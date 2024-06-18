pragma solidity ^0.8.0;

contract game {

    //struct for game "move"
    struct Guess{
        uint pos1;
        uint pos2;
        uint pos3;
        uint pos4;

    }

    //struct for game "feedback"
    struct Feedback{
        uint wrong_pos;
        uint correct;

    }

    //array of structs for the whole game (ID,players,ecc)
    struct Game {
        uint matchID;
        address creator; //makes the match
        address challenger; //joins match
        uint proposer; //who is currently proposing? 0 creator 1 challenger, or maybe bool is safer
        uint currentStake; //money proposed for the game stake
        bytes hashOfSolution; //uploaded hash
        uint cMaster; //who is currently the codemaster? 0 creator 1 challenger, or maybe bool is safer
        bool afk_CHECK; //true = set false =unset
        Guess[] movesHistory;
        Feedback[] feedbackHistory;
        //to fill
    }

    Game[] public masterMind;

    event Failure(string stringFailure);
    event DepositHashSolution(address indexed _from, bytes  _hashToStore, uint indexed _idOfMatch);
    event DepositGuess(address indexed _from, Guess  _guessmade, uint indexed _idOfMatch);
    event DepositFeedback(address indexed _from, Feedback  _feedbackgiven, uint indexed _idOfMatch);


    constructor() {}

    //lookup game based on id
    function findgame(uint findthisID) private view returns (Game memory){//can you return structs, yes i checked
        for (uint i = 0; i < masterMind.length; i++) {
            if (masterMind[i].matchID == findthisID) {
                return masterMind[i];
            }
        }
        revert("Game not found: no active game for this ID");
    }
    
    function saveGameHash(uint _id, bytes memory hashToSave) private {
        for (uint i = 0; i < masterMind.length; i++) {
            if (masterMind[i].matchID == _id) {
                masterMind[i].hashOfSolution = hashToSave;
                return;
            }
        }
        revert("Game not found: no active game for this ID");
    }

    function actOnAfkFlag(uint _id,bool _set) private {
        for (uint i = 0; i < masterMind.length; i++) {
            if (masterMind[i].matchID == _id) {
                masterMind[i].afk_CHECK = _set; //true is set, false is unset
                return;
            }
        }
        revert("Game not found: no active game for this ID");
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

    //check that a function is been caled by the codebreaker
    modifier onlyCodeBreaker(uint matchID) {
        //given match ID i need to figure out who is the codebreaker
        Game memory currentGame = findgame(matchID);
        require(
            ((currentGame.cMaster == 1) && (currentGame.creator == msg.sender)) 
            ||
            ((currentGame.cMaster == 0) && (currentGame.challenger == msg.sender))
            , "Caller is not the codebreaker");//error message
        _;
    }


    //code maker is checked, the hash uploaded
    function uploadCodeHash(uint matchID, bytes memory uploadedHash) public onlyCodeMaker(matchID){
        //maybe some checks on the hash? IDK
        saveGameHash(matchID,uploadedHash);//if a transaction reverts from the point of view of the blockchain is like it never happened, no need to emit the failure
        emit DepositHashSolution(msg.sender,uploadedHash,matchID);
    }

    function makeGuess(uint matchID, Guess memory uploadedGuess) public onlyCodeBreaker(matchID){
        //uncheck the afk flag 
        actOnAfkFlag(matchID,false);//true is set, false is unset
        //upload the guess in the array of moves
        for (uint i = 0; i < masterMind.length; i++) {
            if (masterMind[i].matchID == matchID) {
                masterMind[i].movesHistory.push(uploadedGuess); 
                emit DepositGuess(msg.sender,uploadedGuess,matchID);
            }
        }
        revert("Game not found: no active game for this ID");
    }

    //save feedback
    function giveFeedback(uint matchID, Feedback memory uploadedFeedback) public onlyCodeMaker(matchID){
        //uncheck the afk flag 
        actOnAfkFlag(matchID,false);//true is set, false is unset
        //upload the guess in the array of moves
        for (uint i = 0; i < masterMind.length; i++) {
            if (masterMind[i].matchID == matchID) {
                masterMind[i].feedbackHistory.push(uploadedFeedback); 
                emit DepositFeedback(msg.sender,uploadedFeedback,matchID);
            }
        }
        revert("Game not found: no active game for this ID");
    }
}
