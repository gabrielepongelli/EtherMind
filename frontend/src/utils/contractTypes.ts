import { ethers } from "ethers";

export type Code = number;
export type Feedback = number;

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
export const newFeedback = (cp: number, np: number): Feedback => {
    return cp | (np << 4);
}