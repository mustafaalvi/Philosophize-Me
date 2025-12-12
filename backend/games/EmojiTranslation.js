const BaseMiniGame = require('./BaseMiniGame');

/**
 * Emoji Translation mini-game
 * Player must interpret what an emoji or emoji string means
 */
class EmojiTranslation extends BaseMiniGame {
  constructor() {
    super(
      'emoji_translation',
      'Emoji Translation',
      'Interpret the meaning behind emojis. Can you decode the message?'
    );
    
    // Predefined emoji challenges
    this.challenges = [
      { emoji: '😭🎉', answer: 'crying tears of joy', alternatives: ['happy crying', 'emotional celebration', 'tears of happiness'] },
      { emoji: '🔥💯', answer: 'on fire', alternatives: ['lit', 'amazing', 'perfect'] },
      { emoji: '🤔💭', answer: 'deep in thought', alternatives: ['thinking', 'contemplating', 'pondering'] },
      { emoji: '❤️🔥', answer: 'passionate love', alternatives: ['burning love', 'intense love', 'hot love'] },
      { emoji: '😎🌴', answer: 'chill vibes', alternatives: ['relaxed', 'vacation mode', 'cool and relaxed'] },
      { emoji: '🎭🎪', answer: 'theatrical performance', alternatives: ['circus', 'drama', 'show'] },
      { emoji: '⚡💪', answer: 'powerful energy', alternatives: ['strength', 'electric power', 'energetic'] },
      { emoji: '🌙✨', answer: 'magical night', alternatives: ['starry night', 'night magic', 'celestial'] },
      { emoji: '🍕❤️', answer: 'love for pizza', alternatives: ['pizza lover', 'pizza heart', 'pizza love'] },
      { emoji: '🎯🏆', answer: 'achieving goals', alternatives: ['target achieved', 'winning', 'success'] }
    ];
  }

  initialize() {
    // Randomly select a challenge
    const challenge = this.challenges[Math.floor(Math.random() * this.challenges.length)];
    
    return {
      emoji: challenge.emoji,
      correctAnswer: challenge.answer,
      alternatives: challenge.alternatives,
      attempts: [],
      isComplete: false,
      startedAt: new Date().toISOString(),
      maxAttempts: 3
    };
  }

  processAction(action, currentState) {
    if (!this.validateAction(action)) {
      throw new Error('Invalid action format');
    }

    const { answer } = action;

    if (!answer || typeof answer !== 'string') {
      throw new Error('Answer must be a non-empty string');
    }

    const normalizedAnswer = answer.toLowerCase().trim();
    const normalizedCorrect = currentState.correctAnswer.toLowerCase().trim();
    
    // Check if answer is correct (exact match or in alternatives)
    const isCorrect = normalizedAnswer === normalizedCorrect ||
      currentState.alternatives.some(alt => 
        normalizedAnswer === alt.toLowerCase().trim()
      );

    // Record attempt
    const updatedAttempts = [
      ...currentState.attempts,
      {
        answer: answer,
        isCorrect: isCorrect,
        timestamp: new Date().toISOString()
      }
    ];

    const updatedState = {
      ...currentState,
      attempts: updatedAttempts,
      isComplete: isCorrect || updatedAttempts.length >= currentState.maxAttempts
    };

    if (updatedState.isComplete) {
      updatedState.completedAt = new Date().toISOString();
      updatedState.won = isCorrect;
    }

    return {
      state: updatedState,
      result: {
        success: true,
        isCorrect: isCorrect,
        message: isCorrect 
          ? 'Correct! You\'ve decoded the emoji message! 🎉'
          : updatedAttempts.length >= currentState.maxAttempts
            ? `Game over! The answer was: "${currentState.correctAnswer}"`
            : `Not quite right. You have ${currentState.maxAttempts - updatedAttempts.length} attempts remaining.`,
        isComplete: updatedState.isComplete,
        attemptsRemaining: currentState.maxAttempts - updatedAttempts.length
      }
    };
  }

  getInstructions() {
    return 'Look at the emoji(s) and guess what they mean. You have 3 attempts!';
  }

  getGameState(state) {
    const baseState = super.getGameState(state);
    return {
      ...baseState,
      attemptsRemaining: state.maxAttempts - state.attempts.length,
      lastAttempt: state.attempts.length > 0 ? state.attempts[state.attempts.length - 1] : null
    };
  }
}

module.exports = EmojiTranslation;

