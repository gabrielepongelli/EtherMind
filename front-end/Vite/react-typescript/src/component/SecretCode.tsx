 // src/components/SecretCode.tsx
import React from 'react';

const generateSecretCode = (length: number = 4): number[] => {
  const code = [];
  for (let i = 0; i < length; i++) {
    code.push(Math.floor(Math.random() * 6) + 1); // Numbers between 1 and 6
  }
  return code;
};

export const SecretCode = () => {
  const code = generateSecretCode();
  console.log('Secret code:', code); // For debugging

  return (
    <div>
      <h3>Secret Code (Debug Only): {code.join(' ')}</h3>
    </div>
  );
};

