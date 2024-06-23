// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./Configs.sol";
import "./Code.sol";

library Game {
    /**
     * Phases in which a game can be.
     */
    enum Phase {
        NOT_CREATED, // The game has not been created yet
        STAKE_DECISION, // The players need to decide the stake value
        STAKE_PAYMENT, // The players need to pay the stake
        GAME_STARTED, // The game is actually started
        ROUND_PLAYING_WAITINGFORMASTER,
        ROUND_PLAYING_WAITINGFORBREAKER,
        ROUND_END,
        GAME_END
    }

    /**
     * Internal state of a game.
     */
    struct State {
        address payable creator; // Player who created the match
        address payable challenger; // Player who joined the match
        uint256 stake; // Money proposed for the game stake (in wei)
        uint proposer; // Who proposed the stake: 0 = creator, 1 = challenger
        uint payment; // Who has already payed the stake: 0 = none, 1 = creator, 2 = challenger, 3 = both
        Phase phase; // Phase in which the game currently is in.
        bytes32 hashedSolution; //uploaded hash
        Codes.Code solution;
        uint codeMaker; //who is currently the codemaster? 0 creator 1 challenger, or maybe bool is safer
        bool afkFlag; //true = set false =unset
        uint256 afkBlockTimestamp; //to keep track of the maximum ammount of time a player can be afk
        Codes.Code[] movesHistory;
        Codes.Feedback[] feedbackHistory; //in theory the link between movesHistory and feedback History is implicit...depend on n of feedback and position (ex. mH[1]=fH[1])
        uint round;
        uint creatorScore; //poins counter, all slots in storage are implicitly zero until set to something else.
        uint challengerScore;
        uint256 holdOffBlockTimestamp; //time to start dispute
    }

    /**
     * Initialize a game state to an initial state.
     * @param self The game state to initialize.
     * @param creator The player who created the game.
     * @param challenger The player who joined the game.
     */
    function initState(
        State storage self,
        address creator,
        address challenger
    ) internal {
        self.creator = payable(creator);
        self.challenger = payable(challenger);
        self.stake = 0;
        self.proposer = 0;
        self.phase = Game.Phase.NOT_CREATED;
        self.payment = 0;
    }

    /**
     * Check whether the specified player is the same that proposed the current
     * stake.
     * @param self The state of the game to modify.
     * @param player The player to check.
     */
    function isSameProposer(
        State storage self,
        address player
    ) internal view returns (bool) {
        return
            (player == self.creator && self.proposer == 0) ||
            (player == self.challenger && self.proposer == 1);
    }

    /**
     * Set a new stake proposal.
     * @param self The state of the game to modify.
     * @param player The player that made the proposal.
     * @param stake The amount of wei proposed.
     */
    function setNewStake(
        State storage self,
        address player,
        uint256 stake
    ) internal {
        self.stake = stake;
        self.proposer = (player == self.creator) ? 0 : 1;
    }

    /**
     * Register a new stake payment by the specified player.
     * @param self The state of the game to modify.
     * @param player The player that made the payment.
     * @return True if both the players have payed after this last payment,
     * false otherwise.
     */
    function newStakePayment(
        State storage self,
        address player
    ) internal returns (bool) {
        if (player == self.creator) {
            self.payment = self.payment == 2 ? 3 : 1;
        } else {
            self.payment = self.payment == 1 ? 3 : 2;
        }

        return self.payment == 3;
    }

    /**
     * Check whether the specified player has already payed the stake or not.
     * @param self The state of the game to modify.
     * @param player The player to check.
     */
    function hasAlreadyPayed(
        State storage self,
        address player
    ) internal view returns (bool) {
        return player == self.creator ? self.payment == 1 : self.payment == 2;
    }

    function actOnAfkFlag(State memory state, bool set) internal pure {
        state.afkFlag = set; //true is set, false is unset
    }

    //the number of guesses that the CodeBreaker needed to crack thesecret code is the number of points awarded to the other player, the CodeMaker.
    //If theCodeBreaker does not end up breaking the code, K extra points are awarded to the CodeMaker.
    function updateScores(State storage game) internal {
        if (game.movesHistory.length == Configs.N_GUESSES) {
            // ran out of guesses give extra points
            if (game.codeMaker == 0) {
                game.creatorScore += game.movesHistory.length;
                game.creatorScore += Configs.EXTRA_POINTS;
            } else {
                game.challengerScore += game.movesHistory.length;
                game.challengerScore += Configs.EXTRA_POINTS;
            }
        } else {
            // give codemaker points
            if (game.codeMaker == 0) {
                game.creatorScore += game.movesHistory.length;
            } else {
                game.challengerScore += game.movesHistory.length;
            }
        }
    }

    // Function to verify the feedback consistency
    function verifyFeedback(State memory game) internal pure returns (bool) {
        for (uint256 i = 0; i < game.movesHistory.length; i++) {
            if (
                !Codes.verifyFeedback(
                    game.feedbackHistory[i],
                    game.solution,
                    game.movesHistory[i]
                )
            ) {
                return false;
            }
        }
        return true;
    }

    function canPlayerWait(
        State memory game,
        address player
    ) internal pure returns (bool) {
        return
            (game.phase == Phase.ROUND_PLAYING_WAITINGFORBREAKER &&
                ((game.codeMaker == 0 && game.creator == player) ||
                    (game.codeMaker == 1 && game.challenger == player))) ||
            (game.phase == Phase.ROUND_PLAYING_WAITINGFORMASTER &&
                ((game.codeMaker == 1 && game.creator == player) ||
                    (game.codeMaker == 0 && game.challenger == player)));
    }

    function isCodeBreaker(
        State memory game,
        address player
    ) internal pure returns (bool) {
        //given match ID i need to figure out who is the codebreaker
        return
            ((game.codeMaker == 1) && (game.creator == player)) ||
            ((game.codeMaker == 0) && (game.challenger == player));
    }

    function getCodeBreaker(State memory game) internal pure returns (address) {
        return
            isCodeBreaker(game, game.creator) ? game.creator : game.challenger;
    }

    function isCodeMaker(
        State memory game,
        address player
    ) internal pure returns (bool) {
        //given match ID i need to figure out who is the codebreaker
        return
            ((game.codeMaker == 0) && (game.creator == player)) ||
            ((game.codeMaker == 1) && (game.challenger == player));
    }

    function getCodeMaker(State memory game) internal pure returns (address) {
        return isCodeMaker(game, game.creator) ? game.creator : game.challenger;
    }

    function invertRoles(State storage game) internal {
        game.codeMaker = (game.codeMaker + 1) % 2;
    }

    function startNewRound(
        State storage game,
        bytes32 hashedSolution
    ) internal {
        // reset history and round data
        delete game.movesHistory;
        delete game.feedbackHistory;
        game.solution = Codes.newCode(0, 0, 0, 0);

        // new game status
        game.phase = Game.Phase.ROUND_PLAYING_WAITINGFORBREAKER;
        game.hashedSolution = hashedSolution;
    }

    function submitGuess(State storage game, Codes.Code guess) internal {
        game.movesHistory.push(guess);
        game.phase = Game.Phase.ROUND_PLAYING_WAITINGFORMASTER;
    }

    function roundEndReached(State memory game) internal pure returns (bool) {
        return
            (game.movesHistory.length == Configs.N_GUESSES) ||
            (
                Codes.isSuccessFeedback(
                    game.feedbackHistory[game.feedbackHistory.length - 1]
                )
            );
    }

    function isRoundEnded(State memory game) internal pure returns (bool) {
        return game.phase == Phase.ROUND_END;
    }

    function submitFeedback(
        State storage game,
        Codes.Feedback feedback
    ) internal {
        game.feedbackHistory.push(feedback);
        game.phase = roundEndReached(game)
            ? Game.Phase.ROUND_END
            : Game.Phase.ROUND_PLAYING_WAITINGFORMASTER;
    }

    function getWinner(State memory game) internal pure returns (address) {
        if (game.creatorScore > game.challengerScore) {
            return game.creator;
        } else if (game.creatorScore < game.challengerScore) {
            return game.challenger;
        } else {
            return address(0);
        }
    }

    function isLastRound(State memory game) internal pure returns (bool) {
        return game.round == Configs.N_TURNS;
    }
}
