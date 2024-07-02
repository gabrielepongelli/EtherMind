 import React, { useState } from 'react';

 interface feedBackFormProps {
   onFb: (feedback: number[]) => void;
 }
 
 export const FeedBackForm: React.FC<feedBackFormProps> = ({ onFb }) => {
   const [feedback, setFeedback] = useState<number[]>([0, 0]);
 
   const handleChange = (index: number, value: string) => {
     const newFb = [...feedback];
     newFb[index] = parseInt(value);
     setFeedback(newFb);
   };
 
   const handleSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     if (feedback.length === 2) {
       onFb(feedback);
       setFeedback([0, 0]); // Reset to [0, 0] after submission
     }
   };
 
   return (
     <form onSubmit={handleSubmit}>
       {[0, 1].map((_, index) => (
         <input
           key={index}
           type="number"
           min="0"
           max="4"
           value={feedback[index]}
           onChange={(e) => handleChange(index, e.target.value)}
           required
         />
       ))}
       <button type="submit">Send Feedback</button>
     </form>
   );
 };
 