"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ethers_1 = require("ethers");
// Connect to Ethereum using Infura
const infuraProjectId = 'a270745867ac48f29fb7d90e316e1402';
const provider = new ethers_1.ethers.JsonRpcProvider(`https://sepolia.infura.io/v3/${infuraProjectId}`);
// Contract details
const contractAddress = '0x18E1039F024b73aB3B45377A127662104D67Cb96';
const contractABI = [{ "inputs": [{ "internalType": "uint256", "name": "_unlockTime", "type": "uint256" }], "stateMutability": "payable", "type": "constructor" }, { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "when", "type": "uint256" }], "name": "Withdrawal", "type": "event" }, { "inputs": [], "name": "owner", "outputs": [{ "internalType": "address payable", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "unlockTime", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "withdraw", "outputs": [], "stateMutability": "nonpayable", "type": "function" }];
//this is if you need to get payed
const privateKey = '7f0a2326943793a9f62333715e771ee1b42a643289299f8e927bd15fd98fb02b';
const wallet = new ethers_1.ethers.Wallet(privateKey, provider);
const contract = new ethers_1.ethers.Contract(contractAddress, contractABI, wallet);
// Function to call the withdraw function in the contract
function withdraw() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const tx = yield contract.withdraw();
            console.log('Transaction:', tx);
            const receipt = yield tx.wait();
            console.log('Transaction receipt:', receipt);
        }
        catch (error) {
            console.error('Error:', error);
        }
    });
}
// Call the withdraw function
withdraw();
