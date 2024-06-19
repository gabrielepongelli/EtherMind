// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "./Game.sol";

/**
 * States in which a match can be.
 */
enum MatchState {
    DO_NOT_EXIST, // A match that has not been created
    OPEN_PENDING, // A pending publicly-accessible match
    PRIVATE_PENDING, // A pending private match
    STARTED // A match that is already started
}

/**
 * Node representing a match inside the circular doubly-linked list of pending
 * publicly-accessible matches.
 */
struct MatchNode {
    Game.State game; // Game data
    address next; // Next pending match in the circular doubly-linked list
    address prev; // Previous pending match in the circular doubly-linked list
    MatchState state; // State of the match.
}

/**
 * Structure that handles matchmaking.
 */
struct Matches {
    mapping(address => MatchNode) existingMatches; // All the matches that currently exist
    address head; // First pending match in the circular doubly-linked list
    uint nPendingMatches; // Total number of existing pending publicly-accessible matches
}

library MatchRegister {
    type Iterator is address;

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
        Game.State calldata state,
        bool isPrivate
    ) internal returns (bool) {
        if (id == address(0)) {
            return false;
        }

        if (self.existingMatches[id].state != MatchState.DO_NOT_EXIST) {
            return false;
        }

        if (isPrivate) {
            self.existingMatches[id] = MatchNode({
                game: state,
                next: address(0),
                prev: address(0),
                state: MatchState.PRIVATE_PENDING
            });
        } else {
            address newPrev = self.existingMatches[self.head].prev;
            address newNext = self.head;

            if (self.head == address(0)) {
                newPrev = id;
                newNext = id;
            }

            self.existingMatches[id] = MatchNode({
                game: state,
                next: newNext,
                prev: newPrev,
                state: MatchState.OPEN_PENDING
            });

            self.existingMatches[newNext].prev = id;
            self.existingMatches[newPrev].next = id;
            self.head = id;

            self.nPendingMatches++;
        }

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
        MatchNode storage node = self.existingMatches[id];
        if (
            node.state == MatchState.STARTED ||
            node.state == MatchState.DO_NOT_EXIST
        ) {
            return false;
        }

        if (node.state == MatchState.OPEN_PENDING) {
            self.existingMatches[node.next].prev = node.prev;
            self.existingMatches[node.prev].next = node.next;

            node.prev = address(0);
            node.next = address(0);

            self.nPendingMatches--;

            if (id == self.head) {
                self.head = node.next;
            }
        }

        node.state = MatchState.STARTED;
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
        return self.existingMatches[id].state == MatchState.OPEN_PENDING;
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
        return self.existingMatches[id].state == MatchState.PRIVATE_PENDING;
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
        return self.nPendingMatches;
    }

    /**
     * Get an iterator over the publicly accessible pending matches.
     * @param self Matchmaking structure to use.
     */
    function iteratePendingMatches(
        Matches storage self
    ) internal view returns (Iterator) {
        return Iterator.wrap(self.head);
    }

    /**
     * Get the next publicly accessible pending match.
     * @param self Matchmaking structure to use.
     * @param it iterator to use.
     */
    function iterateNext(
        Matches storage self,
        Iterator it
    ) internal view returns (Iterator) {
        return Iterator.wrap(self.existingMatches[Iterator.unwrap(it)].next);
    }

    /**
     * Get the previous publicly accessible pending match.
     * @param self Matchmaking structure to use.
     * @param it iterator to use.
     */
    function iterateBack(
        Matches storage self,
        Iterator it
    ) internal view returns (Iterator) {
        return Iterator.wrap(self.existingMatches[Iterator.unwrap(it)].prev);
    }

    /**
     * Get the game data of the publicly accessible pending match.
     * @param self Matchmaking structure to use.
     * @param it iterator to use.
     */
    function iterateGet(
        Matches storage self,
        Iterator it
    ) internal view returns (address, Game.State storage) {
        address addr = Iterator.unwrap(it);
        return (addr, self.existingMatches[addr].game);
    }
}
