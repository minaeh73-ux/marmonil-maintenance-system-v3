
import { Machine, User, PreventiveMaintenanceTask, SparePart, Priority, RoleDefinition, FaultType } from './types';

// --- RBAC Definition ---
export const SYSTEM_ROLES: RoleDefinition[] = [
  {
    id: 'ADMIN',
    name: 'Factory Manager',
    description: 'Full system sovereignty and financial oversight.',
    approvalLevel: 5,
    permissions: { canView: true, canCreate: true, canEdit: true, canDelete: true, canApprove: true, canOverrideKPI: true, canAddHistorical: true }
  },
  {
    id: 'MAINTENANCE',
    name: 'Maintenance Department',
    description: 'Technical workflow control and resource allocation.',
    approvalLevel: 2, 
    permissions: { canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: true, canOverrideKPI: false, canAddHistorical: true }
  },
  {
    id: 'PRODUCTION',
    name: 'Production Supervisor',
    description: 'Operational status reporting and downtime logging.',
    approvalLevel: 1,
    permissions: { canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: false, canOverrideKPI: false, canAddHistorical: false }
  },
  {
    id: 'PLANNING',
    name: 'Efficiency Planner',
    description: 'KPI analysis and scheduling optimization.',
    approvalLevel: 3,
    permissions: { canView: true, canCreate: false, canEdit: true, canDelete: false, canApprove: false, canOverrideKPI: true, canAddHistorical: true }
  },
  {
    id: 'STORE',
    name: 'Inventory Controller',
    description: 'Supply chain management and procurement.',
    approvalLevel: 1,
    permissions: { canView: true, canCreate: true, canEdit: true, canDelete: false, canApprove: true, canOverrideKPI: false, canAddHistorical: false }
  },
  {
    id: 'VIEWER',
    name: 'Operations Auditor',
    description: 'Read-only access for reporting and oversight.',
    approvalLevel: 0,
    permissions: { canView: true, canCreate: false, canEdit: false, canDelete: false, canApprove: false, canOverrideKPI: false, canAddHistorical: false }
  }
];

export const MACHINES: Machine[] = [
  /* Fixed: Added mandatory approvalStatus and approvals fields to match Machine interface to satisfy type constraints */
  { id: 'cts-1', originalAssetCode: 'cts-1', versionNumber: 1, isActiveVersion: true, name: 'Cut to Size', category: 'CTS', workcenterArea: 'CTS', status: 'RUNNING', plannedHours: 168, hourlyLossRate: 250, productionRatePerHour: 45, idealProductionRate: 60, history: [], department: 'Production', approvalStatus: 'APPROVED', approvals: {} },
  { id: 'cts-2', originalAssetCode: 'cts-2', versionNumber: 1, isActiveVersion: true, name: 'Slab Line', category: 'CTS', workcenterArea: 'CTS', status: 'RUNNING', plannedHours: 168, hourlyLossRate: 400, productionRatePerHour: 60, idealProductionRate: 80, history: [], department: 'Production', approvalStatus: 'APPROVED', approvals: {} },
  { id: 'sl-1', originalAssetCode: 'sl-1', versionNumber: 1, isActiveVersion: true, name: 'BC1', category: 'Slabline', workcenterArea: 'Slabline', status: 'RUNNING', plannedHours: 168, hourlyLossRate: 350, productionRatePerHour: 55, idealProductionRate: 75, history: [], department: 'Production', approvalStatus: 'APPROVED', approvals: {} },
  { id: 'sl-2', originalAssetCode: 'sl-2', versionNumber: 1, isActiveVersion: true, name: 'Gaspri Granite', category: 'Slabline', workcenterArea: 'Slabline', status: 'RUNNING', plannedHours: 168, hourlyLossRate: 500, productionRatePerHour: 80, idealProductionRate: 100, history: [], department: 'Production', approvalStatus: 'APPROVED', approvals: {} },
  { id: 'gs-1', originalAssetCode: 'gs-1', versionNumber: 1, isActiveVersion: true, name: 'GS1', category: 'Gangsaws', workcenterArea: 'Gangsaws', status: 'RUNNING', plannedHours: 168, hourlyLossRate: 150, productionRatePerHour: 20, idealProductionRate: 30, history: [], department: 'Production', approvalStatus: 'APPROVED', approvals: {} },
  { id: 'gs-2', originalAssetCode: 'gs-2', versionNumber: 1, isActiveVersion: true, name: 'GS2', category: 'Gangsaws', workcenterArea: 'Gangsaws', status: 'RUNNING', plannedHours: 168, hourlyLossRate: 150, productionRatePerHour: 20, idealProductionRate: 30, history: [], department: 'Production', approvalStatus: 'APPROVED', approvals: {} },
  { id: 'mw-1', originalAssetCode: 'mw-1', versionNumber: 1, isActiveVersion: true, name: 'Gaspri Multiwire', category: 'Multiwires', workcenterArea: 'Multiwires', status: 'RUNNING', plannedHours: 168, hourlyLossRate: 450, productionRatePerHour: 100, idealProductionRate: 120, history: [], department: 'Production', approvalStatus: 'APPROVED', approvals: {} },
];

export const MACHINE_CATEGORIES = Array.from(new Set(MACHINES.map(m => m.category)));

export const SLA_THRESHOLDS: Record<Priority, number> = {
  'CRITICAL': 1 * 60 * 60 * 1000,
  'HIGH': 3 * 60 * 60 * 1000,
  'NORMAL': 6 * 60 * 60 * 1000,
  'LOW': 24 * 60 * 60 * 1000,
};

export const USERS: User[] = [
  { 
    id: 'u1', username: 'prod', password: '123', role: 'PRODUCTION', name: 'M. Ibrahim', department: 'Production', active: true, createdAt: 1735689600000,
    employeeId: 'EMP-001', employmentType: 'FULL_TIME', failedAttempts: 0, isLocked: false, mustChangePassword: false, shift: 'A',
    availableForAssignment: false, approvalLevel: 1, twoFactorAuthEnabled: false
  },
  { 
    id: 'u2', username: 'eng_elec', password: '123', role: 'MAINTENANCE', name: 'Eng. Hanna (E)', department: 'Electrical', active: true, createdAt: 1735689600000, 
    maintenanceRoleType: 'ENGINEER', technicalSpecialization: 'ELECTRICAL', skillLevel: 'SENIOR',
    employeeId: 'EMP-002', employmentType: 'FULL_TIME', failedAttempts: 0, isLocked: false, mustChangePassword: false, shift: 'OFFICE',
    availableForAssignment: true, approvalLevel: 2, twoFactorAuthEnabled: false
  },
  { 
    id: 'u2b', username: 'eng_mech', password: '123', role: 'MAINTENANCE', name: 'Eng. Ahmed (M)', department: 'Mechanical', active: true, createdAt: 1735689600000, 
    maintenanceRoleType: 'ENGINEER', technicalSpecialization: 'MECHANICAL', skillLevel: 'MID_LEVEL',
    employeeId: 'EMP-003', employmentType: 'FULL_TIME', failedAttempts: 0, isLocked: false, mustChangePassword: false, shift: 'A',
    availableForAssignment: true, approvalLevel: 2, twoFactorAuthEnabled: false
  },
  { 
    id: 'u3', username: 'sup_maint', password: '123', role: 'MAINTENANCE', name: 'Supervisor Kamal', department: 'Maintenance', active: true, createdAt: 1735689600000,
    maintenanceRoleType: 'SUPERVISOR', technicalSpecialization: 'MULTI_SKILLED', skillLevel: 'LEAD',
    employeeId: 'EMP-004', employmentType: 'FULL_TIME', failedAttempts: 0, isLocked: false, mustChangePassword: false, shift: 'OFFICE',
    availableForAssignment: true, approvalLevel: 3, twoFactorAuthEnabled: false
  },
  { 
    id: 'u5', username: 'admin', password: '123', role: 'ADMIN', name: 'Eng. Mina Ehab', department: 'Management', active: true, createdAt: 1735689600000,
    employeeId: 'EMP-100', employmentType: 'FULL_TIME', failedAttempts: 0, isLocked: false, mustChangePassword: false, shift: 'OFFICE',
    availableForAssignment: false, approvalLevel: 5, twoFactorAuthEnabled: true // Super Admin with 2FA
  },
];

export const INITIAL_SPARE_PARTS: SparePart[] = [
  { code: 'EL-001', name: 'Contact Block NO', category: 'Electrical', quantity: 24, minLevel: 10, lastUpdated: Date.now() },
  { code: 'ME-001', name: 'Bearing 6205', category: 'Mechanical', quantity: 8, minLevel: 10, lastUpdated: Date.now() }, 
];

export const INITIAL_PM_TASKS: PreventiveMaintenanceTask[] = [
  { id: 'pm-1', machineId: 'gs-2', machineName: 'GS2', taskName: 'Check Motor Brushes', frequencyDays: 30, lastPerformed: Date.now() - (25 * 86400000), nextDue: Date.now() + (5 * 86400000), specialty: 'ELECTRICAL' },
];

export const ALLOWED_RESET_USER = 'admin'; 

export const DEPARTMENTS = [
  'Production', 'Maintenance', 'Planning', 'Admin', 'Warehouse', 'Management', 'Quality', 'Electrical', 'Mechanical', 'Hydraulics', 'Software', 'External Contractor', 'Logistics'
];
