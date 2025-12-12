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
      'Interpret the movie or TV show behind emojis. Can you decode the message?'
    );
    
    // Predefined emoji challenges
this.challenges = [

  // Movies
  { emoji: '🍴🙏❤️', answer: 'Eat Pray Love', alternatives: [] },
  { emoji: '5️⃣0️⃣0️⃣☀️❤️', answer: '500 Days of Summer', alternatives: [] },
  { emoji: '😈 👠', answer: 'The Devil Wears Prada', alternatives: ['devil wears prada'] },
  { emoji: '🚆👀', answer: 'Trainspotting', alternatives: [] },
  { emoji: '👨✂️👐', answer: 'Edward Scissorhands', alternatives: [] },
  { emoji: '🥊 ♣️', answer: 'Fight Club', alternatives: [] },
  { emoji: '🏰👭❄️☃️', answer: 'Frozen', alternatives: [] },
  { emoji: '👰👭💩', answer: 'Bridesmaids', alternatives: [] },
  { emoji: '🔎🐟', answer: 'Finding Nemo', alternatives: [] },
  { emoji: '👨⚡', answer: 'Harry Potter', alternatives: [] },
  { emoji: '🏝️🏐', answer: 'Castaway', alternatives: ['cast away'] },
  { emoji: '👽📞🏠', answer: 'E.T.', alternatives: ['et'] },
  { emoji: '🧙‍♂️🧝‍♀️💍🌋', answer: 'The Lord of the Rings', alternatives: ['lotr'] },
  { emoji: '🐺🏦', answer: 'The Wolf of Wall Street', alternatives: ['wolf of wall street'] },
  { emoji: '🎵🇫🇷😔', answer: 'Les Miserables', alternatives: ['les mis', 'les misérables'] },

  // TV Shows
  { emoji: '🇬🇧🍰', answer: 'The Great British Bake Off', alternatives: ['bake off'] },
  { emoji: '🦑🎮', answer: 'Squid Game', alternatives: [] },
  { emoji: '💰🇪🇸', answer: 'Money Heist', alternatives: ['la casa de papel'] },
  { emoji: '⚰️2️⃣🙋', answer: 'Dead to Me', alternatives: [] },
  { emoji: '👻⛰️🏠', answer: 'The Haunting of Hill House', alternatives: ['hill house'] },
  { emoji: '👑♟️👩‍🦰', answer: 'The Queen\'s Gambit', alternatives: ['queens gambit'] },
  { emoji: '🇮🇪🚸👯', answer: 'Derry Girls', alternatives: [] },
  { emoji: '🍆🍑💦👩‍🏫', answer: 'Sex Education', alternatives: [] },
  { emoji: '🥵❤️🏝️💸', answer: 'Too Hot To Handle', alternatives: [] },
  { emoji: '👇🔛⛪', answer: 'Downton Abbey', alternatives: [] },
  { emoji: '🎲🏰🪑⚔️', answer: 'Game of Thrones', alternatives: ['got'] },
  { emoji: '💬📱👧', answer: 'Gossip Girl', alternatives: [] },
  { emoji: '🛁👑🔔💨', answer: 'The Fresh Prince of Bel-Air', alternatives: ['fresh prince'] },
  { emoji: '📞👶', answer: 'Call the Midwife', alternatives: [] },
  { emoji: '👩🏻👗📱🇫🇷', answer: 'Emily in Paris', alternatives: [] },

  // Disney
  { emoji: '🐒🪔🧞‍♂️', answer: 'Aladdin', alternatives: [] },
  { emoji: '🦁👑', answer: 'Lion King', alternatives: ['the lion king'] },
  { emoji: '👑🐸', answer: 'The Princess and the Frog', alternatives: [] },
  { emoji: '👶🧜🏽‍♀️', answer: 'The Little Mermaid', alternatives: ['little mermaid'] },
  { emoji: '❄️☃️👩‍🦳', answer: 'Frozen', alternatives: [] },
  { emoji: '🧸📖', answer: 'Toy Story', alternatives: [] },
  { emoji: '👩🏻🐉🗡', answer: 'Mulan', alternatives: [] },
  { emoji: '😴👸🏼', answer: 'Sleeping Beauty', alternatives: [] },
  { emoji: '🔍🐟', answer: 'Finding Nemo', alternatives: [] },
  { emoji: '👸🏻🌹👹', answer: 'Beauty and the Beast', alternatives: [] },
  { emoji: '🐀👨‍🍳🍝', answer: 'Ratatouille', alternatives: [] },
  { emoji: '😀😭😡😱🤢', answer: 'Inside Out', alternatives: [] },
  { emoji: '🌻👑💇‍♀️', answer: 'Tangled', alternatives: [] },
  { emoji: '🌺💙👽', answer: 'Lilo and Stitch', alternatives: ['lilo & stitch'] },
  { emoji: '🏺⚡️💪', answer: 'Hercules', alternatives: [] }
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

