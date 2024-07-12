# EtherMind


for local node:

    Follow this link -> https://hardhat.org/hardhat-runner/docs/guides/deploying
    run the script with "npx hardhat run scripts/interactPeriodically.ts --network localhost"
    take the address of the contract and put it in .env file
    same for the private keys of the account
    then go to /EtherMind/frontend and type "npm run dev" (install vite if needed)


for remote node:

    you need to store your infura api key in .env,
    toggle the boolean responsible for selectiong the local node or not,
    put your METAMASK private account key (no "npx hardhat node" here)
    then deploying with the option for hardhat "--network sepolia" put address of contractin env
    then go to /EtherMind/frontend and type "npm run dev" (install vite if needed)


Example:

VITE_LOCAL_NODE=true
VITE_CONTRACT_ADDRESS=0x5FbDBth2315678afecb367f032d977642f64180aa3
VITE_API_KEY=a270747767ac48f29fb7d90e316e1402
VITE_PRIVATE_KEY=0x59c6995e998f97a5a0044966f0945389dc9e86d7788c7a8412f4603b6b78690d

## How to run the frontend

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