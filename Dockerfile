FROM node:22 AS build

WORKDIR /app

COPY package*.json .

COPY . .
RUN apt-get update && apt-get install -y
RUN apt-get install -y git
RUN npm install
RUN npm run build
RUN npm prune --production

FROM node:22-slim AS base45

ENV NODE_ENV=development

WORKDIR /app
COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
RUN ulimit -c unlimited
ENTRYPOINT ["node", "build"]
