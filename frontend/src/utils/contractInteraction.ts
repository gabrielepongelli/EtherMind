
import { ethers } from 'ethers';
import { contract } from '../configs/contract';
import { Code, Feedback, hashCode, prepareSalt } from "../utils/contractTypes";

// if event happened, display on console
contract.on('StakePayed', (Mid, player) => {
    console.log(`StakePayed event: Mid = ${Mid}, address = ${player}`);

});

// if event happened, display on console
contract.on('GameStarted', (Mid) => {
    console.log(`GameStarted event: Mid = ${Mid}`);

});

// if event happened, display on console
contract.on('RoundStarted', (Mid, round, codeMaddress, codeBaddress) => {
    console.log(`RoundStarted event: Mid = ${Mid}, n rounds = ${round}, codemaster = ${codeMaddress}, codebreaker = ${codeBaddress}`);

});

// if event happened, display on console
contract.on('GuessSubmitted', (Mid, address, guess) => {
    console.log(`GuessSubmitted event: Mid = ${Mid}, by = ${address}, guess = ${guess}`);

});

// if event happened, display on console
contract.on('FeedbackSubmitted', (Mid, address, feedback) => {
    console.log(`FeedbackSubmitted event: Mid = ${Mid}, by = ${address}, clue = ${feedback}`);

});

// if event happened, display on console
contract.on('SolutionHashSubmitted', (Mid, address) => {
    console.log(`SolutionHashSubmitted event: Mid = ${Mid}, by = ${address}`);

});

// if event happened, display on console
contract.on('SolutionSubmitted', (Mid, address, solution) => {
    console.log(`SolutionSubmitted event: Mid = ${Mid}, by = ${address}, solution = ${solution}`);

});

// if event happened, display on console
contract.on('ScoresUpdated', (Mid, crsore, chscore) => {
    console.log(`ScoresUpdated event: Mid = ${Mid}, creator score = ${crsore}, challenger score = ${chscore}`);

});

// if event happened, display on console
contract.on('AfkCheckStarted', (Mid, address, timestamp) => {
    console.log(`AfkCheckStarted event:  Mid = ${Mid}, by = ${address}, timestamp = ${timestamp}`);

});

// if event happened, display on console
contract.on('GameEnded', (Mid) => {
    console.log(`GameEnded event: Mid = ${Mid}`);
    // TODO say depending on the returned points who won
});

// if event happened, display on console
contract.on('MatchEnded', (Mid) => {
    console.log(`MatchEnded event: Mid = ${Mid}`);
    // TODO say depending on the returned points who won
});

// if event happened, display on console
contract.on('RoundEnded', (Mid, nOfRounds) => {
    console.log(`RoundEnded event: Mid = ${Mid}, rounds = ${nOfRounds}`);

});

// if event happened, display on console
contract.on('PlayerPunished', (Mid, address, punishment) => {
    console.log(`PlayerPunished event:  Mid = ${Mid}, by = ${address}, reason for punishment = ${punishment}`);

});

// if event happened, display on console
contract.on('RewardDispensed', (Mid, address, currentStake) => {
    console.log(`RewardDispensed event: Mid = ${Mid}, by = ${address}, stake = ${currentStake}`);
    // TODO say depending on the returned points who won
});

// if event happened, display on console
contract.on('Failure', (Mid, message) => {
    console.log(`Failure event: Mid = ${Mid}, msg = ${message}`);
    // TODO say depending on the returned points who won
});


function checkPlayerAddress(otherPlayerAddress: string) {
    // Validate the address
    if (!ethers.isAddress(otherPlayerAddress)) {
        throw new Error('Invalid otherplayer address');
    }
}




//now the functions

type CreateMatchResult =
    | { success: true; tx: ethers.TransactionResponse }
    | { success: false; error: Error };

export const createMatch = async (otherPlayerAddress: string): Promise<CreateMatchResult> => {
    try {

        if (otherPlayerAddress) {
            checkPlayerAddress(otherPlayerAddress);
            otherPlayerAddress = otherPlayerAddress.startsWith('0x') ? otherPlayerAddress : '0x' + otherPlayerAddress;
        } else {
            otherPlayerAddress = ethers.ZeroAddress;
        }

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

export const joinMatch = async (matchId: string, stake: bigint): Promise<JoinMatchResult> => {
    try {

        if (matchId) {
            checkPlayerAddress(matchId);
            matchId = matchId.startsWith('0x') ? matchId : '0x' + matchId;
        } else {
            matchId = ethers.ZeroAddress;
        }

        const tx = await contract.joinMatch(matchId, stake);
        console.log('Transaction:', tx);
        //return the result and some data
        return { success: true, tx };
    } catch (error) {
        console.error('Error:', error);
        return { success: false, error: error as Error };
    }
}

export const proposeStake = async (matchId: string, stake: bigint) => {
    try {
        const tx = await contract.stakeProposal(matchId, stake);
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






