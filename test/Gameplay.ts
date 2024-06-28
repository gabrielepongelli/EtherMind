import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { getEvent, newCode, hashCode } from "./utils/utils";
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
        });

        describe("Events", function () {
        });
    });

    describe("Feedback submission", function () {
        describe("Validation", function () {
        });

        describe("Events", function () {
        });
    });

    describe("Solution submission", function () {
        describe("Validation", function () {
        });

        describe("Events", function () {
        });

        describe("Transactions", function () {
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