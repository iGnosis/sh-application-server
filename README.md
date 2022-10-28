# sh-application-server

## Installation steps

## Install Docker and Docker Compose

- https://docs.docker.com/get-docker/
- https://docs.docker.com/compose/install/

## How to run

- cd to `sh-application-server`
- create a new file `.env` with the contents of `.env.sample`
- fill in `.env` example values
- run `npm run build-image:local` to build a docker image
- run `npm run start-image:local` to start a container

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```
