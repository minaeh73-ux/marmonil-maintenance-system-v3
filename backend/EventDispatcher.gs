
/* -------------------------------------------------------------------------- */
/*                              EVENT DISPATCHER                              */
/* -------------------------------------------------------------------------- */

const Events = {
  TICKET_CREATED: 'TICKET_CREATED',
  TICKET_CLOSED: 'TICKET_CLOSED',
  TICKET_UPDATED: 'TICKET_UPDATED',
  COST_RECORDED: 'COST_RECORDED',
  ASSET_UPDATED: 'ASSET_UPDATED'
};

const EventDispatcher = (function() {
  const listeners = {};

  return {
    /**
     * Register a callback for an event
     */
    subscribe: function(event, callback) {
      if (!listeners[event]) {
        listeners[event] = [];
      }
      listeners[event].push(callback);
    },

    /**
     * Fire an event with data payload
     */
    dispatch: function(event, data) {
      if (!listeners[event]) return;
      
      console.log(`[EventBus] Dispatching: ${event}`);
      
      listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (e) {
          console.error(`[EventBus] Error in subscriber for ${event}: ${e.message}`);
          // We swallow subscriber errors so the main thread continues
        }
      });
    }
  };
})();
