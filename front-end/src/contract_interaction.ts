import { ethers } from 'ethers';

// Connect to Ethereum using Infura
const infuraProjectId = 'a270745867ac48f29fb7d90e316e1402';
const provider = new ethers.JsonRpcProvider(`https://sepolia.infura.io/v3/${infuraProjectId}`);
// Contract details
const contractAddress = '0x18E1039F024b73aB3B45377A127662104D67Cb96';
const contractABI = 
    [{"inputs":[{"internalType":"uint256","name":"_unlockTime","type":"uint256"}],"stateMutability":"payable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"when","type":"uint256"}],"name":"Withdrawal","type":"event"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address payable","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"unlockTime","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"}]
;

//this is if you need to get payed
const privateKey = '7f0a2326943793a9f62333715e771ee1b42a643289299f8e927bd15fd98fb02b';
const wallet = new ethers.Wallet(privateKey, provider);

const contract = new ethers.Contract(contractAddress, contractABI, wallet);

// Function to call the withdraw function in the contract
async function withdraw() {
    try {
        const tx = await contract.withdraw();
        console.log('Transaction:', tx);
        const receipt = await tx.wait();
        console.log('Transaction receipt:', receipt);
    } catch (error) {
        console.error('Error:', error);
    }
}

// Call the withdraw function
withdraw();