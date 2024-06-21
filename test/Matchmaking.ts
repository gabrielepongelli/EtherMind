import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { ContractTransactionResponse, Result, Interface, AddressLike } from "ethers";

const getEvent = async function (tx: ContractTransactionResponse, eventInterface: Interface, eventName: string, eventIdx: number = 0): Promise<Result | undefined> {
    const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
    const data = receipt?.logs[eventIdx].data;
    const topics = receipt?.logs[eventIdx].topics;

    if (data) {
        return eventInterface.decodeEventLog(eventName, data, topics);
    } else {
        return undefined;
    }
}

const getMatchFromEvent = async function (tx: ContractTransactionResponse): Promise<AddressLike | undefined> {
    const eventInterface = new ethers.Interface(["event MatchCreated(address creator, address id)"]);
    const event = await getEvent(tx, eventInterface, "MatchCreated", 0);

    if (event) {
        return event.id;
    } else {
        return undefined;
    }
}

describe("Matchmaking", function () {
    async function deployGame() {
        const EtherMind = await ethers.getContractFactory("EtherMind");
        const game = await EtherMind.deploy();

        const [creator, challenger, otherPlayer] = await ethers.getSigners();
        return { game, creator, challenger, otherPlayer };
    }

    describe("Creation", function () {
        describe("Validation", function () {
            it("Should fail if called with the same address as the sender", async function () {
                const { game, creator } = await loadFixture(deployGame);

                await expect(game.createMatch(creator.address)).to.be.revertedWith(
                    "You cannot create a private match with yourself"
                );
            });

            it("Should not fail if called with a null address", async function () {
                const { game } = await loadFixture(deployGame);

                await expect(game.createMatch(ethers.ZeroAddress)).not.to.be.reverted;
            });

            it("Should not fail if called with an address different from the one of the sender", async function () {
                const { game, challenger } = await loadFixture(deployGame);

                await expect(game.createMatch(challenger.address)).not.to.be.reverted;
            });
        });

        describe("Events", function () {
            it("Should emit an event when a new match is created", async function () {
                const { game } = await loadFixture(deployGame);

                await expect(game.createMatch(ethers.ZeroAddress)).to.emit(game, "MatchCreated");
            });

            it("Should emit an event with valid arguments when a new match is created", async function () {
                const { game, creator } = await loadFixture(deployGame);
                const tx = await game.createMatch(ethers.ZeroAddress);
                const eventInterface = new ethers.Interface(["event MatchCreated(address creator, address id)"]);
                const event = await getEvent(tx, eventInterface, "MatchCreated");

                if (event) {
                    expect(event.creator).to.be.equal(creator.address);
                    expect(event.id.toString()).to.be.a.properAddress;
                    expect(event.id.toString()).to.be.not.hexEqual("0x0");
                } else {
                    throw Error();
                }
            });
        });
    });

    describe("Join", function () {
        describe("Validation", function () {
            it("Should not fail if called with an address of zero and other public matches are available", async function () {
                const { game, challenger } = await loadFixture(deployGame);
                const tx = await game.createMatch(ethers.ZeroAddress);;
                const matchId = await getMatchFromEvent(tx);

                if (!matchId) {
                    throw Error();
                }

                await expect(game.connect(challenger).joinMatch(ethers.ZeroAddress, 10)).not.to.be.reverted;
            });

            it("Should fail if an invalid match ID is passed", async function () {
                const { game, creator } = await loadFixture(deployGame);

                await expect(game.joinMatch(creator.address, 10)).to.be.revertedWith(
                    "Invalid match id"
                );
            });

            it("Should fail if the creator tries to join its own match", async function () {
                const { game } = await loadFixture(deployGame);
                const tx = await game.createMatch(ethers.ZeroAddress);
                const matchId = await getMatchFromEvent(tx);

                if (!matchId) {
                    throw Error();
                }

                await expect(game.joinMatch(matchId, 10)).to.be.revertedWith(
                    "You cannot join your own game"
                );
            });

            it("Should fail if someone else that is not the invited player tries to join a private match", async function () {
                const { game, challenger, otherPlayer } = await loadFixture(deployGame);
                const tx = await game.createMatch(challenger);
                const matchId = await getMatchFromEvent(tx);

                if (!matchId) {
                    throw Error();
                }

                await expect(game.connect(otherPlayer).joinMatch(matchId, 0)).to.be.revertedWith(
                    "You are not allowed to join this match"
                );
            });

            it("Should fail if there are no matches available", async function () {
                const { game } = await loadFixture(deployGame);

                await expect(game.joinMatch(ethers.ZeroAddress, 10)).to.be.revertedWith(
                    "There are no available matches"
                );
            });

            it("Should fail if there are no matches available other than matches created from the same player that want to join them", async function () {
                const { game } = await loadFixture(deployGame);
                await game.createMatch(ethers.ZeroAddress);

                await expect(game.joinMatch(ethers.ZeroAddress, 10)).to.be.revertedWith(
                    "There are no available matches"
                );
            });

            it("Should not fail if called with an address of a public match", async function () {
                const { game, challenger } = await loadFixture(deployGame);
                const tx = await game.createMatch(ethers.ZeroAddress);;
                const matchId = await getMatchFromEvent(tx);

                if (!matchId) {
                    throw Error();
                }

                await expect(game.connect(challenger).joinMatch(matchId, 10)).not.to.be.reverted;
            });

            it("Should not fail if called with an address of a private match by the allowed player", async function () {
                const { game, challenger } = await loadFixture(deployGame);
                const tx = await game.createMatch(challenger.address);;
                const matchId = await getMatchFromEvent(tx);

                if (!matchId) {
                    throw Error();
                }

                await expect(game.connect(challenger).joinMatch(matchId, 10)).not.to.be.reverted;
            });

            it("Should not fail if called with a stake proposal value of zero", async function () {
                const { game, challenger } = await loadFixture(deployGame);
                const tx = await game.createMatch(challenger.address);;
                const matchId = await getMatchFromEvent(tx);

                if (!matchId) {
                    throw Error();
                }

                await expect(game.connect(challenger).joinMatch(matchId, 0)).not.to.be.reverted;
            });

            it("Should fail if called with an address of an existing match which is already started", async function () {
                const { game, challenger, otherPlayer } = await loadFixture(deployGame);
                const tx = await game.createMatch(challenger.address);;
                const matchId = await getMatchFromEvent(tx);

                if (!matchId) {
                    throw Error();
                }

                await game.connect(challenger).joinMatch(matchId, 10);
                await expect(game.connect(otherPlayer).joinMatch(matchId, 10)).to.be.revertedWith(
                    "The match specified is already started"
                );
            });
        });

        describe("Events", function () {
            it("Should emit an event when a match is joined signaling that the match is started", async function () {
                const { game, challenger } = await loadFixture(deployGame);
                const tx = await game.createMatch(challenger.address);;
                const matchId = await getMatchFromEvent(tx);

                if (!matchId) {
                    throw Error();
                }

                await expect(game.connect(challenger).joinMatch(matchId, 10)).to.emit(game, "MatchStarted");
            });

            it("Should emit an event when a match is joined signaling that the match is started with valid parameters", async function () {
                const { game, creator, challenger } = await loadFixture(deployGame);
                const tx1 = await game.createMatch(challenger.address);
                const matchId = await getMatchFromEvent(tx1);

                if (!matchId) {
                    throw Error();
                }

                const tx2 = await game.connect(challenger).joinMatch(matchId, 10);
                const eventInterface = new ethers.Interface(["event MatchStarted(address id, address creator, address challenger)"]);
                const event = await getEvent(tx2, eventInterface, "MatchStarted");

                if (!event) {
                    throw Error();
                }

                expect(event.id).to.be.equal(matchId);
                expect(event.creator).to.be.equal(creator.address);
                expect(event.challenger).to.be.equal(challenger.address);
            });

            it("Should emit an event when a match is joined signaling the new stake proposal", async function () {
                const { game, challenger } = await loadFixture(deployGame);
                const tx = await game.createMatch(challenger.address);;
                const matchId = await getMatchFromEvent(tx);

                if (!matchId) {
                    throw Error();
                }

                await expect(game.connect(challenger).joinMatch(matchId, 10)).to.emit(game, "StakeProposal");
            });

            it("Should emit an event when a match is joined signaling the new stake proposal with valid parameters", async function () {
                const { game, challenger } = await loadFixture(deployGame);
                const tx1 = await game.createMatch(challenger.address);
                const matchId = await getMatchFromEvent(tx1);

                if (!matchId) {
                    throw Error();
                }

                const proposal = 10;
                const tx2 = await game.connect(challenger).joinMatch(matchId, proposal);
                const eventInterface = new ethers.Interface(["event StakeProposal(address id, uint256 proposal)"]);
                const event = await getEvent(tx2, eventInterface, "StakeProposal", 1);

                if (!event) {
                    throw Error();
                }

                expect(event.id).to.be.equal(matchId);
                expect(event.proposal).to.be.equal(proposal);
            });
        });
    });
})