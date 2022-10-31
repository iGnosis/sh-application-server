FROM node:16-alpine
RUN apk add --update python3 make g++ && rm -rf /var/cache/apk/*

WORKDIR /usr/src/sh-application-server
COPY package*.json .
RUN npm ci
ENV PATH=/usr/src/sh-application-server/node_modules/.bin:$PATH

WORKDIR /usr/src/sh-application-server/local
COPY . .

CMD ["npm", "run", "start:debug"]
