// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./Configs.sol";
import "./Code.sol";
import "./Flags.sol";
import "./GamePhase.sol";

library Game {
    /**
     * Internal state of a game.
     */
    struct State {
        address payable creator; // Player who created the match
        address payable challenger; // Player who joined the match
        uint256 stake; // Money proposed for the game stake (in wei)
        Flags flags; // Array of flags
        Phase phase; // Phase in which the game is currently in.
        bytes32 hashedSolution; //uploaded hash
        Codes.Code solution;
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
     * @param isPublic Says whether the game public (true) or private (false).
     */
    function initState(
        State storage self,
        address creator,
        address challenger,
        bool isPublic
    ) internal {
        self.creator = payable(creator);
        self.challenger = payable(challenger);
        self.stake = 0;
        self.phase = NOT_CREATED;
        self.flags = isPublic ? self.flags : self.flags + ACCESSIBILITY;
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
            (player == self.creator && self.flags != LAST_STAKE) ||
            (player == self.challenger && self.flags == LAST_STAKE);
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
        self.flags = player == self.creator
            ? self.flags - LAST_STAKE
            : self.flags + LAST_STAKE;
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
        self.flags = player == self.creator
            ? self.flags + CREATOR_PAYED
            : self.flags + CHALLENGER_PAYED;

        return self.flags == CREATOR_PAYED | CHALLENGER_PAYED;
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
        return
            self.flags ==
            (player == self.creator ? CREATOR_PAYED : CHALLENGER_PAYED);
    }

    function startAfkCheck(State storage self, uint256 blockNumber) internal {
        self.flags = self.flags + AFK_CHECK;
        self.afkBlockTimestamp = blockNumber;
    }

    function stopAfkCheck(State storage self) internal {
        self.flags = self.flags - AFK_CHECK;
    }

    function isAfkCheckActive(State memory self) internal pure returns (bool) {
        return self.flags == AFK_CHECK;
    }

    //the number of guesses that the CodeBreaker needed to crack thesecret code is the number of points awarded to the other player, the CodeMaker.
    //If theCodeBreaker does not end up breaking the code, K extra points are awarded to the CodeMaker.
    function updateScores(State storage self) internal {
        if (self.movesHistory.length == Configs.N_GUESSES) {
            // ran out of guesses give extra points
            if (self.flags == WHOIS) {
                self.challengerScore += self.movesHistory.length;
                self.challengerScore += Configs.EXTRA_POINTS;
            } else {
                self.creatorScore += self.movesHistory.length;
                self.creatorScore += Configs.EXTRA_POINTS;
            }
        } else {
            // give codemaker points
            if (self.flags == WHOIS) {
                self.challengerScore += self.movesHistory.length;
            } else {
                self.creatorScore += self.movesHistory.length;
            }
        }
    }

    // Function to verify the feedback consistency
    function verifyFeedback(State memory self) internal pure returns (bool) {
        for (uint256 i = 0; i < self.movesHistory.length; i++) {
            if (
                !Codes.verifyFeedback(
                    self.feedbackHistory[i],
                    self.solution,
                    self.movesHistory[i]
                )
            ) {
                return false;
            }
        }
        return true;
    }

    function isCodeBreaker(
        State memory self,
        address player
    ) internal pure returns (bool) {
        return
            (self.flags == WHOIS && (self.creator == player)) ||
            (self.flags != WHOIS && (self.challenger == player));
    }

    function getCodeBreaker(State memory self) internal pure returns (address) {
        return
            isCodeBreaker(self, self.creator) ? self.creator : self.challenger;
    }

    function isCodeMaker(
        State memory self,
        address player
    ) internal pure returns (bool) {
        return
            (self.flags != WHOIS && (self.creator == player)) ||
            (self.flags == WHOIS && (self.challenger == player));
    }

    function getCodeMaker(State memory self) internal pure returns (address) {
        return isCodeMaker(self, self.creator) ? self.creator : self.challenger;
    }

    function invertRoles(State storage self) internal {
        self.flags = self.flags == WHOIS
            ? self.flags - WHOIS
            : self.flags + WHOIS;
    }

    function canPlayerWait(
        State memory self,
        address player
    ) internal pure returns (bool) {
        return
            (isCodeMaker(self, player) && self.flags == CB_WAITING) ||
            (isCodeBreaker(self, player) && self.flags == CM_WAITING);
    }

    function startNewRound(
        State storage self,
        bytes32 hashedSolution
    ) internal {
        // reset history and round data
        delete self.movesHistory;
        delete self.feedbackHistory;
        self.solution = Codes.newCode(0, 0, 0, 0);

        // new game status
        self.phase = ROUND_PLAYING;
        self.flags = self.flags + CB_WAITING;
        self.hashedSolution = hashedSolution;
    }

    function submitGuess(State storage self, Codes.Code guess) internal {
        self.movesHistory.push(guess);
        self.flags = (self.flags - CB_WAITING) + CM_WAITING;
    }

    function roundEndReached(State memory self) internal pure returns (bool) {
        return
            (self.movesHistory.length == Configs.N_GUESSES) ||
            (
                Codes.isSuccessFeedback(
                    self.feedbackHistory[self.feedbackHistory.length - 1]
                )
            );
    }

    function isRoundEnded(State memory self) internal pure returns (bool) {
        return self.phase == ROUND_END;
    }

    function submitFeedback(
        State storage self,
        Codes.Feedback feedback
    ) internal {
        self.feedbackHistory.push(feedback);
        self.flags = self.flags - CM_WAITING;
        self.phase = roundEndReached(self) ? ROUND_END : ROUND_PLAYING;
    }

    function getWinner(State memory self) internal pure returns (address) {
        if (self.creatorScore > self.challengerScore) {
            return self.creator;
        } else if (self.creatorScore < self.challengerScore) {
            return self.challenger;
        } else {
            return address(0);
        }
    }

    function isLastRound(State memory self) internal pure returns (bool) {
        return self.round == Configs.N_TURNS;
    }
}
