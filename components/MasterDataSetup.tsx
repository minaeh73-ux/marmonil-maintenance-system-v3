
import React, { useState, useMemo } from 'react';
import { Machine, User, MasterDataApprovalStatus, MachineMasterData, MasterDataLogEntry, Priority, Role } from '../types';
import { 
  Database, ShieldCheck, Clock, CheckCircle2, XCircle, AlertTriangle, 
  ChevronRight, Save, Lock, Unlock, History, Info, Activity, Wrench, 
  Target, CalendarDays, Search, UserCheck, Code, GitBranch
} from 'lucide-react';

interface MasterDataSetupProps {
  machines: Machine[];
  currentUser: User;
  logs: MasterDataLogEntry[];
  onUpdateMasterData: (machineId: string, data: MachineMasterData, status: MasterDataApprovalStatus, log?: MasterDataLogEntry) => void;
  onVerifyMasterData: (machineId: string, dept: 'maintenance' | 'production' | 'planning', entry: any, nextStatus: MasterDataApprovalStatus) => void;
  logSecurity: (userId: string, userName: string, type: string, module: string, details: string) => void;
}

const INITIAL_MASTER_DATA: MachineMasterData = {
  assetCode: '', machineType: '', manufacturer: '', model: '', serialNumber: '', criticality: 'NORMAL', isHistorical: false,
  standardCycleTime: 0, expectedOutputPerShift: 0, plannedDowntimePerWeek: 0, shiftConfiguration: '3-Shift Operation', oeeTarget: 85,
  pmFrequencyDays: 30, mtbfBaseline: 150, mttrBaseline: 45, sparePartsCategory: 'General', requiredSkillType: 'MECHANICAL',
  weeklyCapacity: 168, bufferPercentage: 10
};

const MasterDataSetup: React.FC<MasterDataSetupProps> = ({ machines, currentUser, logs, onUpdateMasterData, onVerifyMasterData, logSecurity }) => {
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [editingData, setEditingData] = useState<MachineMasterData>(INITIAL_MASTER_DATA);
  const [activeSection, setActiveSection] = useState<'ASSET' | 'PRODUCTION' | 'MAINTENANCE' | 'PLANNING' | 'VERIFICATION' | 'HISTORY'>('ASSET');
  const [searchTerm, setSearchTerm] = useState('');

  const selectedMachine = machines.find(m => m.id === selectedMachineId);
  const activeMachineVersions = machines.filter(m => m.isActiveVersion && m.approvalStatus !== 'ARCHIVED'); // Filter for sidebar
  const isApproved = selectedMachine?.approvalStatus === 'APPROVED';
  const isAdmin = currentUser.role === 'ADMIN';
  const isLocked = isApproved && !isAdmin;

  // Filter versions for history view
  const machineHistoryVersions = useMemo(() => {
    if (!selectedMachine) return [];
    return machines.filter(m => m.originalAssetCode === selectedMachine.originalAssetCode)
                   .sort((a, b) => b.versionNumber - a.versionNumber);
  }, [machines, selectedMachine]);


  const handleMachineSelect = (mId: string) => {
    setSelectedMachineId(mId);
    const m = machines.find(x => x.id === mId);
    setEditingData(m?.masterData || { ...INITIAL_MASTER_DATA, assetCode: m?.id || '' });
    setActiveSection('ASSET');
  };

  const updateField = (field: keyof MachineMasterData, value: any) => {
    if (isLocked) return;
    setEditingData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveDraft = () => {
    if (!selectedMachineId) return;
    onUpdateMasterData(selectedMachineId, editingData, 'DRAFT');
    alert("Record saved as DRAFT. Verification cycle may reset.");
    logSecurity(currentUser.id, currentUser.name, 'EDIT', 'MASTER_DATA', `Machine ${selectedMachine?.name} master data saved as DRAFT.`);
  };

  const handleRequestVerification = () => {
    if (!selectedMachineId) return;
    onUpdateMasterData(selectedMachineId, editingData, 'UNDER_MAINTENANCE_REVIEW');
    alert("Verification requested. Sent to Maintenance department.");
    logSecurity(currentUser.id, currentUser.name, 'APPROVE', 'MASTER_DATA', `Verification requested for machine ${selectedMachine?.name} master data.`);
  };

  const handleVerify = (dept: 'maintenance' | 'production' | 'planning', approved: boolean, comment: string) => {
    if (!selectedMachineId) return;
    const currentMachine = machines.find(m => m.id === selectedMachineId);
    if (!currentMachine) return;

    let nextStatus: MasterDataApprovalStatus = 'DRAFT'; // Default if rejected or error
    if (!approved) {
      nextStatus = 'REJECTED';
    } else {
      switch (dept) {
        case 'maintenance': nextStatus = 'UNDER_PRODUCTION_REVIEW'; break;
        case 'production': nextStatus = 'UNDER_PLANNING_REVIEW'; break;
        case 'planning': nextStatus = 'APPROVED'; break;
      }
    }
    
    onVerifyMasterData(selectedMachineId, dept, {
      approvedBy: currentUser.name,
      role: currentUser.role,
      timestamp: Date.now(),
      comment,
      confirmed: approved
    }, nextStatus);
    logSecurity(currentUser.id, currentUser.name, 'APPROVE', 'MASTER_DATA', `Machine ${currentMachine.name} master data ${dept} review: ${approved ? 'APPROVED' : 'REJECTED'}`);
  };

  const handleBreakSeal = (machineId: string) => {
    if (!isAdmin || !confirm("CRITICAL WARNING: Breaking the seal will revert this APPROVED record to DRAFT, requiring a full re-approval cycle. Proceed?")) return;
    
    const machineToBreak = machines.find(m => m.id === machineId);
    if (machineToBreak) {
      onUpdateMasterData(machineId, machineToBreak.masterData || INITIAL_MASTER_DATA, 'DRAFT', { // Pass existing masterData but reset status
        id: `mdl-${Date.now()}`,
        machineId: machineId,
        modifiedBy: currentUser.name,
        fieldName: 'approvalStatus',
        oldValue: machineToBreak.approvalStatus,
        newValue: 'DRAFT',
        timestamp: Date.now(),
        statusAtTime: 'DRAFT'
      });
      alert(`Master Data for ${machineToBreak.name} has been reverted to DRAFT by Admin.`);
      logSecurity(currentUser.id, currentUser.name, 'OVERRIDE', 'MASTER_DATA', `Admin broke seal for machine ${machineToBreak.name}, reverted to DRAFT.`);
    }
  };

  const filteredMachines = activeMachineVersions.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    m.originalAssetCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: MasterDataApprovalStatus) => {
    const styles: Record<string, string> = {
      'DRAFT': 'bg-slate-100 text-slate-600 border-slate-200',
      'UNDER_MAINTENANCE_REVIEW': 'bg-blue-50 text-blue-600 border-blue-200',
      'UNDER_PRODUCTION_REVIEW': 'bg-amber-50 text-amber-600 border-amber-200',
      'UNDER_PLANNING_REVIEW': 'bg-indigo-50 text-indigo-600 border-indigo-200',
      'APPROVED': 'bg-green-100 text-green-700 border-green-200',
      'REJECTED': 'bg-red-100 text-red-700 border-red-200',
      'ARCHIVED': 'bg-gray-100 text-gray-600 border-gray-200'
    };
    return <span className={`px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${styles[status]}`}>{status.replace(/_/g, ' ')}</span>;
  };

  // Check if current user is the relevant approver
  const canApproveCurrentStep = useMemo(() => {
    if (!selectedMachine) return false;
    if (isAdmin) return true; // Admins can always approve
    
    switch (selectedMachine.approvalStatus) {
      case 'UNDER_MAINTENANCE_REVIEW': return currentUser.role === 'MAINTENANCE';
      case 'UNDER_PRODUCTION_REVIEW': return currentUser.role === 'PRODUCTION';
      case 'UNDER_PLANNING_REVIEW': return currentUser.role === 'PLANNING';
      default: return false;
    }
  }, [selectedMachine, currentUser, isAdmin]);


  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 p-3 rounded-2xl text-white shadow-xl"><Database className="w-8 h-8" /></div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Master Data Registry</h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Industrial Parameters & Operational Governance</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Machine Sidebar */}
        <div className="lg:col-span-3 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Lookup asset..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" />
          </div>
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden h-[600px] overflow-y-auto custom-scrollbar">
            {filteredMachines.map(m => (
              <button key={m.id} onClick={() => handleMachineSelect(m.id)} className={`w-full p-5 text-left border-b border-slate-100 transition-all hover:bg-slate-50 ${selectedMachineId === m.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`}>
                 <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-black text-slate-800 uppercase">{m.name}</span>
                    {m.approvalStatus === 'APPROVED' ? <ShieldCheck className="w-4 h-4 text-green-500" /> : <Clock className="w-4 h-4 text-slate-300" />}
                 </div>
                 <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                   {m.approvalStatus.replace(/_/g, ' ')} {m.versionNumber > 1 && `(v${m.versionNumber})`}
                 </div>
              </button>
            ))}
          </div>
        </div>

        {/* Setup Console */}
        <div className="lg:col-span-9 space-y-8">
          {selectedMachine ? (
            <div className="animate-in fade-in slide-in-from-right-4">
               {/* Approval Stepper */}
               <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 mb-8">
                  <div className="flex justify-between items-center mb-8">
                     <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                        <UserCheck className="w-5 h-5 text-blue-600" /> Verification Roadmap
                     </h3>
                     {getStatusBadge(selectedMachine.approvalStatus)}
                  </div>
                  <div className="flex items-center w-full">
                     <StepperStep label="Maintenance" active={selectedMachine.approvalStatus !== 'DRAFT' && selectedMachine.approvalStatus !== 'REJECTED'} completed={!!selectedMachine.approvals.maintenance?.confirmed} />
                     <StepperDivider completed={!!selectedMachine.approvals.maintenance?.confirmed} />
                     <StepperStep label="Production" active={!!selectedMachine.approvals.maintenance?.confirmed} completed={!!selectedMachine.approvals.production?.confirmed} />
                     <StepperDivider completed={!!selectedMachine.approvals.production?.confirmed} />
                     <StepperStep label="Planning" active={!!selectedMachine.approvals.production?.confirmed} completed={!!selectedMachine.approvals.planning?.confirmed} />
                  </div>
               </div>

               {/* Sections */}
               <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
                  <div className="flex border-b border-slate-100 bg-slate-50/50 overflow-x-auto">
                     <SectionTab label="Asset Data" icon={<Info />} active={activeSection === 'ASSET'} onClick={() => setActiveSection('ASSET')} />
                     <SectionTab label="Production" icon={<Target />} active={activeSection === 'PRODUCTION'} onClick={() => setActiveSection('PRODUCTION')} />
                     <SectionTab label="Maintenance" icon={<Wrench />} active={activeSection === 'MAINTENANCE'} onClick={() => setActiveSection('MAINTENANCE')} />
                     <SectionTab label="Planning" icon={<CalendarDays />} active={activeSection === 'PLANNING'} onClick={() => setActiveSection('PLANNING')} />
                     <SectionTab label="Verification" icon={<ShieldCheck />} active={activeSection === 'VERIFICATION'} onClick={() => setActiveSection('VERIFICATION')} />
                     <SectionTab label="History" icon={<GitBranch />} active={activeSection === 'HISTORY'} onClick={() => setActiveSection('HISTORY')} />
                  </div>

                  <div className="p-10 space-y-10">
                     {activeSection === 'ASSET' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-top-2">
                           <Field label="Original Asset Code" value={selectedMachine.originalAssetCode} disabled />
                           <Field label="Current Version" value={`v${selectedMachine.versionNumber}`} disabled />
                           <Field label="Asset Code" value={editingData.assetCode} onChange={v => updateField('assetCode', v)} disabled={isLocked} />
                           <Field label="Asset Name" value={selectedMachine.name} disabled />
                           <Field label="Manufacturer" value={editingData.manufacturer} onChange={v => updateField('manufacturer', v)} disabled={isLocked} />
                           <Field label="Model" value={editingData.model} onChange={v => updateField('model', v)} disabled={isLocked} />
                           <Field label="Serial Number" value={editingData.serialNumber} onChange={v => updateField('serialNumber', v)} disabled={isLocked} />
                           <SelectField label="Criticality Level" value={editingData.criticality} onChange={v => updateField('criticality', v as Priority)} disabled={isLocked} options={['LOW', 'NORMAL', 'HIGH', 'CRITICAL']} />
                           <CheckboxField label="Is Historical Asset?" checked={editingData.isHistorical} onChange={v => updateField('isHistorical', v)} disabled={isLocked} />
                        </div>
                     )}

                     {activeSection === 'PRODUCTION' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-top-2">
                           <Field label="Standard Cycle Time (min)" type="number" value={editingData.standardCycleTime} onChange={v => updateField('standardCycleTime', parseFloat(v))} disabled={isLocked} />
                           <Field label="Expected Output / Shift" type="number" value={editingData.expectedOutputPerShift} onChange={v => updateField('expectedOutputPerShift', parseFloat(v))} disabled={isLocked} />
                           <Field label="Planned Downtime / Week (hrs)" type="number" value={editingData.plannedDowntimePerWeek} onChange={v => updateField('plannedDowntimePerWeek', parseFloat(v))} disabled={isLocked} />
                           <Field label="OEE Target %" type="number" value={editingData.oeeTarget} onChange={v => updateField('oeeTarget', parseFloat(v))} disabled={isLocked} />
                        </div>
                     )}

                     {activeSection === 'MAINTENANCE' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-top-2">
                           <Field label="PM Frequency (Days)" type="number" value={editingData.pmFrequencyDays} onChange={v => updateField('pmFrequencyDays', parseInt(v))} disabled={isLocked} />
                           <Field label="MTBF Baseline (Hrs)" type="number" value={editingData.mtbfBaseline} onChange={v => updateField('mtbfBaseline', parseFloat(v))} disabled={isLocked} />
                           <Field label="MTTR Baseline (Min)" type="number" value={editingData.mttrBaseline} onChange={v => updateField('mttrBaseline', parseFloat(v))} disabled={isLocked} />
                           <SelectField label="Required Skill Type" value={editingData.requiredSkillType} onChange={v => updateField('requiredSkillType', v)} disabled={isLocked} options={['ELECTRICAL', 'MECHANICAL', 'MULTI_SKILLED']} />
                        </div>
                     )}

                     {activeSection === 'PLANNING' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-top-2">
                           <Field label="Weekly Capacity" type="number" value={editingData.weeklyCapacity} onChange={v => updateField('weeklyCapacity', parseFloat(v))} disabled={isLocked} />
                           <Field label="Buffer Percentage %" type="number" value={editingData.bufferPercentage} onChange={v => updateField('bufferPercentage', parseFloat(v))} disabled={isLocked} />
                        </div>
                     )}

                     {activeSection === 'VERIFICATION' && (
                        <div className="space-y-10 animate-in slide-in-from-top-2">
                           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                              <VerificationCard 
                                dept="Maintenance" 
                                data={selectedMachine.approvals.maintenance} 
                                canVerify={canApproveCurrentStep && selectedMachine.approvalStatus === 'UNDER_MAINTENANCE_REVIEW'} 
                                onVerify={(app, com) => handleVerify('maintenance', app, com)} 
                                disabled={selectedMachine.approvalStatus !== 'UNDER_MAINTENANCE_REVIEW'} 
                              />
                              <VerificationCard 
                                dept="Production" 
                                data={selectedMachine.approvals.production} 
                                canVerify={canApproveCurrentStep && selectedMachine.approvalStatus === 'UNDER_PRODUCTION_REVIEW'} 
                                onVerify={(app, com) => handleVerify('production', app, com)} 
                                disabled={selectedMachine.approvalStatus !== 'UNDER_PRODUCTION_REVIEW'} 
                              />
                              <VerificationCard 
                                dept="Planning" 
                                data={selectedMachine.approvals.planning} 
                                canVerify={canApproveCurrentStep && selectedMachine.approvalStatus === 'UNDER_PLANNING_REVIEW'} 
                                onVerify={(app, com) => handleVerify('planning', app, com)} 
                                disabled={selectedMachine.approvalStatus !== 'UNDER_PLANNING_REVIEW'} 
                              />
                           </div>
                           
                           {isApproved && (
                              <div className="bg-green-50 border-2 border-green-200 rounded-[2rem] p-8 flex items-center justify-between">
                                 <div className="flex items-center gap-4">
                                    <ShieldCheck className="w-12 h-12 text-green-600" />
                                    <div>
                                       <h4 className="text-xl font-black text-green-800 uppercase tracking-tight">System Integrity Locked</h4>
                                       <p className="text-sm font-bold text-green-600">This asset is verified. Parameters are used in live OEE calculations.</p>
                                    </div>
                                 </div>
                                 {isAdmin && (
                                    <button onClick={() => handleBreakSeal(selectedMachine.id)} className="btn-industrial bg-white text-red-600 border-2 border-red-200 px-8 py-4 rounded-2xl hover:bg-red-50">
                                       <Unlock className="w-4 h-4" /> Reopen Request (ADMIN)
                                    </button>
                                 )}
                              </div>
                           )}
                        </div>
                     )}

                     {activeSection === 'HISTORY' && (
                       <div className="animate-in slide-in-from-top-2">
                         <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight mb-6 flex items-center gap-3">
                            <GitBranch className="w-6 h-6 text-blue-600" /> Version History for {selectedMachine.name} ({selectedMachine.originalAssetCode})
                         </h3>
                         <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                           <table className="w-full text-left">
                             <thead>
                               <tr className="bg-slate-50 text-[10px] uppercase text-slate-500 font-black tracking-widest border-b border-slate-100">
                                 <th className="px-6 py-4">Version</th>
                                 <th className="px-6 py-4">Status</th>
                                 <th className="px-6 py-4">Active</th>
                                 <th className="px-6 py-4">Approved By</th>
                                 <th className="px-6 py-4">Timestamp</th>
                                 <th className="px-6 py-4 text-right">Actions</th>
                               </tr>
                             </thead>
                             <tbody className="divide-y divide-slate-100">
                               {machineHistoryVersions.map(version => (
                                 <tr key={version.id} className={`hover:bg-slate-50 transition-colors ${version.isActiveVersion && version.approvalStatus === 'APPROVED' ? 'bg-green-50/30' : ''}`}>
                                   <td className="px-6 py-4 font-black text-slate-800">v{version.versionNumber}</td>
                                   <td className="px-6 py-4">{getStatusBadge(version.approvalStatus)}</td>
                                   <td className="px-6 py-4">
                                     {version.isActiveVersion ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-slate-300" />}
                                   </td>
                                   <td className="px-6 py-4">
                                     {version.approvals?.planning?.approvedBy || 'N/A'}
                                   </td>
                                   <td className="px-6 py-4 text-xs text-slate-500">
                                     {new Date(version.commissioningDate || 0).toLocaleDateString()}
                                   </td>
                                   <td className="px-6 py-4 text-right">
                                     <button className="btn-industrial !text-blue-600 !bg-transparent !border-none !text-[10px] hover:underline" onClick={() => handleMachineSelect(version.id)}>
                                       View Details
                                     </button>
                                     {/* Restore/Revert action could go here for Admin */}
                                   </td>
                                 </tr>
                               ))}
                             </tbody>
                           </table>
                         </div>
                       </div>
                     )}

                     {activeSection !== 'VERIFICATION' && activeSection !== 'HISTORY' && (
                        <div className="pt-10 border-t border-slate-100 flex justify-between items-center">
                           <div className="flex items-center gap-3 text-amber-500">
                              <AlertTriangle className="w-5 h-5" />
                              <span className="text-[10px] font-black uppercase tracking-widest">Modification resets approval cycle</span>
                           </div>
                           <div className="flex gap-4">
                              {!isLocked && (
                                 <>
                                    <button onClick={handleSaveDraft} className="btn-industrial btn-outline px-10 py-5 rounded-[2rem]">Save Draft</button>
                                    <button onClick={handleRequestVerification} className="btn-industrial btn-primary px-14 py-5 rounded-[2rem]">Request Verification</button>
                                 </>
                              )}
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-white border border-slate-100 rounded-[3rem] p-20 border-dashed">
               <Database className="w-20 h-20 opacity-10 mb-6" />
               <p className="font-black uppercase tracking-[0.2em] text-sm">Select an asset from the fleet to begin setup</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SectionTab = ({ label, icon, active, onClick }: any) => (
  <button onClick={onClick} className={`flex items-center gap-3 px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] transition-all border-r border-slate-100 ${active ? 'bg-white text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
     {React.cloneElement(icon, { className: 'w-4 h-4' })} {label}
  </button>
);

const Field = ({ label, value, onChange, disabled, type = 'text' }: any) => (
  <div className="space-y-2">
     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">{label}</label>
     <input type={type} value={value} onChange={e => onChange(e.target.value)} disabled={disabled} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-800 focus:border-blue-500 outline-none transition-all disabled:bg-slate-100 disabled:text-slate-400" />
  </div>
);

const SelectField = ({ label, value, onChange, disabled, options }: any) => (
  <div className="space-y-2">
     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block ml-1">{label}</label>
     <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-800 focus:border-blue-500 outline-none transition-all appearance-none disabled:bg-slate-100">
        {options.map((o: any) => <option key={o} value={o}>{o}</option>)}
     </select>
  </div>
);

const CheckboxField = ({ label, checked, onChange, disabled }: any) => (
  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border-2 border-slate-100">
     <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} disabled={disabled} className="w-6 h-6 rounded-lg border-2 border-slate-300 text-blue-600 focus:ring-0" />
     <span className="text-xs font-black text-slate-600 uppercase tracking-widest">{label}</span>
  </div>
);

const VerificationCard = ({ dept, data, canVerify, onVerify, disabled }: any) => {
  const [comment, setComment] = useState('');
  return (
    <div className={`p-6 rounded-3xl border-2 transition-all ${data?.confirmed ? 'bg-green-50 border-green-200' : disabled ? 'bg-slate-50 border-slate-100 opacity-60' : 'bg-white border-blue-100 shadow-lg'}`}>
       <div className="flex justify-between items-center mb-4">
          <h4 className="text-xs font-black uppercase text-slate-800">{dept} Review</h4>
          {data?.confirmed ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Clock className="w-5 h-5 text-slate-300" />}
       </div>
       
       {data ? (
          <div className="space-y-2 text-[10px]">
             <div className="flex justify-between font-bold text-slate-400 uppercase tracking-tighter"><span>By: {data.approvedBy}</span><span>{new Date(data.timestamp).toLocaleDateString()}</span></div>
             <p className="text-slate-600 italic">"{data.comment}"</p>
          </div>
       ) : (
          <div className="space-y-4">
             <textarea placeholder="Verification comments..." value={comment} onChange={e => setComment(e.target.value)} disabled={disabled || !canVerify} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs outline-none h-20" />
             <div className="flex gap-2">
                <button onClick={() => onVerify(false, comment)} disabled={disabled || !canVerify} className="flex-1 py-2 rounded-lg bg-red-100 text-red-700 text-[10px] font-black uppercase">Reject</button>
                <button onClick={() => onVerify(true, comment)} disabled={disabled || !canVerify} className="flex-1 py-2 rounded-lg bg-green-600 text-white text-[10px] font-black uppercase">Approve</button>
             </div>
          </div>
       )}
    </div>
  );
};

const StepperStep = ({ label, active, completed }: any) => (
  <div className="flex flex-col items-center">
     <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 transition-all ${completed ? 'bg-green-600 border-green-200 text-white' : active ? 'bg-blue-600 border-blue-200 text-white' : 'bg-white border-slate-100 text-slate-200'}`}>
        {completed ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-2 h-2 rounded-full bg-current" />}
     </div>
     <span className={`text-[8px] font-black uppercase tracking-widest mt-2 ${active || completed ? 'text-slate-800' : 'text-slate-300'}`}>{label}</span>
  </div>
);

const StepperDivider = ({ completed }: any) => (
  <div className={`flex-1 h-1 mx-2 rounded-full transition-all ${completed ? 'bg-green-600' : 'bg-slate-100'}`} />
);

export default MasterDataSetup;
