// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

library Configs {
    /**
     * @dev Config parameters.
     */
    uint256 internal constant N_ROUNDS = 4;
    uint256 internal constant N_GUESSES = 12;
    uint256 internal constant EXTRA_POINTS = 6;
    uint256 internal constant WAIT_UNTIL = 90; //holdoff time to give challenger time to dispute
    uint256 internal constant AFK_MAX = 180; //max afk time
    uint256 internal constant AVG_BLOCK_TIME = 12; // Average block time in seconds (for ETH is 12s)
}
