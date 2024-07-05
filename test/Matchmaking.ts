import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { getEvent, getMatchFromEvent } from "./utils/utils";
import { untilDeploy } from "./utils/phases";

describe("Matchmaking", function () {
    describe("Creation", function () {
        describe("Validation", function () {
            it("Should fail if called with the same address as the sender", async function () {
                const { game, creator } = await loadFixture(untilDeploy);

                await expect(game.createMatch(creator.address)).to.be.revertedWith(
                    "You cannot create a private match with yourself"
                );
            });

            it("Should not fail if called with a null address", async function () {
                const { game } = await loadFixture(untilDeploy);

                await expect(game.createMatch(ethers.ZeroAddress)).not.to.be.reverted;
            });

            it("Should not fail if called with an address different from the one of the sender", async function () {
                const { game, challenger } = await loadFixture(untilDeploy);

                await expect(game.createMatch(challenger.address)).not.to.be.reverted;
            });
        });

        describe("Events", function () {
            it("Should emit an event when a new match is created", async function () {
                const { game } = await loadFixture(untilDeploy);

                await expect(game.createMatch(ethers.ZeroAddress)).to.emit(game, "MatchCreated");
            });

            it("Should emit an event with valid arguments when a new match is created", async function () {
                const { game, creator } = await loadFixture(untilDeploy);
                const tx = await game.createMatch(ethers.ZeroAddress);
                const eventInterface = new ethers.Interface(["event MatchCreated(address indexed id, address indexed creator)"]);
                const event = await getEvent(tx, eventInterface, "MatchCreated");

                expect(event.creator).to.be.equal(creator.address);
                expect(event.id.toString()).to.be.a.properAddress;
                expect(event.id.toString()).to.be.not.hexEqual("0x0");
            });
        });
    });

    describe("Join", function () {
        describe("Validation", function () {
            it("Should not fail if called with an address of zero and other public matches are available", async function () {
                const { game, challenger } = await loadFixture(untilDeploy);
                await game.createMatch(ethers.ZeroAddress);

                await expect(game.connect(challenger).joinMatch(ethers.ZeroAddress, 10)).not.to.be.reverted;
            });

            it("Should fail if an invalid match ID is passed", async function () {
                const { game, creator } = await loadFixture(untilDeploy);

                await expect(game.joinMatch(creator.address, 10)).to.be.revertedWith(
                    "Invalid match id"
                );
            });

            it("Should fail if the creator tries to join its own match", async function () {
                const { game } = await loadFixture(untilDeploy);
                const tx = await game.createMatch(ethers.ZeroAddress);
                const matchId = await getMatchFromEvent(tx);

                await expect(game.joinMatch(matchId, 10)).to.be.revertedWith(
                    "You cannot join your own game"
                );
            });

            it("Should fail if someone else that is not the invited player tries to join a private match", async function () {
                const { game, challenger, otherPlayer } = await loadFixture(untilDeploy);
                const tx = await game.createMatch(challenger);
                const matchId = await getMatchFromEvent(tx);

                await expect(game.connect(otherPlayer).joinMatch(matchId, 0)).to.be.revertedWith(
                    "You are not allowed to join this match"
                );
            });

            it("Should fail if there are no matches available", async function () {
                const { game } = await loadFixture(untilDeploy);

                await expect(game.joinMatch(ethers.ZeroAddress, 10)).to.be.revertedWith(
                    "There are no available matches"
                );
            });

            it("Should fail if there are no matches available other than matches created from the same player that want to join them", async function () {
                const { game } = await loadFixture(untilDeploy);
                await game.createMatch(ethers.ZeroAddress);

                await expect(game.joinMatch(ethers.ZeroAddress, 10)).to.be.revertedWith(
                    "There are no available matches"
                );
            });

            it("Should not fail if called with an address of a public match", async function () {
                const { game, challenger } = await loadFixture(untilDeploy);
                const tx = await game.createMatch(ethers.ZeroAddress);;
                const matchId = await getMatchFromEvent(tx);

                await expect(game.connect(challenger).joinMatch(matchId, 10)).not.to.be.reverted;
            });

            it("Should not fail if called with an address of a private match by the allowed player", async function () {
                const { game, challenger } = await loadFixture(untilDeploy);
                const tx = await game.createMatch(challenger.address);;
                const matchId = await getMatchFromEvent(tx);

                await expect(game.connect(challenger).joinMatch(matchId, 10)).not.to.be.reverted;
            });

            it("Should not fail if called with a stake proposal value of zero", async function () {
                const { game, challenger } = await loadFixture(untilDeploy);
                const tx = await game.createMatch(challenger.address);;
                const matchId = await getMatchFromEvent(tx);

                await expect(game.connect(challenger).joinMatch(matchId, 0)).not.to.be.reverted;
            });

            it("Should fail if called with an address of an existing match which is already started", async function () {
                const { game, challenger, otherPlayer } = await loadFixture(untilDeploy);
                const tx = await game.createMatch(challenger.address);;
                const matchId = await getMatchFromEvent(tx);

                await game.connect(challenger).joinMatch(matchId, 10);
                await expect(game.connect(otherPlayer).joinMatch(matchId, 10)).to.be.revertedWith(
                    "The match specified is already started or do not exists"
                );
            });
        });

        describe("Events", function () {
            it("Should emit an event when a match is joined signaling that the match is started", async function () {
                const { game, challenger } = await loadFixture(untilDeploy);
                const tx = await game.createMatch(challenger.address);;
                const matchId = await getMatchFromEvent(tx);

                await expect(game.connect(challenger).joinMatch(matchId, 10)).to.emit(game, "MatchStarted");
            });

            it("Should emit an event when a match is joined signaling that the match is started with valid parameters", async function () {
                const { game, creator, challenger } = await loadFixture(untilDeploy);
                const tx1 = await game.createMatch(challenger.address);
                const matchId = await getMatchFromEvent(tx1);

                const tx2 = await game.connect(challenger).joinMatch(matchId, 10);
                const eventInterface = new ethers.Interface(["event MatchStarted(address indexed id, address creator, address challenger)"]);
                const event = await getEvent(tx2, eventInterface, "MatchStarted");

                expect(event.id).to.be.equal(matchId);
                expect(event.creator).to.be.equal(creator.address);
                expect(event.challenger).to.be.equal(challenger.address);
            });
        });
    });
})