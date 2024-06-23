// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

library Codes {
    uint8 internal constant N_COLORS = 6;
    uint8 internal constant N_COMBINATIONS = 4;

    /**
     * A code represents a combination of colors.
     *
     * There are a total of N_COLORS possible colors. They are represented with
     * values in [0, N_COLORS-1].
     *
     * There are N_COMBINATIONS combinations of colors.
     */
    type Code is uint16;

    /**
     * Create a new code.
     * @param c0 The code of the first color. It is assumed to be less than N_COLORS.
     * @param c1 The code of the second color. It is assumed to be less than N_COLORS.
     * @param c2 The code of the third color. It is assumed to be less than N_COLORS.
     * @param c3 The code of the fourth color. It is assumed to be less than N_COLORS.
     */
    function newCode(
        uint8 c0,
        uint8 c1,
        uint8 c2,
        uint8 c3
    ) internal pure returns (Code) {
        return Code.wrap(c0 | (c1 << 3) | (c2 << 6) | (c3 << 9));
    }

    /**
     * Get the n-th color value from the code.
     * @param code The code to use. It is assumed to be in a valid format.
     * @param n The position of the color to pick. It is assumed that it is
     * less than 4.
     */
    function getColor(Code code, uint8 n) internal pure returns (uint8) {
        return uint8(Code.unwrap(code) & (7 << (n * 3)));
    }

    /**
     * Check that a given code is in the correct format (see Code).
     * @param code The code to check.
     */
    function checkFromat(Code code) internal pure returns (bool) {
        // all guessable colors go from 0 to COLOR_VALUE_MAX (6 colors in 4 positions)
        return
            getColor(code, 0) <= N_COLORS - 1 &&
            getColor(code, 1) <= N_COLORS - 1 &&
            getColor(code, 2) <= N_COLORS - 1 &&
            getColor(code, 3) <= N_COLORS - 1;
    }

    /**
     * Produce an hash of the given code.
     * @param code The code to be hashed.
     * @return The hash of code.
     */
    function hashCode(Code code) internal pure returns (bytes32) {
        return sha256(abi.encodePacked(Code.unwrap(code)));
    }

    /**
     * Check if the codes specified are equal.
     * @param c1 First code to check.
     * @param c2 Second code to check.
     * @return True if c1 == c2, false otherwise.
     */
    function equals(Code c1, Code c2) internal pure returns (bool) {
        return Code.unwrap(c1) == Code.unwrap(c2);
    }

    /**
     * A feedback is a concept linked to a code.
     *
     * For a code, a feedback contains 2 values:
     * - CP: the number of correct colors in the correct position.
     * - NP: the number of correct colors in the wrong position.
     */
    type Feedback is uint8;

    /**
     * Create a new feedback.
     * @param cp The number of correct colors in the correct position.
     * @param np The number of correct colors in the wrong position.
     */
    function newFeedback(uint8 cp, uint8 np) internal pure returns (Feedback) {
        return Feedback.wrap(cp | (np << 4));
    }

    /**
     * Get the CP value of the given feedback.
     * @param f The feedback to use. It is assumed to be in a valid format.
     */
    function getCP(Feedback f) internal pure returns (uint8) {
        return uint8(Feedback.unwrap(f) & 15);
    }

    /**
     * Get the NP value of the given feedback.
     * @param f The feedback to use. It is assumed to be in a valid format.
     */
    function getNP(Feedback f) internal pure returns (uint8) {
        return uint8(Feedback.unwrap(f) & (15 << 4));
    }

    /**
     * Check that a given feedback is in the correct format (see Feedback).
     * @param f The feedback to check.
     */
    function checkFromat(Feedback f) internal pure returns (bool) {
        return
            (getNP(f) <= N_COMBINATIONS) &&
            (getCP(f) <= N_COMBINATIONS) &&
            (getCP(f) + getNP(f) <= N_COMBINATIONS);
    }

    /**
     * Check if the given feedback represent a completely correct guess.
     * @param f The feedback to check. It is assumed to be in a valid format.
     */
    function isSuccessFeedback(Feedback f) internal pure returns (bool) {
        return getNP(f) == 0 && getCP(f) == N_COMBINATIONS;
    }

    /**
     * Generate a new feedback from the correct code and the guess.
     * @param solution The correct code. It is assumed to be in a valid format.
     * @param guess The guess. It is assumed to be in a valid format.
     */
    function generateFeedback(
        Code solution,
        Code guess
    ) private pure returns (Feedback) {
        uint8 correctPosition = 0;
        uint8 correctColor = 0;

        bool[N_COMBINATIONS] memory isCorrectColorAndPos;
        bool[N_COMBINATIONS] memory pairedPos;

        // count the correct positions (and correct colors)
        for (uint8 i = 0; i < N_COMBINATIONS; i++) {
            if (Codes.getColor(guess, i) == Codes.getColor(solution, i)) {
                correctPosition++;
                isCorrectColorAndPos[i] = true;
                pairedPos[i] = true;
            }
        }

        // count the correct colors in the wrong positions
        for (uint8 i = 0; i < N_COMBINATIONS; i++) {
            if (!isCorrectColorAndPos[i]) {
                for (uint8 j = i + 1; j < N_COMBINATIONS; j++) {
                    if (
                        !pairedPos[j] &&
                        Codes.getColor(solution, i) == Codes.getColor(guess, j)
                    ) {
                        correctColor++;
                        pairedPos[j] = true;
                        break;
                    }
                }
            }
        }

        return newFeedback(correctPosition, correctColor);
    }

    /**
     * Verify if the given feedback is correct w.r.t. the solution and the
     * guess provided.
     * @param feedback The feedback to check. It is assumed to be in a valid format.
     * @param solution The correct code. It is assumed to be in a valid format.
     * @param guess The guess. It is assumed to be in a valid format.
     */
    function verifyFeedback(
        Feedback feedback,
        Code solution,
        Code guess
    ) internal pure returns (bool) {
        Feedback generatedFeedback = generateFeedback(solution, guess);
        return
            getCP(generatedFeedback) == getCP(feedback) &&
            getNP(generatedFeedback) == getNP(feedback);
    }
}
