import { ethers } from 'ethers';
import { abi as contractAbi } from '../../../artifacts/contracts/EtherMind.sol/EtherMind.json';
import { Code, Feedback, hashCode, prepareSalt } from "../utils/contractTypes";



// Connect to Ethereum using Infura
const infuraProjectId = 'a270745867ac48f29fb7d90e316e1402';
const provider = new ethers.JsonRpcProvider(`https://sepolia.infura.io/v3/${infuraProjectId}`);
// Contract details
const contractAddress = '0x18E1039F024b73aB3B45377A127662104D67Cb96';

//this is if you need to get payed
const privateKey = '7f0a2326943793a9f62333715e771ee1b42a643289299f8e927bd15fd98fb02b';
const wallet = new ethers.Wallet(privateKey, provider);

const contract = new ethers.Contract(contractAddress, contractAbi, wallet);


//if event happened, display on console
contract.on('MatchCreated', (Mid, address) => {
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
contract.on('AfkCheckStarted', (Mid, address, timestamp) => {
    console.log(`AfkCheckStarted event:  Mid = ${Mid}, by = ${address}, timestamp = ${timestamp}`);

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
contract.on('Failure', (Mid, message) => {
    console.log(`Failure event: Mid = ${Mid}, msg = ${message}`);
    //TODO say depending on the returned points who won
});


function check_player_address(otherPlayerAddress: string) {
    // Validate the address
    if (!ethers.isAddress(otherPlayerAddress)) {
        throw new Error('Invalid otherplayer address');
    }
}




//now the functions

type CreateMatchResult =
    | { success: true; tx: ethers.TransactionResponse }
    | { success: false; error: Error };

export async function NewMatch(otherPlayerAddress: string): Promise<CreateMatchResult> {

    try {
        check_player_address(otherPlayerAddress);
        const tx = await contract.createMatch(otherPlayerAddress);
        console.log('Transaction:', tx);
        //const receipt = await tx.wait();
        //console.log('Transaction receipt:', receipt);
        return { success: true, tx };

    } catch (error) {
        console.error('Error:', error);
        return { success: false, error: error as Error };
    }
}


type JoinMatchResult =
    | { success: true; tx: ethers.TransactionResponse }
    | { success: false; error: Error };

export async function joinMatch(Address: string, stake: bigint): Promise<JoinMatchResult> {
    try {
        //as long as it is properly formatted the conversion string->address should be handlesd by itself
        const tx = await contract.joinMatch(Address, stake);
        console.log('Transaction:', tx);
        //return the result and some data
        return { success: true, tx };
    } catch (error) {
        console.error('Error:', error);
        return { success: false, error: error as Error };
    }
}

export async function proposeStake(Address: string, stake: bigint) {
    try {
        const tx = await contract.stakeProposal(Address, stake);
        console.log('Transaction:', tx);
        //const receipt = await tx.wait();
        //console.log('Transaction receipt:', receipt);

    } catch (error) {
        console.error('Error:', error);
    }
}

export async function uploadHash(matchID: string, solution: Code, salt: number) {
    let hashedSolution = hashCode(solution, salt);
    try {
        const tx = await contract.newSolutionHash(matchID, hashedSolution);
        console.log('Transaction:', tx);
        //const receipt = await tx.wait();
        //console.log('Transaction receipt:', receipt);

    } catch (error) {
        console.error('Error:', error);
    }
}

export async function uploadGuess(matchID: number, guess: Code) {
    try {
        const tx = await contract.newGuess(matchID, guess);
        console.log('Transaction:', tx);
        //const receipt = await tx.wait();
        //console.log('Transaction receipt:', receipt);

    } catch (error) {
        console.error('Error:', error);
    }
}

export async function uploadFeedback(matchID: number, feedback: Feedback) {
    try {
        const tx = await contract.newFeedback(matchID, feedback);
        console.log('Transaction:', tx);
        //const receipt = await tx.wait();
        //console.log('Transaction receipt:', receipt);

    } catch (error) {
        console.error('Error:', error);
    }
}

export async function sendSolution(matchID: number, solution: Code, salt: number) {
    try {
        const tx = await contract.uploadSolution(matchID, solution, prepareSalt(salt));
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






