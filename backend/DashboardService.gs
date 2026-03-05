
/* -------------------------------------------------------------------------- */
/*                             DASHBOARD SERVICE                              */
/* -------------------------------------------------------------------------- */

const DashboardService = {
  
  /**
   * Returns cached metrics to Frontend.
   * If cache is stale, logic could be added here to refresh, 
   * but usually we rely on the Time-Driven trigger to refresh cache.
   */
  getCache: function() {
    return DAL.query('Dash_Cache');
  },

  /**
   * Triggered Hourly. Aggregates data and updates Dash_Cache sheet.
   */
  refreshCache: function() {
    const tickets = DAL.query('Core_Tickets');
    
    const openTickets = tickets.filter(t => t.Status !== 'CLOSED').length;
    const closedTickets = tickets.filter(t => t.Status === 'CLOSED');
    
    const totalDowntime = closedTickets.reduce((acc, t) => acc + (parseFloat(t.Downtime_Minutes) || 0), 0);
    
    const metrics = [
      { Metric_Key: 'TOTAL_OPEN_TICKETS', Value: openTickets, Last_Updated: new Date().toISOString() },
      { Metric_Key: 'TOTAL_DOWNTIME_MIN', Value: totalDowntime, Last_Updated: new Date().toISOString() },
      { Metric_Key: 'AVG_MTTR_GLOBAL', Value: closedTickets.length ? (totalDowntime / closedTickets.length).toFixed(1) : 0, Last_Updated: new Date().toISOString() }
    ];

    // Clear old cache (Logic to clear sheet needed here, simplified for XML)
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Dash_Cache');
    if(sheet) sheet.clearContents();
    
    // Add Headers
    sheet.appendRow(['Metric_Key', 'Value', 'Last_Updated']);
    
    // Write new cache
    DAL.batchInsert('Dash_Cache', metrics);
  }
};
