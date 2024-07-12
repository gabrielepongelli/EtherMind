import { ethers } from 'ethers';
import { abi as contractAbi } from '../abi.json';

// import.meta.env is the equivalent of dotenv for broswers

// contract details
const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;

// this is if you need to pay
const privateKey: string = import.meta.env.VITE_PRIVATE_KEY;

// connect to the blockchain provider
export const provider = new ethers.JsonRpcProvider(import.meta.env.VITE_BLOCKCHAIN_PROVIDER_URL);

// use a specific private key
export const wallet = new ethers.Wallet(privateKey, provider);

// connect to the deployed contract
export const contract = new ethers.Contract(contractAddress as string, contractAbi, wallet);