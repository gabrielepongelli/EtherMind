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

    enum status {GAME_START,ROUND_PLAYING_WAITINGFORMASTER,ROUND_PLAYING_WAITINGFORBREAKER,ROUND_END,GAME_END}

    //array of structs for the whole game (ID,players,ecc)
    struct Game {
        uint matchID;
        address payable creator; //makes the match
        address payable challenger; //joins match
        uint currentStake; //money proposed for the game stake
        bytes32 hashOfSolution; //uploaded hash
        Move mmSolution;
        uint cMaster; //who is currently the codemaster? 0 creator 1 challenger, or maybe bool is safer OR ENUM?
        bool afk_CHECK; //true = set false =unset
        uint256 afkTimestamp;
        Move[] movesHistory;
        Feedback[] feedbackHistory; //in theory the link between movesHistory and feedback History is implicit...depend on n of feedback and position (ex. mH[1]=fH[1])
        uint n_of_rounds;        
        uint points_cr; //poins counter, all slots in storage are implicitly zero until set to something else.
        uint points_ch;
        uint256 holdOffTimestamp;//time to start dispute
        status gameStatus;
        //status?
        //to fill
    }

    Game[] public masterMind;

    //statically defined "config" parameters
    uint private nTurns = 3; 
    uint private nGuesses = 12;
    uint private extraPoints = 6;
    uint256 private waitUntil = 90; //holdoff time to give challenger time to dispute
    uint256 private afk_max = 180;

    event Failure(string stringFailure);
    event DepositHashSolution(address indexed _from, bytes32  _hashToStore, uint indexed _idOfMatch);
    event DepositGuess(address indexed _from, Move  _guessmade, uint indexed _idOfMatch);
    event DepositFeedback(address indexed _from, Feedback  _feedbackgiven, uint indexed _idOfMatch);
    event EndOfGuesses(address indexed _from, uint indexed _idOfMatch);
    event EndOfRound(address indexed _from, Move _solutionOfRound, uint indexed _idOfMatch);
    event PunishmentDispensed(address indexed _from, string _reason, uint indexed _idOfMatch);
    event RewardDispensed(address indexed _from, uint _pointsCr, uint _pointsCh, uint _reward, uint indexed _idOfMatch);
    event EndOfMatch(address indexed _from, uint _pointsCr, uint _pointsCh, uint indexed _idOfMatch);
    event AFKCheckStarted(address indexed _from, uint256 indexed afkTimestamp, uint indexed _idOfMatch);
    event StartOfNewRound(address indexed _from, uint indexed _idOfMatch);

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

  // Function to get the latest item in the array
    function getLatestItem(Move[] memory listofmoves) public view returns (Move memory) {
        require(listofmoves.length > 0, "Array is empty");
        return listofmoves[listofmoves.length - 1];
    }


    //code maker is checked, the hash uploaded
    function uploadCodeHash(uint matchID, bytes32 uploadedHash) public onlyCodeMaker(matchID){

        //TO DO make some mechanism that checks if roles are initialized and if they are to swap them when rounds end
        //done in another function
        //reset moves history and feedback history -> if its the first turn nothing is done, all other turns is resets the history since if this function is alled it means that no dipute is necessary
        //i put it in sameGameHash, match id search already done there
        //maybe some checks on the hash? ID
        //if a transaction reverts from the point of view of the blockchain is like it never happened, no need to emit the failure
        for (uint i = 0; i < masterMind.length; i++) {
            if (masterMind[i].matchID == matchID) {
                require(masterMind[i].gameStatus == status.ROUND_END || masterMind[i].gameStatus == status.GAME_START
                ,"previous round has not ended, game has not yet started");
                //reset history and round data
                delete masterMind[i].movesHistory;
                delete masterMind[i].feedbackHistory;
                delete masterMind[i].mmSolution;

                //new game status
                masterMind[i].gameStatus = status.ROUND_PLAYING_WAITINGFORBREAKER;
                masterMind[i].hashOfSolution = uploadedHash;
                emit DepositHashSolution(msg.sender,uploadedHash,matchID);
                return;
            }
        }        
        revert("Game not found: no active game for this ID");
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

    function hashNumbers(uint num1, uint num2, uint num3, uint num4) private pure returns (bytes32) {
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
                //require round started
                require(masterMind[i].gameStatus == status.ROUND_PLAYING_WAITINGFORBREAKER ,"round not started");

                //must check that i didn't already made a guess that is waiting for an answer (not needed anymore technically but ill'keep it anyway)
                if (masterMind[i].movesHistory.length == masterMind[i].feedbackHistory.length){

                    masterMind[i].movesHistory.push(uploadedGuess); 
                    masterMind[i].gameStatus = status.ROUND_PLAYING_WAITINGFORMASTER;
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
                //require round started
                require(masterMind[i].gameStatus == status.ROUND_PLAYING_WAITINGFORMASTER ,"round not started");

                //if n. of round reached end the game
                if(masterMind[i].movesHistory.length < nGuesses){ //nGuesses reached REMEMBER AT THE END OF A ROUND IF NO COMPLAIN IS RAISED YOU NEED TO EMPTY THE HISTORY OF THIS WONT WORK
                
                    if (masterMind[i].movesHistory.length > masterMind[i].feedbackHistory.length){

                        masterMind[i].feedbackHistory.push(uploadedFeedback); 
                        masterMind[i].gameStatus = status.ROUND_PLAYING_WAITINGFORBREAKER;
                        emit DepositFeedback(msg.sender,uploadedFeedback,matchID);//meit given feedback

                    }else if (masterMind[i].movesHistory.length == masterMind[i].feedbackHistory.length){
                        
                        //must wait, guess not yet given
                        revert("error, must wait guess not yet made");//non sono sicuro se qui il revert vada bene come error handling
                    }else{

                        revert("internal error");
                    }

                }else if(masterMind[i].movesHistory.length == nGuesses){//last chance to get it right (no feedback necessary)
                    
                    //breaker has run out of guesses,ROUND ENDS now is time for the solution
                    masterMind[i].gameStatus = status.ROUND_END;
                    emit EndOfGuesses(msg.sender,matchID);
                }else{

                    revert("internal error");
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
                return;
            }
        }
        revert("Game not found: no active game for this ID");
    }

    function move_is_equal(Move memory m1 ,Move memory m2) public pure returns(bool){
        if(m1.pos1 == m2.pos1 && m1.pos2 == m2.pos2 && m1.pos3 == m2.pos3 && m1.pos4 == m2.pos4){
            return true;
        }else{
            return false;
        }
    }

    function checkWinner(uint matchID) public payable{//ASK IS THIS OKAY TO BE PUBLIC?
        actOnAfkFlag(matchID,false);//true is set, false is unset
        //i assume that i already checked and updated the scores
        for (uint i = 0; i < masterMind.length; i++) {
            if (masterMind[i].matchID == matchID) {
                //in order to determine the winner i must first check that the round is over
                require(masterMind[i].gameStatus == status.GAME_END ,"game not finished");

                require(address(this).balance >= masterMind[i].currentStake, "Insufficient balance in contract");

                //if this is called by the codemaker force him to wait otherwise do it immidiately
                if (
                    (msg.sender == masterMind[i].creator && masterMind[i].cMaster == 1) ||
                    (msg.sender == masterMind[i].challenger && masterMind[i].cMaster == 0)
                ) {
                    // Perform the operation immediately
                    if(masterMind[i].points_cr > masterMind[i].points_ch)
                    {
                        // Transfer the amount to the recipient
                        (bool success, ) = masterMind[i].creator.call{value: masterMind[i].currentStake}("");
                        require(success, "Transfer failed.");
                        emit RewardDispensed(msg.sender,masterMind[i].points_cr,masterMind[i].points_ch,masterMind[i].currentStake,matchID);
                    }else if(masterMind[i].points_cr < masterMind[i].points_ch)
                    {
                        // Transfer the amount to the recipient
                        (bool success, ) = masterMind[i].challenger.call{value: masterMind[i].currentStake}("");
                        require(success, "Transfer failed.");
                        emit RewardDispensed(msg.sender,masterMind[i].points_cr,masterMind[i].points_ch,masterMind[i].currentStake,matchID);
                    }else{//its a draw
                        uint halfreward = masterMind[i].currentStake / 2; //solidity will truncate automatically
                        (bool success, ) = masterMind[i].challenger.call{value: halfreward}("");
                        require(success, "Transfer failed.");
                        (success, ) = masterMind[i].creator.call{value: halfreward}("");
                        require(success, "Transfer failed.");
                        emit RewardDispensed(msg.sender,masterMind[i].points_cr,masterMind[i].points_ch,masterMind[i].currentStake,matchID);

                    }

                } else if (block.timestamp >= masterMind[i].holdOffTimestamp) {

                    // Perform the operation if the current time is past the waitUntil time
                    if(masterMind[i].points_cr > masterMind[i].points_ch)
                    {
                        // Transfer the amount to the recipient
                        (bool success, ) = masterMind[i].creator.call{value: masterMind[i].currentStake}("");
                        require(success, "Transfer failed.");
                        emit RewardDispensed(msg.sender,masterMind[i].points_cr,masterMind[i].points_ch,masterMind[i].currentStake,matchID);
                    }else if(masterMind[i].points_cr < masterMind[i].points_ch)
                    {
                        // Transfer the amount to the recipient
                        (bool success, ) = masterMind[i].challenger.call{value: masterMind[i].currentStake}("");
                        require(success, "Transfer failed.");
                        emit RewardDispensed(msg.sender,masterMind[i].points_cr,masterMind[i].points_ch,masterMind[i].currentStake,matchID);
                    }else{//its a draw
                        uint halfreward = masterMind[i].currentStake / 2; //solidity will truncate automatically
                        (bool success, ) = masterMind[i].challenger.call{value: halfreward}("");
                        require(success, "Transfer failed.");
                        (success, ) = masterMind[i].creator.call{value: halfreward}("");
                        require(success, "Transfer failed.");
                        emit RewardDispensed(msg.sender,masterMind[i].points_cr,masterMind[i].points_ch,masterMind[i].currentStake,matchID);

                    }
                } else {
                    // Inform the codemaster to wait until the waitUntil time
                    revert( "Operation performed only after wait time.");
                }
            }
        }
    }

    function uploadSolution(uint matchID, Move memory solution) public payable onlyCodeMaker(matchID){
        actOnAfkFlag(matchID,false);//true is set, false is unset were doing something...

        require(checkinput(solution),"the solution is impossible");

        for (uint i = 0; i < masterMind.length; i++) {
            if (masterMind[i].matchID == matchID) {
                if((masterMind[i].hashOfSolution) == hashNumbers(solution.pos1,solution.pos2,solution.pos3,solution.pos4)){
                    //solution matches


                    //can upload the solution only if the round is ended OR player got it right
                    require(
                    move_is_equal(getLatestItem(masterMind[i].movesHistory), solution) ||
                    masterMind[i].gameStatus == status.ROUND_END 
                    , "you can't upload the solution yet");
                    
                    //is this necessary for AFK? maybe not
                    //masterMind[i].last_activity = block.timestamp; //global variable representing the current timestamp of the block being mined
                    masterMind[i].holdOffTimestamp = block.timestamp + waitUntil;//THIS IS FOR DISPUTE CHECK
                    masterMind[i].mmSolution = solution; //THIS ALSO, for reference and cheating checking

                    updateGameScore(matchID);
                    //have we reached the limit of rounds?

                    if (masterMind[i].n_of_rounds == nTurns){
                        masterMind[i].gameStatus = status.GAME_END;
                        emit EndOfMatch(msg.sender,masterMind[i].points_cr,masterMind[i].points_ch,matchID);
                    }else{
                        //end of round, but not game
                        masterMind[i].n_of_rounds ++;
                        masterMind[i].gameStatus = status.ROUND_END;
                        emit EndOfRound(msg.sender,solution,matchID);
                    }
                }else{

                    //solution dosen't match PUNISH CODEMAKER
                    masterMind[i].gameStatus = status.GAME_END;

                    // Ensure the contract has enough balance to make the transfer
                    require(address(this).balance >= masterMind[i].currentStake, "Insufficient balance in contract");

                    if (masterMind[i].cMaster == 0){
                        // Transfer the amount to the recipient
                        (bool success, ) = masterMind[i].challenger.call{value: masterMind[i].currentStake}("");//no gas limit?
                        require(success, "Transfer failed.");
                        emit PunishmentDispensed(msg.sender,"false code solution provided",matchID);
                        

                    }else if(masterMind[i].cMaster == 1){
                        // Transfer the amount to the recipient
                        (bool success, ) = masterMind[i].creator.call{value: masterMind[i].currentStake}("");
                        require(success, "Transfer failed.");
                        emit PunishmentDispensed(msg.sender,"false code solution provided",matchID);

                    }else{
                        revert("internal error");//just to be safe
                    }
                }
            }
        }
    }


    
    // Function to verify the feedback consistency
    function verifyFeedback(Move[] memory guesses, Feedback[] memory clues, Move memory secret) internal pure returns (bool) {
        require(guesses.length == clues.length, "Mismatched guesses and clues length");

        for (uint256 i = 0; i < guesses.length; i++) {
            Feedback memory generatedFeedback = getFeedback(secret, guesses[i]);
            if (generatedFeedback.correct != clues[i].correct || generatedFeedback.wrong_pos != clues[i].wrong_pos) {
                return false;
            }
        }
        return true;
    }

    // Function to calculate feedback for a given guess
    function getFeedback(Move memory secret, Move memory guess) internal pure returns (Feedback memory) {
        uint correctPosition = 0;
        uint correctColor = 0;

        uint[4] memory secretArray = [secret.pos1, secret.pos2, secret.pos3, secret.pos4];
        uint[4] memory guessArray = [guess.pos1, guess.pos2, guess.pos3, guess.pos4];
        
        bool[4] memory secretMatched;
        bool[4] memory guessMatched;

        // Count the correct positions (and correct colors)
        for (uint256 i = 0; i < 4; i++) {
            if (guessArray[i] == secretArray[i]) {
                correctPosition++;
                secretMatched[i] = true;
                guessMatched[i] = true;
            }
        }

        // Count the correct colors in the wrong positions
        for (uint256 i = 0; i < 4; i++) {
            if (!secretMatched[i]) {
                for (uint256 j = 0; j < 4; j++) {
                    if (!guessMatched[j] && secretArray[i] == guessArray[j]) {//because between CP and WP, the former has priority
                        correctColor++;
                        guessMatched[j] = true; //to not evaluate twice an alement of the guess
                        break;
                    }
                }
            }
        }

        return Feedback(correctColor, correctPosition);
    }


    function dispute(uint matchID) public payable onlyCodeBreaker(matchID){
        actOnAfkFlag(matchID,false);//true is set, false is unset

        for (uint i = 0; i < masterMind.length; i++) {
            if (masterMind[i].matchID == matchID) {
                //check that ROUND_END
                require(masterMind[i].gameStatus == status.ROUND_END || masterMind[i].gameStatus == status.GAME_END,"round is not over");
                require(masterMind[i].holdOffTimestamp > block.timestamp,"request is too late, dispute refuted");

                //check cheating-> true: no cheater , false: cheater
                if(!verifyFeedback(masterMind[i].movesHistory, masterMind[i].feedbackHistory, masterMind[i].mmSolution))
                {
                    //cheating detected, punish the codemaker
                    masterMind[i].gameStatus = status.GAME_END;

                    // Ensure the contract has enough balance to make the transfer
                    require(address(this).balance >= masterMind[i].currentStake, "Insufficient balance in contract");

                    if (masterMind[i].cMaster == 0){
                        // Transfer the amount to the recipient
                        (bool success, ) = masterMind[i].challenger.call{value: masterMind[i].currentStake}(""); //no gas limit?
                        require(success, "Transfer failed.");
                        emit PunishmentDispensed(msg.sender,"codemaster cheated, false clues provided",matchID);
                        

                    }else if(masterMind[i].cMaster == 1){
                        // Transfer the amount to the recipient
                        (bool success, ) = masterMind[i].creator.call{value: masterMind[i].currentStake}("");
                        require(success, "Transfer failed.");
                        emit PunishmentDispensed(msg.sender,"codemaster cheated, false clues provided",matchID);

                    }else{
                        revert("internal error");//just to be safe
                    }
                }else{
                    //if codemaker was unjustly accused, reward him instead
                    masterMind[i].gameStatus = status.GAME_END;

                    // Ensure the contract has enough balance to make the transfer
                    require(address(this).balance >= masterMind[i].currentStake, "Insufficient balance in contract");

                    if (masterMind[i].cMaster == 1){
                        // Transfer the amount to the recipient
                        (bool success, ) = masterMind[i].challenger.call{value: masterMind[i].currentStake}(""); //no gas limit?
                        require(success, "Transfer failed.");
                        emit PunishmentDispensed(msg.sender,"codebreaker unjustly accused codemaster",matchID);
                        

                    }else if(masterMind[i].cMaster == 0){
                        // Transfer the amount to the recipient
                        (bool success, ) = masterMind[i].creator.call{value: masterMind[i].currentStake}("");
                        require(success, "Transfer failed.");
                        emit PunishmentDispensed(msg.sender,"codebreaker unjustly accused codemaster",matchID);

                    }else{
                        revert("internal error");//just to be safe
                    }
                }
            }
        }
    }


    //DO I NEED THIS? HOW ELSE?
    function no_dispute(uint matchID) public{
        //swap the roles
        actOnAfkFlag(matchID,false);//true is set, false is unset

        for (uint i = 0; i < masterMind.length; i++) {
            if (masterMind[i].matchID == matchID) {
                //check that ROUND_END
                require(masterMind[i].gameStatus == status.ROUND_END,"round is not over");
                if(masterMind[i].cMaster == 0){
                    masterMind[i].cMaster = 1;
                }else{
                    masterMind[i].cMaster = 0;
                } 
                emit StartOfNewRound(msg.sender,matchID);
            }
        }
    }

    function can_you_wait(Game memory to_check) private view returns(bool){
        if(
            (to_check.gameStatus == status.ROUND_PLAYING_WAITINGFORBREAKER && 
            ((to_check.cMaster == 0 && to_check.creator == msg.sender) ||
            (to_check.cMaster == 1 && to_check.challenger == msg.sender)))
            ||
            (to_check.gameStatus == status.ROUND_PLAYING_WAITINGFORMASTER && 
            ((to_check.cMaster == 1 && to_check.creator == msg.sender) ||
            (to_check.cMaster == 0 && to_check.challenger == msg.sender)))
        )//im waiting for the other guy and i'm not the other guy....
        {
            return true;
        }else{
            return false;
        }
    }

    function startAfkCheck(uint matchID) public{
        //check that whoever is calling is in the position to wait the other
        for (uint i = 0; i < masterMind.length; i++) {
            if (masterMind[i].matchID == matchID) {

                require(can_you_wait(masterMind[i]) ,"you can't ask for afk check, you are the one that needs to make a move");
                masterMind[i].afk_CHECK = true; //set flag, all other actions unset it
                masterMind[i].afkTimestamp = block.timestamp;//timestamp blocco attuale
                emit AFKCheckStarted(msg.sender,masterMind[i].afkTimestamp,matchID);
                return;
            }
        }
    }

    function stopMatch(uint matchID) public payable{
        for (uint i = 0; i < masterMind.length; i++) {
            if (masterMind[i].matchID == matchID) {
                require(masterMind[i].afk_CHECK == true,"you must first ask for AFK check");
                require(masterMind[i].afkTimestamp + afk_max < block.timestamp, "too early to call AFK"); 

                //must punish who is afk...depends on the status!                   
                if(masterMind[i].gameStatus == status.ROUND_PLAYING_WAITINGFORMASTER){
                    //end game 
                    masterMind[i].gameStatus = status.GAME_END;

                    // Ensure the contract has enough balance to make the transfer
                    require(address(this).balance >= masterMind[i].currentStake, "Insufficient balance in contract");

                    if (masterMind[i].cMaster == 0){
                        // Transfer the amount to the recipient
                        (bool success, ) = masterMind[i].challenger.call{value: masterMind[i].currentStake}("");//no gas limit?
                        require(success, "Transfer failed.");
                        emit PunishmentDispensed(msg.sender,"punished codemaster, AFK",matchID);
                        

                    }else if(masterMind[i].cMaster == 1){
                        // Transfer the amount to the recipient
                        (bool success, ) = masterMind[i].creator.call{value: masterMind[i].currentStake}("");
                        require(success, "Transfer failed.");
                        emit PunishmentDispensed(msg.sender,"punished codemaster, AFK",matchID);

                    }else{
                        revert("internal error");//just to be safe
                    }

                }else if(masterMind[i].gameStatus == status.ROUND_PLAYING_WAITINGFORBREAKER
                        || masterMind[i].gameStatus == status.ROUND_END){ //if the code master offer the solution but cb dosn't do anything...
                    //end game 
                    masterMind[i].gameStatus = status.GAME_END;

                    // Ensure the contract has enough balance to make the transfer
                    require(address(this).balance >= masterMind[i].currentStake, "Insufficient balance in contract");

                    if (masterMind[i].cMaster == 1){
                        // Transfer the amount to the recipient
                        (bool success, ) = masterMind[i].challenger.call{value: masterMind[i].currentStake}("");//no gas limit?
                        require(success, "Transfer failed.");
                        emit PunishmentDispensed(msg.sender,"punished codebreaker, AFK",matchID);
                        

                    }else if(masterMind[i].cMaster == 0){
                        // Transfer the amount to the recipient
                        (bool success, ) = masterMind[i].creator.call{value: masterMind[i].currentStake}("");
                        require(success, "Transfer failed.");
                        emit PunishmentDispensed(msg.sender,"punished codebreaker, AFK",matchID);

                    }else{
                        revert("internal error");//just to be safe
                    }

                }else{

                    revert("erron invalid state (game end)");
                }
                

            }
        }
    }
    
}
