// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

// Uncomment this line to use console.log
//import "hardhat/console.sol";
import "./libs/Game.sol";
import "./libs/MatchRegister.sol";
import "./libs/Utils.sol";

contract EtherMind {
    Matches private matches;
    uint8 nRand;

    /**
     * Modifiers
     */

    /**
     * Check whether a match id exists or not.
     * @param id The id of the match to check.
     */
    modifier onlyExistingIds(address id) {
        require(
            MatchRegister.isValid(matches, id),
            "The match id specified does not exist"
        );
        _;
    }

    /**
     * Check whether an existing match id is a pending match or not.
     * @param id The id of the match to check. The match is assumed to already
     * exist.
     */
    modifier onlyPendingMatches(address id) {
        require(
            !MatchRegister.isStarted(matches, id),
            "The match specified is already started"
        );

        _;
    }

    /**
     * Check whether an existing match id is already started or not.
     * @param id The id of the match to check. The match is assumed to already
     * exist.
     */
    modifier onlyStartedMatches(address id) {
        require(
            MatchRegister.isStarted(matches, id),
            "The match specified is not started yet"
        );

        _;
    }

    /**
     * Events
     */

    event NewMatchCreated(address creator, address id);
    event MatchStarted(address id, address creator, address challenger);
    event NewStakeProposal(address id, uint proposal);

    /**
     * @dev TODO
     */
    constructor() {
        nRand = 0;
    }

    /**
     * Create a new match.
     * @param otherPlayer The other player that can join the match. If is 0,
     * then anyone can join the match.
     */
    function createMatch(address otherPlayer) public {
        require(
            msg.sender != otherPlayer,
            "You cannot create a private match with yourself"
        );

        address newId = address(
            uint160(
                uint256(
                    keccak256(
                        abi.encodePacked(
                            block.timestamp,
                            msg.sender,
                            block.number
                        )
                    )
                )
            )
        );

        bool res = MatchRegister.addMatch(
            matches,
            newId,
            Game.State({
                creator: msg.sender,
                challenger: otherPlayer,
                stake: 0
            }),
            otherPlayer == address(0)
        );

        require(res, "An error occurred while creating the new match");
        emit NewMatchCreated(msg.sender, newId);
    }

    /**
     * Join an existing match.
     * @param id The id of the match to join. If is 0 then the match will be
     * chosen randomly.
     * @param stakeProposal The proposed amount of wei to place as game stake.
     */
    function joinMatch(
        address id,
        uint stakeProposal
    ) public onlyPendingMatches(id) {
        Game.State storage game;
        if (id == address(0)) {
            // randomly extract match

            uint nPendingMatches = MatchRegister.nPendingMatches(matches);
            uint rand = Utils.rand(++nRand) % nPendingMatches;
            uint pos = rand;
            do {
                (id, game) = MatchRegister.getPending(matches, pos);
                pos = (pos + 1) % nPendingMatches;
            } while (msg.sender == game.creator && pos != rand);

            if (msg.sender == game.creator) {
                revert("There are no available matches");
            }
        } else {
            // specific game chosen

            game = MatchRegister.getMatch(matches, id);
            if (
                MatchRegister.isPrivatePending(matches, id) &&
                game.challenger != msg.sender
            ) {
                revert("You are not allowed to join this match");
            }

            if (msg.sender == game.creator) {
                revert("You cannot join your own game");
            }
        }

        MatchRegister.setMatchStarted(matches, id);
        game.challenger = msg.sender;
        emit MatchStarted(id, game.creator, game.challenger);

        game.stake = stakeProposal;
        emit NewStakeProposal(id, game.stake);
    }
}
