
/* -------------------------------------------------------------------------- */
/*                                COST SERVICE                                */
/* -------------------------------------------------------------------------- */

const CostService = {
  
  /**
   * Event Listener: Triggered when a ticket is closed
   */
  onTicketClosed: function(ticket) {
    // 1. Get Asset Config for Hourly Rate
    const asset = DAL.getById('Asset_Registry', ticket.Asset_ID);
    if (!asset) return;

    const hourlyRate = parseFloat(asset.Hourly_Loss_Cost || 0);
    const downtimeHours = (ticket.Downtime_Minutes || 0) / 60;
    
    // 2. Calculate Downtime Cost
    const downtimeCost = downtimeHours * hourlyRate;

    if (downtimeCost > 0) {
      const ledgerEntry = {
        Transaction_ID: Utilities.getUuid(),
        Ticket_ID: ticket.Ticket_ID,
        Cost_Type: 'DOWNTIME_LOSS',
        Amount: downtimeCost.toFixed(2),
        Currency: 'USD', // Should come from ConfigService
        Date: new Date().toISOString()
      };

      DAL.insert('Cost_Ledger', ledgerEntry);
      console.log(`[CostService] Logged $${downtimeCost} loss for Ticket ${ticket.Ticket_ID}`);
    }
  },

  addSparePartCost: function(ticketId, spareCost) {
    const entry = {
      Transaction_ID: Utilities.getUuid(),
      Ticket_ID: ticketId,
      Cost_Type: 'SPARE_PARTS',
      Amount: spareCost,
      Currency: 'USD',
      Date: new Date().toISOString()
    };
    DAL.insert('Cost_Ledger', entry);
  }
};
