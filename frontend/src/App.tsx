 
// src/App.tsx
import { ethers } from 'ethers';
import React, { useState } from 'react';
import { GuessForm } from './component/GuessForm';
import { FeedBackForm } from './component/Feedback';
import { NewMatch, joinMatch, proposeStake, uploadHash ,uploadGuess, uploadFeedback, sendSolution, sendDispute, AFKcheck, HaltGame, checkWhoWinner} from './component/contract_interaction';



enum phase { start, match_waiting, decide_stake, round_play_guesser, round_play_master, round_end_master, round_end_guesser, game_end }
//just to keep track of the state of the game




let game_state = phase.start;
let REASON_OF_MATCH_END : string;
let points_CR : number;
let points_CH : number;





const App: React.FC = () => {
  const [guesses, setGuesses] = useState<number[][]>([]);
  const [Feedbs, setFeedbs] = useState<number[][]>([]);


//TODO HOW DO WE MANAGE AFK CHECK?!??! need to have a button always avaliable...


  const handleGuess = (guess: number[]) => {
    //TODO CALL CONTRACT FROM HERE
    game_state = phase.round_end_guesser;
    setGuesses([...guesses, guess]);//this means that we add the new guess to the array of guesses
  };

  const handleFbs = (Fb: number[]) => {
    //TODO CALL CONTRACT FROM HERE
    setFeedbs([...Feedbs, Fb]);//this means that we add the new feeback to the array of guesses
  };

  const [inputValuejoinid, setInputValuejoinid] = useState<string>('');
  const [inputValuejoinStake, setInputValuejoinStake] = useState<string>('');
  const [transactionData, setTransactionData] = useState<ethers.TransactionResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);


  const [inputValueCreateId, setInputValueCreateId] = useState<string>('');
  const [inputStake, setInputStake] = useState<string>('');


  const handleSubmitJoin = async  () => {
    console.log('join Submitted:', inputValuejoinid);
    console.log('stake Submitted:', inputValuejoinStake);
    //convert from string to int
    const result = await joinMatch(inputValuejoinid,BigInt(inputValuejoinStake));
      if (result.success) { //TRANSACTION is a success NOT join!... i think
          setTransactionData(result.tx);
          setError(null);
          //move to next step IF EVENT IS CALLED
          /*if(???){
            game_state = phase.decide_stake;
          }*/
      } else {
          setTransactionData(null);
          setError(result.error);
          //print error on screen
      }
    setInputValuejoinid(''); // Reset the input field after submission
    setInputValuejoinStake(''); // Reset the input field after submission
  };


  const handleSubmitCreate = async () => {
    console.log('create Submitted:', inputValueCreateId);
    //TODO call the contract create function from here
    const result = await NewMatch(inputValuejoinid);
      if (result.success) {
          setTransactionData(result.tx);
          setError(null);
          //move to next step
          game_state = phase.match_waiting;//HOW DO WE MOVE FROM HERE?
      } else {
          setTransactionData(null);
          setError(result.error);
          //print error on screen
      }
    setInputValueCreateId(''); // Reset the input field after submission
  };

  const handleStake = () => {
    console.log('new stake Submitted:', inputStake);
    //call stake function
    setInputStake(''); // Reset the input field after submission
  };






if(game_state == phase.start)
  {

    return(
      <div>
      <h1>Join or create a game</h1>
      <div>
        <h2>Join</h2>
        <input
          type="number"
          value={inputValuejoinid}
          onChange={(e) => setInputValuejoinid(e.target.value)}
          placeholder="Enter machID or 0"
        />
        <input
          type="number"
          value={inputValuejoinStake}
          onChange={(e) => setInputValuejoinStake(e.target.value)}
          placeholder="Enter initial stake"
        />
        <button onClick={handleSubmitJoin}>join match</button>
        <p>{ error?.message }</p> {/* if we get an error it should be shown to the user */} 
      </div>
      <div>
        <h2>Create</h2>
        <input
          type="number"
          value={inputValueCreateId}
          onChange={(e) => setInputValueCreateId(e.target.value)}
          placeholder="Enter machID or 0"
        />
        <button onClick={handleSubmitCreate}>create match</button>
        <p>{ error?.message }</p> {/* if we get an error it should be shown to the user */} 
      </div>
    </div>
    );

  }else if(game_state == phase.match_waiting){
    return(
      <div>
        <h2>waiting for other player to join</h2>
        <p>info {transactionData?.from} -- {transactionData?.data} </p> {/* room info shown to the user */}
      </div>
    );

  }else if(game_state == phase.decide_stake){
    return(//TO DO ADD A WAY TO DISPLAY CURRENT STAKE WHEN AGREE MOVE TO NEXT STEP
      <div>
        <h2>Agree on stake of the game</h2>
        <input
          type="number"
          value={inputStake}
          onChange={(e) => setInputStake(e.target.value)}
          placeholder="Enter stake"
        />
        <button onClick={handleStake}>Submit</button>
        <div>
          <h1>current stake</h1>
          
        </div>
      </div>
    );
  }else if(game_state == phase.round_play_guesser){
    //HERE FEEDBACKS MUST BE SHOWN
    return (
      <div>
        <h1>Mastermind Game</h1>

        <GuessForm onGuess={handleGuess} />
        {guesses.map((guess, index) => (
          <div key={index}>
            <h3>Guess {index + 1}</h3>
            <p>{guess.join(' ')}</p>
          </div>
        ))}
      </div>
    );

  }else if(game_state == phase.round_play_master){
    //read guesses (MUST BE SHOWN) and give feedback 
    return (
      <div>
        <h1>Mastermind Game</h1>
        <FeedBackForm onFb={handleFbs} />
        {Feedbs.map((feedback, index) => (
          <div key={index}>
            <h3>Feedback {index + 1}</h3>
            <p>{feedback.join(' ')}</p>
          </div>
        ))}
      </div>
    );

  }else if(game_state == phase.round_end_guesser){
    //see all the guesses and the feedbacks, decide if yuo want to dispute or not
    //assuming all moves have 
    return (
      <div>
        <h1>Round End - Guesser</h1>
        {Feedbs.map((feedback, index) => (
          <div key={index}>
            <h3>Feedback {index + 1}</h3>
            <p>{feedback.join(' ')}</p>
          </div>
        ))}
        {guesses.map((guess, index) => (
          <div key={index}>
            <h3>Guess {index + 1}</h3>
            <p>{guess.join(' ')}</p>
          </div>
        ))}
      </div>
    );
  }else if(game_state == phase.round_end_master){
    //wait if you are cleared or not, IF CODEGUESSER DISPUTE IS RIGHT THEN MATCH ENDS (SAME IF DISPUTE IS UNJUST)
    return(
      <div>
        <h2>please wait</h2>
        <h3>waiting for the decision of the code-guesser</h3>
      </div>
    );
  }else if(game_state == phase.game_end){
    //show reason for beign ended and final score MUST GET REASON FOR MATCH ENDING AND GET LATEST SCORES FROM EVENT 
    return(
      <div>
        <h1>Match Ended</h1>
        <h3>Reason: {REASON_OF_MATCH_END}</h3>
        <h3>Points creator: {points_CR}</h3>
        <h3>Points challenger: {points_CH}</h3>
      </div>
    );
  }

 
};

export default App;
