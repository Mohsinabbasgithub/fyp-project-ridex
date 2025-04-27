import React, { useState } from 'react';
import { analyzeSentiment } from '../utils/sentiment';

const Rating = () => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  const handleRatingChange = (value) => {
    setRating(value);
  };

  const handleFeedbackChange = (e) => {
    setFeedback(e.target.value);
  };

  const handleSubmit = () => {
    const sentimentResult = analyzeSentiment(feedback);
    console.log('Sentiment Analysis:', sentimentResult);
    // Here you can handle the submission, e.g., send to a server
  };

  return (
    <div>
      <h2>Rate Your Experience</h2>
      <div>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            onClick={() => handleRatingChange(value)}
            style={{ margin: '0 5px' }}
          >
            {value} Star
          </button>
        ))}
      </div>
      <div>
        <textarea
          placeholder="Provide your feedback..."
          value={feedback}
          onChange={handleFeedbackChange}
          rows="4"
          cols="50"
        />
      </div>
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
};

export default Rating; 