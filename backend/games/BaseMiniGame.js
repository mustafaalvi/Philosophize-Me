/**
 * Base class for all mini-games in the philosopher dating app
 * Provides a common interface and structure for extensible game mechanics
 */
class BaseMiniGame {
  constructor(gameId, gameName, description) {
    this.gameId = gameId;
    this.gameName = gameName;
    this.description = description;
    this.state = null;
  }

  /**
   * Initialize a new game instance
   * Must be implemented by subclasses
   * @returns {Object} Initial game state
   */
  initialize() {
    throw new Error('initialize() must be implemented by subclass');
  }

  /**
   * Process a player's action/submission
   * Must be implemented by subclasses
   * @param {Object} action - The player's action
   * @param {Object} currentState - Current game state
   * @returns {Object} Updated game state and result
   */
  processAction(action, currentState) {
    throw new Error('processAction() must be implemented by subclass');
  }

  /**
   * Check if the game is complete
   * @param {Object} state - Current game state
   * @returns {boolean}
   */
  isComplete(state) {
    return state?.isComplete || false;
  }

  /**
   * Get the current game state formatted for the frontend
   * @param {Object} state - Current game state
   * @returns {Object} Formatted state for UI
   */
  getGameState(state) {
    return {
      gameId: this.gameId,
      gameName: this.gameName,
      description: this.description,
      state: state,
      isComplete: this.isComplete(state)
    };
  }

  /**
   * Validate an action before processing
   * Can be overridden by subclasses for custom validation
   * @param {Object} action - The action to validate
   * @returns {boolean}
   */
  validateAction(action) {
    return action && typeof action === 'object';
  }

  /**
   * Get instructions for the player
   * Can be overridden by subclasses
   * @returns {string}
   */
  getInstructions() {
    return this.description;
  }
}

module.exports = BaseMiniGame;

