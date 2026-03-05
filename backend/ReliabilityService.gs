
/* -------------------------------------------------------------------------- */
/*                            RELIABILITY SERVICE                             */
/* -------------------------------------------------------------------------- */

const ReliabilityService = {

  onTicketClosed: function(ticket) {
    // Optional: Re-calculate just for this asset immediately
    // Or just log that this asset needs a refresh in the next batch job
  },

  /**
   * Batch Job: Calculates MTBF/MTTR for all assets
   * Schedule this to run Nightly
   */
  calculateBatch: function() {
    const assets = DAL.query('Asset_Registry');
    const tickets = DAL.query('Core_Tickets', t => t.Status === 'CLOSED');
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));

    const analyticsData = assets.map(asset => {
      // Filter tickets for this asset in last 30 days
      const assetTickets = tickets.filter(t => 
        t.Asset_ID === asset.Asset_ID && 
        new Date(t.Created_At) > thirtyDaysAgo
      );

      const failures = assetTickets.length;
      const totalDowntimeMin = assetTickets.reduce((sum, t) => sum + (parseFloat(t.Downtime_Minutes) || 0), 0);
      
      // Standard: 24/7 operation = 720 hours/month = 43200 minutes
      // Better: Get planned hours from Asset_Registry
      const plannedTimeMin = (parseFloat(asset.Planned_Weekly_Hours) || 168) * 4 * 60; 
      const operatingTimeMin = Math.max(0, plannedTimeMin - totalDowntimeMin);

      const mtbf = failures > 0 ? (operatingTimeMin / 60) / failures : operatingTimeMin / 60; // Hours
      const mttr = failures > 0 ? (totalDowntimeMin / 60) / failures : 0; // Hours
      const availability = plannedTimeMin > 0 ? (operatingTimeMin / plannedTimeMin) * 100 : 100;

      return {
        Calculation_ID: Utilities.getUuid(),
        Date: today.toISOString(),
        Asset_ID: asset.Asset_ID,
        MTBF_Hours: mtbf.toFixed(2),
        MTTR_Hours: mttr.toFixed(2),
        Availability_Pct: availability.toFixed(2),
        Failures_Count: failures
      };
    });

    // Write to Analytics Table
    DAL.batchInsert('Analytics_Reliability', analyticsData);
    return { processed: analyticsData.length };
  }
};
