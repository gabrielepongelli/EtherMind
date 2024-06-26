import { ethers } from "hardhat";
import { getMatchFromEvent } from "./utils";

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