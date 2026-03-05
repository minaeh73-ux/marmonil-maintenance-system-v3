
/* -------------------------------------------------------------------------- */
/*                                UTILITIES SERVICE                           */
/* -------------------------------------------------------------------------- */

/**
 * Provides general utility functions for the Google Apps Script environment.
 */
const Utilities = {
  /**
   * Generates a universally unique identifier (UUID).
   * This implementation mimics the standard UUID format.
   * @returns {string} A new UUID string.
   */
  getUuid: function() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  /**
   * Safely parses a JSON string, returning null if parsing fails.
   * @param {string} jsonString The string to parse.
   * @returns {Object|Array|null} The parsed object/array or null if parsing fails.
   */
  safeJSONParse: function(jsonString) {
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      console.warn("Failed to parse JSON string:", jsonString, e);
      return null;
    }
  },
};