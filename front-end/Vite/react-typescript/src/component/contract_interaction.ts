import { ethers } from 'ethers';
import CryptoJS from 'crypto-js';

interface Move {
    pos1: number;
    pos2: number;
    pos3: number;
    pos4: number;
}

interface Feedb {
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
    [{ "inputs": [{ "internalType": "uint256", "name": "_unlockTime", "type": "uint256" }], "stateMutability": "payable", "type": "constructor" }, { "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "when", "type": "uint256" }], "name": "Withdrawal", "type": "event" }, { "inputs": [], "name": "owner", "outputs": [{ "internalType": "address payable", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "unlockTime", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "withdraw", "outputs": [], "stateMutability": "nonpayable", "type": "function" }]
    ;

//this is if you need to get payed
const privateKey = '7f0a2326943793a9f62333715e771ee1b42a643289299f8e927bd15fd98fb02b';
const wallet = new ethers.Wallet(privateKey, provider);

const contract = new ethers.Contract(contractAddress, contractABI, wallet);


//if event happened, display on console
contract.on('MatchCreated', (address,Mid) => {
    console.log(`MatchCreated event: Mid = ${Mid}, by = ${address}`);

});

//if event happened, display on console
contract.on('MatchStarted', (Mid, addressCreator, addressChallenger) => {
    console.log(`MatchStarted event: Mid = ${Mid}, by = ${addressCreator}, challenger = ${addressChallenger}`);

});

//if event happened, display on console
contract.on('StakeProposal', (Mid, proposal) => {
    console.log(`StakeProposal event: Mid = ${Mid}, stake = ${proposal}`);
    //show new proposed stake to the user
    
});

//if event happened, display on console
contract.on('StakeFixed', (Mid, stake) => {
    console.log(`StakeFixed event: Mid = ${Mid}, stake = ${stake}`);

});

//if event happened, display on console
contract.on('StakePayed', (Mid, player) => {
    console.log(`StakePayed event: Mid = ${Mid}, address = ${player}`);

});

//if event happened, display on console
contract.on('GameStarted', (Mid) => {
    console.log(`GameStarted event: Mid = ${Mid}`);

});

//if event happened, display on console
contract.on('RoundStarted', (Mid, round, codeMaddress, codeBaddress) => {
    console.log(`RoundStarted event: Mid = ${Mid}, n rounds = ${round}, codemaster = ${codeMaddress}, codebreaker = ${codeBaddress}`);

});

//if event happened, display on console
contract.on('GuessSubmitted', (Mid, address, guess) => {
    console.log(`GuessSubmitted event: Mid = ${Mid}, by = ${address}, guess = ${guess}`);

});

//if event happened, display on console
contract.on('FeedbackSubmitted', (Mid, address, feedback) => {
    console.log(`FeedbackSubmitted event: Mid = ${Mid}, by = ${address}, clue = ${feedback}`);

});

//if event happened, display on console
contract.on('SolutionHashSubmitted', (Mid, address) => {
    console.log(`SolutionHashSubmitted event: Mid = ${Mid}, by = ${address}`);

});

//if event happened, display on console
contract.on('SolutionSubmitted', (Mid, address, solution) => {
    console.log(`SolutionSubmitted event: Mid = ${Mid}, by = ${address}, solution = ${solution}`);

});

//if event happened, display on console
contract.on('ScoresUpdated', (Mid, crsore, chscore) => {
    console.log(`ScoresUpdated event: Mid = ${Mid}, creator score = ${crsore}, challenger score = ${chscore}`);

});

//if event happened, display on console
contract.on('AFKCheckStarted', (Mid, address, timestamp) => {
    console.log(`AFKCheckStarted event:  Mid = ${Mid}, by = ${address}, timestamp = ${timestamp}`);

});

//if event happened, display on console
contract.on('GameEnded', (Mid) => {
    console.log(`GameEnded event: Mid = ${Mid}`);
    //TODO say depending on the returned points who won
});

//if event happened, display on console
contract.on('MatchEnded', (Mid) => {
    console.log(`MatchEnded event: Mid = ${Mid}`);
    //TODO say depending on the returned points who won
});

//if event happened, display on console
contract.on('RoundEnded', (Mid, nOfRounds) => {
    console.log(`RoundEnded event: Mid = ${Mid}, rounds = ${nOfRounds}`);

});

//if event happened, display on console
contract.on('PlayerPunished', (Mid, address, punishment) => {
    console.log(`PlayerPunished event:  Mid = ${Mid}, by = ${address}, reason for punishment = ${punishment}`);

});

//if event happened, display on console
contract.on('RewardDispensed', (Mid, address, currentStake) => {
    console.log(`RewardDispensed event: Mid = ${Mid}, by = ${address}, stake = ${currentStake}`);
    //TODO say depending on the returned points who won
});

//if event happened, display on console
contract.on('Failure', (message) => {
    console.log(`Failure event: Mid = ${message}`);
    //TODO say depending on the returned points who won
});


function check_player_address(otherPlayerAddress: string){
    // Validate the address
    if (!ethers.isAddress(otherPlayerAddress)) {
        throw new Error('Invalid otherplayer address');
    }
}




//now the functions

type CreateMatchResult = 
  | { success: true; tx: ethers.TransactionResponse }
  | { success: false; error: Error };

export async function NewMatch(otherPlayerAddress: string) : Promise<CreateMatchResult> {
    
    try {
        check_player_address(otherPlayerAddress);
        const tx = await contract.createMatch(otherPlayerAddress);
        console.log('Transaction:', tx);
        //const receipt = await tx.wait();
        //console.log('Transaction receipt:', receipt);
        return { success: true, tx };

    } catch (error) {
        console.error('Error:', error);
        return { success: false, error: error as Error  };   
    }
}


type JoinMatchResult = 
  | { success: true; tx: ethers.TransactionResponse }
  | { success: false; error: Error };

export async function joinMatch(Address: string, stake: bigint): Promise<JoinMatchResult> {
    try {
        //as long as it is properly formatted the conversion string->address should be handlesd by itself
        const tx = await contract.joinMatch(Address,stake);
        console.log('Transaction:', tx);
        //return the result and some data
        return { success: true, tx };
    } catch (error) {
        console.error('Error:', error);
        return { success: false, error: error as Error  };    
    }
}


export async function proposeStake(Address: string, stake: bigint) {
    try {
        const tx = await contract.stakeProposal(Address,stake);
        console.log('Transaction:', tx);
        //const receipt = await tx.wait();
        //console.log('Transaction receipt:', receipt);

    } catch (error) {
        console.error('Error:', error);
    }
}



export async function uploadHash(matchID: string, SecretCode: string) {
    //hash secret code, convert it to string using Hex encoder
    let generated_signature = CryptoJS.SHA256(SecretCode).toString(CryptoJS.enc.Hex);
    try {
        const tx = await contract.newSolutionHash(matchID, generated_signature);
        console.log('Transaction:', tx);
        //const receipt = await tx.wait();
        //console.log('Transaction receipt:', receipt);

    } catch (error) {
        console.error('Error:', error);
    }
}

export async function uploadGuess(matchID: number, guess: Move) {//THIS *MAY* CAUSE PROBLEMS IN THE FUTURE, CONSIDER SWITCH TO JUST NUMBERS
    try {
        const tx = await contract.newGuess(matchID, guess);
        console.log('Transaction:', tx);
        //const receipt = await tx.wait();
        //console.log('Transaction receipt:', receipt);

    } catch (error) {
        console.error('Error:', error);
    }
}



export async function uploadFeedback(matchID: number, feedback: Feedb) {//THIS *MAY* CAUSE PROBLEMS IN THE FUTURE, CONSIDER SWITCH TO JUST NUMBERS
    try {
        const tx = await contract.newFeedback(matchID, feedback);
        console.log('Transaction:', tx);
        //const receipt = await tx.wait();
        //console.log('Transaction receipt:', receipt);

    } catch (error) {
        console.error('Error:', error);
    }
}


export async function sendSolution(matchID: number, solution: Move) {//THIS *MAY* CAUSE PROBLEMS IN THE FUTURE, CONSIDER SWITCH TO JUST NUMBERS
    try {
        const tx = await contract.uploadSolution(matchID, solution);
        console.log('Transaction:', tx);
        //const receipt = await tx.wait();
        //console.log('Transaction receipt:', receipt);

    } catch (error) {
        console.error('Error:', error);
    }
}



export async function sendDispute(matchID: number) {
    try {
        const tx = await contract.dispute(matchID);
        console.log('Transaction:', tx);
        //const receipt = await tx.wait();
        //console.log('Transaction receipt:', receipt);

    } catch (error) {
        console.error('Error:', error);
    }
}



export async function AFKcheck(matchID: number) {
    try {
        const tx = await contract.startAfkCheck(matchID);
        console.log('Transaction:', tx);
        //const receipt = await tx.wait();
        //console.log('Transaction receipt:', receipt);

    } catch (error) {
        console.error('Error:', error);
    }
}


export async function HaltGame(matchID: number) {
    try {
        const tx = await contract.stopMatchForAfk(matchID);
        console.log('Transaction:', tx);
        //const receipt = await tx.wait();
        //console.log('Transaction receipt:', receipt);

    } catch (error) {
        console.error('Error:', error);
    }
}


export async function checkWhoWinner(matchID: number) {//THIS *MAY* CAUSE PROBLEMS IN THE FUTURE, CONSIDER SWITCH TO JUST NUMBERS
    try {
        const tx = await contract.checkWinner(matchID);
        console.log('Transaction:', tx);
        //const receipt = await tx.wait();
        //console.log('Transaction receipt:', receipt);

    } catch (error) {
        console.error('Error:', error);
    }
}

//in theory we don't need to perform any extra check: if say uploadhash was successful then we can go on and do the feedback, otherwise it automatically kick us out saying were not there wyt...






