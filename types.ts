

export type Role = 'PRODUCTION' | 'MAINTENANCE' | 'STORE' | 'PLANNING' | 'ADMIN' | 'VIEWER';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'ON_HOLD' | 'CLOSED';

export type Priority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export type FaultType = 'ELECTRICAL' | 'MECHANICAL' | 'HYDRAULIC' | 'SOFTWARE' | 'OTHER';

export type DowntimeType = 'FULL_STOP' | 'PARTIAL_STOP';

export type MachineStatus = 'RUNNING' | 'UNDER_MAINTENANCE' | 'OUT_OF_SERVICE';

export type MaintenanceRoleType = 'TECHNICIAN' | 'ENGINEER' | 'SUPERVISOR' | 'SECTION_HEAD' | 'MAINTENANCE_MANAGER';

export type SkillLevel = 'JUNIOR' | 'MID_LEVEL' | 'SENIOR' | 'LEAD';

export type ResetType = 'OPERATIONAL' | 'FULL_FACTORY';
export type ResetMode = 'STANDARD' | 'EMERGENCY_ADMIN';

export type ImportMode = 'ADD_ONLY' | 'UPDATE_EXISTING' | 'CREATE_NEW_VERSION'; // New: For bulk machine import

export interface SystemResetApproval {
  userId: string;
  userName: string;
  role: Role;
  timestamp: number;
  comment: string;
}

export interface SystemResetLog {
  id: string;
  resetType: ResetType;
  resetMode: ResetMode; // New: Standard or Emergency
  performedBy: string;
  approvals: SystemResetApproval[]; // Empty if Emergency_Admin
  timestamp: number;
  backupPath: string;
  backupFileHash: string; // New: SHA256 hash of backup
  reason: string; // Renamed to reason (from justificationText)
  twoFactorVerified: boolean; // New: True if 2FA was used
  countdownCompleted: boolean; // New: True if countdown ran out
  ipAddress: string; // New
  deviceInfo: string; // New
}

export type MasterDataApprovalStatus = 
  | 'DRAFT' 
  | 'UNDER_MAINTENANCE_REVIEW' 
  | 'UNDER_PRODUCTION_REVIEW' 
  | 'UNDER_PLANNING_REVIEW' 
  | 'APPROVED' 
  | 'REJECTED'
  | 'ARCHIVED'; // New: For old versions of approved machines

export interface MasterDataApprovalEntry {
  approvedBy: string;
  role: string;
  timestamp: number;
  comment: string;
  confirmed: boolean;
}

export interface MasterDataLogEntry {
  id: string;
  machineId: string;
  modifiedBy: string;
  fieldName: string;
  oldValue: any;
  newValue: any;
  timestamp: number;
  statusAtTime: MasterDataApprovalStatus;
}

export interface MachineMasterData {
  // Asset
  assetCode: string;
  machineType: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  criticality: Priority;
  isHistorical: boolean;
  
  // Production
  standardCycleTime: number; // minutes per unit
  expectedOutputPerShift: number;
  plannedDowntimePerWeek: number; // hours
  shiftConfiguration: string;
  oeeTarget: number; // percentage
  
  // Maintenance
  pmFrequencyDays: number;
  mtbfBaseline: number; // hours
  mttrBaseline: number; // minutes
  sparePartsCategory: string;
  requiredSkillType: 'ELECTRICAL' | 'MECHANICAL' | 'MULTI_SKILLED';
  
  // Planning
  weeklyCapacity: number; // units or hours
  bufferPercentage: number;
  shutdownCalendarJson?: string;
  plannedStopsJson?: string;
}

export interface PermissionSet {
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canApprove: boolean;
  canOverrideKPI: boolean;
  canAddHistorical: boolean;
}

export interface RoleDefinition {
  id: Role;
  name: string;
  description: string;
  approvalLevel: number; 
  permissions: PermissionSet;
}

export interface User {
  id: string;
  username: string;
  password: string; 
  role: Role;
  name: string;
  department: string;
  active: boolean;
  createdAt: number;
  employeeId: string;
  email?: string;
  phone?: string;
  supervisorId?: string;
  shift?: 'A' | 'B' | 'C' | 'OFFICE';
  employmentType: 'FULL_TIME' | 'CONTRACTOR';
  maintenanceRoleType?: MaintenanceRoleType;
  technicalSpecialization?: FaultType | 'MULTI_SKILLED';
  skillLevel?: SkillLevel;
  availableForAssignment: boolean;
  approvalLevel: number;
  failedAttempts: number;
  isLocked: boolean;
  mustChangePassword: boolean;
  lastLogin?: number;
  accountExpiry?: number;
  twoFactorAuthEnabled: boolean; // New: for Emergency Reset
}

export interface Machine {
  id: string; // Unique ID for THIS specific version
  originalAssetCode: string; // New: The unchanging identifier for the physical asset
  versionNumber: number; // New: Version of this machine's master data
  isActiveVersion: boolean; // New: True if this is the version currently used by KPI/Operational logic
  parentRecordId?: string; // New: ID of the previous version
  
  name: string;
  category: string;
  workcenterArea: string; 
  status: MachineStatus;
  outOfServiceReason?: string;
  outOfServiceSince?: number;
  plannedHours?: number; 
  hourlyLossRate: number; 
  productionRatePerHour: number; 
  idealProductionRate: number; 
  history: BreakdownEvent[];
  department?: string; 
  commissioningDate?: number;
  
  // Master Data Setup
  masterData?: MachineMasterData;
  approvalStatus: MasterDataApprovalStatus;
  approvals: {
    maintenance?: MasterDataApprovalEntry;
    production?: MasterDataApprovalEntry;
    planning?: MasterDataApprovalEntry;
  };
}

export interface Ticket {
  id: string;
  machineId: string;
  machineName: string;
  category: string;
  priority: Priority;
  faultType: FaultType;
  downtimeType: DowntimeType; 
  description: string;
  status: TicketStatus;
  assignedTechnicians: AssignedTechnician[];
  createdAt: number;
  assignedAt?: number;
  closedAt?: number;
  logs: TicketLog[];
  currentHoldDetails?: HoldDetails;
  solution?: string;
  sparePartsConsumed: ConsumedSpare[];
  totalActiveMinutes: number;
  totalHoldMinutes: number;
  lastStatusChange: number;
  aiAnalysis?: AIAnalysisResult;
  media?: TicketMedia[];
  slaDeadline: number;
  isEscalated: boolean;
  actualDowntimeMinutes?: number;
  pmTaskId?: string;
  technicianName?: string;
  approvalChain?: string[]; 
}

export interface UserAuditLog {
  id: string;
  userId: string;
  userName: string;
  actionType: 'LOGIN' | 'LOGOUT' | 'EDIT' | 'DELETE' | 'APPROVE' | 'OVERRIDE' | 'SECURITY_ALERT' | 'ASSIGNMENT' | 'SYSTEM_RESET' | 'BULK_IMPORT'; // Added BULK_IMPORT
  moduleName: string;
  timestamp: number;
  details: string;
  ipAddress: string;
  deviceInfo: string;
}

export interface AssignedTechnician {
  id: string;
  name: string;
  roleType: MaintenanceRoleType;
  specialization: FaultType | 'MULTI_SKILLED';
}

export interface HistoricalDowntime {
  id: string;
  assetId: string;
  assetName: string;
  startDate: number;
  endDate: number;
  reason: string;
  justification: string;
  insertedBy: string;
  insertedDate: number;
  isHistorical: boolean;
}

export type HoldCategory = 
  | 'SPARE_PART_NOT_AVAILABLE'
  | 'SPARE_PART_DAMAGED'
  | 'WAITING_FOR_WAREHOUSE_APPROVAL'
  | 'NO_TECHNICIAN_AVAILABLE'
  | 'WAITING_FOR_EXTERNAL_SUPPORT'
  | 'WAITING_FOR_OWNER_SUPPORT'
  | 'SAFETY_ISSUE'
  | 'OTHER'
  | 'PRODUCTION_DECISION_PENDING';

export type SparePartRequestStatus = 'PENDING' | 'APPROVED' | 'ORDERED' | 'IN_TRANSIT' | 'DELIVERED';

export interface ConsumedSpare {
  code: string;
  name: string;
  quantity: number;
}

export interface SparePartRequest {
  id: string;
  ticketId: string;
  machineName: string;
  partName: string;
  partCode?: string;
  quantity: number;
  requestedFrom: string;
  status: SparePartRequestStatus;
  requestDate: number;
  requestedBy: string;
  priority: Priority;
  deliveryDate?: number;
  warehouseResponseTime?: number;
  supplierLeadTime?: number;
}

export interface HoldDetails {
  category: HoldCategory;
  description: string;
  timestamp: number;
  sparePartName?: string;
  sparePartCode?: string;
  quantity?: number;
  requestedFrom?: 'MAIN_WAREHOUSE' | 'LOCAL_STORE' | 'EXTERNAL_SUPPLIER' | 'EMERGENCY_PURCHASE';
}

export interface AIAnalysisResult {
  category: FaultType;
  riskLevel: Priority;
  rootCause: string;
  recommendedAction: string;
}

export interface ProductionLog {
  id: string;
  date: string; 
  machineId: string;
  machineName: string;
  actualRunHours: number; 
  actualProduction: number; 
  rejectQuantity: number; 
  loggedBy: string;
}

export interface OEEMetrics {
  date: string;
  machineId: string;
  machineName: string;
  dailyAvailability: number;
  dailyPerformance: number;
  dailyQuality: number;
  dailyOEE: number;
  plannedProductionTime: number; 
  downtimeHours: number;
  expectedProduction: number;
  goodProduction: number;
}

export interface ProductionRollingKPIs {
  machineId: string;
  machineName: string;
  expected14DayProduction: number;
  actual14DayProduction: number;
  compliance14Day: number; 
  productionGap14Day: number; 
  oee14DayAverage: number;
  availability14DayAverage: number; 
  latestLogDate?: string;
}

export interface ProductionKPIAlert {
  machineId: string;
  machineName: string;
  type: 'Availability' | 'Performance' | 'OEE' | 'Compliance';
  threshold: number;
  actualValue: number;
  date: string;
}

export interface TicketLog {
  timestamp: number;
  status: TicketStatus;
  user: string;
  note?: string;
  holdCategory?: HoldCategory;
}

export interface TicketMedia {
  url: string;
  type: 'image' | 'video';
  name: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  actionBy: string;
  department: string;
  timestamp: number;
  details?: string; 
  entityId?: string; 
  oldValue?: string; 
  newValue?: string; 
}

export interface SparePart {
  code: string;
  name: string;
  category: string;
  quantity: number;
  minLevel: number;
  lastUpdated: number;
}

export interface PreventiveMaintenanceTask {
  id: string;
  machineId: string;
  machineName: string;
  taskName: string;
  frequencyDays: number;
  lastPerformed: number;
  nextDue: number;
  specialty: 'ELECTRICAL' | 'MECHANICAL';
}

export interface ResetLog {
  id: string;
  timestamp: number;
  executedBy: string;
  status: 'SUCCESS' | 'FAILED' | 'UNAUTHORIZED';
  backupFileName: string;
  token: string;
  ip: string;
}

export interface BulkImportLog { // New interface
  id: string;
  timestamp: number;
  importedBy: string;
  fileName: string;
  importMode: ImportMode;
  recordsInserted: number;
  recordsUpdated: number;
  recordsSkipped: number;
  newVersionsCreated: number;
  reportDownloadUrl?: string; // For skipped/error report
}

// Moved BackendReportData interface to types.ts so it can be imported by AIAdvancedReport.tsx
export interface BackendReportData {
  kpis: {
    globalOEE: number;
    avgAvailability: number;
    avgPerformance: number;
    avgQuality: number;
    totalDowntimeMonthly: number;
    plannedVsActualHours: any[];
    maintenanceResponseTime: number;
    maintenanceResolutionTime: number;
    techEfficiencyScores: any[];
    oeePerMachine: any[];
    oeePerLine: any[];
    thisMonth?: { downtime: number; oee: number };
    lastMonth?: { downtime: number; oee: number; };
    avgMTBF: number;
    avgMTTR: number;
  };
  failureAnalysis: {
    topMachinesByFrequency: Array<{ name: string; count: number }>;
    topFaultTypes: any[];
    topRootCauses: any[];
    breakdownByShift: any[];
    breakdownByWeekday: any[];
    breakdownByProductionLine: any[];
    monthlyTrend: any[];
    heatmap: any[];
  };
  riskAnalysis: {
    machineRisks: Array<{
      machineId: string;
      machineName: string;
      riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
      riskScore: number;
      recommendedAction: string;
    }>;
  };
  costImpact: {
    estimatedProductionLoss: number;
    mostExpensiveMachines: Array<{ name: string; cost: number }>;
    sparePartsConsumptionImpact: number;
    technicianLaborHoursCost: number;
    monthlyLossSummary: any[];
    annualProjection: number;
  };
  executiveSummary: string;
  generatedAt: string;
}


export interface TourStep {
  targetId: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
}

export type TrainingRank = 'Cadet' | 'Operator' | 'Specialist' | 'Supervisor' | 'Expert';

export interface TrainingScenario {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  role: Role;
  objectives: any[];
}

export interface TrainingSession {
  isActive: boolean;
  scenarioId: string | null;
  currentScore: number;
  mistakes: number;
  startTime: number;
  completedStepIds: string[];
  rank: TrainingRank;
  history: any[];
}

export interface ImportMapping {
  date: string;
  machine: string;
  faultType: string;
  downtime: string;
  description: string;
  technician: string;
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
  data: any;
}

export type ImportModeOld = 'HISTORICAL_SHEET' | 'CLOSED_TICKETS'; // Renamed to avoid clash

export type SystemFieldType = 
  | 'MACHINE' 
  | 'DATE' 
  | 'FAILURE_TYPE' 
  | 'DOWNTIME' 
  | 'DESCRIPTION' 
  | 'ROOT_CAUSE' 
  | 'ACTION_TAKEN' 
  | 'TECHNICIAN' 
  | 'DEPARTMENT' 
  | 'PRIORITY' 
  | 'CUSTOM' 
  | 'IGNORE';

export interface ColumnMapping {
  excelHeader: string;
  systemField: SystemFieldType;
  customName: string;
}

// New types for BulkMachineImportView
export type MachineSystemFieldType = 
  | '' // Added for default empty selection
  | 'originalAssetCode'
  | 'name'
  | 'category'
  | 'workcenterArea'
  | 'machineType'
  | 'manufacturer'
  | 'model'
  | 'serialNumber'
  | 'criticality'
  | 'pmFrequencyDays'
  | 'mtbfBaseline'
  | 'mttrBaseline'
  | 'requiredSkillType'
  | 'standardCycleTime'
  | 'expectedOutputPerShift'
  | 'plannedDowntimePerWeek'
  | 'oeeTarget'
  | 'weeklyCapacity'
  | 'bufferPercentage'
  | 'commissioningDate'
  // Added missing properties from Machine and MachineMasterData interfaces
  | 'department'
  | 'plannedHours'
  | 'hourlyLossRate'
  | 'productionRatePerHour'
  | 'idealProductionRate'
  | 'shiftConfiguration'
  | 'sparePartsCategory'
  | 'IGNORE'; // Added 'IGNORE' for consistency

export interface MachineColumnMapping {
  excelHeader: string;
  systemField: MachineSystemFieldType;
  customName: string;
}


export interface ImportSummary {
  totalRows: number;
  importedRows: number;
  failedRows: number;
  missingMachineCount: number;
  missingDateCount: number;
  newSystemName: string;
}

export interface MachineRiskProfile {
  machineId: string;
  machineName: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  riskScore: number;
  recommendedAction: string;
}

export interface KPIMetrics {
  globalOEE: number;
  avgAvailability: number;
  avgPerformance: number;
  avgQuality: number;
  totalDowntimeMonthly: number;
  plannedVsActualHours: any[];
  maintenanceResponseTime: number;
  maintenanceResolutionTime: number;
  techEfficiencyScores: any[];
  oeePerMachine: any[];
  oeePerLine: any[];
  thisMonth?: { downtime: number; oee: number };
  lastMonth?: { downtime: number; oee: number };
  avgMTBF: number;
  avgMTTR: number;
}

export interface BreakdownEvent {
  id: string;
  startTime: number;
  endTime?: number;
  reason: string;
  description: string;
  changedBy: string;
  totalCost: number;
  productionLoss: number;
  maxEscalation: 'NONE' | 'SUPERVISOR' | 'MANAGER' | 'FACTORY_MANAGER';
  faultType?: FaultType;
  responsibleDepartment?: string;
  media?: TicketMedia[];
  isBackdated?: boolean;
}
