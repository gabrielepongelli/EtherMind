import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { getEvent, setAutoMine, mineBlocks, newFeedback } from "./utils/utils";
import { phases } from "./utils/phases";

describe("Dispute handling", function () {
    afterEach(async function () {
        // just to be sure
        await setAutoMine(true);
    });

    describe("Validation", function () {
        it("Should fail if an invalid match ID is passed", async function () {
            const { game, codeMaker } = await loadFixture(phases.untilFirstRoundSolution);
            const invalidMatchId = ethers.ZeroAddress;

            await expect(game.connect(codeMaker).dispute(invalidMatchId, [0])).to.be.revertedWith("The match specified does not exist.");
        });

        it("Should fail if called on a match that is in the wrong phase", async function () {
            for (const phaseFn of Object.values(phases)) {
                if (phaseFn == phases.untilFirstRoundSolution
                    || phaseFn == phases.untilSecondRoundSolution
                    || phaseFn == phases.untilThirdRoundSolution
                    || phaseFn == phases.untilLastRoundSolution) {
                    return;
                }

                const { game, challenger, matchId } = await loadFixture(phaseFn);

                await expect(game.dispute(matchId, [0])).to.be.reverted;
                await expect(game.connect(challenger).dispute(matchId, [0])).to.be.reverted;
            }
        });

        it("Should fail if called by someone which is not part of the match", async function () {
            const { game, matchId, otherPlayer } = await loadFixture(phases.untilFirstRoundSolution);

            await expect(game.connect(otherPlayer).dispute(matchId, [0])).to.be.revertedWith("The caller is not the CodeMaker.");
        });

        it("Should fail if called by the old CodeMaker (the new CodeBreaker)", async function () {
            const { game, matchId, codeBreaker } = await loadFixture(phases.untilFirstRoundSolution);

            await expect(game.connect(codeBreaker).dispute(matchId, [0])).to.be.revertedWith("The caller is not the CodeMaker.");
        });

        it("Should fail if called by the new CodeMaker (the old CodeBreaker) after that the dispute time is passed", async function () {
            const AVG_BLOCK_TIME = 12;
            const WAIT_UNTIL = 90;

            const { game, matchId, codeMaker } = await loadFixture(phases.untilFirstRoundSolution);

            await setAutoMine(false);
            await mineBlocks(WAIT_UNTIL / AVG_BLOCK_TIME);
            await setAutoMine(true);

            await expect(game.connect(codeMaker).dispute(matchId, [0])).to.be.revertedWith("The request is too late, dispute refuted.");
        });

        it("Should fail if called with an invalid number of indexes", async function () {
            const { game, matchId, codeMaker } = await loadFixture(phases.untilFirstRoundSolution);

            let indexes: number[] = [];
            await expect(game.connect(codeMaker).dispute(matchId, indexes)).to.be.revertedWith("Invalid number of feedback indexes passed.");

            for (let i = 0; i < 13; i++) {
                indexes.push(1);
            }
            await expect(game.connect(codeMaker).dispute(matchId, indexes)).to.be.revertedWith("Invalid number of feedback indexes passed.");
        });

        it("Should fail if called with one or more invalid indexes", async function () {
            const { game, matchId, codeMaker } = await loadFixture(phases.untilFirstRoundSolution);

            let indexes: number[] = [13];
            await expect(game.connect(codeMaker).dispute(matchId, indexes)).to.be.revertedWith("Invalid index submitted.");
        });

        it("Should not fail if called by the new CodeMaker (the old CodeBreaker) before that the dispute time is passed", async function () {
            const { game, matchId, codeMaker } = await loadFixture(phases.untilFirstRoundSolution);

            await expect(game.connect(codeMaker).dispute(matchId, [0])).not.to.be.reverted;
        });

        it("Should terminate the match", async function () {
            const { game, matchId, codeMaker } = await loadFixture(phases.untilFirstRoundSolution);

            await game.connect(codeMaker).dispute(matchId, [0]);

            // in this case if the error is that the match specified 
            // doesn't exist it means that the match has been deleted
            await expect(game.connect(codeMaker).dispute(matchId, [0])).to.be.revertedWith("The match specified does not exist.");
        });
    });

    describe("Events", function () {
        it("Should emit an event when called signaling that the match is ended", async function () {
            const { game, matchId, codeMaker } = await loadFixture(phases.untilFirstRoundSolution);

            await expect(game.connect(codeMaker).dispute(matchId, [0])).to.emit(game, "MatchEnded");
        });

        it("Should emit an event when called signaling that the match is ended with valid parameters", async function () {
            const { game, matchId, codeMaker } = await loadFixture(phases.untilFirstRoundSolution);

            const tx = await game.connect(codeMaker).dispute(matchId, [0]);
            const eventInterface = new ethers.Interface(["event MatchEnded(address indexed id)"]);
            const event = await getEvent(tx, eventInterface, "MatchEnded", 1);

            expect(event.id).to.be.equal(matchId);
        });

        it("Should emit an event when called signaling that a player has been punished", async function () {
            const { game, matchId, codeMaker } = await loadFixture(phases.untilFirstRoundSolution);

            await expect(game.connect(codeMaker).dispute(matchId, [0])).to.emit(game, "PlayerPunished");
        });

        it("Should emit an event when called if the old CodeMaker cheated signaling that it has been punished with valid parameters", async function () {
            const { game, matchId, codeMaker, codeBreaker, solution, feedbacks } = await loadFixture(phases.untilFirstRoundLastGuess);

            // submit feedback
            const hints = { cp: 0, np: 4 };
            const feedback = newFeedback(hints.cp, hints.np);
            await game.connect(codeMaker).newFeedback(matchId, feedback);

            // submit final solution
            await game.connect(codeMaker).uploadSolution(matchId, solution.code, solution.encodedSalt)

            const indexes = [feedbacks.length];
            const tx = await game.connect(codeBreaker).dispute(matchId, indexes);
            const eventInterface = new ethers.Interface(["event PlayerPunished(address indexed id, address player, string reason)"]);
            const event = await getEvent(tx, eventInterface, "PlayerPunished");

            expect(event.id).to.be.equal(matchId);
            expect(event.player).to.be.equal(codeMaker.address);
            expect(event.reason).to.be.equal("Player provided false feedbacks.");
        });

        it("Should emit an event when called if the old CodeBreaker unjustly accused the other player signaling that it has been punished with valid parameters", async function () {
            const { game, matchId, codeMaker } = await loadFixture(phases.untilFirstRoundSolution);
            // codeMaker is the old codeBreaker

            const tx = await game.connect(codeMaker).dispute(matchId, [0]);
            const eventInterface = new ethers.Interface(["event PlayerPunished(address indexed id, address player, string reason)"]);
            const event = await getEvent(tx, eventInterface, "PlayerPunished");

            expect(event.id).to.be.equal(matchId);
            expect(event.player).to.be.equal(codeMaker.address);
            expect(event.reason).to.be.equal("Player unjustly accused the opponent.");
        });
    });

    describe("Transactions", function () {
        it("Should transfer all the stake amount to the old CodeBreaker if the CodeMaker cheated", async function () {
            const { game, matchId, codeMaker, codeBreaker, solution, finalStake, feedbacks } = await loadFixture(phases.untilFirstRoundLastGuess);

            // submit feedback
            const hints = { cp: 0, np: 4 };
            const feedback = newFeedback(hints.cp, hints.np);
            await game.connect(codeMaker).newFeedback(matchId, feedback);

            // submit final solution
            await game.connect(codeMaker).uploadSolution(matchId, solution.code, solution.encodedSalt)

            const totalStakeAmount = finalStake * 2;
            const indexes = [feedbacks.length];
            await expect(game.connect(codeBreaker).dispute(matchId, indexes)).to.changeEtherBalances(
                [codeBreaker, game],
                [totalStakeAmount, -totalStakeAmount]
            );
        });

        it("Should transfer all the stake amount to the old CodeMaker if it is unjustly accused", async function () {
            const { game, matchId, codeMaker, codeBreaker, finalStake } = await loadFixture(phases.untilFirstRoundSolution);
            // codeBreaker is the old codeMaker

            const totalStakeAmount = finalStake * 2;
            await expect(game.connect(codeMaker).dispute(matchId, [0])).to.changeEtherBalances(
                [codeBreaker, game],
                [totalStakeAmount, -totalStakeAmount]
            );
        });
    });
})