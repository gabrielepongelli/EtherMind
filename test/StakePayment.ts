import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { getEvent } from "./utils/utils";
import { phases } from "./utils/phases";

describe("Stake payment", function () {
    describe("Validation", function () {
        it("Should fail if an invalid match ID is passed", async function () {
            const { game, finalStake } = await loadFixture(phases.untilStakeDecision);
            const invalidMatchId = ethers.ZeroAddress;

            await expect(game.payStake(invalidMatchId, { value: finalStake })).to.be.revertedWith("The match specified does not exist");
        });

        it("Should fail if called on a match that is in the wrong phase", async function () {
            for (const phaseFn of Object.values(phases)) {
                if (phaseFn == phases.untilStakeDecision) {
                    return;
                }

                const { game, challenger, matchId } = await loadFixture(phaseFn);

                await expect(game.payStake(matchId, { value: 10 })).to.be.revertedWith("Operation not permitted in this phase of the game");
                await expect(game.connect(challenger).payStake(matchId, { value: 10 })).to.be.revertedWith("Operation not permitted in this phase of the game");
            }
        });

        it("Should fail if called by someone which is not part of the match", async function () {
            const { game, matchId, otherPlayer } = await loadFixture(phases.untilStakeDecision);

            await expect(game.connect(otherPlayer).payStake(matchId, { value: 10 })).to.be.revertedWith("You are not part of the match specified");
        });

        it("Should fail if called with the wrong amount of money", async function () {
            const { game, matchId, finalStake } = await loadFixture(phases.untilStakeDecision);

            await expect(game.payStake(matchId, { value: finalStake + 1 })).to.be.revertedWith("Wrong stake value");
        });

        it("Should fail if called more than once by the same player", async function () {
            const { game, matchId, finalStake } = await loadFixture(phases.untilStakeDecision);

            await game.payStake(matchId, { value: finalStake });
            await expect(game.payStake(matchId, { value: finalStake })).to.be.revertedWith("You have already payed");
        });

        it("Should not fail if called with the right amount of money", async function () {
            const { game, matchId, finalStake } = await loadFixture(phases.untilStakeDecision);

            await expect(game.payStake(matchId, { value: finalStake })).not.to.be.reverted;
        });

        it("Should fail if called after that both players have payed", async function () {
            const { game, challenger, matchId, finalStake } = await loadFixture(phases.untilStakeDecision);

            await game.payStake(matchId, { value: finalStake });
            await game.connect(challenger).payStake(matchId, { value: finalStake });

            await expect(game.payStake(matchId, { value: finalStake })).to.be.revertedWith("Operation not permitted in this phase of the game");
        });
    });

    describe("Events", function () {
        it("Should emit an event when called with the right amount of money", async function () {
            const { game, matchId, finalStake } = await loadFixture(phases.untilStakeDecision);

            await expect(game.payStake(matchId, { value: finalStake })).to.emit(game, "StakePayed");
        });

        it("Should emit an event with valid parameters when called with the right amount of money", async function () {
            const { game, creator, matchId, finalStake } = await loadFixture(phases.untilStakeDecision);

            const tx = await game.payStake(matchId, { value: finalStake });
            const eventInterface = new ethers.Interface(["event StakePayed(address indexed id, address indexed player)"]);
            const event = await getEvent(tx, eventInterface, "StakePayed");

            expect(event.id).to.be.equal(matchId);
            expect(event.player).to.be.equal(creator.address);
        });

        it("Should emit an event when both player payed signaling that the game is started", async function () {
            const { game, challenger, matchId, finalStake } = await loadFixture(phases.untilStakeDecision);

            await game.payStake(matchId, { value: finalStake });
            await expect(game.connect(challenger).payStake(matchId, { value: finalStake })).to.emit(game, "GameStarted");
        });

        it("Should emit an event when both player payed signaling that the game is started with valid parameters", async function () {
            const { game, challenger, matchId, finalStake } = await loadFixture(phases.untilStakeDecision);

            await game.payStake(matchId, { value: finalStake });
            const tx = await game.connect(challenger).payStake(matchId, { value: finalStake });
            const eventInterface = new ethers.Interface(["event GameStarted(address indexed id)"]);
            const event = await getEvent(tx, eventInterface, "GameStarted", 1);

            expect(event.id).to.be.equal(matchId);
        });

        it("Should emit an event when both player payed signaling that the first round is started", async function () {
            const { game, challenger, matchId, finalStake } = await loadFixture(phases.untilStakeDecision);

            await game.payStake(matchId, { value: finalStake });
            await expect(game.connect(challenger).payStake(matchId, { value: finalStake })).to.emit(game, "RoundStarted");
        });

        it("Should emit an event when both player payed signaling that the first round is started with valid parameters", async function () {
            const { game, creator, challenger, matchId, finalStake } = await loadFixture(phases.untilStakeDecision);

            await game.payStake(matchId, { value: finalStake });
            const tx = await game.connect(challenger).payStake(matchId, { value: finalStake });
            const eventInterface = new ethers.Interface(["event RoundStarted(address indexed id, uint indexed round, address codemaker, address codebreaker)"]);
            const event = await getEvent(tx, eventInterface, "RoundStarted", 2);

            expect(event.id).to.be.equal(matchId);
            expect(event.round).to.be.equal(1);
            expect(event.codemaker).not.to.be.equal(event.codebreaker);

            const creatorIsCodeMaker = creator.address === event.codemaker;
            const creatorIsCodeBreaker = creator.address === event.codebreaker;
            expect(creatorIsCodeMaker || creatorIsCodeBreaker).to.be.true;
            expect(creatorIsCodeMaker && creatorIsCodeBreaker).to.be.false;

            const challengerIsCodeMaker = challenger.address === event.codemaker;
            const challengerIsCodeBreaker = challenger.address === event.codebreaker;
            expect(challengerIsCodeMaker || challengerIsCodeBreaker).to.be.true;
            expect(challengerIsCodeMaker && challengerIsCodeBreaker).to.be.false;
        });
    });

    describe("Transfers", function () {
        it("Should transfer the money to the contract", async function () {
            const { game, creator, challenger, matchId, finalStake } = await loadFixture(phases.untilStakeDecision);

            await expect(game.payStake(matchId, { value: finalStake })).to.changeEtherBalances(
                [creator, game],
                [-finalStake, finalStake]
            );

            await expect(game.connect(challenger).payStake(matchId, { value: finalStake })).to.changeEtherBalances(
                [challenger, game],
                [-finalStake, finalStake]
            );
        });
    });
})