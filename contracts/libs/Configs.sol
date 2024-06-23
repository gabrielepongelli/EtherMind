// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

library Configs {
    /**
     * @dev Config parameters.
     */
    uint internal constant nTurns = 4;
    uint internal constant nGuesses = 12;
    uint internal constant extraPoints = 6;
    uint256 internal constant waitUntil = 90; //holdoff time to give challenger time to dispute
    uint256 internal constant afkMax = 180; //max afk time
    uint256 internal constant avgBlockTime = 12; // Average block time in seconds (for ETH is 12s)
}
