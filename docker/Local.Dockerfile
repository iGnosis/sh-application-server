FROM node:16-alpine
RUN apk add --update python3 make g++ && rm -rf /var/cache/apk/*

WORKDIR /usr/src/sh-application-server
COPY package*.json .
RUN npm ci
ENV PATH=/usr/src/sh-application-server/node_modules/.bin:$PATH

WORKDIR /usr/src/sh-application-server/local
COPY . .

RUN mkdir /usr/src/sh-application-server/nestjs-app-logs \
    && chown -R node:node /usr/src/sh-application-server

USER node
CMD ["npm", "run", "start:debug"]
