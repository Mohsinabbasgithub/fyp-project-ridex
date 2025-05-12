import Sentiment from 'sentiment';

const sentiment = new Sentiment({
  // Add custom words to improve accuracy
  extras: {
    'excellent': 5,
    'great': 4,
    'good': 3,
    'ok': 2,
    'bad': -2,
    'terrible': -4,
    'horrible': -5,
    'amazing': 5,
    'wonderful': 4,
    'satisfied': 3,
    'disappointed': -3,
    'frustrated': -4,
    'happy': 4,
    'unhappy': -3,
    'comfortable': 3,
    'uncomfortable': -3,
    'clean': 3,
    'dirty': -3,
    'safe': 3,
    'unsafe': -3,
    'reliable': 3,
    'unreliable': -3,
    'fast': 2,
    'slow': -2,
    'smooth': 2,
    'rough': -2,
    'friendly': 3,
    'unfriendly': -3,
    'professional': 3,
    'unprofessional': -3,
    'punctual': 3,
    'late': -3,
    'helpful': 3,
    'unhelpful': -3
  }
});

/**
 * Analyzes the sentiment of a given text and returns a normalized rating.
 * @param {string} text - The text to analyze.
 * @returns {object} - The sentiment analysis result with normalized rating.
 */
export const analyzeSentiment = (text) => {
  try {
    const result = sentiment.analyze(text);
    
    // Calculate a more nuanced rating
    // The sentiment score ranges from -5 to 5
    // We want to map this to a 1-5 star rating
    let normalizedRating;
    
    if (result.score >= 4) {
      normalizedRating = 5; // Very positive
    } else if (result.score >= 2) {
      normalizedRating = 4; // Positive
    } else if (result.score >= 0) {
      normalizedRating = 3; // Neutral to slightly positive
    } else if (result.score >= -2) {
      normalizedRating = 2; // Slightly negative
    } else {
      normalizedRating = 1; // Very negative
    }

    // Consider the number of words and comparative score
    const wordCount = result.words.length;
    const comparativeScore = result.comparative;
    
    // Adjust rating based on comparative score and word count
    if (wordCount > 10 && Math.abs(comparativeScore) > 0.5) {
      if (comparativeScore > 0) {
        normalizedRating = Math.min(5, normalizedRating + 1);
      } else {
        normalizedRating = Math.max(1, normalizedRating - 1);
      }
    }

    return {
      ...result,
      normalizedRating,
      sentiment: result.score > 0 ? 'positive' : result.score < 0 ? 'negative' : 'neutral'
    };
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    return {
      score: 0,
      normalizedRating: 3,
      sentiment: 'neutral',
      words: [],
      positive: [],
      negative: []
    };
  }
}; 