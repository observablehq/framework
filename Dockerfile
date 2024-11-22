# syntax=docker/dockerfile:1
# https://docs.docker.com/engine/reference/builder/

ARG NODE_VERSION=20.10.0
FROM node:${NODE_VERSION}-alpine

RUN apk add --no-cache python3 zip

WORKDIR /app

# Download dependencies as a separate step to take advantage of Docker's caching.
# Leverage a cache mount for yarn to speed up subsequent builds.
# Leverage a bind mounts to package.json and yarn.lock to avoid having to copy them into
# into this layer.
RUN --mount=type=bind,source=package.json,target=package.json \
    --mount=type=bind,source=yarn.lock,target=yarn.lock \
    --mount=type=cache,target=/usr/local/share/.cache/yarn \
    yarn install --frozen-lockfile

COPY . .

CMD yarn test
