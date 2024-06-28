import { ethers } from "hardhat";
import { getMatchFromEvent, getRoles, getScores, hashCode, prepareSalt, newCode, newFeedback } from "./utils";

/**
 * Deploy the EtherMind contract.
 */
export const untilDeploy = async (): Promise<any> => {
    const [creator, challenger, otherPlayer] = await ethers.getSigners();

    const EtherMind = await ethers.getContractFactory("EtherMind");
    const game = await EtherMind.deploy();

    return { game, creator, challenger, otherPlayer };
}

/**
 * Deploy the EtherMind contract and create a new private match.
 */
const untilCreate = async (): Promise<any> => {
    const data = await untilDeploy();
    const matchId = await getMatchFromEvent(await data.game.createMatch(data.challenger.address));
    data.matchId = matchId;

    return data;
}

/**
 * Deploy the EtherMind contract, create a new match, and join it.
 */
const untilJoin = async (): Promise<any> => {
    const data = await untilCreate();

    const stakeProposal = 20;
    await data.game.connect(data.challenger).joinMatch(data.matchId, stakeProposal);
    data.stakeProposal = stakeProposal;

    return data;
}

/**
 * Deploy the EtherMind contract, create a new match, join it, and decide the 
 * stake value.
 */
const untilStakeDecision = async (): Promise<any> => {
    const data = await untilJoin();

    await data.game.stakeProposal(data.matchId, data.stakeProposal);
    data.finalStake = data.stakeProposal;

    return data;
}

/**
 * Deploy the EtherMind contract, create a new match, join it, decide the 
 * stake value, and pay it.
 */
const untilStakePayment = async (): Promise<any> => {
    const data = await untilStakeDecision();

    await data.game.payStake(data.matchId, { value: data.finalStake });
    const { codeMaker, codeBreaker } = await getRoles(await data.game.connect(data.challenger).payStake(data.matchId, { value: data.finalStake }));
    data.codeMaker = await ethers.getSigner(codeMaker);
    data.codeBreaker = await ethers.getSigner(codeBreaker);

    return data;
}

/**
 * Perform the following operations:
 * 1. Deploy the EtherMind contract.
 * 2. Create a new match.
 * 3. Join the match.
 * 4. Decide the stake value.
 * 5. Pay the value decided.
 * 6. Submit the code hash for the first round.
 */
const untilFirstRoundCodeHash = async (): Promise<any> => {
    const data = await untilStakePayment();

    const colors = { c0: 0, c1: 1, c2: 2, c3: 3 };
    const code = newCode(colors.c0, colors.c1, colors.c2, colors.c3);
    const salt = 1234;
    const codeHash = hashCode(code, salt);
    const encodedSalt = prepareSalt(salt);
    data.solution = { colors, code, codeHash, encodedSalt };

    await data.game.connect(data.codeMaker).newSolutionHash(data.matchId, codeHash);

    return data;
}

/**
 * Perform the following operations:
 * 1. Deploy the EtherMind contract.
 * 2. Create a new match.
 * 3. Join the match.
 * 4. Decide the stake value.
 * 5. Pay the value decided.
 * 6. Submit the code hash for the first round.
 * 7. Submit a first guess.
 */
const untilFirstRoundFirstGuess = async (): Promise<any> => {
    const data = await untilFirstRoundCodeHash();

    const colors = { c0: 1, c1: 2, c2: 3, c3: 4 };
    const code = newCode(colors.c0, colors.c1, colors.c2, colors.c3);
    data.guesses = [{ colors, code }];

    await data.game.connect(data.codeBreaker).newGuess(data.matchId, code);

    return data;
}

/**
 * Perform the following operations:
 * 1. Deploy the EtherMind contract.
 * 2. Create a new match.
 * 3. Join the match.
 * 4. Decide the stake value.
 * 5. Pay the value decided.
 * 6. Submit the code hash for the first round.
 * 7. Submit a first wrong guess.
 * 8. Submit a first feedback.
 */
const untilFirstRoundFirstFeedback = async (): Promise<any> => {
    const data = await untilFirstRoundFirstGuess();

    const hints = { cp: 0, np: 3 };
    const feedback = newFeedback(hints.cp, hints.np);
    data.feedbacks = [{ hints, feedback }];

    await data.game.connect(data.codeMaker).newFeedback(data.matchId, feedback);

    return data;
}

/**
 * Perform the following operations:
 * 1. Deploy the EtherMind contract.
 * 2. Create a new match.
 * 3. Join the match.
 * 4. Decide the stake value.
 * 5. Pay the value decided.
 * 6. Submit the code hash for the first round.
 * 7. Submit a first wrong guess.
 * 8. Submit a first feedback.
 * 9. Submit a second wrong guess.
 */
const untilFirstRoundSecondGuess = async (): Promise<any> => {
    const data = await untilFirstRoundFirstFeedback();

    const colors = { c0: 1, c1: 2, c2: 3, c3: 4 };
    const code = newCode(colors.c0, colors.c1, colors.c2, colors.c3);
    data.guesses.push({ colors, code });

    await data.game.connect(data.codeBreaker).newGuess(data.matchId, code);

    return data;
}

/**
 * Perform the following operations:
 * 1. Deploy the EtherMind contract.
 * 2. Create a new match.
 * 3. Join the match.
 * 4. Decide the stake value.
 * 5. Pay the value decided.
 * 6. Submit the code hash for the first round.
 * 7. Submit a first wrong guess.
 * 8. Submit a first feedback.
 * 9. Submit a second wrong guess.
 * 10. Submit a second feedback.
 */
const untilFirstRoundSecondFeedback = async (): Promise<any> => {
    const data = await untilFirstRoundSecondGuess();

    const hints = { cp: 0, np: 3 };
    const feedback = newFeedback(hints.cp, hints.np);
    data.feedbacks.push({ hints, feedback });

    await data.game.connect(data.codeMaker).newFeedback(data.matchId, feedback);

    return data;
}

/**
 * Perform the following operations:
 * 1. Deploy the EtherMind contract.
 * 2. Create a new match.
 * 3. Join the match.
 * 4. Decide the stake value.
 * 5. Pay the value decided.
 * 6. Submit the code hash for the first round.
 * 7. Submit 12 wrong guesses.
 * 8. Submit 11 feedbacks.
 */
const untilFirstRoundLastGuess = async (): Promise<any> => {
    const data = await untilFirstRoundSecondFeedback();

    for (let guess = 2; guess < 11; guess++) {
        const colors = { c0: 1, c1: 2, c2: 3, c3: 4 };
        const code = newCode(colors.c0, colors.c1, colors.c2, colors.c3);
        data.guesses.push({ colors, code });
        await data.game.connect(data.codeBreaker).newGuess(data.matchId, code);

        const hints = { cp: 0, np: 3 };
        const feedback = newFeedback(hints.cp, hints.np);
        data.feedbacks.push({ hints, feedback });
        await data.game.connect(data.codeMaker).newFeedback(data.matchId, feedback);
    }

    const colors = { c0: 1, c1: 2, c2: 3, c3: 4 };
    const code = newCode(colors.c0, colors.c1, colors.c2, colors.c3);
    data.guesses.push({ colors, code });
    await data.game.connect(data.codeBreaker).newGuess(data.matchId, code);

    return data;
}

/**
 * Perform the following operations:
 * 1. Deploy the EtherMind contract.
 * 2. Create a new match.
 * 3. Join the match.
 * 4. Decide the stake value.
 * 5. Pay the value decided.
 * 6. Submit the code hash for the first round.
 * 7. Submit 12 wrong guesses.
 * 8. Submit 12 feedbacks.
 */
const untilFirstRoundLastFeedback = async (): Promise<any> => {
    const data = await untilFirstRoundLastGuess();

    const hints = { cp: 0, np: 3 };
    const feedback = newFeedback(hints.cp, hints.np);
    data.feedbacks.push({ hints, feedback });

    await data.game.connect(data.codeMaker).newFeedback(data.matchId, feedback);

    return data;
}

/**
 * Perform the following operations:
 * 1. Deploy the EtherMind contract.
 * 2. Create a new match.
 * 3. Join the match.
 * 4. Decide the stake value.
 * 5. Pay the value decided.
 * 6. Submit the code hash for the first round.
 * 7. Submit 12 wrong guesses.
 * 8. Submit 12 feedbacks.
 * 9. Submit the final solution for the first round.
 */
const untilFirstRoundSolution = async (): Promise<any> => {
    let data = await untilFirstRoundLastFeedback();

    await data.game.connect(data.codeMaker).uploadSolution(data.matchId, data.solution.code, data.solution.encodedSalt);
    //const { creatorScore, challengerScore } = await getScores(await data.game.connect(data.codeMaker).uploadSolution(data.matchId, data.solution.code, data.solution.encodedSalt));
    //data.creatorScore = creatorScore;
    //data.challengerScore = challengerScore;
    data.codeMaker, data.codeBreaker = data.codeBreaker, data.codeMaker;

    return data;
}

/**
 * Perform the following operations:
 * 1. Deploy the EtherMind contract.
 * 2. Create a new match.
 * 3. Join the match.
 * 4. Decide the stake value.
 * 5. Pay the value decided.
 * 6. Play a full first round where the CodeMaker wins.
 * 7. Submit the code hash for the second round.
 */
const untilSecondRoundCodeHash = async (): Promise<any> => {
    const data = await untilFirstRoundSolution();

    const colors = { c0: 0, c1: 1, c2: 2, c3: 3 };
    const code = newCode(colors.c0, colors.c1, colors.c2, colors.c3);
    const salt = 1234;
    const codeHash = hashCode(code, salt);
    const encodedSalt = prepareSalt(salt);
    data.solution = { colors, code, codeHash, encodedSalt };

    await data.game.connect(data.codeMaker).newSolutionHash(data.matchId, codeHash);

    return data;
}

/**
 * Perform the following operations:
 * 1. Deploy the EtherMind contract.
 * 2. Create a new match.
 * 3. Join the match.
 * 4. Decide the stake value.
 * 5. Pay the value decided.
 * 6. Play a full first round where the CodeMaker wins.
 * 7. Submit the code hash for the second round.
 * 8. Submit a correct guess.
 */
const untilSecondRoundCorrectGuess = async (): Promise<any> => {
    const data = await untilSecondRoundCodeHash();

    const colors = data.solution.colors;
    const code = data.solution.code;
    data.guesses = [{ colors, code }];

    await data.game.connect(data.codeBreaker).newGuess(data.matchId, code);

    return data;
}

/**
 * Perform the following operations:
 * 1. Deploy the EtherMind contract.
 * 2. Create a new match.
 * 3. Join the match.
 * 4. Decide the stake value.
 * 5. Pay the value decided.
 * 6. Play a full first round where the CodeMaker wins.
 * 7. Submit the code hash for the second round.
 * 8. Submit a correct guess.
 * 9. Submit the correspondant feedback.
 */
const untilSecondRoundFeedback = async (): Promise<any> => {
    const data = await untilSecondRoundCorrectGuess();

    const hints = { cp: 4, np: 0 };
    const feedback = newFeedback(hints.cp, hints.np);
    data.feedbacks = [{ hints, feedback }];

    await data.game.connect(data.codeMaker).newFeedback(data.matchId, feedback);

    return data;
}

/**
 * Perform the following operations:
 * 1. Deploy the EtherMind contract.
 * 2. Create a new match.
 * 3. Join the match.
 * 4. Decide the stake value.
 * 5. Pay the value decided.
 * 6. Play a full first round where the CodeMaker wins.
 * 7. Submit the code hash for the second round.
 * 8. Submit a correct guess.
 * 9. Submit the correspondant feedback.
 * 10. Submit the final solution for the second round.
 */
const untilSecondRoundSolution = async (): Promise<any> => {
    const data = await untilSecondRoundFeedback();

    const { creatorScore, challengerScore } = await getScores(await data.game.connect(data.codeMaker).uploadSolution(data.matchId, data.solution.code, data.solution.encodedSalt));
    data.creatorScore = creatorScore;
    data.challengerScore = challengerScore;
    data.codeMaker, data.codeBreaker = data.codeBreaker, data.codeMaker;

    return data;
}

/**
 * Perform the following operations:
 * 1. Deploy the EtherMind contract.
 * 2. Create a new match.
 * 3. Join the match.
 * 4. Decide the stake value.
 * 5. Pay the value decided.
 * 6. Play a full first round where the CodeMaker wins.
 * 7. Play a second round where the CodeBreaker wins at the first guess.
 * 8. Play a third round where the CodeBreaker wins at the first guess.
 */
const untilThirdRoundSolution = async (): Promise<any> => {
    let data = await untilSecondRoundSolution();

    const colors = { c0: 0, c1: 1, c2: 2, c3: 3 };
    const code = newCode(colors.c0, colors.c1, colors.c2, colors.c3);
    const salt = 1234;
    const codeHash = hashCode(code, salt);
    const encodedSalt = prepareSalt(salt);
    data.solution = { colors, code, codeHash, encodedSalt };
    await data.game.connect(data.codeMaker).newSolutionHash(data.matchId, codeHash);

    data.guesses = [{ colors, code }];
    await data.game.connect(data.codeBreaker).newGuess(data.matchId, code);

    const hints = { cp: 4, np: 0 };
    const feedback = newFeedback(hints.cp, hints.np);
    data.feedbacks = [{ hints, feedback }];
    await data.game.connect(data.codeMaker).newFeedback(data.matchId, feedback);

    const { creatorScore, challengerScore } = await getScores(await data.game.connect(data.codeMaker).uploadSolution(data.matchId, data.solution.code, data.solution.encodedSalt));
    data.creatorScore = creatorScore;
    data.challengerScore = challengerScore;
    data.codeMaker, data.codeBreaker = data.codeBreaker, data.codeMaker;

    return data;
}

/**
 * Perform the following operations:
 * 1. Deploy the EtherMind contract.
 * 2. Create a new match and join it.
 * 3. Decide the stake value and pay it.
 * 4. Play a full first round where the CodeMaker wins.
 * 5. Play a second round where the CodeBreaker wins at the first guess.
 * 6. Play a third round where the CodeBreaker wins at the first guess.
 * 7. Submit the code hash for the last round.
 * 8. Submit 11 wrong guesses.
 * 9. Submit 11 feedbacks.
 */
const untilLastRoundSecondLastFeedback = async (): Promise<any> => {
    const data = await untilThirdRoundSolution();

    let colors = { c0: 0, c1: 1, c2: 2, c3: 3 };
    let code = newCode(colors.c0, colors.c1, colors.c2, colors.c3);
    const salt = 1234;
    const codeHash = hashCode(code, salt);
    const encodedSalt = prepareSalt(salt);
    data.solution = { colors, code, codeHash, encodedSalt };
    data.guesses = [];
    data.feedbacks = [];
    await data.game.connect(data.codeMaker).newSolutionHash(data.matchId, codeHash);

    for (let guess = 0; guess < 11; guess++) {
        colors = { c0: 1, c1: 2, c2: 3, c3: 4 };
        code = newCode(colors.c0, colors.c1, colors.c2, colors.c3);
        data.guesses.push({ colors, code });
        await data.game.connect(data.codeBreaker).newGuess(data.matchId, code);

        const hints = { cp: 0, np: 3 };
        const feedback = newFeedback(hints.cp, hints.np);
        data.feedbacks.push({ hints, feedback });
        await data.game.connect(data.codeMaker).newFeedback(data.matchId, feedback);
    }

    return data;
}

/**
 * Perform the following operations:
 * 1. Deploy the EtherMind contract.
 * 2. Create a new match and join it.
 * 3. Decide the stake value and pay it.
 * 4. Play a full first round where the CodeMaker wins.
 * 5. Play a second round where the CodeBreaker wins at the first guess.
 * 6. Play a third round where the CodeBreaker wins at the first guess.
 * 7. Play a fourth round where the CodeBreaker wins at the last guess.
 */
const untilLastRoundSolution = async (): Promise<any> => {
    let data = await untilLastRoundSecondLastFeedback();

    const colors = data.solution.colors;
    const code = data.solution.code;
    data.guesses.push({ colors, code });
    await data.game.connect(data.codeBreaker).newGuess(data.matchId, code);

    const hints = { cp: 4, np: 0 };
    const feedback = newFeedback(hints.cp, hints.np);
    data.feedbacks.push({ hints, feedback });
    await data.game.connect(data.codeMaker).newFeedback(data.matchId, feedback);

    const { creatorScore, challengerScore } = await getScores(await data.game.connect(data.codeMaker).uploadSolution(data.matchId, data.solution.code, data.solution.encodedSalt));
    data.creatorScore = creatorScore;
    data.challengerScore = challengerScore;
    data.codeMaker, data.codeBreaker = data.codeBreaker, data.codeMaker;

    return data;
}

export const phases = {
    untilCreate,
    untilJoin,
    untilStakeDecision,
    untilStakePayment,
    untilFirstRoundCodeHash,
    untilFirstRoundFirstGuess,
    untilFirstRoundFirstFeedback,
    untilFirstRoundSecondGuess,
    untilFirstRoundSecondFeedback,
    untilFirstRoundLastGuess,
    untilFirstRoundLastFeedback,
    untilFirstRoundSolution,
    untilSecondRoundCodeHash,
    untilSecondRoundCorrectGuess,
    untilSecondRoundFeedback,
    untilSecondRoundSolution,
    untilThirdRoundSolution,
    untilLastRoundSecondLastFeedback,
    untilLastRoundSolution
};