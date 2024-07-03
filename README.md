# EtherMind

for local node:

    Follow this link -> https://hardhat.org/hardhat-runner/docs/guides/deploying
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

VITE_LOCAL_NODE = true
VITE_CONTRACT_ADDRESS = "5FbDB2315678afecb367f032d977642f64180aa3"
VITE_API_KEY = "a270747767ac48f29fb7d90e316e1402"
VITE_PRIVATE_KEY = "59c6995e998f97a5a0044966f0945389dc9e86d7788c7a8412f4603b6b78690d"
