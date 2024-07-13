# EtherMind

This is a project for the Peer to Peer Systems and Blockchains course of the University of Pisa. The aim of this project is to implement the classic Mastermind game using smart contracts over the Ethereum blockchain. 

## Table of Contents

- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [How to Deploy the Contract](#how-to-deploy-the-contract)
- [How to Run the Sample Frontend Application](#how-to-run-the-frontend)
- [License](#license)

## Project Structure

The repository is organized as follows:
```
EtherMind/
├── contracts/
│ ├── EtherMind.sol
│ └── libs/
├── frontend/
├── ignition/
├── scripts/
├── tests/
├── Dockerfile
├── docker-compose.yml
├── hardhat.config.dev.ts
├── hardhat.config.prod.ts
├── hardhat.config.ts
├── Report.pdf
├── README.md
└── ...
```

### Folder Descriptions

- **contracts/**: contains all the files related to the smart contract implementation.
    - **EtherMind.sol**: is the main file where the smart contract is defined.
    - **libs/**: contains helper functions and structure definitions used in the smart contract.
- **frontend/**: contains the sample frontend application code and all its dependencies.
- **ignition/**: contains the script needed to deploy the contract.
- **scripts/**: contains some scripts needed for the correct working of the docker image.
- **tests/**: contains all the test' source code that has been used to test the smart contract.
- **Dockerfile**: Dockerfile for the sample frontend application.
- **docker-compose.yml**: sample of Docker Compose configuration file that utilizes the above Dockerfile.
- **hardhat.config.dev.ts**: Hardhat configuration file used for the development and testing of the smart contract.
- **hardhat.config.prod.ts**: Hardhat configuration file used for the deployment of the production version of the smart contract.
- **hardhat.config.ts**: is the main Hardhat configuration file, that will include one between the 2 above.
- **Report.pdf**: a detailed report of our assumptions, implementation decisions, analisys, and user-guide.
- **README.md**: This document.

## Prerequisites

### Contract Development/Compilation/Testing/Deploying

In order to develop/compile/test/deploy the smart contract, we assume you have  ensure you have the following installed:

- [Node.js](https://nodejs.org/en) at least version **18.0**.
- [Npm](https://www.npmjs.com/), that comes with Node.

### Running the Sample Frontend Application

Before running the application, ensure you have the following installed:

- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/) (Optional, in case you want to try the `docker-compose.yml`)

## How to Deploy the Contract

1. Download the repo (this can be skipped if you have already downloaded it):
    ```bash
    git clone https://github.com/gabrielepongelli/EtherMind
    ```
2. Enter in the root of the project:
    ```bash
    cd EtherMind
    ```
3. Create the `.env` file with the following content:
    - For the deployment on a local node:
        ```bash
        HARDHAT_CONFIG=dev
        EXTERNAL_NODE=true
        ```
    - For the deployment on Sepolia:
        ```bash
        HARDHAT_CONFIG=prod
        INFURA_API_KEY=YOUR-INFURA-API-KEY
        SEPOLIA_PRIVATE_KEY=YOUR-SEPOLIA-PRIVATE-KEY
        ```
4. Install the project dependencies:
    ```bash
    npm install --force
    ```
5. Compile the contract:
    ```bash
    npx hardhat compile
    ```
6. Deploy it:
    - For the deployment on a local node:
        ```bash
        npx hardhat ignition deploy ./ignition/modules/EtherMind.ts --network localhost
        ```
    - For the deployment on Sepolia:
        ```bash
        npx hardhat ignition deploy ./ignition/modules/EtherMind.ts --network sepolia
        ```

## How to run the frontend

If you don't want to start a local node, skip steps 4-7.
1. Download the repo (this can be skipped if you have already downloaded it):
    ```bash
    git clone https://github.com/gabrielepongelli/EtherMind
    ```
2. Enter in the root of the project:
    ```bash
    cd EtherMind
    ```
3. Build the docker image:
    ```bash
    docker build -t ethermind .
    ```
4. Install the project dependencies:
    ```bash
    npm install --force
    ```
5. Start the local hardhat node:
    ```bash
    echo "HARDHAT_CONFIG=dev" >> .env
    echo "EXTERNAL_NODE=true" >> .env
    npx hardhat node
    ```
6. Compile the contract:
    ```bash
    npx hardhat compile
    ```
7. Deploy it on the local node:
    ```bash
    npx hardhat ignition deploy ./ignition/modules/EtherMind.ts --network localhost
    ```
8. Start an instance of the frontend:
    ```bash
    docker run \
            --rm \
            -it \
            -p PORT:8000 \
            -e ETHERMIND_BLOCKCHAIN_PROVIDER_URL="PROVIDER_URL" \
            -e ETHERMIND_CONTRACT_ADDRESS="0xCONTRACT_ADDRESS" \
            -e ETHERMIND_PRIVATE_KEY="0xONE_OF_THE_PRIVATE_KEYS" \
            ethermind
    ```
    Replace to the above command the values:
    - `PORT` with the port number you want to use.
    - `PROVIDER_URL` with the URL of the node to connect (if you want to use a local node, set it to `http://0.0.0.0:8545`).
    - `0xCONTRACT_ADDRESS` with the address of the contract **starting with `0x`**.
    - `0xONE_OF_THE_PRIVATE_KEYS` with the private key of the account you want to use **starting with `0x`**.
9. Now you can access the web interface from `http://localhost:PORT/`, where `PORT` is the port number you chosen to use.


> **Note**: if you want to start multiple instances, just repeat this last command changing `PORT` and `ETHERMIND_PRIVATE_KEY`.

An example of docker compose file can be seen at `/docker-compose.yml`.

## License

This project is licensed under the MIT License - see the LICENSE file for details.