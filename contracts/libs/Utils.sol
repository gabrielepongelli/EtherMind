// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

library Utils {
    /**
     * Generate a random number.
     * @param n The index of block to pick as source of entropy.
     */
    function rand(uint8 n) internal view returns (uint256) {
        bytes32 bhash = blockhash(block.number - n);
        bytes memory bytesArray = new bytes(32);
        for (uint i; i < 32; i++) {
            bytesArray[i] = bhash[i];
        }
        return uint256(keccak256(bytesArray));
    }
}
