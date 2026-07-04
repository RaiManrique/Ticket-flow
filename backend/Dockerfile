FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN apk add --no-cache ffmpeg
RUN npm install --omit=dev

COPY src ./src

EXPOSE 3000

CMD ["npm", "start"]
