FROM node:16-alpine
WORKDIR /app/sh-application-server
COPY . .
RUN npm install
CMD ["npm", "run", "start:debug"]
