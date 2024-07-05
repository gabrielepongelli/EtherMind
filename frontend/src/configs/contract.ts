import { ethers } from 'ethers';
import { abi as contractAbi } from '../../../artifacts/contracts/EtherMind.sol/EtherMind.json';

//import.meta.env is the equivalent of dotenv for broswers

// contract details
const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

// this is if you need to pay
const privateKey: string = import.meta.env.VITE_PRIVATE_KEY;

let provider: ethers.JsonRpcProvider;

if (!import.meta.env.VITE_LOCAL_NODE) {
    // connect to Ethereum using Infura
    const infuraProjectId = import.meta.env.VITE_API_KEY;
    provider = new ethers.JsonRpcProvider(`https://sepolia.infura.io/v3/${infuraProjectId}`);
} else {
    // connect to the Hardhat local network
    provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
}

// use a specific private key
export const wallet = new ethers.Wallet(privateKey, provider);

// connect to the deployed contract
export const contract = new ethers.Contract(contractAddress as string, contractAbi, wallet);