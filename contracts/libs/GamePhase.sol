// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

/**
 * A game can be in one of the following phases:
 * 1. NOT_CREATED: the game has not been created yet.
 * 2. PENDING: the game is created, but is waiting for a challenger.
 * 3. STAKE_DECISION: the players need to decide the stake value.
 * 4. STAKE_PAYMENT: the players need to pay the stake.
 * 5. ROUND_START: a new round is started.
 * 6. GUESS_SUBMISSION: the CodeBreaker has to upload its guess.
 * 7. FEEDBACK_SUBMISSION: the CodeMaker has to upload its feedback.
 * 7. ROUND_END: the current round is ended.
 * 8. GAME_END: the game is finished.
 */
type Phase is uint8;
using {_equals as ==, _nequals as !=, _combine as |} for Phase global;

Phase constant NOT_CREATED = Phase.wrap(0);
Phase constant PENDING = Phase.wrap(1);
Phase constant STAKE_DECISION = Phase.wrap(1 << 1);
Phase constant STAKE_PAYMENT = Phase.wrap(1 << 2);
Phase constant ROUND_START = Phase.wrap(1 << 3);
Phase constant GUESS_SUBMISSION = Phase.wrap(1 << 4);
Phase constant FEEDBACK_SUBMISSION = Phase.wrap(1 << 5);
Phase constant ROUND_END = Phase.wrap(1 << 6);
Phase constant GAME_END = Phase.wrap(1 << 7);

/**
 * Check if a phase correspond to one of the phase(s) specified.
 * @param phase The phase to test.
 * @param selector A collection of one or more phases to test.
 */
function _equals(Phase phase, Phase selector) pure returns (bool) {
    return Phase.unwrap(selector) == Phase.unwrap(NOT_CREATED)
             ? Phase.unwrap(phase) == Phase.unwrap(NOT_CREATED)
             : ((Phase.unwrap(phase) & Phase.unwrap(selector)) > 0);
}

function _nequals(Phase phase, Phase selector) pure returns (bool) {
    return !_equals(phase, selector);
}

/**
 * Create a selector which is the combination of the 2 phases specified.
 * @param p1 First phase.
 * @param p2 Second phase.
 */
function _combine(Phase p1, Phase p2) pure returns (Phase) {
    return Phase.wrap(Phase.unwrap(p1) | Phase.unwrap(p2));
}