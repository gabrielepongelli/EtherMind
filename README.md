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
