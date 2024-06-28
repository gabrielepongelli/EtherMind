 // src/components/Feedback.tsx
import React from 'react';

interface FeedbackProps {
  guess: number[];
  secretCode: number[];
}

export const Feedback: React.FC<FeedbackProps> = ({ guess, secretCode }) => {
  const calculateFeedback = (guess: number[], secretCode: number[]) => {
    let correctPosition = 0;
    let correctNumber = 0;
    const secretCodeCopy = [...secretCode];

    guess.forEach((num, index) => {
      if (num === secretCode[index]) {
        correctPosition++;
        secretCodeCopy[index] = null!;
      }
    });

    guess.forEach((num, index) => {
      if (num !== secretCode[index] && secretCodeCopy.includes(num)) {
        correctNumber++;
        secretCodeCopy[secretCodeCopy.indexOf(num)] = null!;
      }
    });

    return { correctPosition, correctNumber };
  };

  const { correctPosition, correctNumber } = calculateFeedback(guess, secretCode);

  return (
    <div>
      <p>Correct position: {correctPosition}</p>
      <p>Correct number but wrong position: {correctNumber}</p>
    </div>
  );
};

