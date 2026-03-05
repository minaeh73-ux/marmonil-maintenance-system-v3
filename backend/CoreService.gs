
/* -------------------------------------------------------------------------- */
/*                                CORE SERVICE                                */
/* -------------------------------------------------------------------------- */

const CoreService = {
  
  createTicket: function(payload) {
    // 1. Validation (FK Check)
    const asset = DAL.getById('Asset_Registry', payload.Asset_ID);
    if (!asset) {
      throw new Error(`Foreign Key Error: Asset_ID ${payload.Asset_ID} does not exist.`);
    }

    // 2. Prepare Object
    const ticket = {
      Ticket_ID: Utilities.getUuid(),
      Asset_ID: payload.Asset_ID,
      Created_At: new Date().toISOString(),
      Status: 'OPEN',
      Priority: payload.Priority || 'NORMAL',
      Fault_Type: payload.Fault_Type,
      Description: payload.Description,
      Downtime_Type: payload.Downtime_Type,
      JSON_Audit_Log: JSON.stringify([{
        action: 'CREATED',
        timestamp: new Date().toISOString(),
        user: payload.User || 'System'
      }])
    };

    // 3. Persist
    DAL.insert('Core_Tickets', ticket);

    // 4. Dispatch Event
    EventDispatcher.dispatch(Events.TICKET_CREATED, ticket);

    return ticket;
  },

  updateTicket: function(payload) {
    const existing = DAL.getById('Core_Tickets', payload.Ticket_ID);
    if (!existing) throw new Error("Ticket not found");

    // Append to Audit Log
    const history = JSON.parse(existing.JSON_Audit_Log || '[]');
    history.push({
      action: 'UPDATED',
      timestamp: new Date().toISOString(),
      changes: payload
    });
    payload.JSON_Audit_Log = JSON.stringify(history);

    const updated = DAL.update('Core_Tickets', payload.Ticket_ID, payload);
    EventDispatcher.dispatch(Events.TICKET_UPDATED, updated);
    return updated;
  },

  closeTicket: function(payload) {
    const existing = DAL.getById('Core_Tickets', payload.Ticket_ID);
    if (!existing) throw new Error("Ticket not found");

    const now = new Date();
    const created = new Date(existing.Created_At);
    const durationMinutes = (now.getTime() - created.getTime()) / 1000 / 60;

    const closeData = {
      Status: 'CLOSED',
      Closed_At: now.toISOString(),
      Solution: payload.Solution,
      Downtime_Minutes: Math.round(durationMinutes),
      Technician_ID: payload.Technician_ID
    };

    // Audit Log
    const history = JSON.parse(existing.JSON_Audit_Log || '[]');
    history.push({ action: 'CLOSED', timestamp: now.toISOString(), duration: durationMinutes });
    closeData.JSON_Audit_Log = JSON.stringify(history);

    const result = DAL.update('Core_Tickets', payload.Ticket_ID, closeData);

    // CRITICAL: Dispatch event so Cost/Reliability engines pick this up
    EventDispatcher.dispatch(Events.TICKET_CLOSED, result);

    return result;
  }
};
