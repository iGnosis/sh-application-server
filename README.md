# sh-application-server ![check-code-coverage](https://img.shields.io/badge/code--coverage-25.36%25-red)

Please refer to the [documentation](https://docs.pointmotion.us) for more information.


## Installation steps

## Install Docker and Docker Compose

- https://docs.docker.com/get-docker/
- https://docs.docker.com/compose/install/

## How to run

- cd to `sh-application-server`
- create a new file `.env` with the contents of `.env.sample`
- fill in `.env` example values
- run `docker compose --profile local up -d --force-recreate` to build and start the container

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

test dev
