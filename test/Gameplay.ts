import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { getEvent, newCode, hashCode, newFeedback, prepareSalt } from "./utils/utils";
import { phases } from "./utils/phases";

describe("Gameplay", function () {
    describe("Solution hash submission", function () {
        describe("Validation", function () {
            it("Should fail if an invalid match ID is passed", async function () {
                const { game, codeMaker } = await loadFixture(phases.untilStakePayment);
                const invalidMatchId = ethers.ZeroAddress;
                const solution = newCode(1, 2, 3, 4);
                const nonce = 7777;
                const hashedSolution = hashCode(solution, nonce);

                await expect(game.connect(codeMaker).newSolutionHash(invalidMatchId, hashedSolution)).to.be.revertedWith("The match specified does not exist");
            });

            it("Should fail if called on a match that is in the wrong phase", async function () {
                const solution = newCode(1, 2, 3, 4);
                const nonce = 7777;
                const hashedSolution = hashCode(solution, nonce);

                for (const phaseFn of Object.values(phases)) {
                    if (phaseFn == phases.untilStakePayment
                        || phaseFn == phases.untilFirstRoundSolution
                        || phaseFn == phases.untilSecondRoundSolution
                        || phaseFn == phases.untilThirdRoundSolution) {
                        return;
                    }

                    const { game, challenger, matchId } = await loadFixture(phaseFn);

                    await expect(game.newSolutionHash(matchId, hashedSolution)).to.be.revertedWith("Operation not permitted in this phase of the game");
                    await expect(game.connect(challenger).newSolutionHash(matchId, hashedSolution)).to.be.revertedWith("Operation not permitted in this phase of the game");
                }
            });

            it("Should fail if called by someone which is not part of the match", async function () {
                const { game, matchId, otherPlayer } = await loadFixture(phases.untilStakePayment);
                const solution = newCode(1, 2, 3, 4);
                const nonce = 7777;
                const hashedSolution = hashCode(solution, nonce);

                await expect(game.connect(otherPlayer).newSolutionHash(matchId, hashedSolution)).to.be.revertedWith("The caller is not the CodeMaker");
            });

            it("Should fail if called from the CodeBreaker", async function () {
                const { game, matchId, codeBreaker } = await loadFixture(phases.untilStakePayment);
                const solution = newCode(1, 2, 3, 4);
                const nonce = 7777;
                const hashedSolution = hashCode(solution, nonce);

                await expect(game.connect(codeBreaker).newSolutionHash(matchId, hashedSolution)).to.be.revertedWith("The caller is not the CodeMaker");
            });

            it("Should fail if called more than once consecutively by the CodeMaker", async function () {
                const { game, matchId, codeMaker } = await loadFixture(phases.untilStakePayment);
                const solution = newCode(1, 2, 3, 4);
                const nonce = 7777;
                const hashedSolution = hashCode(solution, nonce);

                await game.connect(codeMaker).newSolutionHash(matchId, hashedSolution);
                await expect(game.connect(codeMaker).newSolutionHash(matchId, hashedSolution)).to.be.revertedWith("Operation not permitted in this phase of the game");
            });

            it("Should not fail if called from the CodeMaker once at the beginning of the game", async function () {
                const { game, matchId, codeMaker } = await loadFixture(phases.untilStakePayment);
                const solution = newCode(1, 2, 3, 4);
                const nonce = 7777;
                const hashedSolution = hashCode(solution, nonce);

                await expect(game.connect(codeMaker).newSolutionHash(matchId, hashedSolution)).not.to.be.reverted;
            });

            it("Should not fail if called from the CodeMaker once at the beginning of a new round in the middle of the game", async function () {
                const { game, matchId, codeMaker } = await loadFixture(phases.untilFirstRoundSolution);
                const solution = newCode(1, 2, 3, 4);
                const nonce = 7777;
                const hashedSolution = hashCode(solution, nonce);

                await expect(game.connect(codeMaker).newSolutionHash(matchId, hashedSolution)).not.to.be.reverted;
            });
        });

        describe("Events", function () {
            it("Should emit an event when called by the CodeMaker", async function () {
                const { game, matchId, codeMaker } = await loadFixture(phases.untilStakePayment);
                const solution = newCode(1, 2, 3, 4);
                const nonce = 7777;
                const hashedSolution = hashCode(solution, nonce);

                await expect(game.connect(codeMaker).newSolutionHash(matchId, hashedSolution)).to.emit(game, "SolutionHashSubmitted");
            });

            it("Should emit an event when called by the CodeMaker with valid parameters", async function () {
                const { game, matchId, codeMaker } = await loadFixture(phases.untilStakePayment);
                const solution = newCode(1, 2, 3, 4);
                const nonce = 7777;
                const hashedSolution = hashCode(solution, nonce);

                const tx = await game.connect(codeMaker).newSolutionHash(matchId, hashedSolution);
                const eventInterface = new ethers.Interface(["event SolutionHashSubmitted(address id, address from)"]);
                const event = await getEvent(tx, eventInterface, "SolutionHashSubmitted");

                expect(event.id).to.be.equal(matchId);
                expect(event.from).to.be.equal(codeMaker.address);
            });
        });
    });

    describe("Guess submission", function () {
        describe("Validation", function () {
            it("Should fail if an invalid match ID is passed", async function () {
                const { game, codeBreaker } = await loadFixture(phases.untilFirstRoundCodeHash);
                const invalidMatchId = ethers.ZeroAddress;
                const guess = newCode(1, 2, 3, 4);

                await expect(game.connect(codeBreaker).newGuess(invalidMatchId, guess)).to.be.revertedWith("The match specified does not exist");
            });

            it("Should fail if called on a match that is in the wrong phase", async function () {
                const guess = newCode(1, 2, 3, 4);

                for (const phaseFn of Object.values(phases)) {
                    if (phaseFn == phases.untilFirstRoundCodeHash
                        || phaseFn == phases.untilFirstRoundFirstFeedback
                        || phaseFn == phases.untilFirstRoundSecondFeedback
                        || phaseFn == phases.untilSecondRoundCodeHash
                        || phaseFn == phases.untilLastRoundSecondLastFeedback
                        || phaseFn == phases.untilFirstRoundSecondLastFeedback) {
                        return;
                    }

                    const { game, challenger, matchId } = await loadFixture(phaseFn);

                    await expect(game.newGuess(matchId, guess)).to.be.revertedWith("Operation not permitted in this phase of the game");
                    await expect(game.connect(challenger).newGuess(matchId, guess)).to.be.revertedWith("Operation not permitted in this phase of the game");
                }
            });

            it("Should fail if called by someone which is not part of the match", async function () {
                const { game, matchId, otherPlayer } = await loadFixture(phases.untilFirstRoundCodeHash);
                const guess = newCode(1, 2, 3, 4);

                await expect(game.connect(otherPlayer).newGuess(matchId, guess)).to.be.revertedWith("The caller is not the CodeBreaker");
            });

            it("Should fail if called from the CodeMaker", async function () {
                const { game, matchId, codeMaker } = await loadFixture(phases.untilFirstRoundCodeHash);
                const guess = newCode(1, 2, 3, 4);

                await expect(game.connect(codeMaker).newGuess(matchId, guess)).to.be.revertedWith("The caller is not the CodeBreaker");
            });

            it("Should fail if called more than once consecutively by the CodeBreaker", async function () {
                const { game, matchId, codeBreaker } = await loadFixture(phases.untilFirstRoundCodeHash);
                const guess = newCode(1, 2, 3, 4);

                await game.connect(codeBreaker).newGuess(matchId, guess);
                await expect(game.connect(codeBreaker).newGuess(matchId, guess)).to.be.revertedWith("Operation not permitted in this phase of the game");
            });

            it("Should fail if called with an invalid code format", async function () {
                const { game, matchId, codeBreaker } = await loadFixture(phases.untilFirstRoundCodeHash);
                const guess = newCode(7, 7, 7, 7);

                await expect(game.connect(codeBreaker).newGuess(matchId, guess)).to.be.revertedWith("Invalid guess format");
            });

            it("Should fail if called after the submission of a feedback regarding a correct guess", async function () {
                const { game, matchId, codeBreaker } = await loadFixture(phases.untilSecondRoundFeedback);
                const guess = newCode(1, 2, 3, 4);

                await expect(game.connect(codeBreaker).newGuess(matchId, guess)).to.be.revertedWith("Operation not permitted in this phase of the game");
            });

            it("Should fail if called after the maximum number of guesses is reached", async function () {
                const { game, matchId, codeBreaker } = await loadFixture(phases.untilFirstRoundLastFeedback);
                const guess = newCode(1, 2, 3, 4);

                await expect(game.connect(codeBreaker).newGuess(matchId, guess)).to.be.revertedWith("Operation not permitted in this phase of the game");
            });

            it("Should not fail if called from the CodeBreaker after the submission of the hashed solution", async function () {
                const { game, matchId, codeBreaker } = await loadFixture(phases.untilFirstRoundCodeHash);
                const guess = newCode(1, 2, 3, 4);

                await expect(game.connect(codeBreaker).newGuess(matchId, guess)).not.to.be.reverted;
            });

            it("Should not fail if called from the CodeBreaker after the submission of a feedback regarding a wrong guess", async function () {
                const { game, matchId, codeBreaker } = await loadFixture(phases.untilFirstRoundFirstFeedback);
                const guess = newCode(1, 2, 3, 4);

                await expect(game.connect(codeBreaker).newGuess(matchId, guess)).not.to.be.reverted;
            });
        });

        describe("Events", function () {
            it("Should emit an event when called by the CodeBreaker", async function () {
                const { game, matchId, codeBreaker } = await loadFixture(phases.untilFirstRoundCodeHash);
                const guess = newCode(1, 2, 3, 4);

                await expect(game.connect(codeBreaker).newGuess(matchId, guess)).to.emit(game, "GuessSubmitted");
            });

            it("Should emit an event when called by the CodeBreaker with valid parameters", async function () {
                const { game, matchId, codeBreaker } = await loadFixture(phases.untilFirstRoundCodeHash);
                const guess = newCode(1, 2, 3, 4);

                const tx = await game.connect(codeBreaker).newGuess(matchId, guess);
                const eventInterface = new ethers.Interface(["event GuessSubmitted(address id, address from, uint16 guess)"]);
                const event = await getEvent(tx, eventInterface, "GuessSubmitted");

                expect(event.id).to.be.equal(matchId);
                expect(event.from).to.be.equal(codeBreaker.address);
                expect(event.guess).to.be.equal(guess);
            });
        });
    });

    describe("Feedback submission", function () {
        describe("Validation", function () {
            it("Should fail if an invalid match ID is passed", async function () {
                const { game, codeMaker } = await loadFixture(phases.untilFirstRoundFirstGuess);
                const invalidMatchId = ethers.ZeroAddress;
                const feedback = newFeedback(0, 3);

                await expect(game.connect(codeMaker).newFeedback(invalidMatchId, feedback)).to.be.revertedWith("The match specified does not exist");
            });

            it("Should fail if called on a match that is in the wrong phase", async function () {
                const feedback = newFeedback(0, 3);

                for (const phaseFn of Object.values(phases)) {
                    if (phaseFn == phases.untilFirstRoundFirstGuess
                        || phaseFn == phases.untilFirstRoundSecondGuess
                        || phaseFn == phases.untilFirstRoundLastGuess
                        || phaseFn == phases.untilSecondRoundCorrectGuess
                        || phaseFn == phases.untilLastRoundLastGuess) {
                        return;
                    }

                    const { game, challenger, matchId } = await loadFixture(phaseFn);

                    await expect(game.newFeedback(matchId, feedback)).to.be.revertedWith("Operation not permitted in this phase of the game");
                    await expect(game.connect(challenger).newFeedback(matchId, feedback)).to.be.revertedWith("Operation not permitted in this phase of the game");
                }
            });

            it("Should fail if called by someone which is not part of the match", async function () {
                const { game, matchId, otherPlayer } = await loadFixture(phases.untilFirstRoundFirstGuess);
                const feedback = newFeedback(0, 3);

                await expect(game.connect(otherPlayer).newFeedback(matchId, feedback)).to.be.revertedWith("The caller is not the CodeMaker");
            });

            it("Should fail if called from the CodeBreaker", async function () {
                const { game, matchId, codeBreaker } = await loadFixture(phases.untilFirstRoundFirstGuess);
                const feedback = newFeedback(0, 3);

                await expect(game.connect(codeBreaker).newFeedback(matchId, feedback)).to.be.revertedWith("The caller is not the CodeMaker");
            });

            it("Should fail if called more than once consecutively by the CodeMaker", async function () {
                const { game, matchId, codeMaker } = await loadFixture(phases.untilFirstRoundFirstGuess);
                const feedback = newFeedback(0, 3);

                await game.connect(codeMaker).newFeedback(matchId, feedback);
                await expect(game.connect(codeMaker).newFeedback(matchId, feedback)).to.be.revertedWith("Operation not permitted in this phase of the game");
            });

            it("Should fail if called with an invalid code format", async function () {
                const { game, matchId, codeMaker } = await loadFixture(phases.untilFirstRoundFirstGuess);
                const feedback = newFeedback(5, 5);

                await expect(game.connect(codeMaker).newFeedback(matchId, feedback)).to.be.revertedWith("Invalid feedback format");
            });

            it("Should not fail if called from the CodeMaker after the submission of a guess", async function () {
                const { game, matchId, codeMaker } = await loadFixture(phases.untilFirstRoundFirstGuess);
                const feedback = newFeedback(0, 3);

                await expect(game.connect(codeMaker).newFeedback(matchId, feedback)).not.to.be.reverted;
            });
        });

        describe("Events", function () {
            it("Should emit an event when called by the CodeMaker", async function () {
                const { game, matchId, codeMaker } = await loadFixture(phases.untilFirstRoundFirstGuess);
                const feedback = newFeedback(0, 3);

                await expect(game.connect(codeMaker).newFeedback(matchId, feedback)).to.emit(game, "FeedbackSubmitted");
            });

            it("Should emit an event when called by the CodeMaker with valid parameters", async function () {
                const { game, matchId, codeMaker } = await loadFixture(phases.untilFirstRoundFirstGuess);
                const feedback = newFeedback(0, 3);

                const tx = await game.connect(codeMaker).newFeedback(matchId, feedback);
                const eventInterface = new ethers.Interface(["event FeedbackSubmitted(address id, address from, uint8 feedback)"]);
                const event = await getEvent(tx, eventInterface, "FeedbackSubmitted");

                expect(event.id).to.be.equal(matchId);
                expect(event.from).to.be.equal(codeMaker.address);
                expect(event.feedback).to.be.equal(feedback);
            });

            it("Should emit an event when called by the CodeMaker if the maximum number of guesses is reached", async function () {
                const { game, matchId, codeMaker } = await loadFixture(phases.untilFirstRoundLastGuess);
                const feedback = newFeedback(0, 3);

                await expect(game.connect(codeMaker).newFeedback(matchId, feedback)).to.emit(game, "RoundEnded");
            });

            it("Should emit an event when called by the CodeMaker if the maximum number of guesses is reached with valid parameters", async function () {
                const { game, matchId, codeMaker } = await loadFixture(phases.untilFirstRoundLastGuess);
                const feedback = newFeedback(0, 3);

                const tx = await game.connect(codeMaker).newFeedback(matchId, feedback);
                const eventInterface = new ethers.Interface(["event RoundEnded(address id, uint round)"]);
                const event = await getEvent(tx, eventInterface, "RoundEnded", 1);

                expect(event.id).to.be.equal(matchId);
                expect(event.round).to.be.equal(1);
            });

            it("Should emit an event when called by the CodeMaker if the feedback regards a correct guess", async function () {
                const { game, matchId, codeMaker } = await loadFixture(phases.untilSecondRoundCorrectGuess);
                const feedback = newFeedback(4, 0);

                await expect(game.connect(codeMaker).newFeedback(matchId, feedback)).to.emit(game, "RoundEnded");
            });

            it("Should emit an event when called by the CodeMaker if the feedback regards a correct guess with valid parameters", async function () {
                const { game, matchId, codeMaker } = await loadFixture(phases.untilSecondRoundCorrectGuess);
                const feedback = newFeedback(4, 0);

                const tx = await game.connect(codeMaker).newFeedback(matchId, feedback);
                const eventInterface = new ethers.Interface(["event RoundEnded(address id, uint round)"]);
                const event = await getEvent(tx, eventInterface, "RoundEnded", 1);

                expect(event.id).to.be.equal(matchId);
                expect(event.round).to.be.equal(2);
            });
        });
    });

    describe("Solution submission", function () {
        describe("Validation", function () {
            it("Should fail if an invalid match ID is passed", async function () {
                const { game, codeMaker, solution } = await loadFixture(phases.untilFirstRoundLastFeedback);
                const invalidMatchId = ethers.ZeroAddress;

                await expect(game.connect(codeMaker).uploadSolution(invalidMatchId, solution.code, solution.encodedSalt)).to.be.revertedWith("The match specified does not exist");
            });

            it("Should fail if called on a match that is in the wrong phase", async function () {
                const solution = newCode(0, 1, 2, 3);
                const salt = prepareSalt(1234);

                for (const phaseFn of Object.values(phases)) {
                    if (phaseFn == phases.untilFirstRoundLastFeedback
                        || phaseFn == phases.untilSecondRoundFeedback
                        || phaseFn == phases.untilLastRoundLastFeedback) {
                        return;
                    }

                    const { game, challenger, matchId } = await loadFixture(phaseFn);

                    await expect(game.uploadSolution(matchId, solution, salt)).to.be.revertedWith("Operation not permitted in this phase of the game");
                    await expect(game.connect(challenger).uploadSolution(matchId, solution, salt)).to.be.revertedWith("Operation not permitted in this phase of the game");
                }
            });

            it("Should fail if called by someone which is not part of the match", async function () {
                const { game, matchId, otherPlayer, solution } = await loadFixture(phases.untilFirstRoundLastFeedback);

                await expect(game.connect(otherPlayer).uploadSolution(matchId, solution.code, solution.encodedSalt)).to.be.revertedWith("The caller is not the CodeMaker");
            });

            it("Should fail if called from the CodeBreaker", async function () {
                const { game, matchId, codeBreaker, solution } = await loadFixture(phases.untilFirstRoundLastFeedback);

                await expect(game.connect(codeBreaker).uploadSolution(matchId, solution.code, solution.encodedSalt)).to.be.revertedWith("The caller is not the CodeMaker");
            });

            it("Should fail if called more than once consecutively by the CodeMaker", async function () {
                const { game, matchId, codeMaker, solution } = await loadFixture(phases.untilFirstRoundLastFeedback);

                await game.connect(codeMaker).uploadSolution(matchId, solution.code, solution.encodedSalt);
                await expect(game.connect(codeMaker).uploadSolution(matchId, solution.code, solution.encodedSalt)).to.be.revertedWith("Operation not permitted in this phase of the game");
            });

            it("Should fail if called with an invalid code format", async function () {
                const { game, matchId, codeMaker } = await loadFixture(phases.untilFirstRoundLastFeedback);
                const solution = newCode(7, 1, 2, 3);
                const salt = prepareSalt(1234);

                await expect(game.connect(codeMaker).uploadSolution(matchId, solution, salt)).to.be.revertedWith("Invalid solution format");
            });

            it("Should terminate the match if called with a solution different from the one submitted initially", async function () {
                const { game, matchId, codeMaker, solution } = await loadFixture(phases.untilFirstRoundLastFeedback);
                const code = newCode(0, 0, 0, 0);

                await game.connect(codeMaker).uploadSolution(matchId, code, solution.encodedSalt);

                // in this case if the error is that the match specified 
                // doesn't exist it means that the match has been deleted
                await expect(game.connect(codeMaker).uploadSolution(matchId, code, solution.encodedSalt)).to.be.revertedWith("The match specified does not exist");
            });

            it("Should terminate the match if called with a salt different from the one used initially", async function () {
                const { game, matchId, codeMaker, solution } = await loadFixture(phases.untilFirstRoundLastFeedback);
                const salt = prepareSalt(9999999);

                await game.connect(codeMaker).uploadSolution(matchId, solution.code, salt);

                // in this case if the error is that the match specified 
                // doesn't exist it means that the match has been deleted
                await expect(game.connect(codeMaker).uploadSolution(matchId, solution.code, salt)).to.be.revertedWith("The match specified does not exist");
            });

            it("Should terminate the game if called in last round", async function () {
                const { game, matchId, codeMaker, codeBreaker, solution } = await loadFixture(phases.untilLastRoundLastFeedback);

                await game.connect(codeMaker).uploadSolution(matchId, solution.code, solution.encodedSalt);

                // in this case if the error is that the operation is not 
                // permitted it means that the game is ended
                await expect(game.connect(codeBreaker).newSolutionHash(matchId, solution.codeHash)).to.be.revertedWith("Operation not permitted in this phase of the game");
            });

            it("Should not terminate the game if not called in the last round", async function () {
                const { game, matchId, codeMaker, codeBreaker, solution } = await loadFixture(phases.untilFirstRoundLastFeedback);

                await game.connect(codeMaker).uploadSolution(matchId, solution.code, solution.encodedSalt);

                await expect(game.connect(codeBreaker).newSolutionHash(matchId, solution.codeHash)).not.to.be.reverted;
            });
        });

        describe("Events", function () {
            it("Should emit an event when called by the CodeMaker signaling the successful submission of the solution", async function () {
                const { game, matchId, codeMaker, solution } = await loadFixture(phases.untilFirstRoundLastFeedback);

                await expect(game.connect(codeMaker).uploadSolution(matchId, solution.code, solution.encodedSalt)).to.emit(game, "SolutionSubmitted");
            });

            it("Should emit an event when called by the CodeMaker signaling the successful submission of the solution with valid parameters", async function () {
                const { game, matchId, codeMaker, solution } = await loadFixture(phases.untilFirstRoundLastFeedback);

                const tx = await game.connect(codeMaker).uploadSolution(matchId, solution.code, solution.encodedSalt);
                const eventInterface = new ethers.Interface(["event SolutionSubmitted(address id, address from, uint16 solution)"]);
                const event = await getEvent(tx, eventInterface, "SolutionSubmitted");

                expect(event.id).to.be.equal(matchId);
                expect(event.from).to.be.equal(codeMaker.address);
                expect(event.solution).to.be.equal(solution.code);
            });

            it("Should emit an event when called by the CodeMaker signaling the new updated scores", async function () {
                const { game, matchId, codeMaker, solution } = await loadFixture(phases.untilFirstRoundLastFeedback);

                await expect(game.connect(codeMaker).uploadSolution(matchId, solution.code, solution.encodedSalt)).to.emit(game, "ScoresUpdated");
            });

            it("Should emit an event when called by the CodeMaker signaling the new updated scores with valid parameters if no guess was correct", async function () {
                const N_ROUNDS = 12;
                const EXTRA_POINTS = 6;

                const { game, matchId, codeMaker, challenger, solution } = await loadFixture(phases.untilFirstRoundLastFeedback);

                const tx = await game.connect(codeMaker).uploadSolution(matchId, solution.code, solution.encodedSalt);
                const eventInterface = new ethers.Interface(["event ScoresUpdated(address id, uint creatorScore, uint challengerScore)"]);
                const event = await getEvent(tx, eventInterface, "ScoresUpdated", 1);

                const challengerWonFullPoints = event.challengerScore === N_ROUNDS + EXTRA_POINTS;
                const creatorWonFullPoints = event.creatorScore === N_ROUNDS + EXTRA_POINTS;

                const challengerWonNoPoints = event.challengerScore === 0;
                const creatorWonNoPoints = event.creatorScore === 0;

                expect(event.id).to.be.equal(matchId);
                expect(challengerWonFullPoints || creatorWonFullPoints).to.be.true;
                expect(challengerWonFullPoints && creatorWonFullPoints).to.be.false;
                expect(challengerWonNoPoints || creatorWonNoPoints).to.be.true;
                expect(challengerWonNoPoints && creatorWonNoPoints).to.be.false;
                if (challenger.address === codeMaker.address) {
                    expect(challengerWonFullPoints && creatorWonNoPoints).to.be.true;
                } else {
                    expect(creatorWonFullPoints && challengerWonNoPoints).to.be.true;
                }
            });

            it("Should emit an event when called by the CodeMaker signaling the new updated scores with valid parameters if the last guess of the round was correct", async function () {
                const N_ROUNDS = 12;

                const { game, matchId, codeMaker, codeBreaker, challenger, solution } = await loadFixture(phases.untilFirstRoundSecondLastFeedback);

                await game.connect(codeBreaker).newGuess(matchId, solution.code);
                await game.connect(codeMaker).newFeedback(matchId, newFeedback(4, 0));

                const tx = await game.connect(codeMaker).uploadSolution(matchId, solution.code, solution.encodedSalt);
                const eventInterface = new ethers.Interface(["event ScoresUpdated(address id, uint creatorScore, uint challengerScore)"]);
                const event = await getEvent(tx, eventInterface, "ScoresUpdated", 1);

                const challengerWonFullPoints = event.challengerScore === N_ROUNDS;
                const creatorWonFullPoints = event.creatorScore === N_ROUNDS;

                const challengerWonNoPoints = event.challengerScore === 0;
                const creatorWonNoPoints = event.creatorScore === 0;

                expect(event.id).to.be.equal(matchId);
                expect(challengerWonFullPoints || creatorWonFullPoints).to.be.true;
                expect(challengerWonFullPoints && creatorWonFullPoints).to.be.false;
                expect(challengerWonNoPoints || creatorWonNoPoints).to.be.true;
                expect(challengerWonNoPoints && creatorWonNoPoints).to.be.false;
                if (challenger.address === codeMaker.address) {
                    expect(challengerWonFullPoints && creatorWonNoPoints).to.be.true;
                } else {
                    expect(creatorWonFullPoints && challengerWonNoPoints).to.be.true;
                }
            });

            it("Should emit an event when called by the CodeMaker signaling the new updated scores with valid parameters if one guess in the middle of the round was correct", async function () {
                const { game, matchId, codeMaker, codeBreaker, challenger, solution, guesses } = await loadFixture(phases.untilFirstRoundFirstFeedback);

                await game.connect(codeBreaker).newGuess(matchId, solution.code);
                await game.connect(codeMaker).newFeedback(matchId, newFeedback(4, 0));

                const tx = await game.connect(codeMaker).uploadSolution(matchId, solution.code, solution.encodedSalt);
                const eventInterface = new ethers.Interface(["event ScoresUpdated(address id, uint creatorScore, uint challengerScore)"]);
                const event = await getEvent(tx, eventInterface, "ScoresUpdated", 1);

                const challengerWonFullPoints = event.challengerScore === guesses.length;
                const creatorWonFullPoints = event.creatorScore === guesses.length;

                const challengerWonNoPoints = event.challengerScore === 0;
                const creatorWonNoPoints = event.creatorScore === 0;

                expect(event.id).to.be.equal(matchId);
                expect(challengerWonFullPoints || creatorWonFullPoints).to.be.true;
                expect(challengerWonFullPoints && creatorWonFullPoints).to.be.false;
                expect(challengerWonNoPoints || creatorWonNoPoints).to.be.true;
                expect(challengerWonNoPoints && creatorWonNoPoints).to.be.false;
                if (challenger.address === codeMaker.address) {
                    expect(challengerWonFullPoints && creatorWonNoPoints).to.be.true;
                } else {
                    expect(creatorWonFullPoints && challengerWonNoPoints).to.be.true;
                }
            });

            it("Should emit an event when called by the CodeMaker if called in the last round signaling the end of the game", async function () {
                const { game, matchId, codeMaker, solution } = await loadFixture(phases.untilLastRoundLastFeedback);

                await expect(game.connect(codeMaker).uploadSolution(matchId, solution.code, solution.encodedSalt)).to.emit(game, "GameEnded");
            });

            it("Should emit an event when called by the CodeMaker if called in the last round signaling the end of the game with valid parameters", async function () {
                const { game, matchId, codeMaker, solution } = await loadFixture(phases.untilLastRoundLastFeedback);

                const tx = await game.connect(codeMaker).uploadSolution(matchId, solution.code, solution.encodedSalt);
                const eventInterface = new ethers.Interface(["event GameEnded(address id)"]);
                const event = await getEvent(tx, eventInterface, "GameEnded", 2);

                expect(event.id).to.be.equal(matchId);
            });

            it("Should emit an event when called by the CodeMaker if called not in the last round signaling the beginning of a new round", async function () {
                const { game, matchId, codeMaker, solution } = await loadFixture(phases.untilFirstRoundLastFeedback);

                await expect(game.connect(codeMaker).uploadSolution(matchId, solution.code, solution.encodedSalt)).to.emit(game, "RoundStarted");
            });

            it("Should emit an event when called by the CodeMaker if called not in the last round signaling the beginning of a new round with valid parameters", async function () {
                const { game, matchId, codeMaker, codeBreaker, solution } = await loadFixture(phases.untilFirstRoundLastFeedback);

                const tx = await game.connect(codeMaker).uploadSolution(matchId, solution.code, solution.encodedSalt);
                const eventInterface = new ethers.Interface(["event RoundStarted(address id, uint round, address codemaker, address codebreaker)"]);
                const event = await getEvent(tx, eventInterface, "RoundStarted", 2);

                expect(event.id).to.be.equal(matchId);
                expect(event.round).to.be.equal(2);
                expect(event.codebreaker).to.be.equal(codeMaker.address);
                expect(event.codemaker).to.be.equal(codeBreaker.address);
            });

            it("Should emit an event when called by the CodeMaker if called with a solution different from the one submitted initially signaling that the CodeMaker has been punished", async function () {
                const { game, matchId, codeMaker, solution } = await loadFixture(phases.untilFirstRoundLastFeedback);
                const code = newCode(0, 0, 0, 0);

                await expect(game.connect(codeMaker).uploadSolution(matchId, code, solution.encodedSalt)).to.emit(game, "PlayerPunished");
            });

            it("Should emit an event when called by the CodeMaker if called with a solution different from the one submitted initially signaling that the CodeMaker has been punished with valid parameters", async function () {
                const { game, matchId, codeMaker, solution } = await loadFixture(phases.untilFirstRoundLastFeedback);
                const code = newCode(0, 0, 0, 0);

                const tx = await game.connect(codeMaker).uploadSolution(matchId, code, solution.encodedSalt);
                const eventInterface = new ethers.Interface(["event PlayerPunished(address id, address player, string reason)"]);
                const event = await getEvent(tx, eventInterface, "PlayerPunished", 1);

                expect(event.id).to.be.equal(matchId);
                expect(event.player).to.be.equal(codeMaker.address);
                expect(event.reason).to.be.equal("Wrong solution provided");
            });

            it("Should emit an event when called by the CodeMaker if called with a solution different from the one submitted initially signaling that match has been terminated", async function () {
                const { game, matchId, codeMaker, solution } = await loadFixture(phases.untilFirstRoundLastFeedback);
                const code = newCode(0, 0, 0, 0);

                await expect(game.connect(codeMaker).uploadSolution(matchId, code, solution.encodedSalt)).to.emit(game, "MatchEnded");
            });

            it("Should emit an event when called by the CodeMaker if called with a solution different from the one submitted initially signaling that match has been terminated with valid parameters", async function () {
                const { game, matchId, codeMaker, solution } = await loadFixture(phases.untilFirstRoundLastFeedback);
                const code = newCode(0, 0, 0, 0);

                const tx = await game.connect(codeMaker).uploadSolution(matchId, code, solution.encodedSalt);
                const eventInterface = new ethers.Interface(["event MatchEnded(address id)"]);
                const event = await getEvent(tx, eventInterface, "MatchEnded", 2);

                expect(event.id).to.be.equal(matchId);
            });

            it("Should emit an event when called by the CodeMaker if called with a salt different from the one used initially signaling that the CodeMaker has been punished", async function () {
                const { game, matchId, codeMaker, solution } = await loadFixture(phases.untilFirstRoundLastFeedback);
                const salt = prepareSalt(9999999);

                await expect(game.connect(codeMaker).uploadSolution(matchId, solution.code, salt)).to.emit(game, "PlayerPunished");
            });

            it("Should emit an event when called by the CodeMaker if called with a salt different from the one used initially signaling that the CodeMaker has been punished with valid parameters", async function () {
                const { game, matchId, codeMaker, solution } = await loadFixture(phases.untilFirstRoundLastFeedback);
                const salt = prepareSalt(9999999);

                const tx = await game.connect(codeMaker).uploadSolution(matchId, solution.code, salt);
                const eventInterface = new ethers.Interface(["event PlayerPunished(address id, address player, string reason)"]);
                const event = await getEvent(tx, eventInterface, "PlayerPunished", 1);

                expect(event.id).to.be.equal(matchId);
                expect(event.player).to.be.equal(codeMaker.address);
                expect(event.reason).to.be.equal("Wrong solution provided");
            });

            it("Should emit an event when called by the CodeMaker if called with a salt different from the one used initially signaling that match has been terminated", async function () {
                const { game, matchId, codeMaker, solution } = await loadFixture(phases.untilFirstRoundLastFeedback);
                const salt = prepareSalt(9999999);

                await expect(game.connect(codeMaker).uploadSolution(matchId, solution.code, salt)).to.emit(game, "MatchEnded");
            });

            it("Should emit an event when called by the CodeMaker if called with a salt different from the one used initially signaling that match has been terminated with valid parameters", async function () {
                const { game, matchId, codeMaker, solution } = await loadFixture(phases.untilFirstRoundLastFeedback);
                const salt = prepareSalt(9999999);

                const tx = await game.connect(codeMaker).uploadSolution(matchId, solution.code, salt);
                const eventInterface = new ethers.Interface(["event MatchEnded(address id)"]);
                const event = await getEvent(tx, eventInterface, "MatchEnded", 2);

                expect(event.id).to.be.equal(matchId);
            });
        });

        describe("Transactions", function () {
            it("Should transfer all the stake amount to the CodeBreaker if called by the CodeMaker with a solution different from the one submitted initially", async function () {
                const { game, matchId, codeMaker, codeBreaker, solution, finalStake } = await loadFixture(phases.untilFirstRoundLastFeedback);
                const code = newCode(0, 0, 0, 0);

                const totalStakeAmount = finalStake * 2;
                await expect(game.connect(codeMaker).uploadSolution(matchId, code, solution.encodedSalt)).to.changeEtherBalances(
                    [codeBreaker, game],
                    [totalStakeAmount, -totalStakeAmount]
                );
            });

            it("Should transfer all the stake amount to the CodeBreaker if called by the CodeMaker with a salt different from the one used initially", async function () {
                const { game, matchId, codeMaker, codeBreaker, solution, finalStake } = await loadFixture(phases.untilFirstRoundLastFeedback);
                const salt = prepareSalt(9999999);

                const totalStakeAmount = finalStake * 2;
                await expect(game.connect(codeMaker).uploadSolution(matchId, solution.code, salt)).to.changeEtherBalances(
                    [codeBreaker, game],
                    [totalStakeAmount, -totalStakeAmount]
                );
            });
        });
    });

    describe("Dispute", function () {
        describe("Validation", function () {
        });

        describe("Events", function () {
        });

        describe("Transactions", function () {
        });
    });

    describe("AFK check", function () {
        describe("Validation", function () {
        });

        describe("Events", function () {
        });

        describe("Transactions", function () {
        });
    });
})