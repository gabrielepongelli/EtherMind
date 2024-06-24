// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

// Uncomment this line to use console.log
//import "hardhat/console.sol";
import "./libs/Game.sol";
import "./libs/MatchRegister.sol";
import "./libs/Utils.sol";
import "./libs/Configs.sol";

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
     * @param phase The phase(s) in which the game should be. If is more than
     * one, the check passes if the game is in one of the specified phases.
     */
    modifier onlyGamesInPhase(address id, Phase phase) {
        require(
            MatchRegister.getMatch(matches, id).phase == phase,
            "Operation not permitted in this phase of the game"
        );
        _;
    }

    //check that a function is been caled by the codemaker
    modifier onlyCodeMaker(address id) {
        //given match ID i need to figure out who is the code maker
        Game.State memory game = MatchRegister.getMatch(matches, id);
        require(
            Game.isCodeMaker(game, msg.sender),
            "Caller is not the codemaker"
        );
        _;
    }

    //check that a function is been caled by the codebreaker
    modifier onlyCodeBreaker(address id) {
        //given match ID i need to figure out who is the codebreaker
        Game.State memory game = MatchRegister.getMatch(matches, id);
        require(
            Game.isCodeBreaker(game, msg.sender),
            "Caller is not the codebreaker"
        );
        _;
    }

    modifier onlyMe() {
        require(
            msg.sender == address(this),
            "You are not allowed to call this function"
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
    event Failure(string stringFailure);
    event DepositHashSolution(address id, address from, bytes32 solution);
    event DepositGuess(address id, address from, Code guess);
    event DepositFeedback(address id, address from, Feedback feedback);
    event EndOfGuesses(address id, address from);
    event EndOfRound(address id, address from, Code solution);
    event PunishmentDispensed(address id, address from, string reason);
    event RewardDispensed(
        address id,
        address from,
        uint creatorScore,
        uint challengerScore,
        uint reward
    );
    event EndOfMatch(
        address id,
        address from,
        uint creatorScore,
        uint challengerScore
    );
    event AFKCheckStarted(address id, address from, uint256 timestamp);
    event StartOfNewRound(address id, address from);

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
            msg.sender,
            otherPlayer
        );
        require(res, "An error occurred while creating the new match");

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
        game.challenger = payable(msg.sender);
        game.phase = STAKE_DECISION;
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
        onlyGamesInPhase(id, STAKE_DECISION)
    {
        Game.State storage game = MatchRegister.getMatch(matches, id);

        if (!Game.isSameProposer(game, msg.sender) && game.stake == stake) {
            // stake value decided
            game.phase = STAKE_PAYMENT;
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
        onlyGamesInPhase(id, STAKE_PAYMENT)
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

            game.phase = GAME_STARTED;
            emit GameStarted(id);
        }
    }

    //code maker is checked, the hash uploaded
    function uploadCodeHash(
        address id,
        bytes32 uploadedHash
    )
        external
        onlyExistingIds(id)
        onlyStartedMatches(id)
        onlyAllowedPlayers(id)
    {
        Game.State storage game = MatchRegister.getMatch(matches, id);

        //reset moves history and feedback history -> if its the first turn nothing is done, all other turns is resets the history since if this function is called it means that no dipute is necessary
        //maybe some checks on the hash?
        //if a transaction reverts from the point of view of the blockchain is like it never happened, no need to emit the failure

        require(
            game.phase == ROUND_END || game.phase == GAME_STARTED,
            "previous round has not ended, game has not yet started"
        );

        if (game.phase == ROUND_END && Game.isCodeBreaker(game, msg.sender)) {
            Game.invertRoles(game);
        }

        // check that the caller is the code maker NOW
        require(
            Game.isCodeMaker(game, msg.sender),
            "you are not the codemaker"
        );

        Game.stopAfkCheck(game);

        Game.startNewRound(game, uploadedHash);
        emit DepositHashSolution(id, msg.sender, uploadedHash);
    }

    function makeGuess(
        address id,
        Code guess
    ) public onlyExistingIds(id) onlyStartedMatches(id) onlyCodeBreaker(id) {
        Game.State storage game = MatchRegister.getMatch(matches, id);

        //require round started
        require(
            game.phase == ROUND_PLAYING && game.flags == CB_WAITING,
            "round not started"
        );

        Game.stopAfkCheck(game);

        require(guess.checkFromat(), "incorrectly set guess, ivalid colors");

        Game.submitGuess(game, guess);
        emit DepositGuess(id, msg.sender, guess);
    }

    //save feedback
    function giveFeedback(
        address id,
        Feedback feedback
    ) public onlyExistingIds(id) onlyStartedMatches(id) onlyCodeMaker(id) {
        Game.State storage game = MatchRegister.getMatch(matches, id);

        require(
            game.phase == ROUND_PLAYING && game.flags == CM_WAITING,
            "round not started"
        );

        Game.stopAfkCheck(game);

        require(feedback.checkFromat(), "invalid feedback format");

        Game.submitFeedback(game, feedback);

        if (Game.isRoundEnded(game)) {
            emit EndOfGuesses(id, msg.sender);
        } else {
            emit DepositFeedback(id, msg.sender, feedback);
        }
    }

    function checkWinner(
        address id
    )
        external
        payable
        onlyExistingIds(id)
        onlyStartedMatches(id)
        onlyAllowedPlayers(id)
    {
        Game.State storage game = MatchRegister.getMatch(matches, id);

        //i assume that i already checked and updated the scores
        //in order to determine the winner i must first check that the round is over
        require(game.phase == GAME_END, "game not finished");

        Game.stopAfkCheck(game);

        require(
            address(this).balance >= game.stake * 2,
            "Insufficient balance in contract"
        );

        //if this is called by the codemaker force him to wait otherwise do it immidiately
        if (
            Game.isCodeBreaker(game, msg.sender) ||
            block.number >= game.holdOffBlockTimestamp
        ) {
            address payable winner = payable(Game.getWinner(game));

            if (winner != address(0)) {
                // transfer the amount to the winner
                winner.transfer(game.stake * 2);
            } else {
                // it's a draw
                game.creator.transfer(game.stake);
                game.challenger.transfer(game.stake);
            }
        } else {
            revert("Operation performed only after wait time.");
        }

        emit RewardDispensed(
            id,
            msg.sender,
            game.creatorScore,
            game.challengerScore,
            game.stake
        );
    }

    function punish(
        address id,
        bool codeMaker,
        string memory eventMsg
    ) internal onlyMe {
        Game.State memory game = MatchRegister.getMatch(matches, id);

        // ensure the contract has enough balance to make the transfer
        require(
            address(this).balance >= game.stake * 2,
            "Insufficient balance in contract"
        );

        address payable playerToPay = payable(
            codeMaker ? Game.getCodeBreaker(game) : Game.getCodeMaker(game)
        );

        playerToPay.transfer(game.stake * 2);
        emit PunishmentDispensed(id, msg.sender, eventMsg);
    }

    function uploadSolution(
        address id,
        Code solution
    )
        external
        payable
        onlyExistingIds(id)
        onlyStartedMatches(id)
        onlyCodeMaker(id)
    {
        Game.State storage game = MatchRegister.getMatch(matches, id);

        require(game.phase == ROUND_END, "you can't upload the solution yet");

        require(solution.checkFromat(), "wrong solution format");

        if (game.hashedSolution == solution.hashCode()) {
            // solution hashes match

            Game.stopAfkCheck(game);

            game.holdOffBlockTimestamp =
                block.number +
                (Configs.WAIT_UNTIL / Configs.AVG_BLOCK_TIME); //THIS IS FOR DISPUTE CHECK
            game.solution = solution; //THIS ALSO, for reference and cheating checking

            Game.updateScores(game);

            if (Game.isLastRound(game)) {
                game.phase = GAME_END;
                emit EndOfMatch(
                    id,
                    msg.sender,
                    game.creatorScore,
                    game.challengerScore
                );
            } else {
                // end of the round, but not of the game
                game.round++;
                game.phase = ROUND_END;
                emit EndOfRound(id, msg.sender, solution);
            }
        } else {
            // solution dosen't match -> PUNISH CODEMAKER
            game.phase = GAME_END;
            punish(id, true, "false code solution provided");
        }
    }

    function dispute(
        address id
    )
        external
        payable
        onlyExistingIds(id)
        onlyStartedMatches(id)
        onlyCodeBreaker(id)
    {
        Game.State storage game = MatchRegister.getMatch(matches, id);

        require(
            game.phase == ROUND_END || game.phase == GAME_END,
            "round is not over"
        );

        require(
            game.holdOffBlockTimestamp > block.number,
            "request is too late, dispute refuted"
        );

        Game.stopAfkCheck(game);

        //check cheating-> true: no cheater , false: cheater
        if (Game.verifyFeedback(game)) {
            punish(id, false, "codebreaker unjustly accused codemaster");
        } else {
            // cheating detected, punish the codemaker
            punish(id, true, "codemaker cheated, false clues provided");
        }

        game.phase = GAME_END;
    }

    function startAfkCheck(
        address id
    )
        external
        onlyExistingIds(id)
        onlyStartedMatches(id)
        onlyAllowedPlayers(id)
    {
        Game.State storage game = MatchRegister.getMatch(matches, id);

        // check that whoever is calling is in the position to wait the other
        require(
            Game.canPlayerWait(game, msg.sender),
            "you can't ask for afk check, you are the one that needs to make a move"
        );

        Game.startAfkCheck(game, block.number);
        emit AFKCheckStarted(id, msg.sender, game.afkBlockTimestamp);
    }

    function stopMatch(
        address id
    )
        external
        payable
        onlyExistingIds(id)
        onlyStartedMatches(id)
        onlyAllowedPlayers(id)
    {
        Game.State storage game = MatchRegister.getMatch(matches, id);

        require(
            Game.isAfkCheckActive(game),
            "you must first ask for AFK check"
        );
        require(
            game.afkBlockTimestamp +
                (Configs.AFK_MAX / Configs.AVG_BLOCK_TIME) <
                block.number,
            "too early to call AFK"
        );

        if (game.phase == ROUND_PLAYING && game.flags == CM_WAITING) {
            punish(id, true, "punished codemaker, AFK");
        } else if (
            (game.phase == ROUND_PLAYING && game.flags == CB_WAITING) ||
            game.phase == ROUND_END
        ) {
            // if the code maker offer the solution but the codebreaker doesn't do anything
            punish(id, false, "punished codebreaker, AFK");
        } else {
            revert("erron invalid state (game end)");
        }

        game.phase = GAME_END;
    }
}
