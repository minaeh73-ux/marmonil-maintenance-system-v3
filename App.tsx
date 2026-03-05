import React, { useState, useEffect, useRef } from 'react';
import Login from './components/Login';
import Layout from './components/Layout';
import PublicLayout from './components/PublicLayout'; // Import the new PublicLayout
import ProductionView from './components/ProductionView';
import MaintenanceView from './components/MaintenanceView';
import PlanningBoard from './components/PlanningBoard';
import KPIs from './components/KPIs';
import PreventiveMaintenanceView from './components/PreventiveMaintenanceView';
import StoreView from './components/StoreView';
import SparePartTrackingView from './components/SparePartTrackingView';
import ReportsView from './components/ReportsView';
import { ResourceManagement } from './components/ResourceManagement';
import OperatingHoursView from './components/OperatingHoursView';
import AIReportView from './components/AIReportView'; 
import AIAdvancedReport from './components/AIAdvancedReport'; 
import MaintenanceTeamView from './components/MaintenanceTeamView';
import FailureHistoryView from './components/FailureHistoryView';
import TrainingDashboard from './components/TrainingDashboard';
import SystemGuide from './components/SystemGuide';
import BulkMachineImportView from './components/BulkMachineImportView';
import ProductionKPIEntry from './components/ProductionKPIEntry';
import ProductionKPIDashboard from './components/ProductionKPIDashboard';
import PredictiveView from './components/PredictiveView';
import TechnicianView from './components/TechnicianView';
import AuditView from './components/AuditView';
import TicketSystemBuilder from './components/TicketSystemBuilder';
import MasterDataSetup from './components/MasterDataSetup';
import SystemResetView from './components/SystemResetView';
import AIChatbot from './components/AIChatbot';
import { 
  User, Ticket, Machine, SparePart, ActivityLog, Priority, SparePartRequest, ConsumedSpare, ResetLog, TrainingScenario, TrainingSession, TourStep, ProductionLog, PreventiveMaintenanceTask, HistoricalDowntime, UserAuditLog, MasterDataLogEntry, SystemResetLog, BulkImportLog, ImportMode, MachineColumnMapping, MachineSystemFieldType
} from './types';
import { MACHINES as INITIAL_MACHINES, INITIAL_PM_TASKS, INITIAL_SPARE_PARTS, USERS as INITIAL_USERS, SLA_THRESHOLDS } from './constants';
import { AlertTriangle, ShieldAlert, CheckCircle2, X, Activity, HardHat, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const loadData = <T,>(key: string, defaultValue: T): T => {
    const saved = localStorage.getItem(`marmonil_${key}`);
    return saved ? JSON.parse(saved) : defaultValue;
  };

  const generateUuid = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);


  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState('planning');
  const [contextMachineId, setContextMachineId] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [forcePasswordChange, setForcePasswordChange] = useState(false);
  
  const [trainingSession, setTrainingSession] = useState<TrainingSession>({
    isActive: false, scenarioId: null, currentScore: 0, mistakes: 0, startTime: 0, completedStepIds: [], rank: 'Cadet', history: []
  });

  const [tickets, setTickets] = useState<Ticket[]>(() => loadData('tickets', []));
  const [sparePartRequests, setSparePartRequests] = useState<SparePartRequest[]>(() => loadData('spare_requests', []));
  const [pmTasks, setPmTasks] = useState<PreventiveMaintenanceTask[]>(() => loadData('pm_tasks', INITIAL_PM_TASKS));
  const [spareParts, setSpareParts] = useState<SparePart[]>(() => loadData('spare_parts', INITIAL_SPARE_PARTS));
  const [users, setUsers] = useState<User[]>(() => loadData('users', INITIAL_USERS.map(u => ({ ...u, createdAt: Date.now() }))));
  const [machines, setMachines] = useState<Machine[]>(() => loadData('machines', INITIAL_MACHINES));
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => loadData('activity_logs', []));
  const [securityLogs, setSecurityLogs] = useState<UserAuditLog[]>(() => loadData('security_logs', []));
  const [masterDataLogs, setMasterDataLogs] = useState<MasterDataLogEntry[]>(() => loadData('master_data_logs', []));
  const [productionLogEntries, setProductionLogEntries] = useState<ProductionLog[]>(() => loadData('production_logs', []));
  const [historicalDowntime, setHistoricalDowntime] = useState<HistoricalDowntime[]>(() => loadData('historical_downtime', []));
  const [systemResetLogs, setSystemResetLogs] = useState<SystemResetLog[]>(() => loadData('system_reset_logs', []));
  const [bulkImportLogs, setBulkImportLogs] = useState<BulkImportLog[]>(() => loadData('bulk_import_logs', []));
  const [notifications, setNotifications] = useState<{id: string, text: string, type: 'info' | 'urgent' | 'success'}[]>([]);

  // Check for forced password change on app load
  useEffect(() => {
    const forced = localStorage.getItem('marmonil_force_password_change');
    if (forced === 'true') {
      setForcePasswordChange(true);
      // For a real app, this would trigger a password change modal
      alert("Security Alert: Your password must be changed immediately after a Full Factory Reset.");
      localStorage.removeItem('marmonil_force_password_change');
    }
  }, []);

  useEffect(() => {
    const dataToSave = { 
      tickets, sparePartRequests, pmTasks, spareParts, users, machines, activityLogs, 
      security_logs: securityLogs, productionLogEntries, historical_downtime: historicalDowntime,
      master_data_logs: masterDataLogs, system_reset_logs: systemResetLogs, bulk_import_logs: bulkImportLogs
    };
    Object.entries(dataToSave).forEach(([key, val]) => localStorage.setItem(`marmonil_${key}`, JSON.stringify(val)));
  }, [tickets, sparePartRequests, pmTasks, spareParts, users, machines, activityLogs, securityLogs, productionLogEntries, historicalDowntime, masterDataLogs, systemResetLogs, bulkImportLogs]);

  const logSecurity = (userId: string, userName: string, type: UserAuditLog['actionType'], module: string, details: string) => {
    const newLog: UserAuditLog = {
      id: `sec-${Date.now()}`, userId, userName, actionType: type, moduleName: module, timestamp: Date.now(), details,
      ipAddress: '192.168.1.' + (Math.floor(Math.random() * 254) + 1),
      deviceInfo: navigator.userAgent.split(' ')[0]
    };
    setSecurityLogs(prev => [newLog, ...prev].slice(0, 1000));
  };

  const handleLogin = (username: string, success: boolean, user?: User) => {
    if (success && user) {
      const updatedUser = { ...user, lastLogin: Date.now(), failedAttempts: 0 };
      setUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));
      setCurrentUser(updatedUser);
      logSecurity(user.id, user.name, 'LOGIN', 'AUTHENTICATION', 'User logged in successfully');
    } else {
      const target = users.find(u => u.username === username);
      if (target) {
        const newAttempts = (target.failedAttempts || 0) + 1;
        const shouldLock = newAttempts >= 5;
        setUsers(prev => prev.map(u => u.id === target.id ? { ...u, failedAttempts: newAttempts, isLocked: shouldLock } : u));
        logSecurity(target.id, target.name, 'SECURITY_ALERT', 'AUTHENTICATION', `Failed login attempt (${newAttempts}/5). ${shouldLock ? 'ACCOUNT LOCKED.' : ''}`);
      }
    }
  };

  const handleRegister = (userData: Partial<User>) => {
    const newUser: User = {
      id: generateUuid(),
      username: userData.username || '',
      password: userData.password || '',
      name: userData.name || '',
      employeeId: userData.employeeId || '',
      department: userData.department || 'General',
      role: userData.role || 'VIEWER',
      active: false, // Pending approval
      createdAt: Date.now(),
      employmentType: 'FULL_TIME',
      availableForAssignment: false,
      approvalLevel: 0,
      failedAttempts: 0,
      isLocked: false,
      mustChangePassword: false,
      email: userData.email,
      phone: userData.phone,
      twoFactorAuthEnabled: false,
    };
    
    if (users.find(u => u.username.toLowerCase() === newUser.username.toLowerCase())) {
      throw new Error('Username already exists.');
    }
    
    setUsers(prev => [...prev, newUser]);
    logSecurity(newUser.id, newUser.name, 'EDIT', 'AUTHENTICATION', 'New user self-registered (Pending Approval)');
    addNotification(`Registration request received for ${newUser.name}. Pending Administrator approval.`, 'info');
  };

  const generateSha256Hash = (str: string) => {
    // This is a client-side simulation. For a real app, use a proper crypto library
    // or generate on the backend.
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
  };

  const handleSystemReset = (log: SystemResetLog) => {
    setIsResetting(true);
    
    const currentSystemResetLogs = JSON.parse(localStorage.getItem('marmonil_system_reset_logs') || '[]'); 

    const backupData = {
      tickets, sparePartRequests, pmTasks, spareParts, users, machines, productionLogEntries, historicalDowntime, masterDataLogs, bulkImportLogs,
      systemResetLogs: currentSystemResetLogs
    };
    
    const backupJsonString = JSON.stringify(backupData, null, 2);
    const backupFileHash = generateSha256Hash(backupJsonString);

    const blob = new Blob([backupJsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Marmonil_Backup_${new Date().toISOString().slice(0,10)}_${log.resetType}_${log.resetMode}.json`;
    link.click();
    
    const finalLog = { ...log, backupFileHash: backupFileHash };
    setSystemResetLogs(prev => [finalLog, ...prev]); 

    setTimeout(() => {
      if (log.resetType === 'FULL_FACTORY') {
        const superAdmin = INITIAL_USERS.find(u => u.username === 'admin');
        const resetUsers = superAdmin ? [{ ...superAdmin, mustChangePassword: true, lastLogin: 0, failedAttempts: 0, isLocked: false }] : [];
        
        setTickets([]);
        setSparePartRequests([]);
        setPmTasks([]);
        setSpareParts([]);
        setUsers(resetUsers);
        setMachines([]);
        setActivityLogs([]);
        setSecurityLogs([]);
        setMasterDataLogs([]);
        setProductionLogEntries([]);
        setHistoricalDowntime([]);
        setBulkImportLogs([]);

        localStorage.setItem('marmonil_force_password_change', 'true');
        logSecurity(log.performedBy, log.performedBy, 'SYSTEM_RESET', 'ADMINISTRATION', `Full Factory Reset executed by ${log.performedBy}. Super Admin password change forced.`);

      } else { // Operational Reset
        setTickets([]);
        setSparePartRequests([]);
        setProductionLogEntries([]);
        setHistoricalDowntime([]);
        setActivityLogs([]);
        setSecurityLogs(prev => prev.filter(l => l.actionType !== 'LOGIN' && l.actionType !== 'LOGOUT'));
        logSecurity(log.performedBy, log.performedBy, 'SYSTEM_RESET', 'ADMINISTRATION', `Operational Data Reset executed by ${log.performedBy}.`);
      }

      setIsResetting(false);
      setCurrentUser(null);
      setCurrentView('planning');
      alert("System Reset Successfully Performed. Returning to Login.");
    }, 3000);
  };

  const handleBulkImport = (importMode: ImportMode, fileData: any[], mappings: MachineColumnMapping[], fileName: string, fileExcelHeaders: string[]) => {
    let recordsInserted = 0;
    let recordsUpdated = 0;
    let recordsSkipped = 0;
    let newVersionsCreated = 0;
    const importErrors: any[] = [];

    setMachines(prevMachines => {
      const updatedMachines = [...prevMachines];
      fileData.forEach((row, rowIndex) => {
        const assetCodeMapping = mappings.find((m: any) => m.systemField === 'originalAssetCode');
        const machineCode = (assetCodeMapping && fileExcelHeaders.indexOf(assetCodeMapping.excelHeader) !== -1)
          ? String(row[fileExcelHeaders.indexOf(assetCodeMapping.excelHeader)] || '').trim()
          : '';

        if (!machineCode) {
          recordsSkipped++;
          importErrors.push({ rowData: row, reason: `Row ${rowIndex + 2}: Missing required 'Asset Code'. Skipped.`, mode: importMode });
          return;
        }

        const existingMachine = updatedMachines.find(m => m.originalAssetCode === machineCode && m.isActiveVersion);
        
        const getMappedValue = (systemField: MachineSystemFieldType, defaultValue: any = '') => {
          const map = mappings.find((m: any) => m.systemField === systemField);
          if (!map || !map.excelHeader) return defaultValue;
          const excelHeaderIndex = fileExcelHeaders.indexOf(map.excelHeader);
          if (excelHeaderIndex === -1 || row[excelHeaderIndex] === undefined || row[excelHeaderIndex] === null) {
              return defaultValue;
          }
          return row[excelHeaderIndex];
        };

        const newMachineData: Partial<Machine> = {
          // Fixed: 'assetCode' should be in masterData
          originalAssetCode: machineCode,
          name: getMappedValue('name', 'Unknown Machine')?.toString() || 'Unknown Machine',
          category: getMappedValue('category', 'General')?.toString() || 'General',
          workcenterArea: getMappedValue('workcenterArea', 'General')?.toString() || 'General',
          department: getMappedValue('department', 'Production')?.toString() || 'Production',
          commissioningDate: getMappedValue('commissioningDate') ? new Date(getMappedValue('commissioningDate')).getTime() : Date.now(),
          status: 'RUNNING',
          plannedHours: parseFloat(getMappedValue('plannedHours') || 168),
          hourlyLossRate: parseFloat(getMappedValue('hourlyLossRate') || 0),
          productionRatePerHour: parseFloat(getMappedValue('productionRatePerHour') || 0),
          idealProductionRate: parseFloat(getMappedValue('idealProductionRate') || 0),
          history: [],
          
          masterData: {
            assetCode: machineCode, // Correct location for assetCode
            machineType: getMappedValue('machineType')?.toString() || '',
            manufacturer: getMappedValue('manufacturer')?.toString() || '',
            model: getMappedValue('model')?.toString() || '',
            serialNumber: getMappedValue('serialNumber')?.toString() || '',
            criticality: getMappedValue('criticality')?.toString() as Priority || 'NORMAL',
            isHistorical: false,
            standardCycleTime: parseFloat(getMappedValue('standardCycleTime') || 0),
            expectedOutputPerShift: parseFloat(getMappedValue('expectedOutputPerShift') || 0),
            plannedDowntimePerWeek: parseFloat(getMappedValue('plannedDowntimePerWeek') || 0),
            shiftConfiguration: getMappedValue('shiftConfiguration')?.toString() || '3-Shift Operation',
            oeeTarget: parseFloat(getMappedValue('oeeTarget') || 85),
            pmFrequencyDays: parseFloat(getMappedValue('pmFrequencyDays') || 30),
            mtbfBaseline: parseFloat(getMappedValue('mtbfBaseline') || 150),
            mttrBaseline: parseFloat(getMappedValue('mttrBaseline') || 45),
            sparePartsCategory: getMappedValue('sparePartsCategory')?.toString() || 'General',
            requiredSkillType: getMappedValue('requiredSkillType')?.toString() as any || 'MECHANICAL',
            weeklyCapacity: parseFloat(getMappedValue('weeklyCapacity') || 168),
            bufferPercentage: parseFloat(getMappedValue('bufferPercentage') || 10),
          },
          approvals: {},
          versionNumber: 1,
          isActiveVersion: true,
          parentRecordId: undefined,
          approvalStatus: 'DRAFT',
        };

        if (importMode === 'ADD_ONLY') {
          if (existingMachine) {
            recordsSkipped++;
            importErrors.push({ rowData: row, reason: `Row ${rowIndex + 2}: Asset Code '${machineCode}' already exists (Active Version). Skipped.`, mode: importMode });
          } else {
            updatedMachines.push({ ...newMachineData as Machine, id: generateUuid() });
            recordsInserted++;
          }
        } else if (importMode === 'UPDATE_EXISTING') {
          if (existingMachine) {
            if (existingMachine.approvalStatus === 'APPROVED' || existingMachine.approvalStatus === 'UNDER_MAINTENANCE_REVIEW' || existingMachine.approvalStatus === 'UNDER_PRODUCTION_REVIEW' || existingMachine.approvalStatus === 'UNDER_PLANNING_REVIEW') {
              recordsSkipped++;
              importErrors.push({ rowData: row, reason: `Row ${rowIndex + 2}: Asset Code '${machineCode}' is ${existingMachine.approvalStatus}. Cannot update directly. Skipped.`, mode: importMode });
            } else {
              // Merge updates, ensuring masterData is nested correctly
              Object.assign(existingMachine, {
                ...newMachineData,
                id: existingMachine.id,
                versionNumber: existingMachine.versionNumber,
                isActiveVersion: existingMachine.isActiveVersion,
                originalAssetCode: existingMachine.originalAssetCode,
                masterData: { ...existingMachine.masterData, ...newMachineData.masterData }
              });
              existingMachine.approvalStatus = 'DRAFT';
              recordsUpdated++;
            }
          } else {
            updatedMachines.push({ ...newMachineData as Machine, id: generateUuid() });
            recordsInserted++;
          }
        } else if (importMode === 'CREATE_NEW_VERSION') {
          if (existingMachine) {
            existingMachine.isActiveVersion = false;
            existingMachine.approvalStatus = 'ARCHIVED';
            
            const newVersionMachine: Machine = {
              ...newMachineData as Machine,
              id: generateUuid(),
              versionNumber: existingMachine.versionNumber + 1,
              parentRecordId: existingMachine.id,
              isActiveVersion: true,
              approvalStatus: 'DRAFT',
              originalAssetCode: existingMachine.originalAssetCode,
            };
            updatedMachines.push(newVersionMachine);
            newVersionsCreated++;
          } else {
            updatedMachines.push({ ...newMachineData as Machine, id: generateUuid() });
            recordsInserted++;
          }
        }
      });
      return updatedMachines;
    });

    const newLog: BulkImportLog = {
      id: generateUuid(),
      timestamp: Date.now(),
      importedBy: currentUser?.name || 'System',
      fileName: fileName,
      importMode: importMode,
      recordsInserted: recordsInserted,
      recordsUpdated: recordsUpdated,
      recordsSkipped: recordsSkipped,
      newVersionsCreated: newVersionsCreated,
      reportDownloadUrl: importErrors.length > 0 ? `data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(importErrors, null, 2))}` : undefined
    };
    setBulkImportLogs(prev => [newLog, ...prev]);
    logSecurity(currentUser.id, currentUser.name, 'BULK_IMPORT', 'MASTER_DATA', `Bulk import completed: Mode ${importMode}. Inserted: ${recordsInserted}, Updated: ${recordsUpdated}, Skipped: ${recordsSkipped}, New Versions: ${newVersionsCreated}`);
    addNotification(`Bulk Import (${importMode}) Complete. Inserted: ${recordsInserted}, Updated: ${recordsUpdated}, Skipped: ${recordsSkipped}.`, 'success');

    if (newLog.reportDownloadUrl && importErrors.length > 0) {
      const link = document.createElement('a');
      link.href = newLog.reportDownloadUrl;
      link.download = `BulkImport_Error_Report_${new Date().toISOString().slice(0,10)}.json`;
      link.click();
      addNotification("Download: Bulk Import Error Report Generated.", 'info');
    }

    return { recordsInserted, recordsUpdated, recordsSkipped, newVersionsCreated };
  };

  const addNotification = (text: string, type: 'info' | 'urgent' | 'success') => {
    setNotifications(prev => [{ id: Math.random().toString(), text, type }, ...prev].slice(0, 5));
  };

  const createTicket = (data: any) => {
    const machine = machines.find(m => m.id === data.machineId && m.isActiveVersion && m.approvalStatus === 'APPROVED');
    if (machine && machine.approvalStatus !== 'APPROVED') {
       addNotification(`Warning: Asset ${machine.name} Master Data is not approved. KPI accuracy may be compromised.`, 'urgent');
    }
    const now = Date.now();
    const newTicket: Ticket = {
      ...data,
      id: `BRK-${new Date().getFullYear()}-${String(tickets.length + 1).padStart(4, '0')}`,
      status: 'OPEN', assignedTechnicians: [], sparePartsConsumed: [], createdAt: now, lastStatusChange: now,
      totalActiveMinutes: 0, totalHoldMinutes: 0, slaDeadline: now + (SLA_THRESHOLDS[data.priority as Priority] || 21600000), isEscalated: false,
      logs: [{ timestamp: now, status: 'OPEN', user: currentUser?.name || 'System' }]
    };
    setTickets(prev => [newTicket, ...prev]);
    addNotification(`Ticket ${newTicket.id} created for ${newTicket.machineName}`, 'info');
  };

  const updateTicket = (ticketId: string, action: string, payload?: any) => {
    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId) return t;
      const now = Date.now();
      const updated = { ...t };
      const elapsed = (now - (t.lastStatusChange || t.createdAt)) / 60000;
      if (t.status === 'IN_PROGRESS') updated.totalActiveMinutes += elapsed;
      else if (t.status === 'ON_HOLD') updated.totalHoldMinutes += elapsed;
      updated.lastStatusChange = now;
      if (action === 'START') { updated.status = 'IN_PROGRESS'; updated.currentHoldDetails = undefined; if(payload?.technicians) { updated.assignedTechnicians = payload.technicians; updated.technicianName = payload.technicians[0]?.name; updated.assignedAt = now; } }
      if (action === 'HOLD') { updated.status = 'ON_HOLD'; updated.currentHoldDetails = { ...payload.details, timestamp: now }; }
      if (action === 'CLOSE') { updated.status = 'CLOSED'; updated.solution = payload.solution; updated.closedAt = now; updated.actualDowntimeMinutes = (now - t.createdAt) / 60000; }
      updated.logs = [...(updated.logs || []), { timestamp: now, status: updated.status, user: currentUser?.name || 'System', note: action }];
      return updated;
    }));
  };

  const handleUpdateMachine = (machine: Machine) => {
    setMachines(prev => prev.map(m => m.id === machine.id ? machine : m));
    logSecurity(currentUser?.id || 'sys', currentUser?.name || 'sys', 'EDIT', 'RESOURCES', `Modified asset parameters for ${machine.name}`);
  };

  const handleUpdateMasterData = (machineId: string, masterData: any, newStatus: any, log?: MasterDataLogEntry) => {
    setMachines(prev => prev.map(m => {
       if (m.id !== machineId) return m;
       return { ...m, masterData, approvalStatus: newStatus };
    }));
    if (log) setMasterDataLogs(prev => [log, ...prev].slice(0, 1000));
    logSecurity(currentUser?.id || 'sys', currentUser?.name || 'sys', 'EDIT', 'MASTER_DATA', `Update master data for asset ${machineId} to ${newStatus}`);
  };

  const handleVerifyMasterData = (machineId: string, dept: 'maintenance' | 'production' | 'planning', entry: any, nextStatus: any) => {
    setMachines(prev => prev.map(m => {
      if (m.id !== machineId) return m;
      const approvals = { ...m.approvals, [dept]: entry };
      return { ...m, approvals, approvalStatus: nextStatus };
    }));
    logSecurity(currentUser!.id, currentUser!.name, 'APPROVE', 'MASTER_DATA', `Verified ${dept} stage for machine ${machineId}`);
  };

  const handleUpdateSpareRequest = (requestId: string, status: string) => {
    setSparePartRequests(prev => prev.map(r => r.id === requestId ? {...r, status: status as any} : r));
    logSecurity(currentUser?.id || 'sys', currentUser?.name || 'sys', 'EDIT', 'LOGISTICS', `Updated Spare Request ${requestId} to ${status}`);
  };

  const handleGeneratePMTicket = (task: PreventiveMaintenanceTask) => {
    createTicket({
      machineId: task.machineId,
      machineName: task.machineName,
      category: machines.find(m => m.id === task.machineId)?.category || 'GENERAL',
      priority: 'NORMAL',
      faultType: task.specialty,
      downtimeType: 'PARTIAL_STOP',
      description: `Scheduled PM Duty: ${task.taskName}`,
      media: [],
      pmTaskId: task.id
    });
    setPmTasks(prev => prev.map(t => t.id === task.id ? { ...t, lastPerformed: Date.now(), nextDue: Date.now() + (t.frequencyDays * 86400000) } : t));
    logSecurity(currentUser?.id || 'sys', currentUser?.name || 'sys', 'ASSIGNMENT', 'PREVENTIVE', `Generated ticket from PM schedule: ${task.taskName}`);
  };

  if (isResetting) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-8">
        <Loader2 className="w-16 h-16 animate-spin text-red-500 mb-8" />
        <h1 className="text-4xl font-black uppercase tracking-tighter mb-4">System Data Erase in Progress</h1>
        <p className="text-slate-400 font-mono text-center max-w-md">Encrypted Backup Generated • Wiping Operational Database • Resetting Services...</p>
      </div>
    );
  }

  // Conditional rendering for PublicLayout (Login) vs. PrivateLayout (App content)
  if (!currentUser) return (
    <PublicLayout>
      <Login 
        users={users} 
        onLogin={(u, s) => handleLogin(u, s, users.find(x => x.username === u))} 
        onRegister={handleRegister}
        forcePasswordChange={forcePasswordChange} 
      />
    </PublicLayout>
  );

  const activeApprovedMachines = machines.filter(m => m.isActiveVersion && m.approvalStatus === 'APPROVED');

  return (
    <Layout user={currentUser} currentView={currentView} onChangeView={setCurrentView} onLogout={() => { logSecurity(currentUser.id, currentUser.name, 'LOGOUT', 'AUTHENTICATION', 'Session ended'); setCurrentUser(null); }}>
      <div className="fixed top-20 right-8 z-[200] flex flex-col gap-3 no-print pointer-events-none">
        {notifications.map(n => (
          <div key={n.id} className={`pointer-events-auto flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl border-2 animate-in slide-in-from-right-10 duration-300 ${
            n.type === 'urgent' ? 'bg-red-900 border-red-500 text-white' : n.type === 'success' ? 'bg-emerald-900 border-emerald-500 text-white' : 'bg-slate-900 border-slate-700 text-white'
          }`}>
            {n.type === 'urgent' ? <ShieldAlert className="w-6 h-6 text-red-400" /> : n.type === 'success' ? <CheckCircle2 className="w-6 h-6 text-emerald-400" /> : <Activity className="w-6 h-6 text-blue-400" />}
            <div className="flex-1 pr-8">
               <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">System Alert</div>
               <div className="text-sm font-bold tracking-tight">{n.text}</div>
            </div>
            <button onClick={() => setNotifications(prev => prev.filter(x => x.id !== n.id))} className="opacity-40 hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
          </div>
        ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        {currentView === 'planning' && <PlanningBoard tickets={tickets} machines={activeApprovedMachines} />}
        {currentView === 'production' && <ProductionView machines={activeApprovedMachines} tickets={tickets} onCreateTicket={createTicket} />}
        {currentView === 'maintenance' && <MaintenanceView tickets={tickets} currentUser={currentUser} allUsers={users} onUpdateTicket={updateTicket} spareParts={spareParts} spareRequests={sparePartRequests} />}
        {currentView === 'master-data-setup' && <MasterDataSetup machines={machines} currentUser={currentUser} logs={masterDataLogs} onUpdateMasterData={handleUpdateMasterData} onVerifyMasterData={handleVerifyMasterData} logSecurity={logSecurity} />}
        {currentView === 'production-kpi-entry' && <ProductionKPIEntry machines={activeApprovedMachines} currentUser={currentUser} onLogProductionEntry={(log) => setProductionLogEntries([...productionLogEntries, log])} />}
        {currentView === 'production-kpi' && <ProductionKPIDashboard machines={activeApprovedMachines} productionLogEntries={productionLogEntries} currentUser={currentUser} onDeleteEntry={(id) => setProductionLogEntries(prev => prev.filter(e => e.id !== id))} />}
        {currentView === 'ai-advanced-report' && <AIAdvancedReport tickets={tickets} machines={activeApprovedMachines} users={users} productionLogs={productionLogEntries} currentUser={currentUser} />}
        {currentView === 'predictive' && <PredictiveView tickets={tickets} machines={activeApprovedMachines} onSchedule={(id) => { setContextMachineId(id); setCurrentView('preventive'); }} />}
        {currentView === 'team' && <MaintenanceTeamView users={users} tickets={tickets} />}
        {currentView === 'technician-analytics' && <TechnicianView users={users} tickets={tickets} />}
        {currentView === 'operating-hours' && <OperatingHoursView tickets={tickets} machines={activeApprovedMachines} historicalDowntime={historicalDowntime} currentUser={currentUser} onUpdateMachine={handleUpdateMachine} />}
        {currentView === 'preventive' && <PreventiveMaintenanceView tasks={pmTasks} tickets={tickets} machines={activeApprovedMachines} initialMachineId={contextMachineId} onAddTask={(t) => setPmTasks([...pmTasks, { ...t, id: `pm-${Date.now()}`, lastPerformed: 0, nextDue: Date.now() + (t.frequencyDays * 86400000) }])} onGenerateTicket={handleGeneratePMTicket} />}
        {currentView === 'spare-parts-tracking' && <SparePartTrackingView requests={sparePartRequests} onUpdateRequest={handleUpdateSpareRequest} currentUser={currentUser} />}
        {currentView === 'store' && <StoreView spareParts={spareParts} currentUser={currentUser} onUpdateInventory={setSpareParts} />}
        {currentView === 'failure-history' && <FailureHistoryView tickets={tickets} machines={activeApprovedMachines} users={users} />}
        {currentView === 'reports' && <ReportsView tickets={tickets} machines={activeApprovedMachines} users={users} sparePartRequests={sparePartRequests} pmTasks={pmTasks} historicalDowntime={historicalDowntime} currentUser={currentUser} onLogAction={(a) => logSecurity(currentUser.id, currentUser.name, 'EDIT', 'REPORTING', a)} />}
        {currentView === 'audit-log' && <AuditView logs={activityLogs} />}
        {currentView === 'bulk-machine-import' && <BulkMachineImportView machines={machines} currentUser={currentUser} onBulkImport={handleBulkImport} logs={bulkImportLogs} logSecurity={logSecurity} />}
        {currentView === 'system-builder' && <TicketSystemBuilder currentUser={currentUser} onLogAction={(a) => logSecurity(currentUser!.id, currentUser!.name, 'EDIT', 'BUILDER', a)} />}
        {currentView === 'system-reset' && <SystemResetView currentUser={currentUser} tickets={tickets} users={users} onReset={handleSystemReset} resetLogs={systemResetLogs} logSecurity={logSecurity} />}
        {currentView === 'resources' && <ResourceManagement users={users} machines={machines} spareParts={spareParts} pmTasks={pmTasks} activityLogs={activityLogs} securityLogs={securityLogs} currentUser={currentUser} onUpdateUser={(u, a) => setUsers(prev => a === 'ADD' ? [...prev, u] : a === 'REMOVE' ? prev.filter(x => x.id !== u.id) : prev.map(x => x.id === u.id ? u : x))} onUpdateMachine={handleUpdateMachine} onDeleteMachine={(originalAssetCode) => setMachines(prev => prev.filter(m => m.originalAssetCode !== originalAssetCode))} onUpdateSparePart={(p, a) => setSpareParts(prev => a === 'ADD' ? [...prev, p] : a === 'REMOVE' ? prev.filter(x => x.code !== p.code) : prev.map(x => x.code === p.code ? p : x))} onAddPMTask={(t) => setPmTasks([...pmTasks, { ...t, id: `pm-${Date.now()}`, lastPerformed: 0, nextDue: Date.now() + (t.frequencyDays * 86400000) }])} onDeletePMTask={(id) => setPmTasks(prev => prev.filter(x => x.id !== id))} onAddHistoricalDowntime={(h) => setHistoricalDowntime([...historicalDowntime, { ...h, id: `hist-${Date.now()}`, insertedDate: Date.now(), insertedBy: currentUser.name, isHistorical: true }])} onLogAction={(a) => logSecurity(currentUser.id, currentUser.name, 'EDIT', 'RESOURCES', a)} />}
        {currentView === 'users' && <ResourceManagement users={users} machines={activeApprovedMachines} spareParts={spareParts} pmTasks={pmTasks} activityLogs={activityLogs} securityLogs={securityLogs} currentUser={currentUser} onUpdateUser={(u, a) => setUsers(prev => a === 'ADD' ? [...prev, u] : a === 'REMOVE' ? prev.filter(x => x.id !== u.id) : prev.map(x => x.id === u.id ? u : x))} onUpdateMachine={handleUpdateMachine} onDeleteMachine={(originalAssetCode) => setMachines(prev => prev.filter(m => m.originalAssetCode !== originalAssetCode))} onUpdateSparePart={() => {}} onAddPMTask={() => {}} onDeletePMTask={() => {}} onAddHistoricalDowntime={() => {}} onLogAction={() => {}} />}
        {currentView === 'kpi' && <KPIs tickets={tickets} machines={activeApprovedMachines} />}
        {currentView === 'guide' && <SystemGuide />}
      </div>
      <AIChatbot />
    </Layout>
  );
};

export default App;