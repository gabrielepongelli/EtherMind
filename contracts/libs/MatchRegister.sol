// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./Game.sol";

/**
 * Record representing a match.
 */
struct MatchRecord {
    Game game; // Game data
    uint pos; // Position in the array of pending matches incremented by 1. The value of 0 represent an invalid position in the array.
}

/**
 * Structure that handles matchmaking.
 */
struct MatchRegister {
    mapping(address => MatchRecord) existingMatches; // All the matches that currently exist
    address[] pendingMatches; // Addresses of publicly accessible pending matches
}

using {
    MatchRegisterOp.addMatch,
    MatchRegisterOp.getMatch,
    MatchRegisterOp.isValid,
    MatchRegisterOp.startMatch,
    MatchRegisterOp.deleteMatch,
    MatchRegisterOp.nPendingMatches,
    MatchRegisterOp.getPending
} for MatchRegister global;

library MatchRegisterOp {
    /**
     * Create a new match.
     * @param self Matchmaking structure to use.
     * @param id The id of the new match. Must be greater than 0.
     * @param creator The player who created the game.
     * @param challenger The player who joined the game.
     * @return True if the new match is successfully created, false if a match
     * with the given id already exists or if an invalid id has been provided.
     */
    function addMatch(
        MatchRegister storage self,
        address id,
        address creator,
        address challenger
    ) internal returns (bool) {
        if (id == address(0)) {
            return false;
        }

        if (self.existingMatches[id].game.phase != NOT_CREATED) {
            return false;
        }

        bool isPub = challenger == address(0);
        uint pos = 0;
        if (isPub) {
            self.pendingMatches.push(id);
            pos = self.pendingMatches.length;
        }

        MatchRecord storage rec = self.existingMatches[id];
        rec.pos = pos;
        rec.game.flags = isPub ? rec.game.flags : rec.game.flags + IS_PRIVATE;
        rec.game.creator = creator;
        rec.game.challenger = challenger;
        rec.game.phase = PENDING;
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
        MatchRegister storage self,
        address id
    ) internal view returns (Game storage) {
        return self.existingMatches[id].game;
    }

    /**
     * Check whether the id provided is valid.
     * @param self Matchmaking structure to use.
     * @param id The id of the match to check.
     */
    function isValid(
        MatchRegister storage self,
        address id
    ) internal view returns (bool) {
        if (id == address(0)) {
            return false;
        }

        return self.existingMatches[id].game.phase != NOT_CREATED;
    }

    /**
     * Set a match as started.
     * @param self Matchmaking structure to use.
     * @param id The id of the match to modify.
     * @param finalChallenger The challenger of the match that joined.
     * @return True if the modification succeeded. False if the match is
     * already started or the match do not exist.
     */
    function startMatch(
        MatchRegister storage self,
        address id,
        address finalChallenger
    ) internal returns (bool) {
        MatchRecord storage rec = self.existingMatches[id];
        if (rec.game.phase != PENDING) {
            return false;
        }

        if (rec.pos > 0) {
            if (rec.pos != self.pendingMatches.length) {
                // the match is open, but is not the last one insterted
                // so we swap it with the one in  the last position

                self.pendingMatches[rec.pos - 1] = self.pendingMatches[
                    self.pendingMatches.length
                ];

                self.existingMatches[self.pendingMatches[rec.pos - 1]].pos = rec
                    .pos;
            }

            // now we can safely pop the last element of the pending matches array
            self.pendingMatches.pop();
            rec.pos = 0;
        }

        rec.game.phase = STAKE_DECISION;
        rec.game.challenger = payable(finalChallenger);
        return true;
    }

    /**
     * Delete an already started match.
     * @param self Matchmaking structure to use.
     * @param id The id of the match to delete.
     * @return True if the match is successfully deleted, or false if the match
     * was not already started.
     */
    function deleteMatch(
        MatchRegister storage self,
        address id
    ) internal returns (bool) {
        if (self.existingMatches[id].game.phase == (PENDING | NOT_CREATED)) {
            // the match is not started
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
        MatchRegister storage self
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
        MatchRegister storage self,
        uint i
    ) internal view returns (address, Game storage) {
        address addr = self.pendingMatches[i];
        return (addr, self.existingMatches[addr].game);
    }
}
