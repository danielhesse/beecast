import fs from "fs";
import fsPromises from "fs/promises";
import { join, extname } from "path";
import config from "./config.js";

export class Service {
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
