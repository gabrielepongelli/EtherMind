// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./Configs.sol";

library Game {
    //struct for game "code"
    struct Code {
        uint pos1;
        uint pos2;
        uint pos3;
        uint pos4;
    }

    //struct for game "feedback"
    struct Feedback {
        uint wrong_pos;
        uint correct;
    }

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
        Code solution;
        uint codeMaster; //who is currently the codemaster? 0 creator 1 challenger, or maybe bool is safer
        bool afkFlag; //true = set false =unset
        uint256 afkBlockTimestamp; //to keep track of the maximum ammount of time a player can be afk
        Code[] movesHistory;
        Feedback[] feedbackHistory; //in theory the link between movesHistory and feedback History is implicit...depend on n of feedback and position (ex. mH[1]=fH[1])
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

    //true: all ok false:problem
    function checkCodeFromat(Code memory code) internal pure returns (bool) {
        //all guessable colors go from 1 to 6 (6 colors in 4 positions)
        return
            code.pos1 > 0 &&
            code.pos1 < 7 &&
            code.pos2 > 0 &&
            code.pos2 < 7 &&
            code.pos3 > 0 &&
            code.pos3 < 7 &&
            code.pos4 > 0 &&
            code.pos4 < 7;
    }

    //true: all ok false:problem
    function checkFeedbackFromat(
        Feedback memory feedback
    ) internal pure returns (bool) {
        //all guessable colors go from 1 to 6 (6 colors in 4 positions)
        return
            (feedback.wrong_pos < 0 || feedback.wrong_pos > 4) ||
            (feedback.correct < 0 || feedback.correct > 4) ||
            ((feedback.correct + feedback.wrong_pos) > 4);
    }

    function hashCode(Code memory code) internal pure returns (bytes32) {
        // Ensure the numbers are single digits
        /*require(
            num1 < 7 &&
                num2 < 7 &&
                num3 < 7 &&
                num4 < 7 &&
                num1 > 0 &&
                num2 > 0 &&
                num3 > 0 &&
                num4 > 0,
            "Each number must be a valid choise (1-6)"
        );*/
        // Concatenate the numbers by shifting their positions
        uint concatenatedNumber = (code.pos1 * 1000) +
            (code.pos2 * 100) +
            (code.pos3 * 10) +
            code.pos4;
        // Hash the concatenated result using sha
        return sha256(abi.encodePacked(concatenatedNumber));
    }

    //the number of guesses that the CodeBreaker needed to crack thesecret code is the number of points awarded to the other player, the CodeMaker.
    //If theCodeBreaker does not end up breaking the code, K extra points are awarded to the CodeMaker.
    function updateScores(State storage game) internal {
        if (game.movesHistory.length == Configs.nGuesses) {
            //ran out of guesses give extra points
            if (game.codeMaster == 0) {
                game.creatorScore += game.movesHistory.length;
                game.creatorScore += Configs.extraPoints;
            } else {
                game.challengerScore += game.movesHistory.length;
                game.challengerScore += Configs.extraPoints;
            }
        } else {
            //give codemaker points
            //figure out who is codemaster
            if (game.codeMaster == 0) {
                game.creatorScore += game.movesHistory.length;
            } else {
                game.challengerScore += game.movesHistory.length;
            }
        }
    }

    function equals(
        Code memory c1,
        Code memory c2
    ) internal pure returns (bool) {
        return
            c1.pos1 == c2.pos1 &&
            c1.pos2 == c2.pos2 &&
            c1.pos3 == c2.pos3 &&
            c1.pos4 == c2.pos4;
    }

    // Function to calculate feedback for a given guess
    function generateFeedback(
        Code memory secret,
        Code memory guess
    ) private pure returns (Feedback memory) {
        uint correctPosition = 0;
        uint correctColor = 0;

        uint[4] memory secretArray = [
            secret.pos1,
            secret.pos2,
            secret.pos3,
            secret.pos4
        ];
        uint[4] memory guessArray = [
            guess.pos1,
            guess.pos2,
            guess.pos3,
            guess.pos4
        ];

        bool[4] memory secretMatched;
        bool[4] memory guessMatched;

        // Count the correct positions (and correct colors)
        for (uint256 i = 0; i < 4; i++) {
            if (guessArray[i] == secretArray[i]) {
                correctPosition++;
                secretMatched[i] = true;
                guessMatched[i] = true;
            }
        }

        // Count the correct colors in the wrong positions
        for (uint256 i = 0; i < 4; i++) {
            if (!secretMatched[i]) {
                for (uint256 j = 0; j < 4; j++) {
                    if (!guessMatched[j] && secretArray[i] == guessArray[j]) {
                        //because between CP and WP, the former has priority
                        correctColor++;
                        guessMatched[j] = true; //to not evaluate twice an alement of the guess
                        break;
                    }
                }
            }
        }

        return Feedback(correctColor, correctPosition);
    }

    // Function to verify the feedback consistency
    function verifyFeedback(State memory game) internal pure returns (bool) {
        require(
            game.movesHistory.length == game.feedbackHistory.length,
            "Mismatched guesses and clues length"
        );

        for (uint256 i = 0; i < game.movesHistory.length; i++) {
            Feedback memory generatedFeedback = generateFeedback(
                game.solution,
                game.movesHistory[i]
            );
            if (
                generatedFeedback.correct != game.feedbackHistory[i].correct ||
                generatedFeedback.wrong_pos != game.feedbackHistory[i].wrong_pos
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
                ((game.codeMaster == 0 && game.creator == player) ||
                    (game.codeMaster == 1 && game.challenger == player))) ||
            (game.phase == Phase.ROUND_PLAYING_WAITINGFORMASTER &&
                ((game.codeMaster == 1 && game.creator == player) ||
                    (game.codeMaster == 0 && game.challenger == player)));
    }

    function isCodeBreaker(
        State memory game,
        address player
    ) internal pure returns (bool) {
        //given match ID i need to figure out who is the codebreaker
        return
            ((game.codeMaster == 1) && (game.creator == player)) ||
            ((game.codeMaster == 0) && (game.challenger == player));
    }

    function isCodeMaker(
        State memory game,
        address player
    ) internal pure returns (bool) {
        //given match ID i need to figure out who is the codebreaker
        return
            ((game.codeMaster == 0) && (game.creator == player)) ||
            ((game.codeMaster == 1) && (game.challenger == player));
    }
}
