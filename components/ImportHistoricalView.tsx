
import React, { useState, useRef } from 'react';
import { Machine, User, ImportMapping, ImportError, ImportMode } from '../types';
import * as XLSX from 'xlsx';
import { 
  Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, 
  ArrowRight, Database, Archive, Layers, ShieldAlert,
  Loader2, ChevronRight, AlertCircle, X
} from 'lucide-react';

interface ImportHistoricalViewProps {
  machines: Machine[];
  users: User[];
  onLogAction: (action: string) => void;
}

const ImportHistoricalView: React.FC<ImportHistoricalViewProps> = ({ machines, users, onLogAction }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [file, setFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<any[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  
  const [mapping, setMapping] = useState<ImportMapping>({
    date: '',
    machine: '',
    faultType: '',
    downtime: '',
    description: '',
    technician: ''
  });

  const [validationErrors, setValidationErrors] = useState<ImportError[]>([]);
  const [importMode, setImportMode] = useState<ImportMode>('HISTORICAL_SHEET');
  const [importStatus, setImportStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [resultStats, setResultStats] = useState({ total: 0, success: 0, failed: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Step 1: File Upload ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        if (data.length > 0) {
          // Filter out empty headers and ensure strings
          const headers = (data[0] as any[]).map(h => String(h || '')); 
          setExcelHeaders(headers);
          setRawData(data.slice(1)); // Exclude header row
          
          // Auto-map attempts
          const newMapping = { ...mapping };
          headers.forEach(h => {
            const lowerH = h.toLowerCase();
            if (lowerH.includes('date')) newMapping.date = h;
            if (lowerH.includes('machine') || lowerH.includes('asset')) newMapping.machine = h;
            if (lowerH.includes('fault') || lowerH.includes('type')) newMapping.faultType = h;
            if (lowerH.includes('downtime') || lowerH.includes('hours') || lowerH.includes('duration')) newMapping.downtime = h;
            if (lowerH.includes('desc') || lowerH.includes('cause')) newMapping.description = h;
            if (lowerH.includes('tech') || lowerH.includes('staff')) newMapping.technician = h;
          });
          setMapping(newMapping);
          setStep(2);
        }
      };
      reader.readAsBinaryString(uploadedFile);
    }
  };

  // --- Step 3: Validation Logic ---
  const validateData = () => {
    const errors: ImportError[] = [];
    const validRows: any[] = [];

    rawData.forEach((row, idx) => {
      const rowData: any = {};
      excelHeaders.forEach((h, i) => rowData[h] = row[i]);

      const dateVal = rowData[mapping.date];
      const machineVal = rowData[mapping.machine];
      const faultVal = rowData[mapping.faultType];
      const downtimeVal = rowData[mapping.downtime];

      // 1. Validate Machine Existence
      const machineExists = machines.find(m => m.name.toLowerCase() === String(machineVal || '').toLowerCase());
      if (!machineExists) {
        errors.push({ row: idx + 2, field: 'Machine', message: `Unknown Asset: ${machineVal}`, data: machineVal });
      }

      // 2. Validate Date
      if (!dateVal) {
        errors.push({ row: idx + 2, field: 'Date', message: 'Missing Date', data: null });
      }

      // 3. Validate Downtime (Must be number)
      if (isNaN(parseFloat(downtimeVal))) {
        errors.push({ row: idx + 2, field: 'Downtime', message: 'Invalid Number', data: downtimeVal });
      }
    });

    setValidationErrors(errors);
    setStep(3);
  };

  // --- Step 4: Execution ---
  const executeImport = async () => {
    setImportStatus('PROCESSING');
    
    // Simulate backend processing
    const syncUrl = localStorage.getItem('marmonil_sync_url');
    
    const payload = {
      action: 'IMPORT_HISTORY',
      mode: importMode,
      mappings: mapping,
      data: rawData.map(row => {
        const obj: any = {};
        excelHeaders.forEach((h, i) => obj[h] = row[i]);
        return obj;
      }),
      user: 'Admin' // Should come from context
    };

    try {
      if (syncUrl) {
        // Real Backend Call (If GAS was deployed)
        await fetch(syncUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        // Simulation for UI Demo
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      setResultStats({
        total: rawData.length,
        success: rawData.length - validationErrors.length,
        failed: validationErrors.length
      });
      setImportStatus('SUCCESS');
      setStep(4);
      onLogAction(`Imported ${rawData.length} historical records via ${importMode}`);
    } catch (e) {
      setImportStatus('ERROR');
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-6">
          <div className="bg-blue-600 p-4 rounded-2xl shadow-lg">
            <Database className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tight">Legacy Data Import</h2>
            <p className="text-blue-200 font-bold uppercase tracking-widest text-xs mt-1">
              Migrate Historical Excel Records to Cloud Database
            </p>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      </div>

      {/* Stepper */}
      <div className="flex justify-between items-center px-8">
        {[
          { num: 1, label: 'Upload Source' },
          { num: 2, label: 'Map Columns' },
          { num: 3, label: 'Validate' },
          { num: 4, label: 'Execute' }
        ].map((s, idx) => (
          <div key={s.num} className={`flex items-center gap-3 ${step === s.num ? 'opacity-100' : 'opacity-40'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
              step >= s.num ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
            }`}>
              {step > s.num ? <CheckCircle2 className="w-4 h-4" /> : s.num}
            </div>
            <span className="font-bold text-slate-700 uppercase text-xs">{s.label}</span>
            {idx < 3 && <div className="w-12 h-[2px] bg-slate-200 ml-4"></div>}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-slate-300 text-center hover:border-blue-500 transition-colors group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
          <input type="file" accept=".xlsx" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
            <Upload className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-xl font-black text-slate-800 uppercase">Drop Historical Data File</h3>
          <p className="text-slate-400 font-bold text-xs mt-2 uppercase tracking-widest">Supports .xlsx up to 5MB</p>
        </div>
      )}

      {/* Step 2: Mapping */}
      {step === 2 && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-black text-slate-800 text-lg uppercase tracking-widest flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-600" /> Column Mapping
            </h3>
            <span className="text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-lg">
              {excelHeaders.length} Columns Detected
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.keys(mapping).map((field) => (
              <div key={field} className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  System Field: <span className="text-slate-800">{field.replace(/([A-Z])/g, ' $1')}</span>
                </label>
                <select 
                  value={(mapping as any)[field]}
                  onChange={(e) => setMapping({...mapping, [field]: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 outline-none focus:border-blue-500"
                >
                  <option value="">-- Select Excel Column --</option>
                  {excelHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div className="mt-8 flex justify-end">
            <button onClick={validateData} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-black uppercase text-xs tracking-widest flex items-center gap-2 shadow-lg active:scale-95 transition-all">
              Run Validation Check <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Validation & Mode */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Validation Report */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-500" /> Data Health Check
                </h3>
                <span className={`text-xs font-black px-3 py-1 rounded-lg uppercase ${validationErrors.length > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                  {validationErrors.length} Issues Found
                </span>
              </div>
              
              <div className="max-h-[300px] overflow-y-auto p-0">
                {validationErrors.length === 0 ? (
                  <div className="p-12 text-center">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <p className="text-slate-800 font-black uppercase">Data Integrity Verified</p>
                    <p className="text-slate-400 text-xs font-bold mt-1">Ready for Import</p>
                  </div>
                ) : (
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-black tracking-widest sticky top-0">
                      <tr>
                        <th className="px-6 py-3">Row</th>
                        <th className="px-6 py-3">Field</th>
                        <th className="px-6 py-3">Error</th>
                        <th className="px-6 py-3">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-600">
                      {validationErrors.map((err, idx) => (
                        <tr key={idx} className="hover:bg-red-50/50">
                          <td className="px-6 py-3 font-mono text-slate-400">{err.row}</td>
                          <td className="px-6 py-3 font-bold text-slate-800">{err.field}</td>
                          <td className="px-6 py-3 text-red-600 font-bold">{err.message}</td>
                          <td className="px-6 py-3 font-mono bg-slate-50">{String(err.data)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Import Mode */}
            <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col justify-between">
              <div>
                <h3 className="font-black uppercase tracking-widest text-sm mb-6 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-400" /> Import Strategy
                </h3>
                <div className="space-y-4">
                  <label className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                    <input type="radio" name="mode" className="mt-1" checked={importMode === 'HISTORICAL_SHEET'} onChange={() => setImportMode('HISTORICAL_SHEET')} />
                    <div>
                      <div className="font-bold text-sm">Dedicated Archive Sheet</div>
                      <div className="text-[10px] text-slate-400 font-medium mt-1">Creates "Historical Failures" tab. Best for analysis.</div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                    <input type="radio" name="mode" className="mt-1" checked={importMode === 'CLOSED_TICKETS'} onChange={() => setImportMode('CLOSED_TICKETS')} />
                    <div>
                      <div className="font-bold text-sm">Merge as Tickets</div>
                      <div className="text-[10px] text-slate-400 font-medium mt-1">Inserts into main Tickets DB as CLOSED status.</div>
                    </div>
                  </label>
                </div>
              </div>
              
              <button 
                onClick={executeImport}
                disabled={validationErrors.length > 0} // Strict block on errors
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest mt-8 shadow-lg active:scale-95 transition-all flex justify-center items-center gap-2"
              >
                Execute Import <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Success */}
      {step === 4 && (
        <div className="bg-green-600 rounded-3xl p-12 text-center text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tight mb-2">Import Successful</h2>
            <p className="text-green-100 font-bold uppercase tracking-widest text-sm mb-8">
              Database Sync Complete
            </p>
            
            <div className="flex justify-center gap-12 mb-8">
              <div className="text-center">
                <div className="text-4xl font-black">{resultStats.total}</div>
                <div className="text-[10px] uppercase font-bold text-green-200">Total Rows</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-black">{resultStats.success}</div>
                <div className="text-[10px] uppercase font-bold text-green-200">Imported</div>
              </div>
              <div className="text-center opacity-50">
                <div className="text-4xl font-black">{resultStats.failed}</div>
                <div className="text-[10px] uppercase font-bold text-green-200">Skipped</div>
              </div>
            </div>

            <button onClick={() => { setStep(1); setRawData([]); setFile(null); }} className="bg-white text-green-700 px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-green-50 transition-colors shadow-xl">
              Process Another File
            </button>
          </div>
          
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        </div>
      )}

      {importStatus === 'PROCESSING' && (
        <div className="fixed inset-0 bg-slate-900/90 z-[200] flex flex-col items-center justify-center text-white backdrop-blur-md">
          <Loader2 className="w-16 h-16 animate-spin text-blue-500 mb-6" />
          <h3 className="text-2xl font-black uppercase tracking-widest">Importing Data...</h3>
          <p className="text-slate-400 mt-2 font-mono text-sm">Do not close this window</p>
        </div>
      )}
    </div>
  );
};

export default ImportHistoricalView;
