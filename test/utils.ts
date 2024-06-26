import { ethers } from "hardhat";
import { ContractTransactionResponse, Result, Interface, AddressLike } from "ethers";

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
 * Deploy the EtherMind contract.
 * @returns an object of this form:
 * {
 *      game: the deployed contract
 *      creator (default), challenger, otherPlayer: three different accounts
 * }
 */
export const untilDeploy = async (): Promise<any> => {
    const [creator, challenger, otherPlayer] = await ethers.getSigners();

    const EtherMind = await ethers.getContractFactory("EtherMind");
    const game = await EtherMind.deploy();

    return { game, creator, challenger, otherPlayer };
}

/**
 * Deploy the EtherMind contract and create a new private match.
 * @returns an object of this form:
 * {
 *      game: the deployed contract
 *      creator (default): the account that created the match
 *      challenger: the account that can join the new match
 *      otherPlayer: another account different from the previous ones
 *      matchId: the id of the new match
 * }
 */
export const untilCreate = async (): Promise<any> => {
    const data = await untilDeploy();
    const tx = await data.game.createMatch(data.challenger.address);
    const matchId = await getMatchFromEvent(tx);
    data.matchId = matchId;

    return data;
}

/**
 * Deploy the EtherMind contract, create a new match, and join it.
 * @returns an object of this form:
 * {
 *      game: the deployed contract
 *      creator (default): the account that created the match
 *      challenger: the account that joined the new match
 *      otherPlayer: another account different from the previous ones
 *      matchId: the id of the match
 *      stakeProposal: the value submitted as stake proposal by challenger
 * }
 */
export const untilJoin = async (): Promise<any> => {
    const data = await untilCreate();

    const stakeProposal = 20;
    await data.game.connect(data.challenger).joinMatch(data.matchId, stakeProposal);
    data.stakeProposal = stakeProposal;

    return data;
}

/**
 * Deploy the EtherMind contract, create a new match, join it, and decide the 
 * stake value.
 * @returns an object of this form:
 * {
 *      game: the deployed contract
 *      creator (default): the account that created the match
 *      challenger: the account that joined the new match
 *      otherPlayer: another account different from the previous ones
 *      matchId: the id of the match
 *      stakeProposal: the value submitted as stake proposal by challenger
 *      finalStake: the final stake value agreed
 * }
 */
export const untilStakeDecision = async (): Promise<any> => {
    const data = await untilJoin();

    await data.game.stakeProposal(data.matchId, data.stakeProposal);
    data.finalStake = data.stakeProposal;

    return data;
}

export const phases = [
    untilCreate,
    untilJoin,
    untilStakeDecision
];