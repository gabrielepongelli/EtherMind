# compile the contract and extract the ABI
FROM node:20-slim AS compile

WORKDIR /project
COPY . .
RUN npm install --save-dev --force
RUN echo "HARDHAT_CONFIG=dev" >> .env && npx hardhat compile


# build the static site using the generated ABI
FROM node:20-slim AS build

WORKDIR /frontend
COPY ./frontend .
COPY --from=compile /project/artifacts/contracts/EtherMind.sol/EtherMind.json .
RUN npm install --save-dev --force
RUN echo "CONTRACT_ABI_PATH=./EtherMind.json" >> .env && npm run build


# start the HTTP server
FROM node:20-slim

WORKDIR /app
COPY --from=build /frontend/dist .
COPY ./scripts/env.sh /docker-entrypoint.d/env.sh
RUN chmod +x /docker-entrypoint.d/env.sh
RUN npm install light-server

COPY ./scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["npx", "light-server", "-s", ".", "-p", "8000"]