// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./Configs.sol";
import "./Code.sol";
import "./Flags.sol";
import "./GamePhase.sol";
import "./Utils.sol";

/**
 * State of a game.
 */
struct Game {
    address creator; // Player who created the match
    uint creatorScore; // Score of the creator
    address challenger; // Player who joined the match
    uint challengerScore; // Score of the challenger
    uint256 stake; // Money proposed for the game stake (in wei)
    Flags flags; // Array of flags
    Phase phase; // Phase in which the game is currently in.
    bytes32 hashedSolution; // Hash of the solution updated by the CodeMaker
    Code solution; // Solution updated by the CodeMaker
    Code[] guesses; // Guesses attempted by the CodeBreaker
    Feedback[] feedbacks; // Feedbacks notified by the CodeMaker
    uint round; // Number of round currently played
    uint256 disputeBlock; // Last block in which a player can start a dispute
    uint256 afkBlock; // Last block in which a player can be afk
}
using {
    GameOp.newStake,
    GameOp.newPayment,
    GameOp.hasAlreadyPayed,
    GameOp.startAfkTimer,
    GameOp.stopAfkTimer,
    GameOp.isAfkTimerStarted,
    GameOp.canStartAfkTimer,
    GameOp.isAfkTimerEnded,
    GameOp.updateScores,
    GameOp.verifyFeedbacks,
    GameOp.isCodeBreaker,
    GameOp.codeBreaker,
    GameOp.isCodeMaker,
    GameOp.codeMaker,
    GameOp.isCodeMakerWaited,
    GameOp.isCodeBreakerWaited,
    GameOp.submitSolutionHash,
    GameOp.submitGuess,
    GameOp.submitFeedback,
    GameOp.submitFinalSolution,
    GameOp.startNewRound,
    GameOp.isRoundEnded,
    GameOp.endGame,
    GameOp.winner,
    GameOp.startDisputeTimer,
    GameOp.isDisputeTimerEnded
} for Game global;

library GameOp {
    /**
     * Set a new stake proposal. If with this new proposal the stake is fixed,
     * the game goes in the next phase.
     * @param self The game to use.
     * @param player The player that made the proposal.
     * @param stake The amount of wei proposed.
     */
    function newStake(
        Game storage self,
        address player,
        uint256 stake
    ) internal {
        bool isSameProposer = (player == self.creator &&
            self.flags != CHALLENGER_PROPOSED_STAKE) ||
            (player == self.challenger &&
                self.flags == CHALLENGER_PROPOSED_STAKE);

        if (!isSameProposer && self.stake == stake) {
            self.phase = STAKE_PAYMENT;
        } else {
            self.stake = stake;
            self.flags = player == self.creator
                ? self.flags - CHALLENGER_PROPOSED_STAKE
                : self.flags + CHALLENGER_PROPOSED_STAKE;
        }
    }

    /**
     * Register a new stake payment by the specified player.
     * @param self The game to use.
     * @param player The player that made the payment.
     * @return True if both the players have payed after this last payment,
     * false otherwise.
     */
    function newPayment(
        Game storage self,
        address player
    ) internal returns (bool) {
        self.flags = player == self.creator
            ? self.flags + CREATOR_PAYED
            : self.flags + CHALLENGER_PAYED;

        return self.flags == CREATOR_PAYED | CHALLENGER_PAYED;
    }

    /**
     * Check whether the specified player has already payed the stake or not.
     * @param self The game to use.
     * @param player The player to check.
     */
    function hasAlreadyPayed(
        Game storage self,
        address player
    ) internal view returns (bool) {
        return
            self.flags ==
            (player == self.creator ? CREATOR_PAYED : CHALLENGER_PAYED);
    }

    /**
     * Start the AFK timer.
     * @param self The game to use.
     * @param blockNumber The number of the current block.
     */
    function startAfkTimer(Game storage self, uint256 blockNumber) internal {
        self.flags = self.flags + AFK_CHECK_ACTIVE;
        self.afkBlock = blockNumber;
        self.afkBlock =
            blockNumber +
            (Configs.AFK_MAX * Configs.AVG_BLOCK_TIME);
    }

    /**
     * Stop the AFK timer.
     * @param self The game to use.
     */
    function stopAfkTimer(Game storage self) internal {
        self.flags = self.flags - AFK_CHECK_ACTIVE;
    }

    /**
     * Check whether the AFK timer is already started or not.
     * @param self The game to use.
     */
    function isAfkTimerStarted(Game storage self) internal view returns (bool) {
        return self.flags == AFK_CHECK_ACTIVE;
    }

    /**
     * Check whether the AFK timer has passed its end threshold or not.
     * @param self The game to use.
     * @param blockNumber The number of the current block.
     */
    function isAfkTimerEnded(
        Game storage self,
        uint256 blockNumber
    ) internal view returns (bool) {
        return blockNumber > self.afkBlock;
    }

    /**
     * Check whether a player can start the AFK timer or not.
     * @param self The game to use.
     * @param player The player to check.
     */
    function canStartAfkTimer(
        Game storage self,
        address player
    ) internal view returns (bool) {
        return
            (self.isCodeMaker(player) && self.flags == CB_WAITING) ||
            (self.isCodeBreaker(player) && self.flags == CM_WAITING);
    }

    /**
     * Update the scores of the players.
     * @param self The game to use.
     */
    function updateScores(Game storage self) internal {
        // if the last feedback is not the feedback representing a completely
        // correct guess assign extra points
        bool extraPoints = !self
            .feedbacks[self.feedbacks.length - 1]
            .isSuccess();

        if (self.isCodeMaker(self.challenger)) {
            self.challengerScore += extraPoints
                ? self.guesses.length + Configs.EXTRA_POINTS
                : self.guesses.length;
        } else {
            self.creatorScore += extraPoints
                ? self.guesses.length + Configs.EXTRA_POINTS
                : self.guesses.length;
        }
    }

    /**
     * Check if all the feedbacks submitted by the CodeMaker are correct.
     * @param self The game to use.
     */
    function verifyFeedbacks(Game storage self) internal view returns (bool) {
        for (uint256 i = 0; i < self.guesses.length; i++) {
            if (!self.feedbacks[i].verify(self.solution, self.guesses[i])) {
                return false;
            }
        }
        return true;
    }

    /**
     * Check whether the player specified is the CodeBreaker or not.
     * @param self The game to use.
     * @param player The player to check.
     */
    function isCodeBreaker(
        Game storage self,
        address player
    ) internal view returns (bool) {
        return
            (self.flags == IS_CHALLENGER_CODEMAKER &&
                (self.creator == player)) ||
            (self.flags != IS_CHALLENGER_CODEMAKER &&
                (self.challenger == player));
    }

    /**
     * Get the CodeBreaker.
     * @param self The game to use.
     */
    function codeBreaker(Game storage self) internal view returns (address) {
        return
            self.isCodeBreaker(self.creator) ? self.creator : self.challenger;
    }

    /**
     * Check whether the player specified is the CodeMaker or not.
     * @param self The game to use.
     * @param player The player to check.
     */
    function isCodeMaker(
        Game storage self,
        address player
    ) internal view returns (bool) {
        return
            (self.flags != IS_CHALLENGER_CODEMAKER &&
                (self.creator == player)) ||
            (self.flags == IS_CHALLENGER_CODEMAKER &&
                (self.challenger == player));
    }

    /**
     * Get the CodeMaker.
     * @param self The game to use.
     */
    function codeMaker(Game storage self) internal view returns (address) {
        return self.isCodeMaker(self.creator) ? self.creator : self.challenger;
    }

    /**
     * Check whether the CodeMaker is being waited by the CodeBreaker or not.
     * @param self The game to use.
     */
    function isCodeMakerWaited(Game storage self) internal view returns (bool) {
        return self.flags == CM_WAITING;
    }

    /**
     * Check whether the CodeBreaker is being waited by the CodeMaker or not.
     * @param self The game to use.
     */
    function isCodeBreakerWaited(
        Game storage self
    ) internal view returns (bool) {
        return self.flags == CB_WAITING;
    }

    /**
     * Submit a new solution hash.
     * @param self The game to use.
     * @param solutionHash The new solution hash.
     */
    function submitSolutionHash(
        Game storage self,
        bytes32 solutionHash
    ) internal {
        // reset the old guesses and feedbacks since they were relative to the
        // old solution
        delete self.guesses;
        delete self.feedbacks;

        self.hashedSolution = solutionHash;
        self.flags = (self.flags - CM_WAITING) + CB_WAITING;
        self.phase = GUESS_SUBMISSION;
    }

    /**
     * Submit a new guess.
     * @param self The game to use.
     * @param guess The new guess.
     */
    function submitGuess(Game storage self, Code guess) internal {
        self.guesses.push(guess);
        self.flags = (self.flags - CB_WAITING) + CM_WAITING;
        self.phase = FEEDBACK_SUBMISSION;
    }

    /**
     * Submit a new feedback.
     * @param self The game to use.
     * @param feedback The new feedback.
     */
    function submitFeedback(Game storage self, Feedback feedback) internal {
        self.feedbacks.push(feedback);

        // if is round end reached
        if (
            (self.guesses.length == Configs.N_GUESSES) ||
            (self.feedbacks[self.feedbacks.length - 1].isSuccess())
        ) {
            // we do not reset the CM_WAITING flag because now it has to send
            // the code
            self.phase = ROUND_END;
        } else {
            self.phase = GUESS_SUBMISSION;
            self.flags = (self.flags - CM_WAITING) + CB_WAITING;
        }
    }

    /**
     * Submit the final solution.
     * @param self The game to use.
     * @param solution The solution.
     * @param salt The salt used in the calculation of the solution hash.
     * @return True if the final solution matches with the hash submitted at
     * the beginning of the round, false otherwise.
     */
    function submitFinalSolution(
        Game storage self,
        Code solution,
        bytes4 salt
    ) internal returns (bool) {
        self.solution = solution;
        self.flags = (self.flags - CM_WAITING) + CB_WAITING;
        return self.hashedSolution == solution.hashCode(salt);
    }

    /**
     * Start a new round.
     * @param self The game to use.
     * @return A couple of addresses, where the first is the address of the
     * CodeMaker, and the second is the address of the CodeBreaker.
     */
    function startNewRound(
        Game storage self
    ) internal returns (address, address) {
        if (self.phase == STAKE_PAYMENT) {
            // randomly choose the CodeMaker
            self.flags = (Utils.rand(1) % 2 == 0)
                ? self.flags
                : self.flags + IS_CHALLENGER_CODEMAKER;
        } else {
            // swap CodeMaker and CodeBreaker
            self.flags = self.flags == IS_CHALLENGER_CODEMAKER
                ? self.flags - IS_CHALLENGER_CODEMAKER
                : self.flags + IS_CHALLENGER_CODEMAKER;
        }

        // new game status
        self.phase = ROUND_START;
        self.flags = self.flags + CM_WAITING;
        self.round++;

        return (self.codeMaker(), self.codeBreaker());
    }

    /**
     * Check if the round is already ended.
     * @param self The game to use.
     */
    function isRoundEnded(Game storage self) internal view returns (bool) {
        return self.phase == ROUND_END;
    }

    /**
     * Try to end the game.
     * @param self The game to use.
     * @return True if the game is ended, false otherwise.
     */
    function endGame(Game storage self) internal returns (bool) {
        if (self.round == Configs.N_ROUNDS) {
            // if this is the last round, end the game
            self.phase = GAME_END;
            return true;
        }

        return false;
    }

    /**
     * Get the winner of the game.
     * @param self The game to use.
     */
    function winner(Game storage self) internal view returns (address) {
        if (self.creatorScore > self.challengerScore) {
            return self.creator;
        } else if (self.creatorScore < self.challengerScore) {
            return self.challenger;
        } else {
            return address(0);
        }
    }

    /**
     * Start the dispute timer.
     * @param self The game to use.
     * @param blockNumber The number of the current block.
     */
    function startDisputeTimer(
        Game storage self,
        uint256 blockNumber
    ) internal {
        self.disputeBlock =
            blockNumber +
            (Configs.WAIT_UNTIL * Configs.AVG_BLOCK_TIME);
    }

    /**
     * Check whether the dispute timer has passed its end threshold or not.
     * @param self The game to use.
     * @param blockNumber The number of the current block.
     */
    function isDisputeTimerEnded(
        Game storage self,
        uint256 blockNumber
    ) internal view returns (bool) {
        return blockNumber > self.disputeBlock;
    }
}
