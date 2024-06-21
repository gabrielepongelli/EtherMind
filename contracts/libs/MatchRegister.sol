// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./Game.sol";

/**
 * States in which a match can be.
 */
enum MatchState {
    DO_NOT_EXIST, // A match that has not been created
    PENDING, // A pending match
    STARTED // A match that is already started
}

/**
 * Record representing a match.
 */
struct MatchRecord {
    Game.State game; // Game data
    MatchState state; // State of the match
    uint pos; // Position in the array of pending matches incremented by 2. The value of 0 represent an invalid position in the array, instead a value of 1 represent a private pending match.
}

/**
 * Structure that handles matchmaking.
 */
struct Matches {
    mapping(address => MatchRecord) existingMatches; // All the matches that currently exist
    address[] pendingMatches; // Addresses of publicly accessible pending matches
}

library MatchRegister {
    /**
     * Create a new match.
     * @param self Matchmaking structure to use.
     * @param id The id of the new match. Must be greater than 0.
     * @param state The internal state of the new match.
     * @param isPrivate Specify whether the new match will be publicly
     * accessible or not.
     * @return True if the new match is successfully created, false if a match
     * with the given id already exists or if an invalid id has been provided.
     */
    function addMatch(
        Matches storage self,
        address id,
        Game.State memory state,
        bool isPrivate
    ) internal returns (bool) {
        if (id == address(0)) {
            return false;
        }

        if (self.existingMatches[id].state != MatchState.DO_NOT_EXIST) {
            return false;
        }

        uint pos = 1;
        if (!isPrivate) {
            self.pendingMatches.push(id);
            pos = self.pendingMatches.length + 1;
        }

        self.existingMatches[id] = MatchRecord({
            game: state,
            state: MatchState.PENDING,
            pos: pos
        });

        return true;
    }

    /**
     * Get the game data of a match.
     * @param self Matchmaking structure to use.
     * @param id The id of the match to retrieve. It is not checked if a match
     * associated to this id exists.
     * @return The state of the specified match.
     */
    function getMatch(
        Matches storage self,
        address id
    ) internal view returns (Game.State storage) {
        return self.existingMatches[id].game;
    }

    /**
     * Check whether the id provided is valid.
     * @param self Matchmaking structure to use.
     * @param id The id of the match to check.
     */
    function isValid(
        Matches storage self,
        address id
    ) internal view returns (bool) {
        if (id == address(0)) {
            return false;
        }

        return self.existingMatches[id].state != MatchState.DO_NOT_EXIST;
    }

    /**
     * Set a match as started.
     * @param self Matchmaking structure to use.
     * @param id The id of the match to modify.
     * @return True if the modification succeeded. False if the match is
     * already started or the match do not exist.
     */
    function setMatchStarted(
        Matches storage self,
        address id
    ) internal returns (bool) {
        MatchRecord storage rec = self.existingMatches[id];
        if (
            rec.state == MatchState.STARTED ||
            rec.state == MatchState.DO_NOT_EXIST
        ) {
            return false;
        }

        if (rec.pos > 1) {
            if (rec.pos != self.pendingMatches.length) {
                // the match is open, but is not the last one insterted
                // so we swap it with the one in  the last position

                self.pendingMatches[rec.pos - 2] = self.pendingMatches[
                    self.pendingMatches.length - 1
                ];

                self.existingMatches[self.pendingMatches[rec.pos - 2]].pos = rec
                    .pos;
            }

            // now we can safely pop the last element of the pending matches array
            self.pendingMatches.pop();
            rec.pos = 0;
        }

        rec.state = MatchState.STARTED;
        return true;
    }

    /**
     * Check whether a match is pending and publicly accessible or not.
     * @param self Matchmaking structure to use.
     * @param id The id of the match to check.
     */
    function isPublicPending(
        Matches storage self,
        address id
    ) internal view returns (bool) {
        return self.existingMatches[id].pos > 1;
    }

    /**
     * Check whether a match is pending and private or not.
     * @param self Matchmaking structure to use.
     * @param id The id of the match to check.
     */
    function isPrivatePending(
        Matches storage self,
        address id
    ) internal view returns (bool) {
        return self.existingMatches[id].pos == 1;
    }

    /**
     * Check whether a match is already started or not.
     * @param self Matchmaking structure to use.
     * @param id The id of the match to check.
     */
    function isStarted(
        Matches storage self,
        address id
    ) internal view returns (bool) {
        return self.existingMatches[id].state == MatchState.STARTED;
    }

    /**
     * End an already started match.
     * @param self Matchmaking structure to use.
     * @param id The id of the match to end.
     * @return True if the match is successfully ended, or false if the match
     * was not already started.
     */
    function endMatch(
        Matches storage self,
        address id
    ) internal returns (bool) {
        if (self.existingMatches[id].state != MatchState.STARTED) {
            return false;
        }

        delete self.existingMatches[id];
        return true;
    }

    /**
     * Get the total number of publicly accessible pending matche.
     * @param self Matchmaking structure to use.
     */
    function nPendingMatches(
        Matches storage self
    ) internal view returns (uint) {
        return self.pendingMatches.length;
    }

    /**
     * Get the game data of the publicly accessible pending match specified.
     * @param self Matchmaking structure to use.
     * @param i Index of the public pending match to retrieve. It is assumed
     * that i is less than the total number of public pending matches (see
     * nPendingMatches).
     */
    function getPending(
        Matches storage self,
        uint i
    ) internal view returns (address, Game.State storage) {
        address addr = self.pendingMatches[i];
        return (addr, self.existingMatches[addr].game);
    }
}
