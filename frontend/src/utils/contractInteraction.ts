
import { ethers } from 'ethers';
import { contract } from '../configs/contract';

type Code = number;
type Feedback = number;

/**
 * Create a new code given the specified colors.
 * @param c0 The first color.
 * @param c1 The second color.
 * @param c2 The third color.
 * @param c3 The fourth color.
 * @returns The resulting code.
 */
const newCode = (c0: number, c1: number, c2: number, c3: number): Code => {
    return c0 | (c1 << 3) | (c2 << 6) | (c3 << 9);
}

/**
 * Encode the salt so that it is in the correct format expected by the contract.
 * @param salt The salt to encode.
 * @returns The encoded salt.
 */
const prepareSalt = (salt: number): string => {
    return "0x" + salt.toString(16).padStart(8, "0");
}

/**
 * Hash the code provided.
 * @param code Code to be hashed.
 * @returns The hash of the code provided.
 */
const hashCode = (code: Code, salt: number): string => {
    return ethers.solidityPackedKeccak256(['uint16', 'bytes4'], [code, prepareSalt(salt)])
}

/**
 * Create a new feedback.
 * @param cp The number of correct colors in the correct position.
 * @param np The number of correct colors in the wrong position.
 * @returns The resulting feedback.
 */
const newFeedback = (cp: number, np: number): Feedback => {
    return cp | (np << 4);
}

interface EthersError extends Error {
    code: string;
    reason?: string;
    message: string;
}

function handleEthersError(error: EthersError): string {
    if (error.reason) {
        return error.reason;
    }

    if (error.message.includes('insufficient funds')) {
        return 'Your account does not have enough funds to complete this transaction.';
    }

    if (error.message.includes('NetworkError')) {
        return 'A network error occurred. Please check your internet connection.';
    }

    if (error.message.includes('invalid JSON-RPC response')) {
        return 'The server encountered an error. Please try again later.';
    }

    if (error.message.includes('timeout')) {
        return 'The request timed out. Please try again.';
    }

    if (error.message.includes('invalid address')) {
        return 'Invalid address format. Please check the address and try again.';
    }

    // default error message
    return 'An unknown error occurred. Please try again later.';
}

const checkAddress = (addr: string) => {
    if (!ethers.isAddress(addr)) {
        throw Error('invalid address');
    }
}

type ContractCallResult =
    | { success: true; tx: ethers.TransactionResponse }
    | { success: false; error: string };

export const createMatch = async (otherPlayerAddress: string): Promise<ContractCallResult> => {
    try {

        if (otherPlayerAddress) {
            checkAddress(otherPlayerAddress);
            otherPlayerAddress = otherPlayerAddress.startsWith('0x') ? otherPlayerAddress : '0x' + otherPlayerAddress;
        } else {
            otherPlayerAddress = ethers.ZeroAddress;
        }

        const tx = await contract.createMatch(otherPlayerAddress);
        console.log('Transaction:', tx);

        return { success: true, tx };
    } catch (error) {
        console.error('Error:', error);
        const ethersError = error as EthersError;
        return { success: false, error: handleEthersError(ethersError) };
    }
}

export const joinMatch = async (matchId: string, stake: string): Promise<ContractCallResult> => {
    try {

        if (matchId) {
            checkAddress(matchId);
            matchId = matchId.startsWith('0x') ? matchId : '0x' + matchId;
        } else {
            matchId = ethers.ZeroAddress;
        }

        const tx = await contract.joinMatch(matchId, BigInt(stake));
        console.log('Transaction:', tx);

        return { success: true, tx };
    } catch (error) {
        console.error('Error:', error);

        if (error instanceof SyntaxError || error instanceof TypeError) {
            return { success: false, error: 'Invalid stake format. Please enter a valid number.' };
        }

        const ethersError = error as EthersError;
        return { success: false, error: handleEthersError(ethersError) };
    }
}

export const proposeStake = async (matchId: string, stake: string): Promise<ContractCallResult> => {
    try {
        const tx = await contract.stakeProposal(matchId, BigInt(stake));
        console.log('Transaction:', tx);
        return { success: true, tx };
    } catch (error) {
        console.error('Error:', error);

        if (error instanceof SyntaxError || error instanceof TypeError) {
            return { success: false, error: 'Invalid stake format. Please enter a valid number.' };
        }

        const ethersError = error as EthersError;
        return { success: false, error: handleEthersError(ethersError) };
    }
}

export const payStake = async (matchId: string, stake: bigint): Promise<ContractCallResult> => {
    try {
        const tx = await contract.payStake(matchId, { value: stake });
        console.log('Transaction:', tx);
        return { success: true, tx };
    } catch (error) {
        console.error('Error:', error);
        const ethersError = error as EthersError;
        return { success: false, error: handleEthersError(ethersError) };
    }
}

export const uploadHash = async (matchID: string, solution: Code, salt: number) => {
    let hashedSolution = hashCode(solution, salt);
    try {
        const tx = await contract.newSolutionHash(matchID, hashedSolution);
        console.log('Transaction:', tx);
        return { success: true, tx };
    } catch (error) {
        console.error('Error:', error);
        const ethersError = error as EthersError;
        return { success: false, error: handleEthersError(ethersError) };
    }
}

export const uploadGuess = async (matchID: number, guess: Code) => {
    try {
        const tx = await contract.newGuess(matchID, guess);
        console.log('Transaction:', tx);
        return { success: true, tx };
    } catch (error) {
        console.error('Error:', error);
        const ethersError = error as EthersError;
        return { success: false, error: handleEthersError(ethersError) };
    }
}

export const uploadFeedback = async (matchID: number, feedback: Feedback) => {
    try {
        const tx = await contract.newFeedback(matchID, feedback);
        console.log('Transaction:', tx);
        return { success: true, tx };
    } catch (error) {
        console.error('Error:', error);
        const ethersError = error as EthersError;
        return { success: false, error: handleEthersError(ethersError) };
    }
}

export const sendSolution = async (matchID: number, solution: Code, salt: number) => {
    try {
        const tx = await contract.uploadSolution(matchID, solution, prepareSalt(salt));
        console.log('Transaction:', tx);
        return { success: true, tx };
    } catch (error) {
        console.error('Error:', error);
        const ethersError = error as EthersError;
        return { success: false, error: handleEthersError(ethersError) };
    }
}

export const sendDispute = async (matchID: number) => {
    try {
        const tx = await contract.dispute(matchID);
        console.log('Transaction:', tx);
        return { success: true, tx };
    } catch (error) {
        console.error('Error:', error);
        const ethersError = error as EthersError;
        return { success: false, error: handleEthersError(ethersError) };
    }
}

export const AFKcheck = async (matchID: number) => {
    try {
        const tx = await contract.startAfkCheck(matchID);
        console.log('Transaction:', tx);
        return { success: true, tx };
    } catch (error) {
        console.error('Error:', error);
        const ethersError = error as EthersError;
        return { success: false, error: handleEthersError(ethersError) };
    }
}

export const HaltGame = async (matchID: number) => {
    try {
        const tx = await contract.stopMatchForAfk(matchID);
        console.log('Transaction:', tx);
        return { success: true, tx };
    } catch (error) {
        console.error('Error:', error);
        const ethersError = error as EthersError;
        return { success: false, error: handleEthersError(ethersError) };
    }
}

export const checkWhoWinner = async (matchID: number) => {
    try {
        const tx = await contract.checkWinner(matchID);
        console.log('Transaction:', tx);
        return { success: true, tx };
    } catch (error) {
        console.error('Error:', error);
        const ethersError = error as EthersError;
        return { success: false, error: handleEthersError(ethersError) };
    }
}