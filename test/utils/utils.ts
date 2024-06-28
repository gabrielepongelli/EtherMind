import { ethers } from "hardhat";
import { ContractTransactionResponse, Result, Interface, AddressLike } from "ethers";

type Code = number;
type Feedback = number;

/**
 * Extract a value or raise an exception if it is undefined.
 * @param value Value to extract.
 * @param errorMessage Error message to insert in the exception in case value 
 * is undefined.
 * @throws Error if value is undefined.
 */
export const assertDefined = <T>(value: T | undefined, errorMessage: string = "Value is undefined"): T => {
    if (value === undefined) {
        throw new Error(errorMessage);
    }
    return value;
}

/**
 * Get the event specified from the transaction specified.
 * @param tx The transaction from where to extract the event.
 * @param eventInterface The event definition.
 * @param eventName The name of the event.
 * @param eventIdx The position of the event to parse with the given interface 
 * and extract.
 * @returns A result containing all the values for each argument of the event.
 * @throws Error if an error occurs during the process.
 */
export const getEvent = async (tx: ContractTransactionResponse, eventInterface: Interface, eventName: string, eventIdx: number = 0): Promise<Result> => {
    const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
    const data = assertDefined(receipt?.logs[eventIdx].data);
    const topics = receipt?.logs[eventIdx].topics;
    return eventInterface.decodeEventLog(eventName, data, topics);
}

/**
 * Get the ID of a match from the transaction specified.
 * @param tx The transaction from where to extract the match ID.
 * @returns The ID of the match present in the event inside the transaction 
 * specified.
 * @throws Error if an error occurred.
 */
export const getMatchFromEvent = async (tx: ContractTransactionResponse): Promise<AddressLike> => {
    const eventInterface = new ethers.Interface(["event MatchCreated(address creator, address id)"]);
    const event = await getEvent(tx, eventInterface, "MatchCreated", 0);
    return assertDefined(event).id;
}

/**
 * Get the ID of a match from the transaction specified.
 * @param tx The transaction from where to extract the roles.
 * @returns An object of this form is returned:
 * {
 *      codeMaker: the address of the CodeMaker
 *      codeBreaker: the address of the CodeBreaker
 * }
 * @throws Error if an error occurred.
 */
export const getRoles = async (tx: ContractTransactionResponse): Promise<any> => {
    const eventInterface = new ethers.Interface(["event RoundStarted(address id, uint round, address codemaker, address codebreaker)"]);
    const event = assertDefined(await getEvent(tx, eventInterface, "RoundStarted", 2));

    const codeBreaker = event.codebreaker;
    const codeMaker = event.codemaker;
    return { codeMaker, codeBreaker };
}

/**
 * Get the updated scores of a match from the transaction specified.
 * @param tx The transaction from where to extract the roles.
 * @returns An object of this form is returned:
 * {
 *      creatorScore: the score of the creator
 *      challengerScore: the score of the challenger
 * }
 * @throws Error if an error occurred.
 */
export const getScores = async (tx: ContractTransactionResponse): Promise<any> => {
    const eventInterface = new ethers.Interface(["event ScoresUpdated(address id, uint creatorScore, uint challengerScore)"]);
    const event = assertDefined(await getEvent(tx, eventInterface, "ScoresUpdated", 1));

    const creatorScore = event.creatorScore;
    const challengerScore = event.challengerScore;
    return { creatorScore, challengerScore };
}

/**
 * Create a new code given the specified colors.
 * @param c0 The first color.
 * @param c1 The second color.
 * @param c2 The third color.
 * @param c3 The fourth color.
 * @returns The resulting code.
 */
export const newCode = (c0: number, c1: number, c2: number, c3: number): Code => {
    return c0 | (c1 << 3) | (c2 << 6) | (c3 << 9);
}

/**
 * Encode the salt so that it is in the correct format expected by the contract.
 * @param salt The salt to encode.
 * @returns The encoded salt.
 */
export const prepareSalt = (salt: number): string => {
    return "0x" + salt.toString(16).padStart(8, "0");
}

/**
 * Hash the code provided.
 * @param code Code to be hashed.
 * @returns The hash of the code provided.
 */
export const hashCode = (code: Code, salt: number): string => {
    return ethers.solidityPackedKeccak256(['uint16', 'bytes4'], [code, prepareSalt(salt)])
}

/**
 * Create a new feedback.
 * @param cp The number of correct colors in the correct position.
 * @param np The number of correct colors in the wrong position.
 * @returns The resulting feedback.
 */
export const newFeedback = (cp: number, np: number): Code => {
    return cp | (np << 4);
}