const KissMarryKill = require('./KissMarryKill');
const EmojiTranslation = require('./EmojiTranslation');

/**
 * Game Manager - Factory and registry for mini-games
 * Handles game instantiation and state management
 */
class GameManager {
  constructor() {
    this.games = new Map();
    this.registerDefaultGames();
  }

  /**
   * Register all available mini-games
   */
  registerDefaultGames() {
    this.registerGame('kiss_marry_kill', KissMarryKill);
    this.registerGame('emoji_translation', EmojiTranslation);
  }

  /**
   * Register a new game class
   * @param {string} gameId - Unique identifier for the game
   * @param {Class} GameClass - The game class (must extend BaseMiniGame)
   */
  registerGame(gameId, GameClass) {
    this.games.set(gameId, GameClass);
  }

  /**
   * Get list of available games
   * @returns {Array} List of game metadata
   */
  getAvailableGames() {
    return Array.from(this.games.entries()).map(([gameId, GameClass]) => {
      const instance = new GameClass();
      return {
        gameId: instance.gameId,
        gameName: instance.gameName,
        description: instance.description,
        instructions: instance.getInstructions()
      };
    });
  }

  /**
   * Create a new game instance
   * @param {string} gameId - The game identifier
   * @param {Object} options - Optional initialization options
   * @returns {Object} Initial game state
   */
  createGame(gameId, options = {}) {
    const GameClass = this.games.get(gameId);
    if (!GameClass) {
      throw new Error(`Game "${gameId}" not found`);
    }

    const game = new GameClass();
    const initialState = game.initialize(options);
    
    return {
      gameId: gameId,
      state: initialState,
      gameInstance: game
    };
  }

  /**
   * Process an action for a game
   * @param {string} gameId - The game identifier
   * @param {Object} action - The player's action
   * @param {Object} currentState - Current game state
   * @returns {Object} Updated state and result
   */
  processGameAction(gameId, action, currentState) {
    const GameClass = this.games.get(gameId);
    if (!GameClass) {
      throw new Error(`Game "${gameId}" not found`);
    }

    const game = new GameClass();
    return game.processAction(action, currentState);
  }

  /**
   * Get formatted game state for frontend
   * @param {string} gameId - The game identifier
   * @param {Object} state - Current game state
   * @returns {Object} Formatted state
   */
  getGameState(gameId, state) {
    const GameClass = this.games.get(gameId);
    if (!GameClass) {
      throw new Error(`Game "${gameId}" not found`);
    }

    const game = new GameClass();
    return game.getGameState(state);
  }
}

// Export singleton instance
module.exports = new GameManager();

