const BaseMiniGame = require('./BaseMiniGame');

/**
 * Kiss, Marry, Kill mini-game
 * Player must choose 3 people and assign them to kiss, marry, or kill
 */
class KissMarryKill extends BaseMiniGame {
  constructor() {
    super(
      'kiss_marry_kill',
      'Kiss, Marry, Kill',
      'Choose 3 people and decide: who would you kiss, who would you marry, and who would you kill?'
    );
    // Default options - can be customized per game instance
    this.defaultOptions = [
      'Your Ex',
      'Your Best Friend',
      'Your Boss',
      'A Celebrity',
      'A Philosopher',
      'Your Neighbor',
      'A Stranger',
      'Your Pet'
    ];
  }

  initialize(customOptions = null) {
    const options = customOptions || this.defaultOptions;
    
    // Randomly select 3 options
    const shuffled = [...options].sort(() => Math.random() - 0.5);
    const selectedOptions = shuffled.slice(0, 3);

    return {
      options: selectedOptions,
      selections: {
        kiss: null,
        marry: null,
        kill: null
      },
      isComplete: false,
      startedAt: new Date().toISOString()
    };
  }

  processAction(action, currentState) {
    if (!this.validateAction(action)) {
      throw new Error('Invalid action format');
    }

    const { type, option } = action;

    if (!['kiss', 'marry', 'kill'].includes(type)) {
      throw new Error('Invalid selection type. Must be kiss, marry, or kill');
    }

    if (!currentState.options.includes(option)) {
      throw new Error('Invalid option. Must be one of the provided options');
    }

    // Check if option is already selected
    const alreadySelected = Object.values(currentState.selections).includes(option);
    if (alreadySelected) {
      throw new Error('This option has already been selected');
    }

    // Update state
    const updatedState = {
      ...currentState,
      selections: {
        ...currentState.selections,
        [type]: option
      }
    };

    // Check if game is complete
    const allSelected = Object.values(updatedState.selections).every(sel => sel !== null);
    updatedState.isComplete = allSelected;
    
    if (updatedState.isComplete) {
      updatedState.completedAt = new Date().toISOString();
    }

    return {
      state: updatedState,
      result: {
        success: true,
        message: allSelected 
          ? 'All selections made! The philosopher will now reflect on your choices...'
          : `You've chosen to ${type} ${option}. Select the remaining choices.`,
        isComplete: allSelected
      }
    };
  }

  getInstructions() {
    return 'You have 3 people. Choose wisely: who would you kiss, who would you marry, and who would you kill?';
  }

  getGameState(state) {
    const baseState = super.getGameState(state);
    return {
      ...baseState,
      remainingSelections: Object.entries(state.selections)
        .filter(([_, value]) => value === null)
        .map(([key]) => key),
      progress: {
        total: 3,
        completed: Object.values(state.selections).filter(v => v !== null).length
      }
    };
  }
}

module.exports = KissMarryKill;

