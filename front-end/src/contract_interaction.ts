import { ethers } from 'ethers';
import CryptoJS from 'crypto-js';

interface Move{
    pos1: number;
    pos2: number;
    pos3: number;
    pos4: number;
}

interface Feedb{
    wrong_pos: number;
    correct: number;
}

// Connect to Ethereum using Infura
const infuraProjectId = 'a270745867ac48f29fb7d90e316e1402';
const provider = new ethers.JsonRpcProvider(`https://sepolia.infura.io/v3/${infuraProjectId}`);
// Contract details
const contractAddress = '0x18E1039F024b73aB3B45377A127662104D67Cb96';
//In order to communicate with the Contract on-chain, must know what methods are available and how to encode and decode the data
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


//if event happened, display on console
contract.on('DepositFeedback', (address, feedback, Mid) => {
    console.log(`DepositFeedback event: by = ${address}, guess = ${feedback}, Mid = ${Mid}`);

});

contract.on('EndOfGuesses', (address, Mid) => {
    console.log(`EndOfGuesses event: by = ${address}, Mid = ${Mid}`);

});

//if event happened, display on console
contract.on('DepositHashSolution', (address, guess, Mid) => {
    console.log(`DepositHashSolution event: by = ${address}, guess = ${guess}, Mid = ${Mid}`);

});


//if event happened, display on console
contract.on('DepositHashSolution', (address, hash, Mid) => {
    console.log(`DepositHashSolution event: by = ${address}, hash = ${hash}, Mid = ${Mid}`);

});

//if event happened, display on console
contract.on('AFKCheckStarted', (address, timestamp, Mid) => {
    console.log(`AFKCheckStarted event: by = ${address}, reason for punishment = ${timestamp}, Mid = ${Mid}`);

});

//if event happened, display on console
contract.on('AFKCheckStarted', (address, timestamp, Mid) => {
    console.log(`AFKCheckStarted event: by = ${address}, reason for punishment = ${timestamp}, Mid = ${Mid}`);

});

//if event happened, display on console
contract.on('EndOfMatch', (address, points_host, points_challenger, currentStake, Mid) => {
    console.log(`EndOfMatch event: by = ${address}, points host = ${points_host}, points challenger = ${points_challenger}, stake = ${currentStake}, Mid = ${Mid}`);
    //TODO say depending on the returned points who won
});

//if event happened, display on console
contract.on('EndOfRound', (address, solution, Mid) => {
    console.log(`EndOfRound event: by = ${address}, solution = ${solution}, Mid = ${Mid}`);

});

//if event happened, display on console
contract.on('PunishmentDispensed', (address, punishment, Mid) => {
    console.log(`PunishmentDispensed event: by = ${address}, reason for punishment = ${punishment}, Mid = ${Mid}`);

});

//if event happened, display on console
contract.on('RewardDispensed', (address, points_host, points_challenger, currentStake, Mid) => {
    console.log(`RewardDispensed event: by = ${address}, points host = ${points_host}, points challenger = ${points_challenger}, stake = ${currentStake}, Mid = ${Mid}`);
    //TODO say depending on the returned points who won
});

async function uploadHash(matchID: number, SecretCode: string) {
    //hash secret code, convert it to string using Hex encoder
    let generated_signature = CryptoJS.SHA256(SecretCode).toString(CryptoJS.enc.Hex); 
    try {
        const tx = await contract.uploadCodeHash(matchID,generated_signature);
        console.log('Transaction:', tx);
        //const receipt = await tx.wait();
        //console.log('Transaction receipt:', receipt);
       
    } catch (error) {
        console.error('Error:', error);
    }
}

async function uploadGuess(matchID: number, guess: Move) {//THIS *MAY* CAUSE PROBLEMS IN THE FUTURE, CONSIDER SWITCH TO JUST NUMBERS
    try {
        const tx = await contract.makeGuess(matchID,guess);
        console.log('Transaction:', tx);
        //const receipt = await tx.wait();
        //console.log('Transaction receipt:', receipt);
       
    } catch (error) {
        console.error('Error:', error);
    }
}



async function uploadFeedback(matchID: number, feedback: Feedb) {//THIS *MAY* CAUSE PROBLEMS IN THE FUTURE, CONSIDER SWITCH TO JUST NUMBERS
    try {
        const tx = await contract.giveFeedback(matchID,feedback);
        console.log('Transaction:', tx);
        //const receipt = await tx.wait();
        //console.log('Transaction receipt:', receipt);
       
    } catch (error) {
        console.error('Error:', error);
    }
}


async function checkWhoWinner(matchID: number) {//THIS *MAY* CAUSE PROBLEMS IN THE FUTURE, CONSIDER SWITCH TO JUST NUMBERS
    try {
        const tx = await contract.checkWinner(matchID);
        console.log('Transaction:', tx);
        //const receipt = await tx.wait();
        //console.log('Transaction receipt:', receipt);
       
    } catch (error) {
        console.error('Error:', error);
    }
}



async function sendSolution(matchID: number, solution: Move) {//THIS *MAY* CAUSE PROBLEMS IN THE FUTURE, CONSIDER SWITCH TO JUST NUMBERS
    try {
        const tx = await contract.uploadSolution(matchID,solution);
        console.log('Transaction:', tx);
        //const receipt = await tx.wait();
        //console.log('Transaction receipt:', receipt);
       
    } catch (error) {
        console.error('Error:', error);
    }
}



async function sendDispute(matchID: number) {//THIS *MAY* CAUSE PROBLEMS IN THE FUTURE, CONSIDER SWITCH TO JUST NUMBERS
    try {
        const tx = await contract.dispute(matchID);
        console.log('Transaction:', tx);
        //const receipt = await tx.wait();
        //console.log('Transaction receipt:', receipt);
       
    } catch (error) {
        console.error('Error:', error);
    }
}



async function AFKcheck(matchID: number) {//THIS *MAY* CAUSE PROBLEMS IN THE FUTURE, CONSIDER SWITCH TO JUST NUMBERS
    try {
        const tx = await contract.startAfkCheck(matchID);
        console.log('Transaction:', tx);
        //const receipt = await tx.wait();
        //console.log('Transaction receipt:', receipt);
       
    } catch (error) {
        console.error('Error:', error);
    }
}


async function HaltGame(matchID: number) {//THIS *MAY* CAUSE PROBLEMS IN THE FUTURE, CONSIDER SWITCH TO JUST NUMBERS
    try {
        const tx = await contract.stopMatch(matchID);
        console.log('Transaction:', tx);
        //const receipt = await tx.wait();
        //console.log('Transaction receipt:', receipt);
       
    } catch (error) {
        console.error('Error:', error);
    }
}



//in theory we don't need to perform any extra check: if say uploadhash was successful then we can go on and do the feedback, otherwise it automatically kick us out saying were not there wyt...



// Call the withdraw function
withdraw();


