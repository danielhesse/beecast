import childProcess from "child_process";
import { randomUUID } from "crypto";
import fs from "fs";
import fsPromises from "fs/promises";
import { extname, join } from "path";
import { PassThrough, Writable } from "stream";
import streamsPromises from "stream/promises";
import Throttle from "throttle";
import config from "./config.js";
import { logger } from "./utils.js";
import { once } from "events";


export class Service {
  constructor() {
    this.clientStreams = new Map();
    this.currentSong = config.constants.englishConversation;
    this.currentBitRate = 0;
    this.throttleTransform = {};
    this.currentReadable = {};

    this.startStream()
  }

  createClientStream() {
    const id = randomUUID();
    const clientStream = new PassThrough();
    this.clientStreams.set(id, clientStream);

    return { id, clientStream };
  }

  removeClientStream(id) {
    this.clientStreams.delete(id);
  }

  _executeSoxCommand(args) {
    return childProcess.spawn("sox", args);
  }

  async getBitRate(song) {
    try {
      const args = [
        "--i", //info
        "-B", // bitrate
        song
      ];

      const {
        stderr, // tudo o que é erro
        stdout, // tudo que é log
        // stdin // enviar dados como stream
      } = this._executeSoxCommand(args);

      await Promise.all([
        once(stderr, "readable"),
        once(stdout, "readable"),
      ])

      const [success, error] = [stdout, stderr].map(stream => stream.read());

      if (error) return await Promise.reject(error);
      return success.toString().trim().replace(/k/, "000");
    } catch (error) {
      logger.error(`deu ruim no bitrate: ${error}`);
      return config.constants.fallbackBitRate;
    }
  }

  broadCast() {
    return new Writable({
      write: (chunk, enc, cb) => {
        for (const [id, stream] of this.clientStreams) {
          // Se o cliente desconectou não devemos mais mandar dados pra ele
          if (stream.writableEnded) {
            this.clientStreams.delete(id);
            continue;
          }

          stream.write(chunk);
        }

        cb();
      },
    });
  }

  async startStream() {
    logger.info(`starting with ${this.currentSong}`);

    const bitRate = this.currentBitRate = (
      await this.getBitRate(this.currentSong)
    ) / config.constants.bitRateDivisor;

    const throttleTransform = this.throttleTransform = new Throttle(bitRate);
    const songReadable = this.currentReadable = this.createFileStream(this.currentSong);

    return streamsPromises.pipeline(
      songReadable,
      throttleTransform,
      this.broadCast()
    );
  }

  createFileStream(filename) {
    return fs.createReadStream(filename);
  }

  async getFileInfo(file) {
    // File = home/index.html
    const fullFilePath = join(config.dir.publicDirectory, file);

    // Valida se existe o arquivo, se não existe estoura erro!!
    await fsPromises.access(fullFilePath);

    // Pega extensão do arquivo
    const fileType = extname(fullFilePath);

    return {
      type: fileType,
      name: fullFilePath,
    };
  }

  async getFileStream(file) {
    const { name, type } = await this.getFileInfo(file);

    return {
      stream: this.createFileStream(name),
      type
    };
  }
}
