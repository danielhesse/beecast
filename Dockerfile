FROM node:16-slim

RUN apt-get update \
  && apt-get install -y sox libsox-fmt-mp3

# libsox-fmt-all para instalar todos os formatos
WORKDIR /beecast/

COPY package.json package-lock.json /beecast/

RUN npm ci --silent

COPY . .

USER node

CMD npm run dev
