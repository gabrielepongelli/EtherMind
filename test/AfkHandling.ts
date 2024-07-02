import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { getEvent, newCode, hashCode, newFeedback, setAutoMine, mineBlocks } from "./utils/utils";
import { phases } from "./utils/phases";

const codeMakerShouldMove = [
    phases.untilStakePayment,
    phases.untilFirstRoundFirstGuess,
    phases.untilFirstRoundSecondGuess,
    phases.untilFirstRoundLastGuess,
    phases.untilFirstRoundLastFeedback,
    phases.untilFirstRoundSolution,
    phases.untilSecondRoundCorrectGuess,
    phases.untilSecondRoundFeedback,
    phases.untilSecondRoundSolution,
    phases.untilThirdRoundSolution,
    phases.untilLastRoundLastGuess,
    phases.untilLastRoundLastFeedback
];

const codeBreakerShouldMove = [
    phases.untilFirstRoundCodeHash,
    phases.untilFirstRoundFirstFeedback,
    phases.untilFirstRoundSecondFeedback,
    phases.untilFirstRoundSecondLastFeedback,
    phases.untilSecondRoundCodeHash,
    phases.untilLastRoundSecondLastFeedback
];

describe("AFK handling", function () {
    afterEach(async function () {
        // just to be sure
        await setAutoMine(true);
    });

    describe("Starting the check", function () {
        describe("Validation", function () {
            it("Should fail if an invalid match ID is passed", async function () {
                const { game, codeBreaker } = await loadFixture(phases.untilFirstRoundSolution);
                const invalidMatchId = ethers.ZeroAddress;

                await expect(game.connect(codeBreaker).startAfkCheck(invalidMatchId)).to.be.revertedWith("The match specified does not exist");
            });

            it("Should fail if called on a match that is in the wrong phase", async function () {
                const phasesToBeChecked = [
                    phases.untilCreate,
                    phases.untilJoin,
                    phases.untilStakeDecision,
                    phases.untilLastRoundSolution
                ];

                for (const phaseFn of Object.values(phasesToBeChecked)) {
                    const { game, challenger, matchId } = await loadFixture(phaseFn);

                    await expect(game.startAfkCheck(matchId)).to.be.revertedWith("Operation not permitted in this phase of the game");
                    await expect(game.connect(challenger).startAfkCheck(matchId)).to.be.revertedWith("Operation not permitted in this phase of the game");
                }
            });

            it("Should fail if called by someone which is not part of the match", async function () {
                const { game, matchId, otherPlayer } = await loadFixture(phases.untilFirstRoundSolution);

                await expect(game.connect(otherPlayer).startAfkCheck(matchId)).to.be.revertedWith("You are not part of the match specified");
            });

            it("Should fail if called by the player that should make the move", async function () {
                for (const phaseFn of Object.values(codeMakerShouldMove)) {
                    const { game, matchId, codeMaker } = await loadFixture(phaseFn);

                    await expect(game.connect(codeMaker).startAfkCheck(matchId)).to.be.revertedWith("You can't ask for an afk check");
                }

                for (const phaseFn of Object.values(codeBreakerShouldMove)) {
                    const { game, matchId, codeBreaker } = await loadFixture(phaseFn);

                    await expect(game.connect(codeBreaker).startAfkCheck(matchId)).to.be.revertedWith("You can't ask for an afk check");
                }
            });

            it("Should not fail if called by the player that is waiting for the opponent to move", async function () {
                for (const phaseFn of Object.values(codeMakerShouldMove)) {
                    const { game, matchId, codeBreaker } = await loadFixture(phaseFn);

                    await expect(game.connect(codeBreaker).startAfkCheck(matchId)).not.to.be.reverted;
                }

                for (const phaseFn of Object.values(codeBreakerShouldMove)) {
                    const { game, matchId, codeMaker } = await loadFixture(phaseFn);

                    await expect(game.connect(codeMaker).startAfkCheck(matchId)).not.to.be.reverted;
                }
            });

            it("Should fail if called by the player that is waiting for the opponent to move more than once consecutively", async function () {
                for (const phaseFn of Object.values(codeMakerShouldMove)) {
                    const { game, matchId, codeBreaker } = await loadFixture(phaseFn);

                    await game.connect(codeBreaker).startAfkCheck(matchId);
                    await expect(game.connect(codeBreaker).startAfkCheck(matchId)).to.be.revertedWith("AFK check already started");
                }

                for (const phaseFn of Object.values(codeBreakerShouldMove)) {
                    const { game, matchId, codeMaker } = await loadFixture(phaseFn);

                    await game.connect(codeMaker).startAfkCheck(matchId);
                    await expect(game.connect(codeMaker).startAfkCheck(matchId)).to.be.revertedWith("AFK check already started");
                }
            });
        });

        describe("Events", function () {
            it("Should emit an event when called by the right player signaling that the timer is started", async function () {
                for (const phaseFn of Object.values(codeMakerShouldMove)) {
                    const { game, matchId, codeBreaker } = await loadFixture(phaseFn);

                    await expect(game.connect(codeBreaker).startAfkCheck(matchId)).to.emit(game, "AfkCheckStarted");
                }

                for (const phaseFn of Object.values(codeBreakerShouldMove)) {
                    const { game, matchId, codeMaker } = await loadFixture(phaseFn);

                    await expect(game.connect(codeMaker).startAfkCheck(matchId)).to.emit(game, "AfkCheckStarted");
                }
            });

            it("Should emit an event when called by the right player signaling that the timer is started with valid parameters", async function () {
                for (const phaseFn of Object.values(codeMakerShouldMove)) {
                    const { game, matchId, codeBreaker } = await loadFixture(phaseFn);

                    const tx = await game.connect(codeBreaker).startAfkCheck(matchId);
                    const eventInterface = new ethers.Interface(["event AfkCheckStarted(address id, address from, uint256 time)"]);
                    const event = await getEvent(tx, eventInterface, "AfkCheckStarted");

                    expect(event.id).to.be.equal(matchId);
                    expect(event.from).to.be.equal(codeBreaker.address);
                    expect(event.time).to.be.equal(180);
                }

                for (const phaseFn of Object.values(codeBreakerShouldMove)) {
                    const { game, matchId, codeMaker } = await loadFixture(phaseFn);

                    const tx = await game.connect(codeMaker).startAfkCheck(matchId);
                    const eventInterface = new ethers.Interface(["event AfkCheckStarted(address id, address from, uint256 time)"]);
                    const event = await getEvent(tx, eventInterface, "AfkCheckStarted");

                    expect(event.id).to.be.equal(matchId);
                    expect(event.from).to.be.equal(codeMaker.address);
                    expect(event.time).to.be.equal(180);
                }
            });
        });
    });

    describe("Stopping the match", function () {
        describe("Validation", function () {
            it("Should fail if an invalid match ID is passed", async function () {
                const { game, codeBreaker } = await loadFixture(phases.untilFirstRoundSolution);
                const invalidMatchId = ethers.ZeroAddress;

                await expect(game.connect(codeBreaker).stopMatchForAfk(invalidMatchId)).to.be.revertedWith("The match specified does not exist");
            });

            it("Should fail if called on a match that is in the wrong phase", async function () {
                const phasesToBeChecked = [
                    phases.untilCreate,
                    phases.untilJoin,
                    phases.untilStakeDecision,
                    phases.untilLastRoundSolution
                ];

                for (const phaseFn of Object.values(phasesToBeChecked)) {
                    const { game, challenger, matchId } = await loadFixture(phaseFn);

                    await expect(game.stopMatchForAfk(matchId)).to.be.revertedWith("Operation not permitted in this phase of the game");
                    await expect(game.connect(challenger).stopMatchForAfk(matchId)).to.be.revertedWith("Operation not permitted in this phase of the game");
                }
            });

            it("Should fail if called by someone which is not part of the match", async function () {
                const { game, matchId, otherPlayer } = await loadFixture(phases.untilFirstRoundSolution);

                await expect(game.connect(otherPlayer).stopMatchForAfk(matchId)).to.be.revertedWith("You are not part of the match specified");
            });

            it("Should fail if called before starting the AFK timer", async function () {
                for (const phaseFn of Object.values(codeMakerShouldMove.concat(codeBreakerShouldMove))) {
                    const { game, matchId } = await loadFixture(phaseFn);

                    await expect(game.stopMatchForAfk(matchId)).to.be.revertedWith("No AFK check was started");
                }
            });

            it("Should fail if called before the AFK timer is expired", async function () {
                for (const phaseFn of Object.values(codeMakerShouldMove)) {
                    const { game, matchId, codeBreaker } = await loadFixture(phaseFn);

                    await game.connect(codeBreaker).startAfkCheck(matchId);
                    await expect(game.stopMatchForAfk(matchId)).to.be.revertedWith("Too early to end the match for AFK");
                }

                for (const phaseFn of Object.values(codeBreakerShouldMove)) {
                    const { game, matchId, codeMaker } = await loadFixture(phaseFn);

                    await game.connect(codeMaker).startAfkCheck(matchId);
                    await expect(game.stopMatchForAfk(matchId)).to.be.revertedWith("Too early to end the match for AFK");
                }
            });

            it("Should fail if called after that the AFK timer is started, but the other player made the move before the timer expired", async function () {
                for (const phaseFn of Object.values(codeMakerShouldMove).concat(codeBreakerShouldMove)) {
                    const { game, matchId, codeMaker, codeBreaker, solution } = await loadFixture(phaseFn);

                    switch (phaseFn) {
                        case phases.untilStakePayment:
                        case phases.untilFirstRoundSolution:
                        case phases.untilSecondRoundSolution:
                        case phases.untilThirdRoundSolution:
                            await game.connect(codeBreaker).startAfkCheck(matchId);

                            // submit solution hash
                            {
                                const solution = newCode(1, 2, 3, 4);
                                const nonce = 7777;
                                const hashedSolution = hashCode(solution, nonce);
                                await game.connect(codeMaker).newSolutionHash(matchId, hashedSolution);
                            }
                            break;

                        case phases.untilFirstRoundCodeHash:
                        case phases.untilFirstRoundFirstFeedback:
                        case phases.untilFirstRoundSecondFeedback:
                        case phases.untilFirstRoundSecondLastFeedback:
                        case phases.untilSecondRoundCodeHash:
                        case phases.untilLastRoundSecondLastFeedback:
                            await game.connect(codeMaker).startAfkCheck(matchId);

                            // submit solution hash
                            {
                                const guess = newCode(1, 2, 3, 4);
                                await game.connect(codeBreaker).newGuess(matchId, guess);
                            }
                            break;

                        case phases.untilFirstRoundFirstGuess:
                        case phases.untilFirstRoundSecondGuess:
                        case phases.untilFirstRoundLastGuess:
                        case phases.untilSecondRoundCorrectGuess:
                        case phases.untilLastRoundLastGuess:
                            await game.connect(codeBreaker).startAfkCheck(matchId);

                            // submit a feedback
                            {
                                const feedback = newFeedback(0, 3);
                                await game.connect(codeMaker).newFeedback(matchId, feedback);
                            }
                            break;

                        case phases.untilFirstRoundLastFeedback:
                        case phases.untilSecondRoundFeedback:
                        case phases.untilLastRoundLastFeedback:
                            await game.connect(codeBreaker).startAfkCheck(matchId);

                            // submit the solution
                            await game.connect(codeMaker).uploadSolution(matchId, solution.code, solution.encodedSalt);
                            break;

                        default:
                            throw Error(phaseFn.name);
                    }

                    await expect(game.stopMatchForAfk(matchId)).to.be.reverted;
                }
            });

            it("Should not fail if called after the AFK timer is expired and the opponent hasn't made any move since then", async function () {
                const AVG_BLOCK_TIME = 12;
                const MAX_AFK_TIME = 180;

                for (const phaseFn of Object.values(codeMakerShouldMove)) {
                    const { game, matchId, codeBreaker } = await loadFixture(phaseFn);

                    await game.connect(codeBreaker).startAfkCheck(matchId);

                    await setAutoMine(false);
                    await mineBlocks(MAX_AFK_TIME / AVG_BLOCK_TIME);
                    await setAutoMine(true);

                    await expect(game.stopMatchForAfk(matchId)).not.to.be.reverted;
                }

                for (const phaseFn of Object.values(codeBreakerShouldMove)) {
                    const { game, matchId, codeMaker } = await loadFixture(phaseFn);

                    await game.connect(codeMaker).startAfkCheck(matchId);

                    await setAutoMine(false);
                    await mineBlocks(MAX_AFK_TIME / AVG_BLOCK_TIME);
                    await setAutoMine(true);

                    await expect(game.stopMatchForAfk(matchId)).not.to.be.reverted;
                }
            });

            it("Should not fail if called after the AFK timer is expired and the opponent hasn't made any move since then", async function () {
                const AVG_BLOCK_TIME = 12;
                const MAX_AFK_TIME = 180;

                for (const phaseFn of Object.values(codeMakerShouldMove)) {
                    const { game, matchId, codeBreaker } = await loadFixture(phaseFn);

                    await game.connect(codeBreaker).startAfkCheck(matchId);

                    await setAutoMine(false);
                    await mineBlocks(MAX_AFK_TIME / AVG_BLOCK_TIME);
                    await setAutoMine(true);

                    await game.stopMatchForAfk(matchId);

                    // in this case if the error is that the match specified 
                    // doesn't exist it means that the match has been deleted
                    await expect(game.stopMatchForAfk(matchId)).to.be.revertedWith("The match specified does not exist");
                }

                for (const phaseFn of Object.values(codeBreakerShouldMove)) {
                    const { game, matchId, codeMaker } = await loadFixture(phaseFn);

                    await game.connect(codeMaker).startAfkCheck(matchId);

                    await setAutoMine(false);
                    await mineBlocks(MAX_AFK_TIME / AVG_BLOCK_TIME);
                    await setAutoMine(true);

                    await game.stopMatchForAfk(matchId);

                    // in this case if the error is that the match specified 
                    // doesn't exist it means that the match has been deleted
                    await expect(game.stopMatchForAfk(matchId)).to.be.revertedWith("The match specified does not exist");
                }
            });
        });

        describe("Events", function () {
            it("Should emit an event when called correctly signaling that the match is ended", async function () {
                const AVG_BLOCK_TIME = 12;
                const MAX_AFK_TIME = 180;

                for (const phaseFn of Object.values(codeMakerShouldMove)) {
                    const { game, matchId, codeBreaker } = await loadFixture(phaseFn);

                    await game.connect(codeBreaker).startAfkCheck(matchId);

                    await setAutoMine(false);
                    await mineBlocks(MAX_AFK_TIME / AVG_BLOCK_TIME);
                    await setAutoMine(true);

                    await expect(game.stopMatchForAfk(matchId)).to.emit(game, "MatchEnded");
                }

                for (const phaseFn of Object.values(codeBreakerShouldMove)) {
                    const { game, matchId, codeMaker } = await loadFixture(phaseFn);

                    await game.connect(codeMaker).startAfkCheck(matchId);

                    await setAutoMine(false);
                    await mineBlocks(MAX_AFK_TIME / AVG_BLOCK_TIME);
                    await setAutoMine(true);

                    await expect(game.stopMatchForAfk(matchId)).to.emit(game, "MatchEnded");
                }
            });

            it("Should emit an event when called correctly signaling that the match is ended with valid parameters", async function () {
                const AVG_BLOCK_TIME = 12;
                const MAX_AFK_TIME = 180;

                for (const phaseFn of Object.values(codeMakerShouldMove)) {
                    const { game, matchId, codeBreaker } = await loadFixture(phaseFn);

                    await game.connect(codeBreaker).startAfkCheck(matchId);

                    await setAutoMine(false);
                    await mineBlocks(MAX_AFK_TIME / AVG_BLOCK_TIME);
                    await setAutoMine(true);

                    const tx = await game.stopMatchForAfk(matchId);
                    const eventInterface = new ethers.Interface(["event MatchEnded(address id)"]);
                    const event = await getEvent(tx, eventInterface, "MatchEnded", 1);

                    expect(event.id).to.be.equal(matchId);
                }

                for (const phaseFn of Object.values(codeBreakerShouldMove)) {
                    const { game, matchId, codeMaker } = await loadFixture(phaseFn);

                    await game.connect(codeMaker).startAfkCheck(matchId);

                    await setAutoMine(false);
                    await mineBlocks(MAX_AFK_TIME / AVG_BLOCK_TIME);
                    await setAutoMine(true);

                    const tx = await game.stopMatchForAfk(matchId);
                    const eventInterface = new ethers.Interface(["event MatchEnded(address id)"]);
                    const event = await getEvent(tx, eventInterface, "MatchEnded", 1);

                    expect(event.id).to.be.equal(matchId);
                }
            });

            it("Should emit an event when called correctly signaling that the player being AFK has been punished", async function () {
                const AVG_BLOCK_TIME = 12;
                const MAX_AFK_TIME = 180;

                for (const phaseFn of Object.values(codeMakerShouldMove)) {
                    const { game, matchId, codeBreaker } = await loadFixture(phaseFn);

                    await game.connect(codeBreaker).startAfkCheck(matchId);

                    await setAutoMine(false);
                    await mineBlocks(MAX_AFK_TIME / AVG_BLOCK_TIME);
                    await setAutoMine(true);

                    await expect(game.stopMatchForAfk(matchId)).to.emit(game, "PlayerPunished");
                }

                for (const phaseFn of Object.values(codeBreakerShouldMove)) {
                    const { game, matchId, codeMaker } = await loadFixture(phaseFn);

                    await game.connect(codeMaker).startAfkCheck(matchId);

                    await setAutoMine(false);
                    await mineBlocks(MAX_AFK_TIME / AVG_BLOCK_TIME);
                    await setAutoMine(true);

                    await expect(game.stopMatchForAfk(matchId)).to.emit(game, "PlayerPunished");
                }
            });

            it("Should emit an event when called correctly signaling that the player being AFK has been punished with valid parameters", async function () {
                const AVG_BLOCK_TIME = 12;
                const MAX_AFK_TIME = 180;

                for (const phaseFn of Object.values(codeMakerShouldMove)) {
                    const { game, matchId, codeMaker, codeBreaker } = await loadFixture(phaseFn);

                    await game.connect(codeBreaker).startAfkCheck(matchId);

                    await setAutoMine(false);
                    await mineBlocks(MAX_AFK_TIME / AVG_BLOCK_TIME);
                    await setAutoMine(true);

                    const tx = await game.stopMatchForAfk(matchId);
                    const eventInterface = new ethers.Interface(["event PlayerPunished(address id, address player, string reason)"]);
                    const event = await getEvent(tx, eventInterface, "PlayerPunished");

                    expect(event.id).to.be.equal(matchId);
                    expect(event.player).to.be.equal(codeMaker.address);
                    expect(event.reason).to.be.equal("Player is AFK");
                }

                for (const phaseFn of Object.values(codeBreakerShouldMove)) {
                    const { game, matchId, codeMaker, codeBreaker } = await loadFixture(phaseFn);

                    await game.connect(codeMaker).startAfkCheck(matchId);

                    await setAutoMine(false);
                    await mineBlocks(MAX_AFK_TIME / AVG_BLOCK_TIME);
                    await setAutoMine(true);

                    const tx = await game.stopMatchForAfk(matchId);
                    const eventInterface = new ethers.Interface(["event PlayerPunished(address id, address player, string reason)"]);
                    const event = await getEvent(tx, eventInterface, "PlayerPunished");

                    expect(event.id).to.be.equal(matchId);
                    expect(event.player).to.be.equal(codeBreaker.address);
                    expect(event.reason).to.be.equal("Player is AFK");
                }
            });
        });

        describe("Transactions", function () {
            it("Should transfer all the stake amount to the player that started the AFK check if called correctly", async function () {
                const AVG_BLOCK_TIME = 12;
                const MAX_AFK_TIME = 180;

                for (const phaseFn of Object.values(codeMakerShouldMove)) {
                    const { game, matchId, codeBreaker, finalStake } = await loadFixture(phaseFn);

                    await game.connect(codeBreaker).startAfkCheck(matchId);

                    await setAutoMine(false);
                    await mineBlocks(MAX_AFK_TIME / AVG_BLOCK_TIME);
                    await setAutoMine(true);

                    const totalStakeAmount = finalStake * 2;
                    await expect(game.stopMatchForAfk(matchId)).to.changeEtherBalances(
                        [codeBreaker, game],
                        [totalStakeAmount, -totalStakeAmount]
                    );
                }

                for (const phaseFn of Object.values(codeBreakerShouldMove)) {
                    const { game, matchId, codeMaker, finalStake } = await loadFixture(phaseFn);

                    await game.connect(codeMaker).startAfkCheck(matchId);

                    await setAutoMine(false);
                    await mineBlocks(MAX_AFK_TIME / AVG_BLOCK_TIME);
                    await setAutoMine(true);

                    const totalStakeAmount = finalStake * 2;
                    await expect(game.stopMatchForAfk(matchId)).to.changeEtherBalances(
                        [codeMaker, game],
                        [totalStakeAmount, -totalStakeAmount]
                    );
                }
            });
        });
    });
})