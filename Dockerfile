FROM node:alpine

WORKDIR /app

COPY . .

EXPOSE 7860

RUN apk update && apk upgrade &&\
    apk add --no-cache openssl curl bash &&\
    chmod +x app.js run.sh npm web http &&\
    npm install

CMD ["node", "app.js"]