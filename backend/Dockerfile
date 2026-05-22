FROM registry.cn-hangzhou.aliyuncs.com/library/node:18-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 8010

CMD ["node", "server.js"]