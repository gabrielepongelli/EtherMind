pragma solidity ^0.8.0;

contract game {

    //struct for game "move"
    struct Guess{
        uint pos1;
        uint pos2;
        uint pos3;
        uint pos4;

    }
    //array of structs for the whole game (ID,players,ecc)
    struct Game {
        uint matchID;
        
        //to fill
    }

    Game[] public MasterMind;

    constructor() {}

    //check that a function is been caled by the codemaker
    modifier onlyCodeMaker(uint matchID) {
        require(msg.sender == codemaker, "Caller is not the codemaker");
        _;
    }

    function uploadCodeHash(uint matchID, bytes memory hash) public{
        //update the score?
        require
    }
}