
/* -------------------------------------------------------------------------- */
/*                                 CONTROLLER                                 */
/* -------------------------------------------------------------------------- */

/**
 * Main Entry Point for all HTTP POST requests
 */
function doPost(e) {
  const startTime = new Date().getTime();
  const response = {
    success: false,
    data: null,
    error: null,
    meta: {
      version: '2.2.0-ENTERPRISE', // Increment version
      executionTime: 0
    }
  };

  try {
    // 1. Parse Request
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Invalid Request: No payload found");
    }
    const request = JSON.parse(e.postData.contents);
    const action = request.action;
    const payload = request.payload || {};
    const userRole = request.userRole || 'VIEWER';

    // 2. Initialize System (Wire up Events)
    Bootstrap.init();

    // 3. Routing Logic
    switch (action) {
      // --- CORE MAINTENANCE ---
      case 'TICKET_CREATE':
        Security.assertRole(userRole, ['PRODUCTION', 'MAINTENANCE', 'ADMIN']);
        response.data = CoreService.createTicket(payload);
        break;
      
      case 'TICKET_UPDATE':
        Security.assertRole(userRole, ['MAINTENANCE', 'ADMIN']);
        response.data = CoreService.updateTicket(payload);
        break;

      case 'TICKET_CLOSE':
        Security.assertRole(userRole, ['MAINTENANCE', 'ADMIN']);
        response.data = CoreService.closeTicket(payload);
        break;

      // --- ASSET INTELLIGENCE ---
      case 'ASSET_GET_ALL':
        response.data = AssetService.getAllAssets();
        break;

      // --- DASHBOARD & ANALYTICS ---
      case 'DASHBOARD_GET_CACHE':
        response.data = DashboardService.getCache();
        break;

      case 'REPORTS_GENERATE':
        Security.assertRole(userRole, ['ADMIN', 'PLANNING']);
        response.data = ReportingService.generateReport(payload);
        break;
        
      case 'REPORT_GET_ADVANCED_DATA': // NEW ENDPOINT for AI Advanced Report
        Security.assertRole(userRole, ['ADMIN', 'MAINTENANCE', 'PLANNING']); // Restricted access
        response.data = AdvancedAnalyticsService.getReportData();
        break;

      // --- SYSTEM ---
      case 'SYSTEM_GET_CONFIG':
        response.data = ConfigService.getPublicConfig();
        break;

      default:
        throw new Error(`Unknown Action: ${action}`);
    }

    response.success = true;

  } catch (error) {
    console.error(`API Error: ${error.message}`);
    response.error = error.message;
    response.success = false;
  } finally {
    response.meta.executionTime = new Date().getTime() - startTime;
    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Bootstrapper to wire up the Event Bus subscribers
 */
const Bootstrap = {
  init: function() {
    // Subscribe Reliability Engine to Ticket Closures
    EventDispatcher.subscribe(Events.TICKET_CLOSED, ReliabilityService.onTicketClosed);
    
    // Subscribe Cost Engine to Ticket Closures
    EventDispatcher.subscribe(Events.TICKET_CLOSED, CostService.onTicketClosed);
    
    // Subscribe Risk Engine to Ticket Creation
    EventDispatcher.subscribe(Events.TICKET_CREATED, RiskService.onTicketCreated);
  }
};

/**
 * Security Helper
 */
const Security = {
  assertRole: function(currentRole, allowedRoles) {
    if (!allowedRoles.includes(currentRole)) {
      throw new Error(`Access Denied: Role '${currentRole}' is not authorized.`);
    }
  }
};
