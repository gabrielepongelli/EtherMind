import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import { ethers } from "hardhat";

describe("EtherMind", function () {
    async function deployGame() {
        const EtherMind = await ethers.getContractFactory("EtherMind");
        const game = await EtherMind.deploy();

        const [creator, challenger, otherPlayer] = await ethers.getSigners();
        return { game, creator, challenger, otherPlayer };
    }

    describe("Matchmaking", function () {
        describe("Creation", function () {
            describe("Validation", function () {
                it("Should fail if called with the same address as the sender", async function () {
                    const { game, creator } = await loadFixture(deployGame);

                    await expect(game.createMatch(creator.address)).to.be.revertedWith(
                        "You cannot create a private match with yourself"
                    );
                });
            });

            describe("Events", function () {

            });
        })
    });

    describe("Game", function () {

    });
})