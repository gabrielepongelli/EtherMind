# EtherMind

## How to deploy the contract

1. Create the `.env` file with the following content:
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
2. Compile the contract:
    ```bash
    npx hardhat compile
    ```
3. Deploy it:
    - For the deployment on a local node:
        ```bash
        npx hardhat ignition deploy ./ignition/modules/EtherMind.ts --network localhost
        ```
    - For the deployment on Sepolia:
        ```bash
        npx hardhat ignition deploy ./ignition/modules/EtherMind.ts --network sepolia
        ```

## How to run the frontend

If you don't want to start a local node, skip steps 4-6.
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
4. Start the local hardhat node:
    ```bash
    echo "HARDHAT_CONFIG=dev" >> .env
    echo "EXTERNAL_NODE=true" >> .env
    npx hardhat node
    ```
5. Compile the contract:
    ```bash
    npx hardhat compile
    ```
6. Deploy it on the local node:
    ```bash
    npx hardhat ignition deploy ./ignition/modules/EtherMind.ts --network localhost
    ```
7. Start an instance of the frontend:
    ```bash
    docker run \
            --rm \
            -it \
            -p PORT:8000 \
            -e ETHERMIND_BLOCKCHAIN_PROVIDER_URL="http://0.0.0.0:8545" \
            -e ETHERMIND_CONTRACT_ADDRESS="0xCONTRACT_ADDRESS" \
            -e ETHERMIND_PRIVATE_KEY="0xONE_OF_THE_PRIVATE_KEYS" \
            ethermind
    ```
    > **Note**: remember to set the PORT.
    
    > **Note**: if you want to start multiple instances, just repeat this last command changing PORT and ETHERMIND_PRIVATE_KEY.