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
        Feedback[] feedbackHistory;//in theory the link between movesHistory and feedback History is implicit...depend on n of feedback and position (ex. mH[1]=fH[1])
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

    //true: all ok false:problem
    function checkinput(Guess memory newGuess) private pure returns(bool){
        //all guessable colors go from 1 to 6 (6 colors in 4 positions)
        if (newGuess.pos1 > 0 && newGuess.pos1 < 7 &&
            newGuess.pos2 > 0 && newGuess.pos2 < 7 &&
            newGuess.pos3 > 0 && newGuess.pos3 < 7 &&
            newGuess.pos4 > 0 && newGuess.pos4 < 7){
                return true;
            }else{
                return false;
            }
    }

    //true: all ok false:problem
    function checkFeeback(Feedback memory newFeedback) private pure returns(bool){
        //all guessable colors go from 1 to 6 (6 colors in 4 positions)
        if ((newFeedback.wrong_pos < 0 || newFeedback.wrong_pos > 4) || 
            (newFeedback.correct < 0 || newFeedback.correct > 4) || 
            ((newFeedback.correct + newFeedback.wrong_pos) > 4)){
                return false;
            }else{
                return true;
            }
    }

    function makeGuess(uint matchID, Guess memory uploadedGuess) public onlyCodeBreaker(matchID){
        //uncheck the afk flag 
        actOnAfkFlag(matchID,false);//true is set, false is unset
        
        //checkinput
        require(checkinput(uploadedGuess),"incorrectly set guess, ivalid colors");

        //upload the guess in the array of moves
        for (uint i = 0; i < masterMind.length; i++) {
            if (masterMind[i].matchID == matchID) {
                //must check that i didn't already made a guess that is waiting for an answer
                if (masterMind[i].movesHistory.length == masterMind[i].feedbackHistory.length){

                    masterMind[i].movesHistory.push(uploadedGuess); 
                    emit DepositGuess(msg.sender,uploadedGuess,matchID);
                }else if (masterMind[i].movesHistory.length > masterMind[i].feedbackHistory.length){
                    
                    //must wait, feedback not yet returned
                    revert("error, must wait feedback not yet returned");//non sono sicuro se qui il revert vada bene come error handling
                }else{

                    revert("internal error");
                }
            }
        }
        revert("Game not found: no active game for this ID");
    }

    //save feedback
    function giveFeedback(uint matchID, Feedback memory uploadedFeedback) public onlyCodeMaker(matchID){
        //uncheck the afk flag 
        actOnAfkFlag(matchID,false);//true is set, false is unset

        //checkFeeback
        require(checkFeeback(uploadedFeedback),"incorrectly set feedback, ivalid value");

        //upload the guess in the array of moves
        for (uint i = 0; i < masterMind.length; i++) {
            if (masterMind[i].matchID == matchID) {
                if (masterMind[i].movesHistory.length > masterMind[i].feedbackHistory.length){

                    masterMind[i].feedbackHistory.push(uploadedFeedback); 
                    emit DepositFeedback(msg.sender,uploadedFeedback,matchID);
                }else if (masterMind[i].movesHistory.length == masterMind[i].feedbackHistory.length){
                    
                    //must wait, feedback not yet returned
                    revert("error, must wait guess not yet made");//non sono sicuro se qui il revert vada bene come error handling
                }else{

                    revert("internal error");
                }

                
            }
        }
        revert("Game not found: no active game for this ID");
    }
}
