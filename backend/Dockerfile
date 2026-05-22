FROM node:18-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm install --production

COPY backend/server.js ./
COPY backend/index.html ./
COPY public ./public

EXPOSE 8010

CMD ["node", "server.js"]