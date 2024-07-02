import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { getEvent } from "./utils/utils";
import { phases } from "./utils/phases";

describe("Stake decision", function () {
    describe("Proposal on join", function () {
        describe("Events", function () {
            it("Should emit an event when a match is joined signaling the new stake proposal", async function () {
                const { game, challenger, matchId } = await loadFixture(phases.untilCreate);

                await expect(game.connect(challenger).joinMatch(matchId, 10)).to.emit(game, "StakeProposal");
            });

            it("Should emit an event when a match is joined signaling the new stake proposal with valid parameters", async function () {
                const { game, challenger, matchId } = await loadFixture(phases.untilCreate);

                const proposal = 10;
                const tx2 = await game.connect(challenger).joinMatch(matchId, proposal);
                const eventInterface = new ethers.Interface(["event StakeProposal(address indexed id, uint256 proposal)"]);
                const event = await getEvent(tx2, eventInterface, "StakeProposal", 1);

                expect(event.id).to.be.equal(matchId);
                expect(event.proposal).to.be.equal(proposal);
            });
        });
    });

    describe("Standalone proposal", function () {
        describe("Validation", function () {
            it("Should fail if an invalid match ID is passed", async function () {
                const { game } = await loadFixture(phases.untilJoin);
                const invalidMatchId = ethers.ZeroAddress;

                await expect(game.stakeProposal(invalidMatchId, 10)).to.be.revertedWith("The match specified does not exist");
            });

            it("Should fail if called on a match that is in the wrong phase", async function () {
                for (const phaseFn of Object.values(phases)) {
                    if (phaseFn == phases.untilJoin) {
                        return;
                    }

                    const { game, challenger, matchId } = await loadFixture(phaseFn);

                    await expect(game.stakeProposal(matchId, 10)).to.be.revertedWith("Operation not permitted in this phase of the game");
                    await expect(game.connect(challenger).stakeProposal(matchId, 10)).to.be.revertedWith("Operation not permitted in this phase of the game");
                }
            });

            it("Should fail if called by someone which is not part of the match", async function () {
                const { game, matchId, otherPlayer } = await loadFixture(phases.untilJoin);

                await expect(game.connect(otherPlayer).stakeProposal(matchId, 10)).to.be.revertedWith("You are not part of the match specified");
            });

            it("Should not fail if called with the same stake proposal value", async function () {
                const { game, matchId, stakeProposal } = await loadFixture(phases.untilJoin);

                await expect(game.stakeProposal(matchId, stakeProposal)).not.to.be.reverted;
            });

            it("Should not fail if called with a different stake proposal value", async function () {
                const { game, matchId, stakeProposal } = await loadFixture(phases.untilJoin);

                await expect(game.stakeProposal(matchId, stakeProposal + 1)).not.to.be.reverted;
            });

            it("Should not fail if called multiple times consecutively by the same player", async function () {
                const { game, challenger, matchId, stakeProposal } = await loadFixture(phases.untilJoin);

                for (let i = 0; i < 5; i++) {
                    await expect(game.stakeProposal(matchId, stakeProposal + 1)).not.to.be.reverted;
                }

                for (let i = 0; i < 5; i++) {
                    await expect(game.connect(challenger).stakeProposal(matchId, stakeProposal)).not.to.be.reverted;
                }
            });

            it("Should fail if called after that the stake value has been decided", async function () {
                const { game, challenger, matchId, stakeProposal } = await loadFixture(phases.untilJoin);

                await expect(game.stakeProposal(matchId, stakeProposal)).not.to.be.reverted;

                await expect(game.stakeProposal(matchId, stakeProposal)).to.be.revertedWith("Operation not permitted in this phase of the game");
                await expect(game.connect(challenger).stakeProposal(matchId, stakeProposal)).to.be.revertedWith("Operation not permitted in this phase of the game");
            });
        });

        describe("Events", function () {
            it("Should emit an event when called with a different value signaling a new stake proposal", async function () {
                const { game, matchId, stakeProposal } = await loadFixture(phases.untilJoin);

                await expect(game.stakeProposal(matchId, stakeProposal + 1)).to.emit(game, "StakeProposal");
            });

            it("Should emit an event when called consecutively by the same player signaling a new stake proposal", async function () {
                const { game, challenger, matchId, stakeProposal } = await loadFixture(phases.untilJoin);

                await expect(game.connect(challenger).stakeProposal(matchId, stakeProposal)).to.emit(game, "StakeProposal");

                await expect(game.connect(challenger).stakeProposal(matchId, stakeProposal - 1)).to.emit(game, "StakeProposal");
            });

            it("Should emit an event when a new stake proposal is issued with valid parameters", async function () {
                const { game, matchId, stakeProposal } = await loadFixture(phases.untilJoin);

                const newStakeProposal = stakeProposal + 10;
                const tx = await game.stakeProposal(matchId, newStakeProposal);
                const eventInterface = new ethers.Interface(["event StakeProposal(address indexed id, uint256 proposal)"]);
                const event = await getEvent(tx, eventInterface, "StakeProposal");

                expect(event.id).to.be.equal(matchId);
                expect(event.proposal).to.be.equal(newStakeProposal);
            });

            it("Should emit an event when called with the same value by the other player signaling that the stake has been decided", async function () {
                const { game, matchId, stakeProposal } = await loadFixture(phases.untilJoin);

                await expect(game.stakeProposal(matchId, stakeProposal)).to.emit(game, "StakeFixed");
            });

            it("Should emit an event when the stake value is decided with valid parameters", async function () {
                const { game, matchId, stakeProposal } = await loadFixture(phases.untilJoin);

                const tx = await game.stakeProposal(matchId, stakeProposal);
                const eventInterface = new ethers.Interface(["event StakeFixed(address indexed id, uint256 stake)"]);
                const event = await getEvent(tx, eventInterface, "StakeFixed");

                expect(event.id).to.be.equal(matchId);
                expect(event.stake).to.be.equal(stakeProposal);
            });
        });
    });
})