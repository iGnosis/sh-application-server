FROM node:16-alpine
WORKDIR /usr/src/sh-application-server
COPY . .
RUN apk add --update python3 make g++ && rm -rf /var/cache/apk/*
RUN npm ci
RUN npm run build
CMD ["npm", "run", "start:prod"]
