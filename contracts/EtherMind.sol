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
     * @param phase The phase in which the game should be.
     */
    modifier onlyGamesInPhase(address id, Game.Phase phase) {
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
            ((game.codeMaster == 0) && (game.creator == msg.sender)) ||
                ((game.codeMaster == 1) && (game.challenger == msg.sender)),
            "Caller is not the codemaker"
        );
        _;
    }

    //check that a function is been caled by the codebreaker
    modifier onlyCodeBreaker(address id) {
        //given match ID i need to figure out who is the codebreaker
        Game.State memory game = MatchRegister.getMatch(matches, id);
        require(
            ((game.codeMaster == 1) && (game.creator == msg.sender)) ||
                ((game.codeMaster == 0) && (game.challenger == msg.sender)),
            "Caller is not the codebreaker"
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
    event DepositGuess(address id, address from, Game.Code guess);
    event DepositFeedback(address id, address from, Game.Feedback feedback);
    event EndOfGuesses(address id, address from);
    event EndOfRound(address id, address from, Game.Code solution);
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
        game.challenger = payable(msg.sender);
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

    //code maker is checked, the hash uploaded
    function uploadCodeHash(
        address id,
        bytes32 uploadedHash
    ) external onlyCodeMaker(id) {
        Game.State memory game = MatchRegister.getMatch(matches, id);
        Game.actOnAfkFlag(game, false); //true is set, false is unset
        //reset moves history and feedback history -> if its the first turn nothing is done, all other turns is resets the history since if this function is called it means that no dipute is necessary
        //maybe some checks on the hash?
        //if a transaction reverts from the point of view of the blockchain is like it never happened, no need to emit the failure

        require(
            game.phase == Game.Phase.ROUND_END ||
                game.phase == Game.Phase.GAME_STARTED,
            "previous round has not ended, game has not yet started"
        );

        //reset history and round data
        delete game.movesHistory;
        delete game.feedbackHistory;
        delete game.solution;

        //new game status
        game.phase = Game.Phase.ROUND_PLAYING_WAITINGFORBREAKER;
        game.hashedSolution = uploadedHash;
        emit DepositHashSolution(id, msg.sender, uploadedHash);
    }

    function makeGuess(
        address id,
        Game.Code memory guess
    ) public onlyCodeBreaker(id) {
        Game.State storage game = MatchRegister.getMatch(matches, id);

        //uncheck the afk flag
        Game.actOnAfkFlag(game, false); //true is set, false is unset

        //checkinput
        require(
            Game.checkCodeFromat(guess),
            "incorrectly set guess, ivalid colors"
        );

        //require round started
        require(
            game.phase == Game.Phase.ROUND_PLAYING_WAITINGFORBREAKER,
            "round not started"
        );

        //must check that i didn't already made a guess that is waiting for an answer (not needed anymore technically but ill'keep it anyway)
        if (game.movesHistory.length == game.feedbackHistory.length) {
            game.movesHistory.push(guess);
            game.phase = Game.Phase.ROUND_PLAYING_WAITINGFORMASTER;
            emit DepositGuess(id, msg.sender, guess);
        } else if (game.movesHistory.length > game.feedbackHistory.length) {
            //must wait, feedback not yet returned
            revert("error, must wait feedback not yet returned"); //non sono sicuro se qui il revert vada bene come error handling
        } else {
            revert("internal error");
        }
    }

    //save feedback
    function giveFeedback(
        address id,
        Game.Feedback memory feedback
    ) public onlyCodeMaker(id) {
        Game.State storage game = MatchRegister.getMatch(matches, id);

        //uncheck the afk flag
        Game.actOnAfkFlag(game, false); //true is set, false is unset

        //checkFeedbackFromat
        require(
            Game.checkFeedbackFromat(feedback),
            "incorrectly set feedback, ivalid value"
        );

        //upload the guess in the array of moves
        //require round started
        require(
            game.phase == Game.Phase.ROUND_PLAYING_WAITINGFORMASTER,
            "round not started"
        );

        //if n. of round reached end the game
        if (game.movesHistory.length < Configs.nGuesses) {
            //nGuesses reached REMEMBER AT THE END OF A ROUND IF NO COMPLAIN IS RAISED YOU NEED TO EMPTY THE HISTORY OF THIS WONT WORK

            if (game.movesHistory.length > game.feedbackHistory.length) {
                game.feedbackHistory.push(feedback);
                game.phase = Game.Phase.ROUND_PLAYING_WAITINGFORBREAKER;
                emit DepositFeedback(id, msg.sender, feedback); //meit given feedback
            } else if (
                game.movesHistory.length == game.feedbackHistory.length
            ) {
                //must wait, guess not yet given
                revert("error, must wait guess not yet made"); //non sono sicuro se qui il revert vada bene come error handling
            } else {
                revert("internal error");
            }
        } else if (game.movesHistory.length == Configs.nGuesses) {
            //last chance to get it right
            if (game.movesHistory.length > game.feedbackHistory.length) {
                game.feedbackHistory.push(feedback);
                //breaker has run out of guesses,ROUND ENDS now is time for the solution
                game.phase = Game.Phase.ROUND_END;
                emit EndOfGuesses(id, msg.sender);
            }
        } else {
            revert("internal error");
        }
    }

    function checkWinner(address id) external payable {
        Game.State memory game = MatchRegister.getMatch(matches, id);

        //ASK IS THIS OKAY TO BE PUBLIC, NO CHOISE?
        Game.actOnAfkFlag(game, false); //true is set, false is unset
        //i assume that i already checked and updated the scores
        //in order to determine the winner i must first check that the round is over
        require(game.phase == Game.Phase.GAME_END, "game not finished");

        require(
            address(this).balance >= game.stake,
            "Insufficient balance in contract"
        );

        //if this is called by the codemaker force him to wait otherwise do it immidiately
        if (
            (msg.sender == game.creator && game.codeMaster == 1) ||
            (msg.sender == game.challenger && game.codeMaster == 0)
        ) {
            // Perform the operation immediately
            if (game.creatorScore > game.challengerScore) {
                // Transfer the amount to the recipient
                (bool success, ) = game.creator.call{value: game.stake}("");
                require(success, "Transfer failed.");
                emit RewardDispensed(
                    id,
                    msg.sender,
                    game.creatorScore,
                    game.challengerScore,
                    game.stake
                );
            } else if (game.creatorScore < game.challengerScore) {
                // Transfer the amount to the recipient
                (bool success, ) = game.challenger.call{value: game.stake}("");
                require(success, "Transfer failed.");
                emit RewardDispensed(
                    id,
                    msg.sender,
                    game.creatorScore,
                    game.challengerScore,
                    game.stake
                );
            } else {
                //its a draw
                uint halfreward = game.stake / 2; //solidity will truncate automatically
                (bool success, ) = game.challenger.call{value: halfreward}("");
                require(success, "Transfer failed.");
                (success, ) = game.creator.call{value: halfreward}("");
                require(success, "Transfer failed.");
                emit RewardDispensed(
                    id,
                    msg.sender,
                    game.creatorScore,
                    game.challengerScore,
                    game.stake
                );
            }
        } else if (block.timestamp >= game.holdOffTimestamp) {
            // Perform the operation if the current time is past the waitUntil time
            if (game.creatorScore > game.challengerScore) {
                // Transfer the amount to the recipient
                (bool success, ) = game.creator.call{value: game.stake}("");
                require(success, "Transfer failed.");
                emit RewardDispensed(
                    id,
                    msg.sender,
                    game.creatorScore,
                    game.challengerScore,
                    game.stake
                );
            } else if (game.creatorScore < game.challengerScore) {
                // Transfer the amount to the recipient
                (bool success, ) = game.challenger.call{value: game.stake}("");
                require(success, "Transfer failed.");
                emit RewardDispensed(
                    id,
                    msg.sender,
                    game.creatorScore,
                    game.challengerScore,
                    game.stake
                );
            } else {
                //its a draw
                uint halfreward = game.stake / 2; //solidity will truncate automatically
                (bool success, ) = game.challenger.call{value: halfreward}("");
                require(success, "Transfer failed.");
                (success, ) = game.creator.call{value: halfreward}("");
                require(success, "Transfer failed.");
                emit RewardDispensed(
                    id,
                    msg.sender,
                    game.creatorScore,
                    game.challengerScore,
                    game.stake
                );
            }
        } else {
            // Inform the codemaster to wait until the waitUntil time
            revert("Operation performed only after wait time.");
        }
    }

    function uploadSolution(
        address id,
        Game.Code memory solution
    ) external payable onlyCodeMaker(id) {
        Game.State storage game = MatchRegister.getMatch(matches, id);

        Game.actOnAfkFlag(game, false); //true is set, false is unset were doing something...

        require(Game.checkCodeFromat(solution), "the solution is impossible");

        if (game.hashedSolution == Game.hashCode(solution)) {
            //solution matches

            require(game.movesHistory.length > 0, "Array is empty");

            //can upload the solution only if the round is ended OR player got it right
            require(
                Game.equals(
                    game.movesHistory[game.movesHistory.length - 1],
                    solution
                ) || game.phase == Game.Phase.ROUND_END,
                "you can't upload the solution yet"
            );

            //is this necessary for AFK? maybe not
            //game.last_activity = block.timestamp; //global variable representing the current timestamp of the block being mined
            game.holdOffTimestamp = block.timestamp + Configs.waitUntil; //THIS IS FOR DISPUTE CHECK
            game.solution = solution; //THIS ALSO, for reference and cheating checking

            Game.updateScores(game);
            //have we reached the limit of rounds?

            if (game.round == Configs.nTurns) {
                game.phase = Game.Phase.GAME_END;
                emit EndOfMatch(
                    id,
                    msg.sender,
                    game.creatorScore,
                    game.challengerScore
                );
            } else {
                //end of round, but not game
                game.round++;
                game.phase = Game.Phase.ROUND_END;
                emit EndOfRound(id, msg.sender, solution);
            }
        } else {
            //solution dosen't match PUNISH CODEMAKER
            game.phase = Game.Phase.GAME_END;

            // Ensure the contract has enough balance to make the transfer
            require(
                address(this).balance >= game.stake,
                "Insufficient balance in contract"
            );

            if (game.codeMaster == 0) {
                // Transfer the amount to the recipient
                (bool success, ) = game.challenger.call{value: game.stake}(""); //no gas limit?
                require(success, "Transfer failed.");
                emit PunishmentDispensed(
                    id,
                    msg.sender,
                    "false code solution provided"
                );
            } else if (game.codeMaster == 1) {
                // Transfer the amount to the recipient
                (bool success, ) = game.creator.call{value: game.stake}("");
                require(success, "Transfer failed.");
                emit PunishmentDispensed(
                    id,
                    msg.sender,
                    "false code solution provided"
                );
            } else {
                revert("internal error"); //just to be safe
            }
        }
    }

    function dispute(address id) external payable onlyCodeBreaker(id) {
        Game.State storage game = MatchRegister.getMatch(matches, id);

        Game.actOnAfkFlag(game, false); //true is set, false is unset were doing something...

        //check that ROUND_END
        require(
            game.phase == Game.Phase.ROUND_END ||
                game.phase == Game.Phase.GAME_END,
            "round is not over"
        );
        require(
            game.holdOffTimestamp > block.timestamp,
            "request is too late, dispute refuted"
        );

        //check cheating-> true: no cheater , false: cheater
        if (!Game.verifyFeedback(game)) {
            //cheating detected, punish the codemaker
            game.phase = Game.Phase.GAME_END;

            // Ensure the contract has enough balance to make the transfer
            require(
                address(this).balance >= game.stake,
                "Insufficient balance in contract"
            );

            if (game.codeMaster == 0) {
                // Transfer the amount to the recipient
                (bool success, ) = game.challenger.call{value: game.stake}(""); //no gas limit?
                require(success, "Transfer failed.");
                emit PunishmentDispensed(
                    id,
                    msg.sender,
                    "codemaster cheated, false clues provided"
                );
            } else if (game.codeMaster == 1) {
                // Transfer the amount to the recipient
                (bool success, ) = game.creator.call{value: game.stake}("");
                require(success, "Transfer failed.");
                emit PunishmentDispensed(
                    id,
                    msg.sender,
                    "codemaster cheated, false clues provided"
                );
            } else {
                revert("internal error"); //just to be safe
            }
        } else {
            //if codemaker was unjustly accused, reward him instead
            game.phase = Game.Phase.GAME_END;

            // Ensure the contract has enough balance to make the transfer
            require(
                address(this).balance >= game.stake,
                "Insufficient balance in contract"
            );

            if (game.codeMaster == 1) {
                // Transfer the amount to the recipient
                (bool success, ) = game.challenger.call{value: game.stake}(""); //no gas limit?
                require(success, "Transfer failed.");
                emit PunishmentDispensed(
                    id,
                    msg.sender,
                    "codebreaker unjustly accused codemaster"
                );
            } else if (game.codeMaster == 0) {
                // Transfer the amount to the recipient
                (bool success, ) = game.creator.call{value: game.stake}("");
                require(success, "Transfer failed.");
                emit PunishmentDispensed(
                    id,
                    msg.sender,
                    "codebreaker unjustly accused codemaster"
                );
            } else {
                revert("internal error"); //just to be safe
            }
        }
    }

    function startAfkCheck(address id) external {
        Game.State storage game = MatchRegister.getMatch(matches, id);

        //check that whoever is calling is in the position to wait the other
        require(
            Game.canPlayerWait(game, msg.sender),
            "you can't ask for afk check, you are the one that needs to make a move"
        );
        game.afkFlag = true; //set flag, all other actions unset it
        game.afkTimestamp = block.timestamp; //timestamp blocco attuale
        emit AFKCheckStarted(id, msg.sender, game.afkTimestamp);
    }

    function stopMatch(address id) external payable {
        Game.State storage game = MatchRegister.getMatch(matches, id);

        require(game.afkFlag == true, "you must first ask for AFK check");
        require(
            game.afkTimestamp + Configs.afkMax < block.timestamp,
            "too early to call AFK"
        );

        //must punish who is afk...depends on the status!
        if (game.phase == Game.Phase.ROUND_PLAYING_WAITINGFORMASTER) {
            //end game
            game.phase = Game.Phase.GAME_END;

            // Ensure the contract has enough balance to make the transfer
            require(
                address(this).balance >= game.stake,
                "Insufficient balance in contract"
            );

            if (game.codeMaster == 0) {
                // Transfer the amount to the recipient
                (bool success, ) = game.challenger.call{value: game.stake}(""); //no gas limit?
                require(success, "Transfer failed.");
                emit PunishmentDispensed(
                    id,
                    msg.sender,
                    "punished codemaster, AFK"
                );
            } else if (game.codeMaster == 1) {
                // Transfer the amount to the recipient
                (bool success, ) = game.creator.call{value: game.stake}("");
                require(success, "Transfer failed.");
                emit PunishmentDispensed(
                    id,
                    msg.sender,
                    "punished codemaster, AFK"
                );
            } else {
                revert("internal error"); //just to be safe
            }
        } else if (
            game.phase == Game.Phase.ROUND_PLAYING_WAITINGFORBREAKER ||
            game.phase == Game.Phase.ROUND_END
        ) {
            //if the code master offer the solution but cb dosn't do anything...
            //end game
            game.phase = Game.Phase.GAME_END;

            // Ensure the contract has enough balance to make the transfer
            require(
                address(this).balance >= game.stake,
                "Insufficient balance in contract"
            );

            if (game.codeMaster == 1) {
                // Transfer the amount to the recipient
                (bool success, ) = game.challenger.call{value: game.stake}(""); //no gas limit?
                require(success, "Transfer failed.");
                emit PunishmentDispensed(
                    id,
                    msg.sender,
                    "punished codebreaker, AFK"
                );
            } else if (game.codeMaster == 0) {
                // Transfer the amount to the recipient
                (bool success, ) = game.creator.call{value: game.stake}("");
                require(success, "Transfer failed.");
                emit PunishmentDispensed(
                    id,
                    msg.sender,
                    "punished codebreaker, AFK"
                );
            } else {
                revert("internal error"); //just to be safe
            }
        } else {
            revert("erron invalid state (game end)");
        }
    }
}
