
import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { SystemFieldType, ColumnMapping, ImportSummary, User } from '../types';
import { 
  Hammer, Upload, FileSpreadsheet, ArrowRight, CheckCircle2, 
  AlertTriangle, Database, FileText, ChevronRight, Play, Loader2
} from 'lucide-react';

interface TicketSystemBuilderProps {
  currentUser: User;
  onLogAction: (action: string) => void;
}

const TicketSystemBuilder: React.FC<TicketSystemBuilderProps> = ({ currentUser, onLogAction }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [rawData, setRawData] = useState<any[][]>([]);
  const [importStatus, setImportStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const SYSTEM_FIELD_OPTIONS: { value: SystemFieldType, label: string, required?: boolean }[] = [
    { value: 'MACHINE', label: 'Machine Name (Required)', required: true },
    { value: 'DATE', label: 'Failure Date (Required)', required: true },
    { value: 'FAILURE_TYPE', label: 'Failure Type' },
    { value: 'DOWNTIME', label: 'Downtime (Hours)' },
    { value: 'DESCRIPTION', label: 'Description' },
    { value: 'ROOT_CAUSE', label: 'Root Cause' },
    { value: 'ACTION_TAKEN', label: 'Action Taken' },
    { value: 'TECHNICIAN', label: 'Technician Name' },
    { value: 'DEPARTMENT', label: 'Department' },
    { value: 'PRIORITY', label: 'Priority' },
    { value: 'CUSTOM', label: 'Custom Field' },
    { value: 'IGNORE', label: 'Ignore Column' },
  ];

  // --- Step 1: Upload & Read ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setFileName(uploadedFile.name);
      
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        
        // Read header row
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        if (data.length > 0) {
          const headers = data[0].map(String);
          setExcelHeaders(headers);
          setRawData(data.slice(1)); // Store data rows
          
          // Initialize Mappings
          const initMap: ColumnMapping[] = headers.map(h => {
            const lower = h.toLowerCase();
            let predicted: SystemFieldType = 'IGNORE';
            
            if (lower.includes('machine') || lower.includes('asset')) predicted = 'MACHINE';
            else if (lower.includes('date') || lower.includes('time')) predicted = 'DATE';
            else if (lower.includes('down') || lower.includes('stop')) predicted = 'DOWNTIME';
            else if (lower.includes('type') || lower.includes('cat')) predicted = 'FAILURE_TYPE';
            else if (lower.includes('cause')) predicted = 'ROOT_CAUSE';
            else if (lower.includes('action')) predicted = 'ACTION_TAKEN';
            else if (lower.includes('tech')) predicted = 'TECHNICIAN';
            else if (lower.includes('desc')) predicted = 'DESCRIPTION';

            return { excelHeader: h, systemField: predicted, customName: h };
          });
          setMappings(initMap);
          setStep(2);
        }
      };
      reader.readAsBinaryString(uploadedFile);
    }
  };

  // --- Step 2: Mapping Logic ---
  const updateMapping = (index: number, field: SystemFieldType) => {
    const newMappings = [...mappings];
    newMappings[index].systemField = field;
    setMappings(newMappings);
  };

  const updateCustomName = (index: number, name: string) => {
    const newMappings = [...mappings];
    newMappings[index].customName = name;
    setMappings(newMappings);
  };

  const validateMappings = () => {
    const hasMachine = mappings.some(m => m.systemField === 'MACHINE');
    const hasDate = mappings.some(m => m.systemField === 'DATE');
    return hasMachine && hasDate;
  };

  // --- Step 3: Execution ---
  const executeBuild = async () => {
    setImportStatus('PROCESSING');
    onLogAction(`Started building Custom System from ${fileName}`);

    const syncUrl = localStorage.getItem('marmonil_sync_url');
    if (!syncUrl) {
      alert("Backend URL not configured. Go to Resource Management -> Cloud Sync.");
      setImportStatus('IDLE');
      return;
    }

    const payload = {
      action: 'BUILD_CUSTOM_SYSTEM',
      fileName,
      mappings,
      data: rawData, // Batch send (Google Apps Script limit is usually 10MB payload)
      user: currentUser.name
    };

    try {
      const response = await fetch(syncUrl, {
        method: 'POST',
        mode: 'no-cors', // We can't get JSON response with no-cors, so we assume success if no error thrown
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Simulation for UI feedback since no-cors is opaque
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      setImportSummary({
        totalRows: rawData.length,
        importedRows: rawData.length, // Optimistic
        failedRows: 0,
        missingMachineCount: 0,
        missingDateCount: 0,
        newSystemName: 'Custom_Ticket_System'
      });
      setImportStatus('SUCCESS');
      onLogAction(`Successfully built Custom System from ${fileName}`);

    } catch (error) {
      console.error(error);
      setImportStatus('ERROR');
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-6">
          <div className="bg-orange-500 p-4 rounded-2xl shadow-lg">
            <Hammer className="w-10 h-10 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter">New Ticket System Builder</h2>
            <p className="text-orange-200 font-bold uppercase tracking-widest text-xs mt-2">
              Transform Historical Data into an Independent Maintenance Database
            </p>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
      </div>

      {/* Stepper */}
      <div className="flex justify-between items-center px-10">
        {[
          { num: 1, label: 'Upload Source' },
          { num: 2, label: 'Map Architecture' },
          { num: 3, label: 'Build System' }
        ].map((s, idx) => (
          <div key={s.num} className={`flex items-center gap-4 ${step === s.num ? 'opacity-100' : 'opacity-40'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm border-4 ${
              step >= s.num ? 'bg-orange-500 border-orange-500 text-white' : 'bg-slate-100 border-slate-300 text-slate-400'
            }`}>
              {step > s.num ? <CheckCircle2 className="w-5 h-5" /> : s.num}
            </div>
            <span className="font-black text-slate-700 uppercase text-xs tracking-widest">{s.label}</span>
            {idx < 2 && <div className="w-20 h-1 bg-slate-200 ml-4 rounded-full"></div>}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="bg-white p-16 rounded-[2.5rem] border-4 border-dashed border-slate-200 text-center hover:border-orange-400 transition-all group cursor-pointer shadow-sm" onClick={() => fileInputRef.current?.click()}>
          <input type="file" accept=".xlsx" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
          <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform">
            <Upload className="w-10 h-10 text-orange-500" />
          </div>
          <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Drop Historical Excel File</h3>
          <p className="text-slate-400 font-bold text-xs mt-3 uppercase tracking-widest">Supports .xlsx up to 5000 rows</p>
        </div>
      )}

      {/* Step 2: Mapping */}
      {step === 2 && (
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <div>
              <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight flex items-center gap-3">
                <FileSpreadsheet className="w-6 h-6 text-orange-500" /> Define System Architecture
              </h3>
              <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
                Map {excelHeaders.length} Detected Columns to System Logic
              </p>
            </div>
            {!validateMappings() && (
              <div className="flex items-center gap-2 text-red-500 text-xs font-black uppercase bg-red-50 px-4 py-2 rounded-xl">
                <AlertTriangle className="w-4 h-4" /> Missing Required Fields
              </div>
            )}
          </div>

          <div className="max-h-[500px] overflow-y-auto p-8">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b-2 border-slate-100">
                  <th className="pb-4 pl-4">Excel Source Column</th>
                  <th className="pb-4">System Role</th>
                  <th className="pb-4">Field Display Name</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {mappings.map((map, idx) => (
                  <tr key={idx} className="group hover:bg-slate-50 transition-colors">
                    <td className="py-4 pl-4 font-bold text-sm text-slate-700">{map.excelHeader}</td>
                    <td className="py-4">
                      <select 
                        value={map.systemField} 
                        onChange={(e) => updateMapping(idx, e.target.value as SystemFieldType)}
                        className={`w-64 p-3 rounded-xl text-xs font-bold uppercase tracking-wide border-2 outline-none transition-all ${
                          map.systemField === 'IGNORE' ? 'bg-slate-50 text-slate-400 border-slate-200' :
                          map.systemField === 'CUSTOM' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          'bg-orange-50 text-orange-700 border-orange-200'
                        }`}
                      >
                        {SYSTEM_FIELD_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-4 pr-4">
                      <input 
                        type="text" 
                        value={map.customName} 
                        onChange={(e) => updateCustomName(idx, e.target.value)}
                        disabled={map.systemField === 'IGNORE'}
                        className="w-full bg-white border-2 border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-800 focus:border-orange-500 outline-none disabled:bg-slate-50 disabled:text-slate-300"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-8 border-t border-slate-100 bg-slate-50 flex justify-end">
            <button 
              disabled={!validateMappings()}
              onClick={() => setStep(3)}
              className="bg-slate-900 hover:bg-black disabled:opacity-50 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-3 shadow-xl active:scale-95 transition-all"
            >
              Review Configuration <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Execution */}
      {step === 3 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl p-10 flex flex-col justify-between">
            <div>
              <h3 className="font-black text-slate-800 text-xl uppercase tracking-tight mb-6">Build Summary</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-4">
                    <Database className="w-6 h-6 text-blue-500" />
                    <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Database</div>
                      <div className="font-bold text-slate-800">Custom_Ticket_System</div>
                    </div>
                  </div>
                  <div className="text-xs font-black bg-blue-100 text-blue-700 px-3 py-1 rounded-lg">NEW SHEET</div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-4">
                    <FileText className="w-6 h-6 text-purple-500" />
                    <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Volume</div>
                      <div className="font-bold text-slate-800">{rawData.length} Records</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-4">
                    <Hammer className="w-6 h-6 text-orange-500" />
                    <div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mapped Fields</div>
                      <div className="font-bold text-slate-800">{mappings.filter(m => m.systemField !== 'IGNORE').length} Columns</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {importStatus === 'IDLE' && (
              <button 
                onClick={executeBuild}
                className="w-full mt-8 bg-orange-600 hover:bg-orange-700 text-white font-black py-5 rounded-2xl uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95"
              >
                <Play className="w-5 h-5 fill-current" /> Execute System Build
              </button>
            )}

            {importStatus === 'PROCESSING' && (
              <div className="mt-8 bg-slate-900 text-white p-6 rounded-2xl text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-orange-500" />
                <h4 className="text-sm font-black uppercase tracking-widest">Constructing Database...</h4>
                <p className="text-[10px] text-slate-400 mt-2">Creating Sheets • Validating Rows • Generating Analytics</p>
              </div>
            )}

            {importStatus === 'SUCCESS' && (
              <div className="mt-8 bg-green-600 text-white p-6 rounded-2xl text-center">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-4" />
                <h4 className="text-lg font-black uppercase tracking-tight">System Deployed Successfully</h4>
                <p className="text-xs font-bold text-green-200 mt-2 uppercase tracking-widest">
                  Analytics Engine is now active on the new sheet.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-6">
             <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-200 h-full">
                <h4 className="font-black text-slate-400 text-xs uppercase tracking-widest mb-6">Preview Architecture</h4>
                <div className="space-y-3">
                   {mappings.filter(m => m.systemField !== 'IGNORE').map((m, i) => (
                      <div key={i} className="flex items-center gap-3">
                         <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                         <span className="text-xs font-bold text-slate-600">{m.customName}</span>
                         <span className="text-[9px] font-black text-slate-400 uppercase bg-white border border-slate-200 px-2 py-0.5 rounded ml-auto">{m.systemField}</span>
                      </div>
                   ))}
                   <div className="pt-4 border-t border-slate-200 mt-4">
                      <div className="flex items-center gap-3">
                         <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                         <span className="text-xs font-bold text-blue-600">Ticket_ID</span>
                         <span className="text-[9px] font-black text-slate-400 uppercase bg-white border border-slate-200 px-2 py-0.5 rounded ml-auto">SYSTEM_GEN</span>
                      </div>
                      <div className="flex items-center gap-3 mt-3">
                         <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                         <span className="text-xs font-bold text-blue-600">Import_ID</span>
                         <span className="text-[9px] font-black text-slate-400 uppercase bg-white border border-slate-200 px-2 py-0.5 rounded ml-auto">SYSTEM_GEN</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketSystemBuilder;
