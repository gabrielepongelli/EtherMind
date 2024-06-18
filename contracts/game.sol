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
        address creator; //makes the match
        address chalenger; //joins match
        uint proposer; //who is currently proposing? 0 creator 1 challenger, or maybe bool is safer
        uint currentStake; //money proposed for the game stake
        bytes hashOfSolution; //uploaded hash
        uint cMaster; //who is currently the codemaster? 0 creator 1 challenger, or maybe bool is safer
        //to fill
    }

    Game[] public masterMind;

    constructor() {}

    //lookup game based on id
    function findgame(uint findthisID) private view returns (Game){//can you return structs, yes i checked
        for (uint i = 0; i < masterMind.length; i++) {
            if (masterMind[i].matchID == findthisID) {
                return masterMind[i];
            }
        }
        revert("Game not found: no active game for this ID");
    }
    
    function saveGameHash(uint _id) private returns (int) {
        for (uint i = 0; i < masterMind.length; i++) {
            if (masterMind[i].matchID == _id) {
                
                return int(i); // return the index as int
            }
        }
        return -1; // return -1 if the person is not found
    }

    //check that a function is been caled by the codemaker
    modifier onlyCodeMaker(uint matchID) {
        //given match ID i need to figure out who is the code maker
        Game memory currentGame = findgame(matchID);
        require(
            ((currentGame.cMaster == 0) && (currentGame.creator == msg.sender)) 
            ||
            ((currentGame.cMaster == 1) && (currentGame.challenger == msg.sender))
            , "Caller is not the codemaker");//error message
        _;
    }

    function uploadCodeHash(uint matchID, bytes memory hash) public onlyCodeMaker(matchID){
        //code maker is checked 
        Game memory currentGame = findgame(matchID);
        //maybe some checks on the hash? IDK

    }
}