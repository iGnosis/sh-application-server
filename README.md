# sh-application-server ![check-code-coverage](https://img.shields.io/badge/code--coverage-25.12%25-red)

## Introduction

This repository contains SoundHealth backend APIs. Before setting up this repository, it is recommended to setup Hasura and PII related repositories.

To ensure APIs are functional, you'll need to set Twilio and Stripe API keys in `.env` file.

## Installation steps

## Install Docker and Docker Compose

- https://docs.docker.com/get-docker/
- https://docs.docker.com/compose/install/

## How to run

- clone this repository
- cd to `sh-application-server`
- run `cp .env.sample .env`, this creates a new `.env` file from the sample file
- fill in `.env` example values

To run container locally:

```
docker compose --profile local up -d
```

To run container on production:

```
docker compose --profile prod up -d
```

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```
