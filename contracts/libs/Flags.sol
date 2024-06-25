// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

/**
 * Bits:
 * - [b0] IS_PRIVATE: is the current match private: 0 = no, 1 = yes
 * - [b1] CHALLENGER_PROPOSED_STAKE: is the last stake proposal made by the 
 *                                   challenger: 0 = no, 1 = yes
 * - [b2] CREATOR_PAYED: has the creator already payed: 0 = no, 1 = yes
 * - [b3] CHALLENGER_PAYED: has the challenger already payed: 0 = no, 1 = yes
 * - [b4] IS_CHALLENGER_CODEMAKER: is the challenger currently the CodeMaker: 
 *                                 0 = no, 1 = yes
 * - [b5] AFK_CHECK_ACTIVE: is the afk check active: 0 = no, 1 = yes
 * - [b6] CB_WAITING: are we waiting for the codebreaker: 0 = no, 1 = yes
 * - [b7] CM_WAITING: are we waiting for the codemaker: 0 = no, 1 = yes
 */
type Flags is uint8;
using {_combine as |, _isSet as ==, _isNotSet as !=, _set as +, _reset as -} for Flags global;

Flags constant IS_PRIVATE = Flags.wrap(1);
Flags constant CHALLENGER_PROPOSED_STAKE = Flags.wrap(1 << 1);
Flags constant CREATOR_PAYED = Flags.wrap(1 << 2);
Flags constant CHALLENGER_PAYED = Flags.wrap(1 << 3);
Flags constant IS_CHALLENGER_CODEMAKER = Flags.wrap(1 << 4);
Flags constant AFK_CHECK_ACTIVE = Flags.wrap(1 << 5);
Flags constant CB_WAITING = Flags.wrap(1 << 6);
Flags constant CM_WAITING = Flags.wrap(1 << 7);

/**
 * Combine the flags specified.
 * @param f1 The first operator.
 * @param f2 The second operator.
 */
function _combine(Flags f1, Flags f2) pure returns (Flags) {
    return Flags.wrap(Flags.unwrap(f1) | Flags.unwrap(f2));
}

/**
 * Check whether all the flags of a filter are set or not.
 * @param flags The flag array to use.
 * @param filter Filter which specifies the flag(s) to check.
 */
function _isSet(Flags flags, Flags filter) pure returns (bool) {
    return
        (Flags.unwrap(flags) & Flags.unwrap(filter)) ==
        Flags.unwrap(filter);
}

function _isNotSet(Flags flags, Flags filter) pure returns (bool) {
    return !_isSet(flags, filter);
}

/**
 * Set a value for a specific flag.
 * @param flags The flag array to use.
 * @param filter Filter which specifies the flag(s) to set.
 */
function _set(Flags flags, Flags filter) pure returns (Flags) {
    return Flags.wrap(Flags.unwrap(flags) | Flags.unwrap(filter));
}

/**
 * Reset a value for a specific flag.
 * @param flags The flag array to use.
 * @param filter Filter which specifies the flag(s) to reset.
 */
function _reset(
    Flags flags,
    Flags filter
) pure returns (Flags) {
    return Flags.wrap(Flags.unwrap(flags) & ~Flags.unwrap(filter));
}
