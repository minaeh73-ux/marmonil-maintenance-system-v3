import React, { useState, useRef, useMemo } from 'react';
import { Machine, User, BulkImportLog, ImportMode, MasterDataApprovalStatus, Priority, MachineColumnMapping, MachineSystemFieldType } from '../types';
import * as XLSX from 'xlsx';
import { 
  Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, 
  ArrowRight, Database, Archive, Layers, ShieldAlert,
  Loader2, ChevronRight, AlertCircle, X, History, Info, GitBranch, Download // Added Download icon
} from 'lucide-react';
import { MACHINES as INITIAL_MACHINES_FROM_CONSTANTS } from '../constants'; // Import MACHINES for comparison

interface BulkMachineImportViewProps {
  machines: Machine[]; // All machines, including archived versions
  currentUser: User;
  onBulkImport: (importMode: ImportMode, fileData: any[], mappings: MachineColumnMapping[], fileName: string, fileExcelHeaders: string[]) => { recordsInserted: number; recordsUpdated: number; recordsSkipped: number; newVersionsCreated: number; };
  logs: BulkImportLog[];
  logSecurity: (userId: string, userName: string, type: string, module: string, details: string) => void;
  // Removed onSetExcelHeaders and excelHeaders from props, as they are now managed internally
}

const generateUuid = () => Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

// Corrected SYSTEM_FIELD_OPTIONS to use MachineSystemFieldType
const SYSTEM_FIELD_OPTIONS: { value: MachineSystemFieldType; label: string; required?: boolean; }[] = [
  { value: '', label: '-- Select System Field --' }, // Cast empty string to type for initial selection
  { value: 'originalAssetCode', label: 'Asset Code (Required)', required: true },
  { value: 'name', label: 'Asset Name (Required)', required: true },
  { value: 'category', label: 'Category' },
  { value: 'workcenterArea', label: 'Workcenter Area' },
  { value: 'machineType', label: 'Machine Type' },
  { value: 'manufacturer', label: 'Manufacturer' },
  { value: 'model', label: 'Model' },
  { value: 'serialNumber', label: 'Serial Number' },
  { value: 'criticality', label: 'Criticality (LOW,NORMAL,HIGH,CRITICAL)' },
  { value: 'pmFrequencyDays', label: 'PM Frequency (Days)' },
  { value: 'mtbfBaseline', label: 'MTBF Baseline (Hours)' },
  { value: 'mttrBaseline', label: 'MTTR Baseline (Minutes)' },
  { value: 'requiredSkillType', label: 'Required Skill Type' },
  { value: 'standardCycleTime', label: 'Standard Cycle Time (min)' },
  { value: 'expectedOutputPerShift', label: 'Expected Output / Shift' },
  { value: 'plannedDowntimePerWeek', label: 'Planned Downtime / Week (hrs)' },
  { value: 'oeeTarget', label: 'OEE Target (%)' },
  { value: 'weeklyCapacity', label: 'Weekly Capacity' },
  { value: 'bufferPercentage', label: 'Buffer Percentage (%)' },
  { value: 'commissioningDate', label: 'Commissioning Date (YYYY-MM-DD)' },
  // Added other properties from Machine and MachineMasterData interfaces
  { value: 'department', label: 'Department' },
  { value: 'plannedHours', label: 'Planned Hours' },
  { value: 'hourlyLossRate', label: 'Hourly Loss Rate' },
  { value: 'productionRatePerHour', label: 'Production Rate Per Hour' },
  { value: 'idealProductionRate', label: 'Ideal Production Rate' },
  { value: 'shiftConfiguration', label: 'Shift Configuration' },
  { value: 'sparePartsCategory', label: 'Spare Parts Category' },
  { value: 'IGNORE', label: 'Ignore Column' },
];

// Hardcoded new factory data for initialization
const NEW_FACTORY_DATA = [
  // CTS
  { category: 'CTS', name: 'Cut to size' },

  // Slabline
  { category: 'Slabline', name: 'BC1' },
  { category: 'Slabline', name: 'BC2' },
  { category: 'Slabline', name: 'BC3' },
  { category: 'Slabline', name: 'BC4' },
  { category: 'Slabline', name: 'BC5' },
  { category: 'Slabline', name: 'Water jet 2' },
  { category: 'Slabline', name: 'Water jet 3' },
  { category: 'Slabline', name: 'Lathe 1' },
  { category: 'Slabline', name: 'Lathe 2' },
  { category: 'Slabline', name: 'Gaspri Granite' },
  { category: 'Slabline', name: 'Briton Granite' },
  { category: 'Slabline', name: 'Gaspri Marble' },

  // Gangsaws
  { category: 'Gangsaws', name: 'GS1' },
  { category: 'Gangsaws', name: 'GS2' },
  { category: 'Gangsaws', name: 'GS3' },
  { category: 'Gangsaws', name: 'GS4' },

  // Multiwires
  { category: 'Multiwires', name: 'Gaspri' },
  { category: 'Multiwires', name: 'Bridese' },

  // Monowires
  { category: 'Monowires', name: 'Marble' },
  { category: 'Monowires', name: 'Granite' },
  { category: 'Monowires', name: 'Jolly' },

  // Crane
  { category: 'Crane', name: '30 ton' },
  { category: 'Crane', name: '40 ton' },
  { category: 'Crane', name: '5 ton(1)' },
  { category: 'Crane', name: '5 ton(2)' },
  { category: 'Crane', name: '5 ton(3)' },
  { category: 'Crane', name: '5 ton(4)' },
  { category: 'Crane', name: '5 ton(5)' },
  { category: 'Crane', name: '1 ton' },

  // FinishingLine
  { category: 'FinishingLine', name: 'Grinder' },
  { category: 'FinishingLine', name: 'Manual Ferza 1' },
  { category: 'FinishingLine', name: 'Manual Ferza 2' },
  { category: 'FinishingLine', name: 'Manual Ferza 3' },
];

const BulkMachineImportView: React.FC<BulkMachineImportViewProps> = ({ machines, currentUser, onBulkImport, logs, logSecurity }) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]); // Internal state for headers
  const [mappings, setMappings] = useState<MachineColumnMapping[]>([]); // Use new type
  const [rawData, setRawData] = useState<any[][]>([]);
  const [importMode, setImportMode] = useState<ImportMode>('ADD_ONLY'); // Default to Add Only
  const [importStatus, setImportStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [importSummary, setImportSummary] = useState<{ recordsInserted: number; recordsUpdated: number; recordsSkipped: number; newVersionsCreated: number; } | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = currentUser.role === 'ADMIN';

  // --- Step 1: File Upload ---
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
        
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        
        if (data.length > 0) {
          const headers = data[0].map(String);
          setExcelHeaders(headers); // Set internal excelHeaders state
          setRawData(data.slice(1));
          
          // Auto-map attempts based on common header names
          const initialMappings: MachineColumnMapping[] = headers.map(h => {
            const lowerH = h.toLowerCase();
            let predictedSystemField: MachineSystemFieldType = 'IGNORE';

            if (lowerH.includes('asset code') || lowerH.includes('code')) predictedSystemField = 'originalAssetCode';
            else if (lowerH.includes('name') || lowerH.includes('asset name')) predictedSystemField = 'name';
            else if (lowerH.includes('category')) predictedSystemField = 'category';
            else if (lowerH.includes('workcenter')) predictedSystemField = 'workcenterArea';
            else if (lowerH.includes('type')) predictedSystemField = 'machineType';
            else if (lowerH.includes('manufacturer')) predictedSystemField = 'manufacturer';
            else if (lowerH.includes('model')) predictedSystemField = 'model';
            else if (lowerH.includes('serial')) predictedSystemField = 'serialNumber';
            else if (lowerH.includes('criticality')) predictedSystemField = 'criticality';
            else if (lowerH.includes('pm frequency')) predictedSystemField = 'pmFrequencyDays';
            else if (lowerH.includes('mtbf')) predictedSystemField = 'mtbfBaseline';
            else if (lowerH.includes('mttr')) predictedSystemField = 'mttrBaseline';
            else if (lowerH.includes('skill')) predictedSystemField = 'requiredSkillType';
            else if (lowerH.includes('cycle time')) predictedSystemField = 'standardCycleTime';
            else if (lowerH.includes('expected output')) predictedSystemField = 'expectedOutputPerShift';
            else if (lowerH.includes('planned downtime')) predictedSystemField = 'plannedDowntimePerWeek';
            else if (lowerH.includes('oee target')) predictedSystemField = 'oeeTarget';
            else if (lowerH.includes('capacity')) predictedSystemField = 'weeklyCapacity';
            else if (lowerH.includes('buffer')) predictedSystemField = 'bufferPercentage';
            else if (lowerH.includes('date') || lowerH.includes('commissioning')) predictedSystemField = 'commissioningDate';
            else if (lowerH.includes('department')) predictedSystemField = 'department';
            else if (lowerH.includes('planned hours')) predictedSystemField = 'plannedHours';
            else if (lowerH.includes('hourly loss')) predictedSystemField = 'hourlyLossRate';
            else if (lowerH.includes('production rate')) predictedSystemField = 'productionRatePerHour';
            else if (lowerH.includes('ideal rate')) predictedSystemField = 'idealProductionRate';
            else if (lowerH.includes('shift config')) predictedSystemField = 'shiftConfiguration';
            else if (lowerH.includes('spare parts cat')) predictedSystemField = 'sparePartsCategory';


            return { excelHeader: h, systemField: predictedSystemField, customName: h };
          });
          setMappings(initialMappings);
          setStep(2);
        }
      };
      reader.readAsBinaryString(uploadedFile);
    }
  };

  // --- Step 2: Mapping Logic ---
  const updateMapping = (index: number, field: string) => {
    const newMappings = [...mappings];
    newMappings[index].systemField = field as MachineSystemFieldType; // Cast to correct type
    setMappings(newMappings);
  };

  const updateCustomName = (index: number, name: string) => {
    const newMappings = [...mappings];
    newMappings[index].customName = name;
    setMappings(newMappings);
  };

  const validateMappings = useMemo(() => {
    const hasAssetCode = mappings.some(m => m.systemField === 'originalAssetCode');
    const hasName = mappings.some(m => m.systemField === 'name');
    return hasAssetCode && hasName;
  }, [mappings]);

  // --- Step 3: Data Validation ---
  const runDataValidation = () => {
    const errors: string[] = [];
    const assetCodeMap = mappings.find(m => m.systemField === 'originalAssetCode');
    const nameMap = mappings.find(m => m.systemField === 'name');
    const commissioningDateMap = mappings.find(m => m.systemField === 'commissioningDate');
    const criticalityMap = mappings.find(m => m.systemField === 'criticality');

    if (!assetCodeMap) errors.push('Missing mapping for "Asset Code".');
    if (!nameMap) errors.push('Missing mapping for "Asset Name".');

    rawData.forEach((row, rowIndex) => {
      const rowNum = rowIndex + 2; // +1 for header, +1 for 0-index
      const assetCode = String(row[excelHeaders.indexOf(assetCodeMap?.excelHeader || '')] || '').trim(); // Ensure string and trim
      const name = String(row[excelHeaders.indexOf(nameMap?.excelHeader || '')] || '').trim(); // Ensure string and trim
      const commissioningDateStr = String(row[excelHeaders.indexOf(commissioningDateMap?.excelHeader || '')] || '').trim(); // Ensure string and trim
      const criticality = String(row[excelHeaders.indexOf(criticalityMap?.excelHeader || '')] || '').trim(); // Ensure string and trim

      if (!assetCode) errors.push(`Row ${rowNum}: Asset Code is empty.`);
      if (!name) errors.push(`Row ${rowNum}: Asset Name is empty.`);
      if (commissioningDateMap && commissioningDateStr && !Date.parse(commissioningDateStr)) errors.push(`Row ${rowNum}: Invalid Commissioning Date format.`);
      if (criticalityMap && criticality && !['LOW', 'NORMAL', 'HIGH', 'CRITICAL'].includes(criticality.toUpperCase())) errors.push(`Row ${rowNum}: Invalid Criticality value '${criticality}'.`);

      // Check for duplicate Asset Codes within the import file
      if (assetCode) {
        const firstOccurrence = rawData.findIndex((r, i) => i !== rowIndex && String(r[excelHeaders.indexOf(assetCodeMap.excelHeader)] || '').trim() === assetCode);
        if (firstOccurrence !== -1 && !errors.some(e => e.includes(`Duplicate Asset Code '${assetCode}'`))) {
          errors.push(`Row ${rowNum}: Duplicate Asset Code '${assetCode}' found in import file.`);
        }
      }
    });
    setValidationErrors(errors);
    setStep(3);
  };

  // --- Step 4: Execution ---
  const executeImport = async () => {
    if (validationErrors.length > 0) {
      alert("Cannot proceed with import due to validation errors. Please fix them first.");
      return;
    }
    setImportStatus('PROCESSING');
    
    // Simulate backend processing
    // The actual onBulkImport will handle the machine state updates
    const results = onBulkImport(importMode, rawData, mappings, fileName, excelHeaders); // Pass internal excelHeaders

    setImportSummary(results);
    setImportStatus('SUCCESS');
    setStep(4);
    logSecurity(currentUser.id, currentUser.name, 'BULK_IMPORT', 'MASTER_DATA', `Bulk import executed: Mode ${importMode}. Inserted: ${results.recordsInserted}, Updated: ${results.recordsUpdated}, Skipped: ${results.recordsSkipped}, New Versions: ${results.newVersionsCreated}`);
  };

  // Function to handle the factory layout initialization
  const handleInitializeFactoryLayout = async () => {
    setImportStatus('PROCESSING');
    const generatedRawData: any[][] = [];
    const generatedExcelHeaders = ['Workcenter', 'Machine Name', 'Asset Code'];

    const generatedMappings: MachineColumnMapping[] = [
      { excelHeader: 'Workcenter', systemField: 'category', customName: 'Category' },
      { excelHeader: 'Machine Name', systemField: 'name', customName: 'Asset Name' },
      { excelHeader: 'Asset Code', systemField: 'originalAssetCode', customName: 'Asset Code' },
    ];

    NEW_FACTORY_DATA.forEach(machine => {
      // Generate a simple slug for originalAssetCode
      const originalAssetCode = `${machine.category}-${machine.name}`.replace(/\s+/g, '-').toLowerCase();
      generatedRawData.push([machine.category, machine.name, originalAssetCode]);
    });

    const results = onBulkImport(
      'ADD_ONLY', // Ensure new machines are added and existing skipped
      generatedRawData,
      generatedMappings,
      'Factory_Layout_Initialization.xlsx',
      generatedExcelHeaders
    );

    setImportSummary(results);
    setImportStatus('SUCCESS');
    setStep(4);
    logSecurity(currentUser.id, currentUser.name, 'BULK_IMPORT', 'MASTER_DATA', `Factory layout initialized: Inserted: ${results.recordsInserted}, Skipped: ${results.recordsSkipped}`);
  };


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
    return <span className={`px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest ${styles[status]}`}>{status.replace(/_/g, ' ')}</span>;
  };

  if (importStatus === 'PROCESSING') {
    return (
      <div className="fixed inset-0 bg-slate-900/90 z-[200] flex flex-col items-center justify-center text-white backdrop-blur-md">
        <Loader2 className="w-16 h-16 animate-spin text-blue-500 mb-6" />
        <h3 className="text-2xl font-black uppercase tracking-widest">Processing Bulk Import...</h3>
        <p className="text-slate-400 mt-2 font-mono text-sm">Applying {importMode.replace(/_/g, ' ')} strategy. Do not close this window.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-6">
          <div className="bg-blue-600 p-4 rounded-2xl shadow-lg">
            <Database className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tight">Bulk Master Data Import</h2>
            <p className="text-blue-200 font-bold uppercase tracking-widest text-xs mt-1">
              Synchronize Fleet Records from External Sources
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
          { num: 3, label: 'Validate Data' },
          { num: 4, label: 'Execute Import' }
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
        <>
          <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-slate-300 text-center hover:border-blue-500 transition-colors group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <input type="file" accept=".xlsx,.csv" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
              <Upload className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase">Drop Machine Data File</h3>
            <p className="text-slate-400 font-bold text-xs mt-2 uppercase tracking-widest">Supports .xlsx, .csv up to 5MB</p>
            {file && <p className="text-xs font-bold text-blue-600 mt-2">{fileName}</p>}
          </div>

          {isAdmin && machines.length === INITIAL_MACHINES_FROM_CONSTANTS.length && (
            <div className="text-center mt-6">
              <span className="text-slate-400 text-xs font-bold uppercase tracking-widest block mb-4">OR</span>
              <button 
                onClick={handleInitializeFactoryLayout}
                className="btn-industrial bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-2xl shadow-xl shadow-orange-200 transition-all active:scale-95 flex items-center justify-center gap-3 mx-auto"
              >
                <Database className="w-5 h-5" /> Initialize Factory Layout
              </button>
              <p className="text-xs text-slate-500 mt-2">Adds predefined workcenters and machines if the system is empty.</p>
            </div>
          )}
        </>
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

          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase text-slate-500 font-black tracking-widest sticky top-0 border-b border-slate-100">
                  <th className="px-4 py-3">Excel Column</th>
                  <th className="px-4 py-3">System Field</th>
                  <th className="px-4 py-3">Display Name</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mappings.map((map, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-bold text-slate-700">{map.excelHeader}</td>
                    <td className="px-4 py-3">
                      <select 
                        value={map.systemField}
                        onChange={(e) => updateMapping(idx, e.target.value)}
                        className={`w-full p-2.5 rounded-lg border-2 text-xs font-bold uppercase outline-none transition-all appearance-none ${
                          SYSTEM_FIELD_OPTIONS.find(opt => opt.value === map.systemField && opt.required) ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          map.systemField === 'IGNORE' ? 'bg-slate-50 text-slate-400 border-slate-200' : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {SYSTEM_FIELD_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input 
                        type="text" 
                        value={map.customName}
                        onChange={(e) => updateCustomName(idx, e.target.value)}
                        disabled={map.systemField === 'IGNORE'}
                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 flex justify-end">
            <button onClick={runDataValidation} disabled={!validateMappings} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-black uppercase text-xs tracking-widest flex items-center gap-2 shadow-lg active:scale-95 transition-all">
              Run Data Validation <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Validation & Import Mode */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Validation Report */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-500" /> Data Health Check ({rawData.length} Rows)
                </h3>
                <span className={`text-xs font-black px-3 py-1 rounded-lg uppercase ${validationErrors.length > 0 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                  {validationErrors.length} Issues Found
                </span>
              </div>
              
              <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
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
                        <th className="px-6 py-3">Issue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-600">
                      {validationErrors.map((err, idx) => (
                        <tr key={idx} className="hover:bg-red-50/50">
                          <td className="px-6 py-3 font-bold text-red-600 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {err}</td>
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
                    <input type="radio" name="mode" className="mt-1" checked={importMode === 'ADD_ONLY'} onChange={() => setImportMode('ADD_ONLY')} />
                    <div>
                      <div className="font-bold text-sm">Add New Machines Only</div>
                      <div className="text-[10px] text-slate-400 font-medium mt-1">Inserts rows with new Asset Codes. Skips existing ones. No changes to existing data.</div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                    <input type="radio" name="mode" className="mt-1" checked={importMode === 'UPDATE_EXISTING'} onChange={() => setImportMode('UPDATE_EXISTING')} />
                    <div>
                      <div className="font-bold text-sm">Update Existing (Draft Only)</div>
                      <div className="text-[10px] text-slate-400 font-medium mt-1">Updates fields for existing machines only if their status is 'DRAFT'. Inserts new as 'DRAFT'. Blocks 'APPROVED' records.</div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-4 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition-colors">
                    <input type="radio" name="mode" className="mt-1" checked={importMode === 'CREATE_NEW_VERSION'} onChange={() => setImportMode('CREATE_NEW_VERSION')} />
                    <div>
                      <div className="font-bold text-sm">Create New Version (Recommended)</div>
                      <div className="text-[10px] text-slate-400 font-medium mt-1">Archives old 'APPROVED' records and creates a new 'DRAFT' version for existing machines. New machines are added as 'DRAFT' v1.</div>
                    </div>
                  </label>
                </div>
              </div>
              
              <button 
                onClick={executeImport}
                disabled={validationErrors.length > 0} 
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest mt-8 shadow-lg active:scale-95 transition-all flex justify-center items-center gap-2"
              >
                Execute Import <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Success/Summary */}
      {step === 4 && importSummary && (
        <div className="bg-green-600 rounded-3xl p-12 text-center text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tight mb-2">Import Complete</h2>
            <p className="text-green-100 font-bold uppercase tracking-widest text-sm mb-8">
              Data Synchronization Concluded
            </p>
            
            <div className="flex justify-center gap-12 mb-8">
              <div className="text-center">
                <div className="text-4xl font-black">{importSummary.recordsInserted}</div>
                <div className="text-[10px] uppercase font-bold text-green-200">Inserted</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-black">{importSummary.recordsUpdated}</div>
                <div className="text-[10px] uppercase font-bold text-green-200">Updated</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-black">{importSummary.newVersionsCreated}</div>
                <div className="text-[10px] uppercase font-bold text-green-200">New Versions</div>
              </div>
              <div className="text-center opacity-70">
                <div className="text-4xl font-black">{importSummary.recordsSkipped}</div>
                <div className="text-[10px] uppercase font-bold text-green-200">Skipped</div>
              </div>
            </div>

            {logs.length > 0 && logs[0].reportDownloadUrl && (
              <a href={logs[0].reportDownloadUrl} download={`BulkImport_Result_Report_${new Date().toISOString().slice(0,10)}.json`} className="bg-white text-blue-700 px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-blue-50 transition-colors shadow-xl flex items-center justify-center gap-2 mx-auto max-w-sm mb-4">
                <Download className="w-4 h-4" /> Download Import Result Report
              </a>
            )}

            <button onClick={() => { setStep(1); setRawData([]); setFile(null); setImportSummary(null); setValidationErrors([]); }} className="bg-white text-green-700 px-8 py-3 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-green-50 transition-colors shadow-xl">
              Process Another File
            </button>
          </div>
          
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        </div>
      )}
    </div>
  );
};

export default BulkMachineImportView;