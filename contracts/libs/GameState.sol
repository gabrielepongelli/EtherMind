// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

library Game {
    struct State {
        address creator; // Player who created the match
        address challenger; // Player who joined the match
        uint stake; // Money proposed for the game stake (in wei)
    }
}
