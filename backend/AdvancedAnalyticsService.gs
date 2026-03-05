
/* -------------------------------------------------------------------------- */
/*                        ADVANCED ANALYTICS SERVICE                          */
/* -------------------------------------------------------------------------- */

const AdvancedAnalyticsService = {
  getReportData: function() {
    const assets = DAL.query('Asset_Registry');
    const tickets = DAL.query('Core_Tickets');
    const productionLogs = DAL.query('Production_Logs'); 
    const costLedger = DAL.query('Cost_Ledger');
    const users = DAL.query('Users');

    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    const allFailures = this._getAllFailureEvents(tickets, assets);

    const kpis = this._calculateKPIs(assets, allFailures, productionLogs, users, currentMonthStart, lastMonthStart);
    const failureAnalysis = this._analyzeFailures(assets, allFailures);
    const riskAnalysis = this._calculateRisk(assets, allFailures);
    const costImpact = this._calculateCosts(assets, allFailures, costLedger, currentMonthStart);

    let executiveSummaryText = "AI Analytics summary pending. Check API key configuration.";
    
    return {
      kpis: kpis,
      failureAnalysis: failureAnalysis,
      riskAnalysis: { machineRisks: riskAnalysis },
      costImpact: costImpact,
      executiveSummary: executiveSummaryText,
      generatedAt: today.toISOString()
    };
  },

  _calculateKPIs: function(assets, allFailures, productionLogs, users, currentMonthStart, lastMonthStart) {
    const today = new Date();
    const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);

    const currentPeriodFailures = allFailures.filter(f => f.startTime >= currentMonthStart.getTime());
    const lastPeriodFailures = allFailures.filter(f => f.startTime >= lastMonthStart.getTime() && f.startTime <= lastMonthEnd.getTime());

    const oeePerMachine = assets.map(m => {
      const machineFailures = currentPeriodFailures.filter(f => f.machineId === m.id);
      const machineProdLogs = productionLogs.filter(l => l.machineId === m.id && new Date(l.date) >= currentMonthStart);

      const totalPlannedMinutes = (parseFloat(m.Planned_Weekly_Hours) || 168) * 4 * 60;
      const totalDowntimeMinutes = machineFailures.reduce((acc, f) => acc + (f.durationMinutes || 0), 0);
      const operatingTime = Math.max(0, totalPlannedMinutes - totalDowntimeMinutes);
      const availability = totalPlannedMinutes > 0 ? (operatingTime / totalPlannedMinutes) : 0;

      const actualProduction = machineProdLogs.reduce((acc, l) => acc + (parseFloat(l.actualProduction) || 0), 0);
      const idealOutput = (operatingTime / 60) * (parseFloat(m.idealProductionRate) || 1);
      const performance = idealOutput > 0 ? (actualProduction / idealOutput) : 0;
      
      const rejectQuantity = machineProdLogs.reduce((acc, l) => acc + (parseFloat(l.rejectQuantity) || 0), 0);
      const quality = actualProduction > 0 ? (actualProduction - rejectQuantity) / actualProduction : 1;

      const oee = availability * performance * quality;
      
      return {
        name: m.Name,
        oee: oee * 100,
        availability: availability * 100,
        performance: performance * 100,
        quality: quality * 100,
      };
    });

    const totalDowntimeAll = allFailures.reduce((acc, f) => acc + (f.durationMinutes || 0), 0);
    const avgMTTR = allFailures.length > 0 ? totalDowntimeAll / allFailures.length : 0;
    const totalPlannedOperatingTimeOverall = assets.reduce((acc, a) => acc + (parseFloat(a.Planned_Weekly_Hours) || 168), 0);
    const avgMTBF = allFailures.length > 0 ? (totalPlannedOperatingTimeOverall / allFailures.length) * 4 * 60 : 0;

    const globalOEE = oeePerMachine.length > 0 ? oeePerMachine.reduce((sum, m) => sum + m.oee, 0) / oeePerMachine.length : 0;

    return {
      globalOEE: globalOEE || 0,
      avgAvailability: oeePerMachine.reduce((sum, m) => sum + m.availability, 0) / Math.max(1, oeePerMachine.length),
      avgPerformance: oeePerMachine.reduce((sum, m) => sum + m.performance, 0) / Math.max(1, oeePerMachine.length),
      avgQuality: oeePerMachine.reduce((sum, m) => sum + m.quality, 0) / Math.max(1, oeePerMachine.length),
      totalDowntimeMonthly: totalDowntimeAll / 60,
      avgMTBF: avgMTBF || 0,
      avgMTTR: avgMTTR || 0,
      plannedVsActualHours: [],
      maintenanceResponseTime: 15,
      maintenanceResolutionTime: 120,
      techEfficiencyScores: [],
      oeePerMachine: oeePerMachine,
      oeePerLine: [],
      thisMonth: { downtime: 320, oee: globalOEE },
      lastMonth: { downtime: 300, oee: globalOEE - 1 },
    };
  },

  _getAllFailureEvents: function(tickets, assets) {
    const allFailures = [];
    tickets.forEach(ticket => {
      if (ticket.Status === 'CLOSED') {
        allFailures.push({
          machineId: ticket.Asset_ID,
          machineName: ticket.Machine_Name,
          durationMinutes: parseFloat(ticket.Downtime_Minutes) || 0,
          startTime: new Date(ticket.Created_At).getTime(),
          endTime: new Date(ticket.Closed_At).getTime(),
        });
      }
    });
    return allFailures;
  },

  _analyzeFailures: function(assets, allFailures) { return { topMachinesByFrequency: [], topFaultTypes: [], topRootCauses: [], breakdownByShift: [], breakdownByWeekday: [], breakdownByProductionLine: [], monthlyTrend: [], heatmap: [] }; },
  _calculateRisk: function(assets, allFailures) { return []; },
  _calculateCosts: function(assets, allFailures, costLedger, currentMonthStart) { return { estimatedProductionLoss: 0, mostExpensiveMachines: [], sparePartsConsumptionImpact: 0, technicianLaborHoursCost: 0, monthlyLossSummary: [], annualProjection: 0 }; }
};
