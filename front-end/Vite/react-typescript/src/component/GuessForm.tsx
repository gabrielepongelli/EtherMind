import React, { useState } from 'react';

interface GuessFormProps {
  onGuess: (guess: number[]) => void;
}

export const GuessForm: React.FC<GuessFormProps> = ({ onGuess }) => {
  const [guess, setGuess] = useState<number[]>([]);

  const handleChange = (index: number, value: string) => {
    const newGuess = [...guess];
    newGuess[index] = parseInt(value);
    setGuess(newGuess);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (guess.length === 4) {
      onGuess(guess);
      setGuess([]);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {[0, 1, 2, 3].map((_, index) => (
        <input
          key={index}
          type="number"
          min="1"
          max="6"
          value={guess[index] || ''}
          onChange={(e) => handleChange(index, e.target.value)}
          required
        />
      ))}
      <button type="submit">Guess</button>
    </form>
  );
};

