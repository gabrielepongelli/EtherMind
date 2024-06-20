pragma solidity ^0.8.0;

contract game {

    //struct for game "move"
    struct Move{
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
        address payable creator; //makes the match
        address payable challenger; //joins match
        uint proposer; //who is currently proposing? 0 creator 1 challenger, or maybe bool is safer
        uint currentStake; //money proposed for the game stake
        bytes32 hashOfSolution; //uploaded hash
        uint cMaster; //who is currently the codemaster? 0 creator 1 challenger, or maybe bool is safer OR ENUM?
        bool afk_CHECK; //true = set false =unset
        Move[] movesHistory;
        Feedback[] feedbackHistory; //in theory the link between movesHistory and feedback History is implicit...depend on n of feedback and position (ex. mH[1]=fH[1])
        uint points_cr; //poins counter, all slots in storage are implicitly zero until set to something else.
        uint points_ch;
        uint256 last_activity;
        uint n_of_rounds;
        //status?
        //to fill
    }

    Game[] public masterMind;

    //statically defined "config" parameters
    uint private nTurns = 3; 
    uint private nGuesses = 12;
    uint private extraPoints = 6;

    event Failure(string stringFailure);
    event DepositHashSolution(address indexed _from, bytes32  _hashToStore, uint indexed _idOfMatch);
    event DepositGuess(address indexed _from, Move  _guessmade, uint indexed _idOfMatch);
    event DepositFeedback(address indexed _from, Feedback  _feedbackgiven, uint indexed _idOfMatch);
    event EndOfGuesses(address indexed _from, uint indexed _idOfMatch);
    event EndOfRound(address indexed _from, Move _solutionOfRound, uint indexed _idOfMatch);
    event PunishmentDispensed(address indexed _from, string reason, uint indexed _idOfMatch);

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
    
    function saveGameHash(uint _id, bytes32 hashToSave) private {
        for (uint i = 0; i < masterMind.length; i++) {
            if (masterMind[i].matchID == _id) {
                //reset history
                delete masterMind[i].movesHistory;
                delete masterMind[i].feedbackHistory;
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
    function uploadCodeHash(uint matchID, bytes32 uploadedHash) public onlyCodeMaker(matchID){

        //TO DO make some mechanism that checks if roles are initialized and if they are to swap them when rounds ends

        //reset moves history and feedback history -> if its the first turn nothing is done, all other turns is resets the history since if this function is alled it means that no dipute is necessary
        //i put it in sameGameHash, match id search already done there
        //maybe some checks on the hash? IDK
        saveGameHash(matchID,uploadedHash);//if a transaction reverts from the point of view of the blockchain is like it never happened, no need to emit the failure
        emit DepositHashSolution(msg.sender,uploadedHash,matchID);
    }

    //true: all ok false:problem
    function checkinput(Move memory newGuess) private pure returns(bool){
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

    function hashNumbers(uint num1, uint num2, uint num3, uint num4) public pure returns (bytes32) {
         // Ensure the numbers are single digits
        require(num1 < 10 && num2 < 10 && num3 < 10 && num4 < 10, "Each number must be a valid choise (1-6)");
        // Concatenate the numbers by shifting their positions
        uint concatenatedNumber = (num1 * 1000) + (num2 * 100) + (num3 * 10) + num4;
        // Hash the concatenated result using keccak256
        bytes32 hash = sha256(abi.encodePacked(concatenatedNumber));
        return hash;
    }


    function makeGuess(uint matchID, Move memory uploadedGuess) public onlyCodeBreaker(matchID){
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
                //if n. of round reached end the game
                if(masterMind[i].movesHistory.length < nGuesses){ //nGuesses reached REMEMBER AT THE END OF A ROUND IF NO COMPLAIN IS RAISED YOU NEED TO EMPTY THE HISTORY OF THIS WONT WORK
                
                    if (masterMind[i].movesHistory.length > masterMind[i].feedbackHistory.length){

                        masterMind[i].feedbackHistory.push(uploadedFeedback); 
                        emit DepositFeedback(msg.sender,uploadedFeedback,matchID);//meit given feedback
                    }else if (masterMind[i].movesHistory.length == masterMind[i].feedbackHistory.length){
                        
                        //must wait, feedback not yet returned
                        revert("error, must wait guess not yet made");//non sono sicuro se qui il revert vada bene come error handling
                    }else{

                        revert("internal error");
                    }

                }else{

                    emit EndOfGuesses(msg.sender,matchID);
                }
            }
        }
        revert("Game not found: no active game for this ID");
        
    }

    //the number of guesses that the CodeBreaker needed to crack thesecret code is the number of points awarded to the other player, the CodeMaker.
    //If theCodeBreaker does not end up breaking the code, K extra points are awarded to the CodeMaker.
    function updateGameScore(uint matchID) private{
        for (uint i = 0; i < masterMind.length; i++) {
            if (masterMind[i].matchID == matchID) {
                if(masterMind[i].movesHistory.length == nGuesses){
                    //ran out of guesses give extra points
                    if(masterMind[i].cMaster == 0){
                        masterMind[i].points_cr += masterMind[i].movesHistory.length;
                        masterMind[i].points_cr += extraPoints;
                    }else{
                        masterMind[i].points_ch += masterMind[i].movesHistory.length;
                        masterMind[i].points_ch += extraPoints;
                    }
                }else{
                    //give codemaker points
                    //figure out who is codemaster
                    if(masterMind[i].cMaster == 0){
                        masterMind[i].points_cr += masterMind[i].movesHistory.length;
                    }else{
                        masterMind[i].points_ch += masterMind[i].movesHistory.length;
                    }
                }
            }
        }
        revert("Game not found: no active game for this ID");
    }

    function checkWinner() private{
        //i assume that i already checked and updated the scores
        //if this is called by the codemaker force him to wait 
    }

    function punish(uint matchID, string reason, uint toPunish) private payable{
        for (uint i = 0; i < masterMind.length; i++) {
            if (masterMind[i].matchID == matchID) {
                // Ensure the contract has enough balance to make the transfer
                require(address(this).balance >= masterMind[i].currentStake, "Insufficient balance in contract");

                if(toPunish == 0)//the creator must be punished
                {
                    // Transfer the amount to the recipient
                    (bool success, ) = masterMind[i].creator.call{value: masterMind[i].currentStake}("");
                    require(success, "Transfer failed.");
                    emit PunishmentDispensed(msg.sender,reason,matchID);
                }else if(toPunish == 1)//the challenger must be punished
                {
                    // Transfer the amount to the recipient
                    (bool success, ) = masterMind[i].challenger.call{value: masterMind[i].currentStake}("");
                    require(success, "Transfer failed.");
                    emit PunishmentDispensed(msg.sender,reason,matchID);
                }else{
                    revert("internal error");
                }
            }
        }
    }

    function uploadSolution(uint matchID, Move memory solution) public onlyCodeMaker(matchID){
        require(checkinput(solution),"the solution is impossible");

        for (uint i = 0; i < masterMind.length; i++) {
            if (masterMind[i].matchID == matchID) {
                if((masterMind[i].hashOfSolution) == hashNumbers(solution.pos1,solution.pos2,solution.pos3,solution.pos4)){
                    //solution matches
                    masterMind[i].last_activity = block.timestamp; //global variable representing the current timestamp of the block being mined
                    updateGameScore(matchID);
                    //have we reached the limit of rounds?
                    if (masterMind[i].n_of_rounds == nTurns){
                        checkwinner();
                    }else{
                        //keep going, next round

                        emit EndOfRound(msg.sender,solution,matchID);
                    }
                }else{
                    //solution dosen't match PUNISH CODEMAKER
                    if (masterMind[i].cMaster == 0){
                        punish(matchID,"false code solution provided",0);
                    }else if(masterMind[i].cMaster == 1){
                        punish(matchID,"false code solution provided",1);
                    }else{
                        require("internal error");//just to be safe
                    }
                }
            }
        }
    }

    
}
