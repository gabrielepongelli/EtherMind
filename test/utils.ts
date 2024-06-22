import { ethers } from "hardhat";
import { ContractTransactionResponse, Result, Interface, AddressLike } from "ethers";

/**
 * Get the event specified from the transaction specified.
 * @param tx The transaction from where to extract the event.
 * @param eventInterface The event definition.
 * @param eventName The name of the event.
 * @param eventIdx The position of the event to parse with the given interface 
 * and extract.
 * @returns A result containing all the values for each argument of the event, 
 * or undefined if an error occurred.
 */
export const getEvent = async (tx: ContractTransactionResponse, eventInterface: Interface, eventName: string, eventIdx: number = 0): Promise<Result | undefined> => {
    const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
    const data = receipt?.logs[eventIdx].data;
    const topics = receipt?.logs[eventIdx].topics;

    if (data) {
        return eventInterface.decodeEventLog(eventName, data, topics);
    } else {
        return undefined;
    }
}

/**
 * Get the ID of a match from the transaction specified.
 * @param tx The transaction from where to extract the match ID.
 * @returns The ID of the match present in the event inside the transaction 
 * specified, or undefined if an error occurred.
 */
export const getMatchFromEvent = async (tx: ContractTransactionResponse): Promise<AddressLike | undefined> => {
    const eventInterface = new ethers.Interface(["event MatchCreated(address creator, address id)"]);
    const event = await getEvent(tx, eventInterface, "MatchCreated", 0);

    if (event) {
        return event.id;
    } else {
        return undefined;
    }
}