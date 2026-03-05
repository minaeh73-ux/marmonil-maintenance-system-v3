
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, Ticket, ResetType, SystemResetLog, SystemResetApproval, Role, ResetMode } from '../types';
import { 
  ShieldAlert, RefreshCcw, Lock, Unlock, CheckCircle2, 
  XCircle, AlertTriangle, Key, UserCheck, Database, 
  Trash2, FileWarning, Clock, Archive, Timer, Clipboard, MinusCircle, ShieldX
} from 'lucide-react';

interface SystemResetViewProps {
  currentUser: User;
  tickets: Ticket[];
  users: User[];
  onReset: (log: SystemResetLog) => void;
  resetLogs: SystemResetLog[];
  logSecurity: (userId: string, userName: string, type: string, module: string, details: string) => void;
}

const SystemResetView: React.FC<SystemResetViewProps> = ({ currentUser, tickets, users, onReset, resetLogs, logSecurity }) => {
  const [resetType, setResetType] = useState<ResetType>('OPERATIONAL');
  const [resetMode, setResetMode] = useState<ResetMode>('STANDARD');

  // Standard Mode Fields
  const [password, setPassword] = useState('');
  const [confirmationText, setConfirmationText] = useState('');
  const [approvals, setApprovals] = useState<SystemResetApproval[]>([]);
  const [isApproving, setIsApproving] = useState(false);
  const [tempApprovalPassword, setTempApprovalPassword] = useState('');
  const [tempApprovalComment, setTempApprovalComment] = useState('');

  // Emergency Mode Fields
  const [adminPasswordConfirm, setAdminPasswordConfirm] = useState('');
  const [confirmationText1, setConfirmationText1] = useState('');
  const [confirmationText2, setConfirmationText2] = useState('');
  const [emergencyReason, setEmergencyReason] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const EMERGENCY_OTP = '123456'; // Simulated 2FA OTP

  // Global fields
  const [reason, setReason] = useState(''); // Unified reason for both modes

  // Countdown State
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownValue, setCountdownValue] = useState(10);
  const countdownIntervalRef = useRef<number | null>(null);

  const activeTickets = tickets.filter(t => t.status !== 'CLOSED');
  const hasActiveWorkflows = activeTickets.length > 0;

  const requiredRoles: Role[] = ['MAINTENANCE', 'PRODUCTION', 'PLANNING'];
  const missingApprovals = requiredRoles.filter(role => !approvals.some(a => a.role === role));

  const isSuperAdmin = currentUser.role === 'ADMIN';
  const confirmationStringStandard = "CONFIRM FACTORY RESET";
  const confirmationStringEmergency1 = "I UNDERSTAND THE CONSEQUENCES";
  const confirmationStringEmergency2 = "CONFIRM EMERGENCY FACTORY RESET";
  
  // ===============================================
  // Global Conditions for Finalization
  // ===============================================
  const canFinalizeStandard = useMemo(() => {
    return isSuperAdmin &&
           password === currentUser.password &&
           confirmationText === confirmationStringStandard &&
           missingApprovals.length === 0 &&
           !hasActiveWorkflows &&
           reason.length > 10;
  }, [isSuperAdmin, password, currentUser.password, confirmationText, confirmationStringStandard, missingApprovals.length, hasActiveWorkflows, reason]);

  const canFinalizeEmergency = useMemo(() => {
    return isSuperAdmin &&
           currentUser.active &&
           currentUser.twoFactorAuthEnabled &&
           adminPasswordConfirm === currentUser.password &&
           otpInput === EMERGENCY_OTP &&
           confirmationText1 === confirmationStringEmergency1 &&
           confirmationText2 === confirmationStringEmergency2 &&
           !hasActiveWorkflows &&
           emergencyReason.length >= 100;
  }, [isSuperAdmin, currentUser, adminPasswordConfirm, otpInput, confirmationText1, confirmationText2, emergencyReason, hasActiveWorkflows]);

  // ===============================================
  // Countdown Logic
  // ===============================================
  useEffect(() => {
    if (showCountdown) {
      countdownIntervalRef.current = window.setInterval(() => {
        setCountdownValue(prev => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current!);
            executeResetConfirmed(); // Execute reset after countdown
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    }
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [showCountdown]);

  const startEmergencyResetCountdown = () => {
    if (!canFinalizeEmergency) {
      alert("Please fulfill all emergency reset requirements.");
      return;
    }
    setShowCountdown(true);
    setCountdownValue(10);
    logSecurity(currentUser.id, currentUser.name, 'SECURITY_ALERT', 'SYSTEM_RESET', 'Emergency Reset Countdown Initiated');
  };

  const cancelCountdown = () => {
    setShowCountdown(false);
    setCountdownValue(10);
    logSecurity(currentUser.id, currentUser.name, 'SECURITY_ALERT', 'SYSTEM_RESET', 'Emergency Reset Countdown Cancelled');
    alert("Emergency Reset cancelled.");
  };

  // ===============================================
  // Event Handlers
  // ===============================================

  const handleApproveStandard = () => {
    // Standard mode approval
    const verifier = users.find(u => 
      requiredRoles.includes(u.role) && 
      u.password === tempApprovalPassword && 
      u.id !== currentUser.id // Initiator cannot self-approve
    );
    
    if (!verifier) {
      alert("Verification failed. Incorrect password, role mismatch, or initiator self-approval attempted.");
      return;
    }

    // Check if the current user has already approved
    if (approvals.some(a => a.userId === verifier.id)) {
      alert("This user has already signed off for this reset operation.");
      return;
    }

    // Check if a user with this role has already approved
    if (approvals.some(a => a.role === verifier.role)) {
      alert(`A manager from ${verifier.role} department has already approved.`);
      return;
    }

    setApprovals(prev => [...prev, {
      userId: verifier.id,
      userName: verifier.name,
      role: verifier.role,
      timestamp: Date.now(),
      comment: tempApprovalComment
    }]);

    setIsApproving(false);
    setTempApprovalPassword('');
    setTempApprovalComment('');
    logSecurity(verifier.id, verifier.name, 'APPROVE', 'SYSTEM_RESET', `Approved Standard Reset for ${resetType} as ${verifier.role}`);
  };

  const executeResetConfirmed = () => {
    const finalReason = resetMode === 'STANDARD' ? reason : emergencyReason;
    const log: SystemResetLog = {
      id: `RST-${Date.now()}`,
      resetType,
      resetMode,
      performedBy: currentUser.name,
      approvals: resetMode === 'STANDARD' ? approvals : [],
      timestamp: Date.now(),
      backupPath: `SecureBackup/Snapshot_${new Date().toISOString()}.json`,
      backupFileHash: 'SIMULATED_SHA256_HASH', // This will be updated by App.tsx
      reason: finalReason,
      twoFactorVerified: resetMode === 'EMERGENCY_ADMIN' ? true : false,
      countdownCompleted: resetMode === 'EMERGENCY_ADMIN' ? true : false,
      ipAddress: '192.168.1.' + (Math.floor(Math.random() * 254) + 1), // Simulated IP
      deviceInfo: navigator.userAgent.split(' ')[0] // Simplified device info
    };

    onReset(log);
  };

  // Disable paste for confirmation fields
  const handlePastePrevent = (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.preventDefault();
    alert("Copy/Paste is disabled for this security input.");
  };

  // Emergency mode eligibility check
  const isEmergencyModeEnabled = isSuperAdmin && currentUser.active && currentUser.twoFactorAuthEnabled;

  if (showCountdown) {
    return (
      <div className="fixed inset-0 z-[300] bg-red-950 flex flex-col items-center justify-center text-white p-8 animate-pulse-slow">
        <Timer className="w-24 h-24 text-red-400 mb-8 animate-bounce-slow" />
        <h1 className="text-5xl font-black uppercase tracking-tighter mb-4 text-red-100">CRITICAL: EMERGENCY RESET</h1>
        <p className="text-red-200 font-mono text-center text-xl max-w-lg mb-8">
          System Wipe will commence in <span className="text-red-500 text-6xl font-black">{countdownValue}</span> seconds.
        </p>
        <button onClick={cancelCountdown} className="btn-industrial bg-red-700 hover:bg-red-800 text-white px-10 py-5 rounded-[2rem] shadow-xl text-lg flex items-center gap-4">
          <XCircle className="w-6 h-6" /> CANCEL RESET
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-20">
      <div className="bg-red-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden border-b-[12px] border-red-600">
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
           <div className="flex items-center gap-6">
              <div className="bg-white/20 p-5 rounded-3xl backdrop-blur-md border border-white/20 shadow-inner">
                 <ShieldAlert className="w-12 h-12 text-white" />
              </div>
              <div>
                 <h2 className="text-3xl font-black uppercase tracking-tighter">Emergency System Reset</h2>
                 <p className="text-red-200 font-bold uppercase tracking-widest text-[10px] mt-1 flex items-center gap-2">
                    <Lock className="w-3 h-3" /> Secure Administrative Access Only
                 </p>
              </div>
           </div>
           <div className="flex bg-black/30 p-2 rounded-2xl border border-white/10">
              <button onClick={() => setResetType('OPERATIONAL')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${resetType === 'OPERATIONAL' ? 'bg-white text-red-900 shadow-xl' : 'text-white/60 hover:text-white'}`}>Operational Only</button>
              <button onClick={() => setResetType('FULL_FACTORY')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${resetType === 'FULL_FACTORY' ? 'bg-red-600 text-white shadow-xl' : 'text-white/60 hover:text-white'}`}>Full Factory Wipe</button>
           </div>
        </div>
        <div className="absolute top-0 right-0 w-full h-full opacity-5 pointer-events-none">
           <svg width="100%" height="100%"><pattern id="reset-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" /></pattern><rect width="100%" height="100%" fill="url(#reset-grid)" /></svg>
        </div>
      </div>

      {hasActiveWorkflows && (
         <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-8 flex items-center gap-6 animate-pulse">
            <AlertTriangle className="w-12 h-12 text-amber-500" />
            <div>
               <h3 className="text-lg font-black text-amber-900 uppercase">Reset Prevented: Active Workflows</h3>
               <p className="text-sm font-bold text-amber-700">There are {activeTickets.length} active maintenance tickets. All work orders and production shifts must be closed before reset.</p>
            </div>
         </div>
      )}

      {/* Reset Mode Selection */}
      {isSuperAdmin && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-2xl text-white"><Database className="w-6 h-6" /></div>
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Select Reset Protocol</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Choose between standard multi-approval or emergency override</p>
            </div>
          </div>
          <div className="flex bg-slate-100 p-1.5 rounded-xl">
             <button onClick={() => setResetMode('STANDARD')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${resetMode === 'STANDARD' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Standard Protocol</button>
             {isEmergencyModeEnabled && (
                <button onClick={() => setResetMode('EMERGENCY_ADMIN')} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${resetMode === 'EMERGENCY_ADMIN' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500 hover:text-red-700'}`}>Emergency Admin Override</button>
             )}
             {!isEmergencyModeEnabled && isSuperAdmin && (
               <button disabled className="px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-400 opacity-50 cursor-not-allowed" title="2FA required for Emergency Mode">Emergency Mode (2FA Required)</button>
             )}
          </div>
        </div>
      )}


      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Verification & Approvals (Conditional) */}
        {resetMode === 'STANDARD' && (
          <div className="lg:col-span-7 space-y-8 animate-in fade-in slide-in-from-left-4">
             <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10 space-y-10">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
                   <UserCheck className="w-6 h-6 text-red-600" />
                   <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Departmental Consensus</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   {requiredRoles.map(role => {
                      const approval = approvals.find(a => a.role === role);
                      return (
                         <div key={role} className={`p-6 rounded-3xl border-2 transition-all ${approval ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-100'}`}>
                            <div className="flex justify-between items-center mb-4">
                               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{role}</span>
                               {approval ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <Clock className="w-5 h-5 text-slate-300" />}
                            </div>
                            {approval ? (
                               <div>
                                  <p className="text-xs font-black text-slate-800">{approval.userName}</p>
                                  <p className="text-[9px] text-slate-400 mt-1 uppercase">{new Date(approval.timestamp).toLocaleDateString()}</p>
                               </div>
                            ) : (
                               <button 
                                 onClick={() => setIsApproving(true)}
                                 disabled={hasActiveWorkflows || currentUser.role !== 'ADMIN'}
                                 className="w-full py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                               >
                                 Sign Off
                               </button>
                            )}
                         </div>
                      );
                   })}
                </div>

                <div className="space-y-6 pt-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Administrative Password</label>
                      <div className="relative">
                         <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                         <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Verify your session credentials..." className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-red-500" />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Typed Confirmation: <span className="text-red-600">"{confirmationStringStandard}"</span></label>
                      <input type="text" value={confirmationText} onPaste={handlePastePrevent} onChange={e => setConfirmationText(e.target.value)} placeholder="Type exactly as shown above..." className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-red-500" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Erase Justification</label>
                      <textarea value={reason} onChange={e => setReason(e.target.value)} rows={4} placeholder="Describe the reason for this system reset (Min 10 characters)..." className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-red-500" />
                   </div>
                </div>
             </div>

             <button 
               onClick={executeResetConfirmed}
               disabled={!canFinalizeStandard}
               className={`w-full py-8 rounded-[2.5rem] font-black uppercase tracking-[0.2em] shadow-2xl transition-all flex items-center justify-center gap-4 ${canFinalizeStandard ? 'bg-red-600 text-white hover:bg-red-700 active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
             >
                <Trash2 className="w-6 h-6" /> Execute Secure Erase Sequence
             </button>
          </div>
        )}

        {/* Emergency Admin Override (Conditional) */}
        {resetMode === 'EMERGENCY_ADMIN' && (
          <div className="lg:col-span-7 space-y-8 animate-in fade-in slide-in-from-left-4">
             <div className="bg-red-900 rounded-[2.5rem] border-2 border-red-500 shadow-xl p-10 text-white space-y-10">
                <div className="flex items-center gap-3 border-b border-red-700 pb-6">
                   <ShieldX className="w-6 h-6 text-red-100" />
                   <h3 className="text-lg font-black text-red-100 uppercase tracking-tight">Emergency Protocol: Admin Override</h3>
                </div>
                
                <div className="space-y-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-red-200 uppercase tracking-widest ml-1">Admin Password Re-Authentication</label>
                      <div className="relative">
                         <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
                         <input type="password" value={adminPasswordConfirm} onChange={e => setAdminPasswordConfirm(e.target.value)} placeholder="Re-enter your Admin password..." className="w-full pl-12 pr-4 py-4 bg-red-800/50 border-2 border-red-700 rounded-2xl font-bold outline-none focus:border-red-400 text-white" />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-red-200 uppercase tracking-widest ml-1">2FA One-Time Password (OTP)</label>
                      <div className="relative">
                         <Timer className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400" />
                         <input type="text" value={otpInput} onChange={e => setOtpInput(e.target.value)} placeholder="Enter 6-digit OTP (e.g. 123456)..." maxLength={6} className="w-full pl-12 pr-4 py-4 bg-red-800/50 border-2 border-red-700 rounded-2xl font-bold outline-none focus:border-red-400 text-white" />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-red-200 uppercase tracking-widest ml-1">Confirmation: <span className="text-red-100">"{confirmationStringEmergency1}"</span></label>
                      <input type="text" value={confirmationText1} onPaste={handlePastePrevent} onChange={e => setConfirmationText1(e.target.value)} placeholder="Type exactly as shown above..." className="w-full p-4 bg-red-800/50 border-2 border-red-700 rounded-2xl font-bold outline-none focus:border-red-400 text-white" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-red-200 uppercase tracking-widest ml-1">Final Confirmation: <span className="text-red-100">"{confirmationStringEmergency2}"</span></label>
                      <input type="text" value={confirmationText2} onPaste={handlePastePrevent} onChange={e => setConfirmationText2(e.target.value)} placeholder="Type exactly as shown above..." className="w-full p-4 bg-red-800/50 border-2 border-red-700 rounded-2xl font-bold outline-none focus:border-red-400 text-white" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-red-200 uppercase tracking-widest ml-1">Mandatory Emergency Justification</label>
                      <textarea value={emergencyReason} onChange={e => setEmergencyReason(e.target.value)} rows={6} placeholder="Describe in detail the critical circumstances requiring this emergency reset (Min 100 characters)..." minLength={100} className="w-full p-4 bg-red-800/50 border-2 border-red-700 rounded-2xl font-bold outline-none focus:border-red-400 text-white" />
                   </div>
                </div>
             </div>

             <button 
               onClick={startEmergencyResetCountdown}
               disabled={!canFinalizeEmergency}
               className={`w-full py-8 rounded-[2.5rem] font-black uppercase tracking-[0.2em] shadow-2xl transition-all flex items-center justify-center gap-4 ${canFinalizeEmergency ? 'bg-red-600 text-white hover:bg-red-700 active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
             >
                <Trash2 className="w-6 h-6" /> Initiate Emergency Erase (10s Countdown)
             </button>
          </div>
        )}

        {/* Info & Logs */}
        <div className="lg:col-span-5 space-y-8">
           <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white space-y-6 shadow-xl">
              <h3 className="font-black text-sm uppercase tracking-widest flex items-center gap-3 text-red-500">
                 <FileWarning className="w-5 h-5" /> Scope of Destruction
              </h3>
              <div className="space-y-4">
                 <div className="flex gap-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5"></div>
                    <div>
                       <p className="text-xs font-black uppercase">Transactional Purge</p>
                       <p className="text-[10px] text-slate-400">All tickets, downtime events, KPI records, and maintenance history will be erased.</p>
                    </div>
                 </div>
                 {resetType === 'FULL_FACTORY' && (
                    <div className="flex gap-4 p-4 bg-red-600/10 border border-red-500/20 rounded-2xl animate-in fade-in slide-in-from-top-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5"></div>
                       <div>
                          <p className="text-xs font-black uppercase text-red-400">Master Data Wipe</p>
                          <p className="text-[10px] text-slate-300 font-bold">WARNING: This will also delete all Asset Registries, Users, Roles, and System Configurations (except Super Admin).</p>
                       </div>
                    </div>
                 )}
                 <div className="flex gap-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5"></div>
                    <div>
                       <p className="text-xs font-black uppercase">Continuous Continuity</p>
                       <p className="text-[10px] text-slate-400">A mandatory encrypted JSON backup will be auto-generated and downloaded locally.</p>
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
                 <Archive className="w-5 h-5 text-slate-400" />
                 <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Reset History</h3>
              </div>
              <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
                 {resetLogs.length > 0 ? resetLogs.map(log => (
                    <div key={log.id} className="p-6 hover:bg-slate-50 transition-colors">
                       <div className="flex justify-between items-start mb-2">
                          <div className="flex gap-2">
                             <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${log.resetType === 'FULL_FACTORY' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{log.resetType}</span>
                             <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${log.resetMode === 'EMERGENCY_ADMIN' ? 'bg-red-200 text-red-800 border-red-400' : 'bg-blue-200 text-blue-800 border-blue-400'}`}>{log.resetMode}</span>
                          </div>
                          <span className="text-[9px] font-mono text-slate-400">{new Date(log.timestamp).toLocaleString()}</span>
                       </div>
                       <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{log.performedBy}</p>
                       <p className="text-[10px] text-slate-500 mt-1 italic">"{log.reason}"</p>
                       <div className="text-[9px] font-mono text-slate-300 mt-2 flex items-center gap-1">
                          <Clipboard className="w-3 h-3" /> Hash: {log.backupFileHash.substring(0, 10)}...
                       </div>
                    </div>
                 )) : (
                    <div className="p-10 text-center text-slate-300">
                       <Clock className="w-10 h-10 mx-auto opacity-10 mb-4" />
                       <p className="text-[10px] font-black uppercase tracking-widest">No resets recorded in current cycle</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      </div>

      {/* Approval Modal */}
      {isApproving && (
         <div className="fixed inset-0 z-[200] bg-slate-950/90 flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
               <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
                  <div className="flex items-center gap-4">
                     <div className="bg-blue-600 p-3 rounded-2xl"><Unlock className="w-6 h-6" /></div>
                     <h3 className="text-xl font-black uppercase tracking-tight">Witness Sign-Off</h3>
                  </div>
                  <button onClick={() => setIsApproving(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><XCircle className="w-6 h-6" /></button>
               </div>
               <div className="p-10 space-y-6">
                  <p className="text-sm font-bold text-slate-600 leading-relaxed">Manager Sign-off required. Credentials must match a system account with the appropriate department role.</p>
                  <div className="space-y-4">
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Witness Credentials</label>
                        <input type="password" value={tempApprovalPassword} onChange={e => setTempApprovalPassword(e.target.value)} placeholder="Witness Password..." className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500" />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Witness Comment</label>
                        <textarea value={tempApprovalComment} onChange={e => setTempApprovalComment(e.target.value)} placeholder="Add mandatory verification comment..." className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-blue-500" />
                     </div>
                  </div>
                  <button onClick={handleApproveStandard} className="w-full btn-industrial btn-primary py-5 rounded-2xl shadow-xl">Confirm Signature</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default SystemResetView;
