// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

library Game {
    /**
     * Phases in which a game can be.
     */
    enum Phase {
        NOT_CREATED, // The game has not been created yet
        STAKE_DECISION, // The players need to decide the stake value
        STAKE_PAYMENT, // The players need to pay the stake
        GAME_STARTED, // The game is actually started
        OTHER // Placeholder for future phases. TO BE REMOVED
    }

    /**
     * Internal state of a game.
     */
    struct State {
        address creator; // Player who created the match
        address challenger; // Player who joined the match
        uint256 stake; // Money proposed for the game stake (in wei)
        uint proposer; // Who proposed the stake: 0 = creator, 1 = challenger
        uint payment; // Who has already payed the stake: 0 = none, 1 = creator, 2 = challenger, 3 = both
        Phase phase; // Phase in which the game currently is in.
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
        self.creator = creator;
        self.challenger = challenger;
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
}
