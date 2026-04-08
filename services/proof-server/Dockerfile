FROM node:20-alpine

WORKDIR /app

RUN apk add --no-cache typescript ts-node

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 9090

CMD ["ts-node", "server.ts"]
