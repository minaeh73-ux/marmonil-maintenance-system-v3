
import React, { useState } from 'react';
import { SparePart, User } from '../types';
import { Upload, Search, Package, AlertCircle, Filter } from 'lucide-react';

interface StoreViewProps {
  spareParts: SparePart[];
  currentUser: User;
  onUpdateInventory: (parts: SparePart[]) => void;
}

const StoreView: React.FC<StoreViewProps> = ({ spareParts, currentUser, onUpdateInventory }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [uploadStatus, setUploadStatus] = useState<'IDLE' | 'SUCCESS' | 'ERROR'>('IDLE');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setCsvContent(text);
      };
      reader.readAsText(file);
    }
  };

  const processUpload = () => {
    try {
      if (!csvContent) return;
      const lines = csvContent.split('\n');
      const newParts: SparePart[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const [code, name, category, quantity, minLevel] = line.split(',').map(s => s.trim());
        if (code && name) {
          newParts.push({
            code,
            name,
            category: category || 'General',
            quantity: parseInt(quantity) || 0,
            minLevel: parseInt(minLevel) || 5,
            lastUpdated: Date.now()
          });
        }
      }
      const updatedInventory = [...spareParts];
      newParts.forEach(newPart => {
        const index = updatedInventory.findIndex(p => p.code === newPart.code);
        if (index >= 0) updatedInventory[index] = newPart;
        else updatedInventory.push(newPart);
      });
      onUpdateInventory(updatedInventory);
      setUploadStatus('SUCCESS');
      setCsvContent('');
    } catch (err) {
      setUploadStatus('ERROR');
    }
  };

  const filteredParts = spareParts.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Responsive Upload Section */}
      {(currentUser.role === 'STORE' || currentUser.role === 'ADMIN') && (
        <div className="card-industrial">
          <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center">
            <Upload className="w-5 h-5 mr-2 text-blue-600" />
            Bulk Inventory Management
          </h3>
          <p className="text-xs text-slate-500 mb-6">
             Import CSV with: <code className="bg-slate-100 px-1 py-0.5 rounded">Part Code, Name, Category, Quantity, Min Level</code>
          </p>
          
          <div className="flex flex-col lg:flex-row gap-6">
             <div className="flex-1 space-y-4">
                <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-4 md:p-8 transition-colors hover:border-blue-400 bg-slate-50/50">
                  <input 
                    type="file" 
                    accept=".csv,.txt"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="text-center">
                    <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm font-bold text-slate-600">Click to upload or drag & drop</p>
                    <p className="text-[10px] text-slate-400 uppercase mt-1">CSV files only</p>
                  </div>
                </div>
                <textarea 
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  className="w-full h-24 text-xs font-mono border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="Paste CSV rows here manually if needed..."
                ></textarea>
             </div>
             <div className="lg:w-48 shrink-0">
               <button 
                 onClick={processUpload}
                 disabled={!csvContent}
                 className="w-full btn-industrial btn-primary py-5 disabled:opacity-50"
               >
                 Execute Import
               </button>
               {uploadStatus === 'SUCCESS' && <p className="text-green-600 text-xs font-bold mt-3 text-center">Update Successful</p>}
               {uploadStatus === 'ERROR' && <p className="text-red-600 text-xs font-bold mt-3 text-center">Format Error</p>}
             </div>
          </div>
        </div>
      )}

      {/* Responsive Inventory List */}
      <div className="card-industrial flex flex-col">
        <div className="p-4 md:p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            <Package className="w-5 h-5 text-slate-400" /> Stock Registry
          </h3>
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Filter by part or code..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Scrollable Table Wrapper */}
        <div className="table-responsive">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 text-[10px] uppercase text-slate-500 font-bold tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Registry Code</th>
                <th className="px-6 py-4">Component Designation</th>
                <th className="px-6 py-4">Sector</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4">Availability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredParts.map(part => (
                <tr key={part.code} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 font-mono text-[11px] text-slate-400 group-hover:text-slate-600">{part.code}</td>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{part.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{part.category}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-sm font-black ${part.quantity <= part.minLevel ? 'text-red-600' : 'text-slate-800'}`}>
                      {part.quantity}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {part.quantity <= part.minLevel ? (
                       <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black bg-red-100 text-red-700 uppercase">
                         <AlertCircle className="w-3 h-3 mr-1" /> Reorder
                       </span>
                    ) : (
                      <span className="text-[10px] font-black text-green-600 uppercase">Available</span>
                    )}
                  </td>
                </tr>
              ))}
              {filteredParts.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                     <Package className="w-12 h-12 mx-auto text-slate-100 mb-2" />
                     <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No items matching criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default StoreView;