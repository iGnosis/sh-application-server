FROM node:16-alpine
WORKDIR /app/sh-application-server
COPY . .
RUN npm install
RUN npm run build
CMD ["npm", "run", "start:prod"]
