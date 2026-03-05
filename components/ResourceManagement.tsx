// Resource Management Module - Enhanced for Industrial Enterprise RBAC and Security
import React, { useState, useMemo, useRef } from 'react';
import { Settings, Plus, Trash2, Edit2, UserPlus, Users, Search, Lock, UserCog, Wrench, Briefcase, Package, AlertCircle, Calendar, Filter, X, CheckCircle2, ShieldAlert, History, Clock, Fingerprint, ShieldCheck, Mail, Phone, User as UserIcon, Copy, ChevronRight, AlertTriangle, ShieldX, XCircle, Download, ChevronDown } from 'lucide-react';
import { Machine, User, SparePart, PreventiveMaintenanceTask, ActivityLog, Role, HoldCategory, Ticket, SparePartRequest, HistoricalDowntime, UserAuditLog, RoleDefinition, PermissionSet, MaintenanceRoleType, SkillLevel, FaultType } from '../types';
import { MACHINE_CATEGORIES, DEPARTMENTS, SYSTEM_ROLES } from '../constants';
import * as XLSX from 'xlsx'; // Added XLSX import

interface ResourceManagementProps {
  users: User[];
  machines: Machine[]; // Now includes all versions
  spareParts: SparePart[];
  pmTasks: PreventiveMaintenanceTask[];
  activityLogs: ActivityLog[];
  securityLogs: UserAuditLog[];
  currentUser: User;
  onUpdateUser: (user: User, action: 'ADD' | 'EDIT' | 'REMOVE') => void;
  onUpdateMachine: (machine: Machine) => void;
  onDeleteMachine: (originalAssetCode: string) => void; // Modified to handle all versions by originalAssetCode
  onUpdateSparePart: (part: SparePart, action: 'ADD' | 'EDIT' | 'REMOVE') => void;
  onAddPMTask: (task: Omit<PreventiveMaintenanceTask, 'id' | 'lastPerformed' | 'nextDue'>) => void;
  onDeletePMTask: (taskId: string) => void;
  onAddHistoricalDowntime: (entry: Omit<HistoricalDowntime, 'id' | 'insertedDate' | 'insertedBy' | 'isHistorical'>) => void;
  onLogAction: (action: string) => void;
}

const generateUuid = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

export const ResourceManagement: React.FC<ResourceManagementProps> = ({ 
  users, machines, spareParts, pmTasks, activityLogs, securityLogs, currentUser, 
  onUpdateUser, onUpdateMachine, onDeleteMachine, onAddPMTask, onDeletePMTask, onAddHistoricalDowntime, onLogAction, onUpdateSparePart,
}) => {
  const [activeTab, setActiveTab] = useState<'assets' | 'users' | 'spareParts' | 'pm' | 'security'>('assets');

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-center no-print">
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 p-3 rounded-2xl text-white shadow-xl">
             <Settings className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">System Control Center</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Resource & Governance Infrastructure</p>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 flex gap-6 overflow-x-auto no-print">
        {[
          { id: 'assets', label: 'Asset Registry', icon: Settings },
          { id: 'users', label: 'Identity & RBAC', icon: Users },
          { id: 'spareParts', label: 'Logistics', icon: Package },
          { id: 'pm', label: 'Maintenance Plan', icon: Calendar },
          { id: 'security', label: 'Security Trail', icon: ShieldAlert }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`py-4 px-2 font-black text-[10px] uppercase tracking-widest whitespace-nowrap transition-all border-b-2 flex items-center gap-2 tab-btn ${activeTab === tab.id ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'assets' && <AssetManagementTab machines={machines} onUpdateMachine={onUpdateMachine} onDeleteMachine={onDeleteMachine} onAddHistoricalDowntime={onAddHistoricalDowntime} />}
        {activeTab === 'users' && <UserManagementTab users={users} onUpdateUser={onUpdateUser} />}
        {activeTab === 'spareParts' && <SparePartManagementTab spareParts={spareParts} onUpdateSparePart={onUpdateSparePart} />}
        {activeTab === 'pm' && <PMTaskManagementTab pmTasks={pmTasks} machines={machines.filter(m => m.isActiveVersion && m.approvalStatus === 'APPROVED')} onAddPMTask={onAddPMTask} onDeletePMTask={onDeletePMTask} />}
        {activeTab === 'security' && <SecurityLogsTab securityLogs={securityLogs} />}
      </div>
    </div>
  );
};

// ===========================================================================
// Assets Sub-Component
// ===========================================================================

interface AssetManagementTabProps {
  machines: Machine[];
  onUpdateMachine: (machine: Machine) => void;
  onDeleteMachine: (originalAssetCode: string) => void; // Corrected to use originalAssetCode
  onAddHistoricalDowntime: (entry: Omit<HistoricalDowntime, 'id' | 'insertedDate' | 'insertedBy' | 'isHistorical'>) => void;
}

const AssetManagementTab: React.FC<AssetManagementTabProps> = ({ machines, onUpdateMachine, onDeleteMachine, onAddHistoricalDowntime }) => {
  const [editingMachine, setEditingMachine] = useState<Partial<Machine> | null>(null);
  const [showMachineModal, setShowMachineModal] = useState(false);
  const [historicalMachineId, setHistoricalMachineId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter to show only active versions for management
  const activeMachines = machines.filter(m => m.isActiveVersion && m.approvalStatus !== 'ARCHIVED');

  const filteredMachines = activeMachines.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.workcenterArea.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.originalAssetCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingMachine && editingMachine.name && editingMachine.category && editingMachine.workcenterArea && editingMachine.originalAssetCode) { // Added originalAssetCode to required fields
      // Find existing machine by originalAssetCode if editing
      const existing = machines.find(m => m.originalAssetCode === editingMachine.originalAssetCode && m.isActiveVersion);

      const newMachine: Machine = {
        id: editingMachine.id || generateUuid(),
        originalAssetCode: editingMachine.originalAssetCode, // Use the provided or generated originalAssetCode
        versionNumber: existing ? existing.versionNumber : 1, // Keep version if editing, else 1
        isActiveVersion: editingMachine.isActiveVersion ?? true,
        name: editingMachine.name,
        category: editingMachine.category,
        workcenterArea: editingMachine.workcenterArea,
        status: editingMachine.status || 'RUNNING',
        plannedHours: editingMachine.plannedHours || 168,
        hourlyLossRate: editingMachine.hourlyLossRate || 0,
        productionRatePerHour: editingMachine.productionRatePerHour || 0,
        idealProductionRate: editingMachine.idealProductionRate || 0,
        department: editingMachine.department || 'Production',
        commissioningDate: editingMachine.commissioningDate || Date.now(),
        history: editingMachine.history || [],
        masterData: editingMachine.masterData,
        approvalStatus: editingMachine.approvalStatus || 'DRAFT',
        approvals: editingMachine.approvals || {},
        parentRecordId: editingMachine.parentRecordId,
      } as Machine;

      onUpdateMachine(newMachine);
      setShowMachineModal(false);
      setEditingMachine(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Physical Asset Fleet</h4>
        <button onClick={() => { setEditingMachine({ plannedHours: 168, status: 'RUNNING', department: 'Production', commissioningDate: Date.now(), versionNumber: 1, isActiveVersion: true, approvalStatus: 'DRAFT', originalAssetCode: '' }); setShowMachineModal(true); }} className="btn-industrial btn-primary px-10 py-5">
          <Plus className="w-4 h-4" /> Provision New Asset
        </button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input 
          type="text" 
          placeholder="Lookup asset by name, serial, category or area..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-11 pr-4 py-3.5 bg-white border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMachines.map(m => {
          const isDown = m.status === 'OUT_OF_SERVICE';
          const isApproved = m.approvalStatus === 'APPROVED';
          return (
            <div key={m.id} className={`card-industrial p-6 flex flex-col justify-between min-h-[14rem] border-2 transition-all hover:border-blue-200 ${isDown ? 'bg-slate-50' : 'bg-white'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h4 className={`font-black text-lg uppercase tracking-tight ${isDown ? 'text-slate-400' : 'text-slate-800'}`}>{m.name}</h4>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{m.category} • {m.workcenterArea} (v{m.versionNumber})</p>
                  <p className="text-[9px] font-bold text-slate-300 uppercase mt-1">Sect: {m.department}</p>
                </div>
                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border-2 ${
                  m.status === 'RUNNING' ? 'bg-green-50 text-green-700 border-green-100' :
                  m.status === 'UNDER_MAINTENANCE' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                  'bg-red-50 text-red-700 border-red-100'
                }`}>
                  {m.status.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-6">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 uppercase">Target Plan</span>
                  <span className="text-sm font-black text-slate-700">{m.plannedHours}h / week</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setHistoricalMachineId(m.id)} className="p-2.5 text-amber-600 hover:bg-amber-50 rounded-xl transition-all" title="Add Historical Record"><History className="w-4 h-4" /></button>
                  <button onClick={() => { setEditingMachine(m); setShowMachineModal(true); }} className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Edit Asset"><Edit2 className="w-4 h-4" /></button>
                  {/* Corrected onDeleteMachine to pass originalAssetCode */}
                  <button onClick={() => { if(confirm(`Confirm decommissioning and deleting ALL versions of "${m.name}"? This action is irreversible.`)) onDeleteMachine(m.originalAssetCode); }} className="p-2.5 text-red-400 hover:bg-red-50 rounded-xl transition-all" title="Delete Asset and all its versions"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {historicalMachineId && (
        <HistoricalRecordModal 
          machine={machines.find(m => m.id === historicalMachineId)!} 
          onClose={() => setHistoricalMachineId(null)} 
          onAdd={onAddHistoricalDowntime} 
        />
      )}

      {showMachineModal && (
        <div className="fixed inset-0 z-[150] bg-slate-950/80 flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 my-8">
            <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
              <div className="flex items-center gap-4">
                 <div className="bg-blue-600 p-3 rounded-2xl"><Wrench className="w-6 h-6" /></div>
                 <div>
                    <h2 className="text-xl font-black uppercase tracking-tight">{editingMachine?.id ? 'Asset Reconfiguration' : 'Asset Provisioning'}</h2>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-0.5">Physical Infrastructure Unit</p>
                 </div>
              </div>
              <button onClick={() => setShowMachineModal(false)} className="p-3 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset Name / Tag</label><input type="text" value={editingMachine?.name || ''} onChange={(e) => setEditingMachine({...editingMachine, name: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500" required /></div>
                <div className="space-y-1.5"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Workcenter Area</label><input type="text" value={editingMachine?.workcenterArea || ''} onChange={(e) => setEditingMachine({...editingMachine, workcenterArea: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500" required /></div>
                <div className="space-y-1.5"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</label><select value={editingMachine?.category || ''} onChange={(e) => setEditingMachine({...editingMachine, category: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 appearance-none" required><option value="">-- Select Group --</option>{MACHINE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
                <div className="space-y-1.5"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</label><select value={editingMachine?.department || ''} onChange={(e) => setEditingMachine({...editingMachine, department: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500 appearance-none" required><option value="">-- Select Owner Dept --</option>{DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}</select></div>
                <div className="space-y-1.5"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Commissioning Date</label><input type="date" value={editingMachine?.commissioningDate ? new Date(editingMachine.commissioningDate).toISOString().split('T')[0] : ''} onChange={(e) => setEditingMachine({...editingMachine, commissioningDate: new Date(e.target.value).getTime()})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500" /></div>
                <div className="space-y-1.5"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Planned Hours (Weekly)</label><input type="number" value={editingMachine?.plannedHours || 0} onChange={(e) => setEditingMachine({...editingMachine, plannedHours: parseFloat(e.target.value)})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500" required min="0" max="168" /></div>
                {/* Adding originalAssetCode field for new assets */}
                {(!editingMachine?.id || !editingMachine?.originalAssetCode) && ( // Show only for new machines or if missing originalAssetCode
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Original Asset Code (Unique Identifier)</label>
                    <input type="text" value={editingMachine?.originalAssetCode || ''} onChange={(e) => setEditingMachine({...editingMachine, originalAssetCode: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500" placeholder="e.g., SL-A-001 (Must be unique)" required />
                  </div>
                )}
              </div>
              <div className="flex gap-4 pt-4 border-t border-slate-50">
                 <button type="button" onClick={() => setShowMachineModal(false)} className="flex-1 btn-industrial btn-outline py-5">Cancel</button>
                 <button type="submit" className="flex-[2] btn-industrial btn-primary py-5 !text-sm">{editingMachine?.id ? 'Commit Changes' : 'Execute Provisioning'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const HistoricalRecordModal: React.FC<{ machine: Machine, onClose: () => void, onAdd: (entry: Omit<HistoricalDowntime, 'id' | 'insertedDate' | 'insertedBy' | 'isHistorical'>) => void }> = ({ machine, onClose, onAdd }) => {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('UNPLANNED_BREAKDOWN');
  const [justification, setJustification] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!start || !end || !justification) return;
    const startMs = new Date(start).getTime();
    const endMs = new Date(end).getTime();
    if (endMs < startMs) { alert("Invalid timeline restoration."); return; }
    onAdd({ assetId: machine.id, assetName: machine.name, startDate: startMs, endDate: endMs, reason, justification });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[160] bg-slate-950/80 flex items-center justify-center p-4 backdrop-blur-md">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
        <div className="bg-amber-600 p-8 text-white flex justify-between items-center"><div className="flex items-center gap-4"><History className="w-6 h-6" /><div><h3 className="text-lg font-black uppercase tracking-tight">Legacy Data Injection</h3><p className="text-amber-200 text-[9px] font-black uppercase tracking-widest">{machine.name}</p></div></div><button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button></div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-1.5"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Start Date</label><input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} required className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-xs font-bold outline-none" /></div>
             <div className="space-y-1.5"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">End Date</label><input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} required className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-xs font-bold outline-none" /></div>
          </div>
          <div className="space-y-1.5"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Failure Cause</label><select value={reason} onChange={e => setReason(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-xs font-bold outline-none"><option value="UNPLANNED_BREAKDOWN">Unplanned Breakdown</option><option value="PREVENTIVE_MAINTENANCE">Preventive Maintenance</option><option value="EXTERNAL_FAILURE">External Failure</option></select></div>
          <div className="space-y-1.5"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">Mandatory Audit Note</label><textarea value={justification} onChange={e => setJustification(e.target.value)} required rows={3} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 text-xs font-bold outline-none" placeholder="Reason for retroactive data modification..."></textarea></div>
          <button type="submit" className="w-full btn-industrial bg-amber-600 hover:bg-amber-700 text-white py-5 shadow-lg shadow-amber-600/20">Append Historical Record</button>
        </form>
      </div>
    </div>
  );
};

// ===========================================================================
// Identity & RBAC Sub-Component
// ===========================================================================

interface UserManagementTabProps {
  users: User[];
  onUpdateUser: (user: User, action: 'ADD' | 'EDIT' | 'REMOVE') => void;
}

const UserManagementTab: React.FC<UserManagementTabProps> = ({ users, onUpdateUser }) => {
  const [viewMode, setViewMode] = useState<'users' | 'roles'>('users');
  const [editingUser, setEditingUser] = useState<Partial<User> | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) || u.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser?.name && editingUser?.username && editingUser?.role) {
      onUpdateUser({
        ...editingUser,
        id: editingUser.id || generateUuid(),
        active: editingUser.active ?? true,
        employmentType: editingUser.employmentType || 'FULL_TIME',
        employeeId: editingUser.employeeId || 'EMP-' + Math.floor(Math.random()*1000),
        failedAttempts: 0,
        isLocked: false,
        password: editingUser.password || '123', // Default password for new users
        mustChangePassword: editingUser.id ? (editingUser.mustChangePassword ?? false) : true, // Force password change for new users
        availableForAssignment: editingUser.availableForAssignment ?? true,
        approvalLevel: editingUser.approvalLevel || 1,
        createdAt: editingUser.createdAt || Date.now(),
        twoFactorAuthEnabled: editingUser.twoFactorAuthEnabled ?? false, // Ensure 2FA is set
      } as User, editingUser.id ? 'EDIT' : 'ADD');
      setShowModal(false);
      setEditingUser(null);
    }
  };

  const toggleUserStatus = (user: User) => {
    onUpdateUser({ ...user, active: !user.active }, 'EDIT');
  };

  const getStatusButton = (user: User) => {
    if (user.isLocked) {
      return (
        <button 
          onClick={() => onUpdateUser({ ...user, isLocked: false, failedAttempts: 0 }, 'EDIT')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-red-100 text-red-600 border-2 border-red-200 hover:bg-red-200 transition-all shadow-sm"
          title="Click to Unlock Account"
        >
          <ShieldX className="w-3.5 h-3.5" /> Locked
        </button>
      );
    }

    if (user.active) {
      return (
        <button 
          onClick={() => toggleUserStatus(user)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-600 border-2 border-emerald-200 hover:bg-emerald-50 transition-all shadow-sm group"
          title="Click to Deactivate"
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> Active
        </button>
      );
    }

    return (
      <button 
        onClick={() => toggleUserStatus(user)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 border-2 border-slate-200 hover:bg-slate-200 transition-all shadow-sm"
        title="Click to Activate"
      >
        <XCircle className="w-3.5 h-3.5" /> Deactivated
      </button>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
         <div className="flex bg-slate-100 p-1.5 rounded-2xl">
            <button onClick={() => setViewMode('users')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'users' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>User Directory</button>
            <button onClick={() => setViewMode('roles')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'roles' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>RBAC Policy Matrix</button>
         </div>
         {viewMode === 'users' && (
           <button onClick={() => { setEditingUser({ role: 'VIEWER', active: true, department: 'Production', employmentType: 'FULL_TIME', availableForAssignment: true, approvalLevel: 1, twoFactorAuthEnabled: false }); setShowModal(true); }} className="btn-industrial btn-primary px-10 py-5 shadow-xl shadow-blue-900/10">
             <UserPlus className="w-4 h-4" /> Issue Credentials
           </button>
         )}
      </div>

      {viewMode === 'users' ? (
        <div className="space-y-6">
           <div className="relative">
             <Search className="w-5 h-5 text-slate-300 absolute left-4 top-1/2 -translate-y-1/2" />
             <input type="text" placeholder="Lookup by Name, ID, or Sector..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-3xl text-sm font-bold focus:ring-4 focus:ring-blue-500/5 outline-none transition-all shadow-sm" />
           </div>
           
           <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="table-responsive">
               <table className="w-full text-left">
                 <thead>
                   <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
                     <th className="px-6 py-4">Employee ID</th>
                     <th className="px-6 py-4">Legal Designation</th>
                     <th className="px-6 py-4">Assigned Role</th>
                     <th className="px-6 py-4">Skill & Scope</th>
                     <th className="px-6 py-4">Account Status</th>
                     <th className="px-6 py-4 text-right">Actions</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                   {filteredUsers.map(u => (
                     <tr key={u.id} className="hover:bg-slate-50 transition-colors group">
                       <td className="px-6 py-4 font-mono text-xs font-black text-slate-400 uppercase tracking-tighter">{u.employeeId}</td>
                       <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-500 border border-slate-200">{u.name.charAt(0)}</div>
                             <div>
                                <div className="text-sm font-black text-slate-800">{u.name}</div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{u.department} • {u.shift || 'N/A'}</div>
                             </div>
                          </div>
                       </td>
                       <td className="px-6 py-4">
                          <span className={`inline-block px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border-2 ${
                            u.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                            u.role === 'MAINTENANCE' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                            'bg-slate-50 text-slate-500 border-slate-100'
                          }`}>
                            {u.role}
                          </span>
                       </td>
                       <td className="px-6 py-4">
                          {u.role === 'MAINTENANCE' ? (
                            <div className="flex flex-col gap-1">
                               <span className="text-[10px] font-black text-slate-700 uppercase tracking-tighter">{u.skillLevel || 'JUNIOR'} {u.maintenanceRoleType}</span>
                               <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border self-start uppercase ${u.technicalSpecialization === 'ELECTRICAL' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>{u.technicalSpecialization || 'GENERAL'}</span>
                            </div>
                          ) : <span className="text-slate-300 text-xs">-</span>}
                       </td>
                       <td className="px-6 py-4">{getStatusButton(u)}</td>
                       <td className="px-6 py-4 text-right space-x-1">
                          <button onClick={() => { setEditingUser({...u}); setShowModal(true); }} className="p-2.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Modify"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => { if(confirm(`Erase all data for ${u.name}?`)) onUpdateUser(u, 'REMOVE'); }} className="p-2.5 text-red-400 hover:bg-red-50 rounded-xl transition-all" title="Purge"><Trash2 className="w-4 h-4" /></button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {SYSTEM_ROLES.map(role => (
             <div key={role.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 flex flex-col gap-6">
                <div className="flex justify-between items-start">
                   <div className="flex items-center gap-4">
                      <div className="bg-slate-900 p-3 rounded-2xl text-white"><Fingerprint className="w-6 h-6" /></div>
                      <div>
                         <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">{role.name}</h4>
                         <span className="text-[10px] font-black uppercase text-blue-600 tracking-[0.2em]">Hierarchy Level {role.approvalLevel}</span>
                      </div>
                   </div>
                   <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="Clone Policy"><Copy className="w-5 h-5" /></button>
                </div>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">{role.description}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                   {Object.entries(role.permissions).map(([key, val]) => (
                      <div key={key} className={`flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all ${val ? 'bg-blue-500/50 border-blue-100 text-blue-700' : 'bg-slate-50 border-slate-100 text-slate-300 opacity-50'}`}>
                         <span className="text-[8px] font-black uppercase tracking-tighter text-center">{key.replace('can', '').replace(/([A-Z])/g, ' $1')}</span>
                         {val ? <CheckCircle2 className="w-4 h-4 mt-1" /> : <XCircle className="w-4 h-4 mt-1" />}
                      </div>
                   ))}
                </div>
             </div>
           ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[150] bg-slate-950/80 flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 my-8">
             <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
                <div className="flex items-center gap-4">
                   <div className="bg-blue-600 p-2.5 rounded-xl"><UserCog className="w-6 h-6" /></div>
                   <div>
                      <h3 className="text-xl font-black uppercase tracking-tight">{editingUser?.id ? 'Profile Modification' : 'Staff Provisioning'}</h3>
                      <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em] mt-0.5">Credential Issuance Portal</p>
                   </div>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-6 h-6" /></button>
             </div>
             <form onSubmit={handleSubmit} className="p-8 md:p-10 space-y-10">
                <div className="space-y-6">
                   <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] flex items-center gap-2"><UserIcon className="w-3 h-3" /> Biological & Identity Data</h4>
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Legal Name</label><input type="text" value={editingUser?.name || ''} onChange={e => setEditingUser({...editingUser, name: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500" required /></div>
                      <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee ID</label><input type="text" value={editingUser?.employeeId || ''} onChange={e => setEditingUser({...editingUser, employeeId: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500" required /></div>
                      <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Login ID</label><input type="text" value={editingUser?.username || ''} onChange={e => setEditingUser({...editingUser, username: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500" required /></div>
                   </div>
                   {/* Add Password field for new users only */}
                   {!editingUser?.id && (
                     <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Initial Password</label><input type="password" value={editingUser?.password || '123'} onChange={e => setEditingUser({...editingUser, password: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none focus:border-blue-500" required /></div>
                   )}
                </div>

                <div className="space-y-6">
                   <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] flex items-center gap-2"><Briefcase className="w-3 h-3" /> Operational Assignment</h4>
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="space-y-1">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Role</label>
                         <div className="relative">
                            <select value={editingUser?.role || 'VIEWER'} onChange={e => setEditingUser({...editingUser, role: e.target.value as Role})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none appearance-none cursor-pointer focus:border-blue-500 transition-all">
                               <option value="ADMIN">ADMIN</option>
                               <option value="MAINTENANCE">MAINTENANCE</option>
                               <option value="PRODUCTION">PRODUCTION</option>
                               <option value="PLANNING">PLANNING</option>
                               <option value="STORE">STORE</option>
                               <option value="VIEWER">VIEWER</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400"><ChevronDown className="w-4 h-4" /></div>
                         </div>
                      </div>
                      <div className="space-y-1">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Factory Sector</label>
                         <div className="relative">
                            <select value={editingUser?.department || 'Production'} onChange={e => setEditingUser({...editingUser, department: e.target.value})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none appearance-none cursor-pointer focus:border-blue-500 transition-all">
                               {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400"><ChevronDown className="w-4 h-4" /></div>
                         </div>
                      </div>
                      <div className="space-y-1">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duty Shift</label>
                         <div className="relative">
                            <select value={editingUser?.shift || 'A'} onChange={e => setEditingUser({...editingUser, shift: e.target.value as any})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none appearance-none cursor-pointer focus:border-blue-500 transition-all">
                               <option value="A">Shift A</option>
                               <option value="B">Shift B</option>
                               <option value="C">Shift C</option>
                               <option value="OFFICE">Office</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400"><ChevronDown className="w-4 h-4" /></div>
                         </div>
                      </div>
                   </div>
                </div>

                {editingUser?.role === 'MAINTENANCE' && (
                  <div className="space-y-6 animate-in slide-in-from-top-2">
                    <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] flex items-center gap-2"><Wrench className="w-3 h-3" /> Technical Skill Matrix</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Maintenance Role</label>
                          <div className="relative">
                             <select value={editingUser?.maintenanceRoleType || 'TECHNICIAN'} onChange={e => setEditingUser({...editingUser, maintenanceRoleType: e.target.value as MaintenanceRoleType})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none appearance-none cursor-pointer focus:border-blue-500 transition-all">
                                <option value="TECHNICIAN">Technician</option>
                                <option value="ENGINEER">Engineer</option>
                                <option value="SUPERVISOR">Supervisor</option>
                                <option value="SECTION_HEAD">Section Head</option>
                                <option value="MAINTENANCE_MANAGER">Maint. Manager</option>
                             </select>
                             <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400"><ChevronDown className="w-4 h-4" /></div>
                          </div>
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Specialization</label>
                          <div className="relative">
                             <select value={editingUser?.technicalSpecialization || 'MECHANICAL'} onChange={e => setEditingUser({...editingUser, technicalSpecialization: e.target.value as any})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none appearance-none cursor-pointer focus:border-blue-500 transition-all">
                                <option value="MECHANICAL">Mechanical</option>
                                <option value="ELECTRICAL">Electrical</option>
                                <option value="HYDRAULIC">Hydraulic</option>
                                <option value="MULTI_SKILLED">Multi-Skilled</option>
                             </select>
                             <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400"><ChevronDown className="w-4 h-4" /></div>
                          </div>
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Skill Level</label>
                          <div className="relative">
                             <select value={editingUser?.skillLevel || 'JUNIOR'} onChange={e => setEditingUser({...editingUser, skillLevel: e.target.value as SkillLevel})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none appearance-none cursor-pointer focus:border-blue-500 transition-all">
                                <option value="JUNIOR">Junior</option>
                                <option value="MID_LEVEL">Mid-Level</option>
                                <option value="SENIOR">Senior</option>
                                <option value="LEAD">Lead</option>
                             </select>
                             <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400"><ChevronDown className="w-4 h-4" /></div>
                          </div>
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Approval Hierarchy</label>
                          <div className="relative">
                             <select value={editingUser?.approvalLevel || 1} onChange={e => setEditingUser({...editingUser, approvalLevel: parseInt(e.target.value)})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold outline-none appearance-none cursor-pointer focus:border-blue-500 transition-all">
                                <option value={1}>L1: Technician</option>
                                <option value={2}>L2: Engineer</option>
                                <option value={3}>L3: Supervisor</option>
                                <option value={4}>L4: Section Head</option>
                                <option value={5}>L5: Manager</option>
                             </select>
                             <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400"><ChevronDown className="w-4 h-4" /></div>
                          </div>
                       </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                       <input type="checkbox" checked={editingUser?.availableForAssignment ?? true} onChange={e => setEditingUser({...editingUser, availableForAssignment: e.target.checked})} className="w-5 h-5 rounded border-2 border-blue-200 text-blue-600 focus:ring-0" />
                       <span className="text-xs font-black uppercase text-blue-700">Available for Assignment</span>
                    </div>
                  </div>
                )}

                <div className="pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                   <div className="flex gap-6">
                      <label className="flex items-center gap-3 cursor-pointer group"><input type="checkbox" checked={editingUser?.active ?? true} onChange={e => setEditingUser({...editingUser, active: e.target.checked})} className="w-5 h-5 rounded-lg border-2 border-slate-200 text-blue-600 focus:ring-0" /><span className="text-xs font-black uppercase text-slate-600 group-hover:text-blue-600">Access Authorized</span></label>
                      <label className="flex items-center gap-3 cursor-pointer group"><input type="checkbox" checked={editingUser?.isLocked ?? false} onChange={e => setEditingUser({...editingUser, isLocked: e.target.checked})} className="w-5 h-5 rounded-lg border-2 border-slate-200 text-red-600 focus:ring-0" /><span className="text-xs font-black uppercase text-slate-600 group-hover:text-red-600">Account Lockout</span></label>
                      <label className="flex items-center gap-3 cursor-pointer group"><input type="checkbox" checked={editingUser?.twoFactorAuthEnabled ?? false} onChange={e => setEditingUser({...editingUser, twoFactorAuthEnabled: e.target.checked})} className="w-5 h-5 rounded-lg border-2 border-slate-200 text-indigo-600 focus:ring-0" /><span className="text-xs font-black uppercase text-slate-600 group-hover:text-indigo-600">2FA Enabled</span></label>
                   </div>
                   <div className="flex gap-4 w-full md:w-auto">
                      <button type="button" onClick={() => setShowModal(false)} className="flex-1 btn-industrial btn-outline px-10 py-5">Abort</button>
                      <button type="submit" className="flex-[2] btn-industrial btn-primary px-14 py-5">Commit to Registry</button>
                   </div>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ===========================================================================
// Spare Parts Sub-Component
// ===========================================================================
const SparePartManagementTab: React.FC<{ spareParts: SparePart[], onUpdateSparePart: (part: SparePart, action: 'ADD' | 'EDIT' | 'REMOVE') => void }> = ({ spareParts, onUpdateSparePart }) => ( <div className="p-20 text-center text-slate-400 font-black uppercase tracking-widest text-xs border-2 border-dashed border-slate-100 rounded-3xl">Logistics Core Active • Check Spare Part Flows Tab</div> );

// ===========================================================================
// PM Tasks Sub-Component
// ===========================================================================
const PMTaskManagementTab: React.FC<{ pmTasks: any[], machines: any[], onAddPMTask: any, onDeletePMTask: any }> = ({ pmTasks, machines, onAddPMTask, onDeletePMTask }) => ( <div className="p-20 text-center text-slate-400 font-black uppercase tracking-widest text-xs border-2 border-dashed border-slate-100 rounded-3xl">PM Logic Controller Integrated • View Preventive Maint. Tab</div> );

// ===========================================================================
// Security Logs Sub-Component
// ===========================================================================
interface SecurityLogsTabProps {
  securityLogs: UserAuditLog[];
}

const SecurityLogsTab: React.FC<SecurityLogsTabProps> = ({ securityLogs }) => {
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');

  const filteredLogs = securityLogs.filter(log => 
    (!filterUser || log.userName.toLowerCase().includes(filterUser.toLowerCase())) &&
    (!filterAction || log.actionType.toLowerCase().includes(filterAction.toLowerCase()))
  ).sort((a, b) => b.timestamp - a.timestamp); // Sort by newest first

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(filteredLogs.map(log => ({
      'ID': log.id,
      'Timestamp': new Date(log.timestamp).toLocaleString(),
      'User ID': log.userId,
      'User Name': log.userName,
      'Action Type': log.actionType,
      'Module': log.moduleName,
      'Details': log.details,
      'IP Address': log.ipAddress,
      'Device Info': log.deviceInfo,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Security_Audit_Log");
    XLSX.writeFile(wb, `Security_Audit_Export_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h4 className="text-xl font-black text-slate-800 uppercase tracking-tighter">System Security Audit Trail</h4>
        <button onClick={handleExport} className="btn-industrial btn-primary px-8 py-4 rounded-2xl">
          <Download className="w-4 h-4" /> Export Full Log
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex flex-wrap gap-4 justify-between items-center">
          <div className="flex gap-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="Filter by User..." value={filterUser} onChange={e => setFilterUser(e.target.value)} className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-red-500 outline-none" />
            </div>
            <div className="relative">
              <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" placeholder="Filter by Action..." value={filterAction} onChange={e => setFilterAction(e.target.value)} className="pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs font-bold focus:ring-2 focus:ring-red-500 outline-none" />
            </div>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            Showing {filteredLogs.length} of {securityLogs.length} entries
          </span>
        </div>
        
        <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
          <table className="w-full text-left">
            <thead className="bg-slate-50 sticky top-0 text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Action Type</th>
                <th className="px-6 py-4">Module</th>
                <th className="px-6 py-4">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs font-bold text-slate-600">{new Date(log.timestamp).toLocaleString()}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-black text-sm text-slate-800">{log.userName}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase">{log.userId}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded text-[9px] font-black uppercase ${
                      log.actionType === 'SECURITY_ALERT' || log.actionType === 'SYSTEM_RESET' ? 'bg-red-100 text-red-700' :
                      log.actionType === 'LOGIN' || log.actionType === 'LOGOUT' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {log.actionType.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-slate-600">{log.moduleName}</span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 max-w-sm truncate">
                    {log.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredLogs.length === 0 && (
            <div className="p-20 text-center text-slate-300">
              <ShieldAlert className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-xs font-black uppercase tracking-widest">No audit logs match your filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};