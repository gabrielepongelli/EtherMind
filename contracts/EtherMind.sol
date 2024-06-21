// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

// Uncomment this line to use console.log
//import "hardhat/console.sol";
import "./libs/Game.sol";
import "./libs/MatchRegister.sol";
import "./libs/Utils.sol";

contract EtherMind {
    Matches private matches;
    uint8 private nRand;

    /**
     * Modifiers
     */

    /**
     * Require that the id specified is linked to an existing match.
     * @param id The id of the match to check.
     */
    modifier onlyExistingIds(address id) {
        require(
            MatchRegister.isValid(matches, id),
            "The match specified does not exist"
        );
        _;
    }

    /**
     * Require that the id specified is linked to an existing match or is zero.
     * @param id The id of the match to check.
     */
    modifier onlyExistingIdsOrZero(address id) {
        require(
            id == address(0) || MatchRegister.isValid(matches, id),
            "Invalid match id"
        );
        _;
    }

    /**
     * Require that the match id specified represents a pending match.
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
     * Require that the match id specified represents an already started match.
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
     * Require that the caller is one of the players of the specified match.
     * @param id The id of the match to check. The match is assumed to already
     * exist.
     */
    modifier onlyAllowedPlayers(address id) {
        require(
            msg.sender == MatchRegister.getMatch(matches, id).creator ||
                msg.sender == MatchRegister.getMatch(matches, id).challenger,
            "You are not part of the match specified"
        );
        _;
    }

    /**
     * Require that the game is in the specified phase.
     * @param id The id of the match to check. The match is assumed to already
     * exist.
     * @param phase The phase in which the game should be.
     */
    modifier onlyGamesInPhase(address id, Game.Phase phase) {
        require(
            MatchRegister.getMatch(matches, id).phase == phase,
            "Operation not permitted in this phase of the game"
        );
        _;
    }

    /**
     * Events
     */

    event MatchCreated(address creator, address id);
    event MatchStarted(address id, address creator, address challenger);
    event StakeProposal(address id, uint256 proposal);
    event StakeFixed(address id, uint256 stake);
    event StakePayed(address id, address player);
    event GameStarted(address id);

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
    function createMatch(address otherPlayer) external {
        require(
            msg.sender != otherPlayer,
            "You cannot create a private match with yourself"
        );

        address newId = address(uint160(Utils.rand(++nRand)));

        bool res = MatchRegister.addMatch(
            matches,
            newId,
            otherPlayer != address(0)
        );
        require(res, "An error occurred while creating the new match");

        Game.State storage game = MatchRegister.getMatch(matches, newId);
        Game.initState(game, msg.sender, otherPlayer);
        emit MatchCreated(msg.sender, newId);
    }

    /**
     * Join an existing match.
     * @param id The id of the match to join. If is 0 then the match will be
     * chosen randomly.
     * @param stake The proposed amount of wei to place as game stake.
     */
    function joinMatch(
        address id,
        uint256 stake
    ) external onlyExistingIdsOrZero(id) onlyPendingMatches(id) {
        Game.State storage game;
        if (id == address(0)) {
            // randomly extract match

            uint nPendingMatches = MatchRegister.nPendingMatches(matches);
            if (nPendingMatches == 0) {
                revert("There are no available matches");
            }

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

            if (msg.sender == game.creator) {
                revert("You cannot join your own game");
            }

            if (
                MatchRegister.isPrivatePending(matches, id) &&
                game.challenger != msg.sender
            ) {
                revert("You are not allowed to join this match");
            }
        }

        MatchRegister.setMatchStarted(matches, id);
        game.challenger = msg.sender;
        game.phase = Game.Phase.STAKE_DECISION;
        emit MatchStarted(id, game.creator, game.challenger);

        Game.setNewStake(game, msg.sender, stake);
        emit StakeProposal(id, game.stake);
    }

    /**
     * Propose a new stake value or confirm the current one.
     * @param id The id of the match on which to operate.
     * @param stake The stake value proposed. If the stake proposed is equal to
     * the stake proposed by the other player, then this call act as stake
     * confirmation. If instead it is different, this will be the new stake
     * value proposed to the other player.
     */
    function stakeProposal(
        address id,
        uint256 stake
    )
        external
        onlyExistingIds(id)
        onlyStartedMatches(id)
        onlyAllowedPlayers(id)
        onlyGamesInPhase(id, Game.Phase.STAKE_DECISION)
    {
        Game.State storage game = MatchRegister.getMatch(matches, id);

        if (!Game.isSameProposer(game, msg.sender) && game.stake == stake) {
            // stake value decided
            game.phase = Game.Phase.STAKE_PAYMENT;
            emit StakeFixed(id, stake);
        } else {
            Game.setNewStake(game, msg.sender, stake);
            emit StakeProposal(id, game.stake);
        }
    }

    /**
     * Pay the decided stake.
     * @param id The id of the match on which to operate.
     */
    function payStake(
        address id
    )
        external
        payable
        onlyExistingIds(id)
        onlyStartedMatches(id)
        onlyAllowedPlayers(id)
        onlyGamesInPhase(id, Game.Phase.STAKE_PAYMENT)
    {
        Game.State storage game = MatchRegister.getMatch(matches, id);

        require(game.stake == msg.value, "Wrong stake value");
        require(
            !Game.hasAlreadyPayed(game, msg.sender),
            "You have already payed"
        );

        bool hasAllPayed = Game.newStakePayment(game, msg.sender);
        emit StakePayed(id, msg.sender);

        if (hasAllPayed) {
            // both players have payed their stake, so the game can begin

            game.phase = Game.Phase.GAME_STARTED;
            emit GameStarted(id);
        }
    }
}
