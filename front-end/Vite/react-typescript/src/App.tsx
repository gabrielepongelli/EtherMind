 
// src/App.tsx
import React, { useState } from 'react';
import { GuessForm } from './component/GuessForm';

enum phase { start, match_waiting, round_play_guesser, round_play_master, round_end_master, round_end_guesser, game_end }
//just to keep track of the state of the game


let game_state = phase.round_play_guesser;

const App: React.FC = () => {
  const [guesses, setGuesses] = useState<number[][]>([]);

  const handleGuess = (guess: number[]) => {
    //TODO CALL CONTRACT FROM HERE
    setGuesses([...guesses, guess]);//this means that we add the new guess to the array of guesses
  };

  const [inputValue1, setInputValue1] = useState<string>('');
  const [inputValue2, setInputValue2] = useState<string>('');

  const handleSubmit1 = () => {
    console.log('join Submitted:', inputValue1);
    //TODO call the contract join function from here
    setInputValue1(''); // Reset the input field after submission
  };

  const handleSubmit2 = () => {
    console.log('create Submitted:', inputValue2);
    //TODO call the contract create function from here
    game_state = phase.match_waiting;
    setInputValue2(''); // Reset the input field after submission
  };



if(game_state == phase.start)
  {

    return(
      <div>
      <h1>Join or create a game</h1>
      <div>
        <h2>Join</h2>
        <input
          type="text"
          value={inputValue1}
          onChange={(e) => setInputValue1(e.target.value)}
          placeholder="Enter machID or 0"
        />
        <button onClick={handleSubmit1}>join match</button>
      </div>
      <div>
        <h2>Create</h2>
        <input
          type="text"
          value={inputValue2}
          onChange={(e) => setInputValue2(e.target.value)}
          placeholder="Enter machID or 0"
        />
        <button onClick={handleSubmit2}>create match</button>
      </div>
    </div>
    );

  }else if(game_state == phase.match_waiting){
    return(
      <div>
        <h2>waiting for other player to join</h2>
      </div>
    );

  }else if(game_state == phase.round_play_guesser){

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
    //read guesses and give feedback
  }else if(game_state == phase.round_end_guesser){
    //see all the guesses and the feedbacks, decide if yuo want to dispute or not

  }else if(game_state == phase.round_end_master){
    //wait,if you are cleared or not
  }else if(game_state == phase.game_end){
    //show reason for beign ended and final score
  }

 
};

export default App;
