
import React, { useState } from 'react';
import { BookOpen, Search, Download, ChevronDown, ChevronUp, Info, HelpCircle, FileText, Settings, AlertTriangle, BarChart3, ShieldCheck } from 'lucide-react';

const SystemGuide: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string | null>('s1');
  const [searchTerm, setSearchTerm] = useState('');

  const sections: { id: string; title: string; icon: React.ReactNode; content: React.ReactNode }[] = [
    {
      id: 's1',
      title: 'System Overview',
      icon: <Info className="w-5 h-5 text-blue-500" />,
      content: (
        <div className="space-y-4">
          <p>The <strong>Marmonil Smart Maintenance System</strong> is a comprehensive digital platform designed to streamline factory operations, maintenance ticketing, and resource management.</p>
          <p>Key modules include:</p>
          <ul className="list-disc pl-5 space-y-1 text-slate-700">
            <li><strong>Factory Status:</strong> Live view of all machine states.</li>
            <li><strong>Production:</strong> Create breakdown tickets and report issues.</li>
            <li><strong>Maintenance:</strong> Manage repairs, spare parts, and technician assignments.</li>
            <li><strong>Store:</strong> Manage inventory and spare part requests.</li>
            <li><strong>Analytics:</strong> AI-driven insights and detailed reports.</li>
          </ul>
        </div>
      )
    },
    {
      id: 's2',
      title: 'How to Create a Ticket',
      icon: <FileText className="w-5 h-5 text-green-500" />,
      content: (
        <div className="space-y-4">
          <p>Production staff can report issues via the <strong>Create Ticket</strong> tab.</p>
          <ol className="list-decimal pl-5 space-y-2 text-slate-700">
            <li>Select the <strong>Workcenter Area</strong> (e.g., Gangsaws, Polishing).</li>
            <li>Select the specific <strong>Target Asset</strong> (Machine).</li>
            <li>Choose the <strong>Operational Impact</strong>:
              <ul className="list-disc pl-5 mt-1 text-sm text-slate-500">
                <li><strong className="text-red-600">Full Stop:</strong> Machine is completely down. Photo evidence is required.</li>
                <li><strong className="text-yellow-600">Partial Stop:</strong> Machine is running at reduced capacity.</li>
              </ul>
            </li>
            <li>Select <strong>Fault Type</strong> and <strong>Priority</strong>.</li>
            <li>Enter a detailed description and click <strong>Submit</strong>.</li>
          </ol>
        </div>
      )
    },
    {
      id: 's3',
      title: 'Maintenance Workflow',
      icon: <Settings className="w-5 h-5 text-slate-500" />,
      content: (
        <div className="space-y-4">
          <p>The repair lifecycle follows a strict protocol:</p>
          <div className="flex flex-col gap-3">
            <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded">
              <span className="font-bold text-red-700 block">1. Open Ticket</span>
              Ticket appears on the dashboard. Lead Technician assigns staff.
            </div>
            <div className="p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
              <span className="font-bold text-blue-700 block">2. In Progress</span>
              Technicians start repair. Timer begins tracking "Active Time".
            </div>
            <div className="p-3 bg-orange-50 border-l-4 border-orange-500 rounded">
              <span className="font-bold text-orange-700 block">3. On Hold (Optional)</span>
              If parts are missing, ticket is placed on hold. A reason must be logged.
            </div>
            <div className="p-3 bg-green-50 border-l-4 border-green-500 rounded">
              <span className="font-bold text-green-700 block">4. Closed</span>
              Repair complete. Solution logged. Spare parts consumed.
            </div>
          </div>
        </div>
      )
    },
    {
      id: 's4',
      title: 'Out of Service Approval Rules',
      icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
      content: (
        <div className="space-y-4">
          <p>Decommissioning a machine ("Halt") requires strict adherence to safety protocols.</p>
          <p className="font-bold text-red-600">CRITICAL POLICY:</p>
          <p>Before setting a machine to <strong>OUT OF SERVICE</strong>, you must obtain verbal or digital approval from:</p>
          <ul className="list-disc pl-5 space-y-1 text-slate-700">
            <li>Production Manager</li>
            <li>Planning Department</li>
            <li>Maintenance Manager</li>
          </ul>
          <p className="text-sm italic text-slate-500">Failure to do so disrupts the weekly production plan and KPI accuracy.</p>
        </div>
      )
    },
    {
      id: 's5',
      title: 'Weekly Machine Hours Logic',
      icon: <BarChart3 className="w-5 h-5 text-purple-500" />,
      content: (
        <div className="space-y-4">
          <p>Machine availability is calculated based on the <strong>Planned Hours</strong> set by the Planning Department (default 168h/week).</p>
          <div className="bg-slate-100 p-4 rounded-lg font-mono text-xs">
            Availability % = (Planned Hours - Equivalent Downtime) / Planned Hours * 100
          </div>
          <p><strong>Equivalent Downtime:</strong></p>
          <ul className="list-disc pl-5 space-y-1 text-slate-700">
            <li>Full Stop = 100% impact (1 hour down = 1 hour lost).</li>
            <li>Partial Stop = Configurable impact (default 50%).</li>
          </ul>
        </div>
      )
    },
    {
      id: 's6',
      title: 'Reports & KPI Explanation',
      icon: <ShieldCheck className="w-5 h-5 text-blue-600" />,
      content: (
        <div className="space-y-4">
          <p>Key Performance Indicators (KPIs) definitions:</p>
          <ul className="list-disc pl-5 space-y-2 text-slate-700">
            <li><strong>MTTR (Mean Time To Repair):</strong> Average time taken to fix a breakdown (Active Time).</li>
            <li><strong>MTBF (Mean Time Between Failures):</strong> Average operational time between two breakdowns.</li>
            <li><strong>Utilization Rate:</strong> Percentage of planned time the machine was actually running.</li>
          </ul>
        </div>
      )
    },
    {
      id: 's7',
      title: 'FAQ',
      icon: <HelpCircle className="w-5 h-5 text-amber-500" />,
      content: (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="font-bold text-slate-800">Q: Can I edit a closed ticket?</p>
            <p className="text-slate-600 text-sm">A: No. Closed tickets are locked for audit purposes. Contact Admin to reopen if necessary.</p>
          </div>
          <div className="space-y-2">
            <p className="font-bold text-slate-800">Q: How do I request a new spare part?</p>
            <p className="text-slate-600 text-sm">A: During a ticket "Hold", select "Spare Part Not Available" and fill out the requisition form that appears.</p>
          </div>
        </div>
      )
    }
  ];

  const filteredSections = sections.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (typeof s.content === 'string' && s.content.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6 no-print">
        <div className="flex items-center gap-4">
          <div className="bg-slate-900 p-3 rounded-2xl text-white shadow-xl">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">System Knowledge Base</h2>
            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Official Documentation v5.5</p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Search documentation..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold w-full md:w-64 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button 
            onClick={() => window.print()}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95"
          >
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>
      </div>

      {/* Guide Content */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden print:shadow-none print:border-none">
        <div className="divide-y divide-slate-100">
          {filteredSections.map(section => (
            <div key={section.id} className="group">
              <button 
                onClick={() => setActiveSection(activeSection === section.id ? null : section.id)}
                className={`w-full px-8 py-6 flex items-center justify-between hover:bg-slate-50 transition-colors text-left focus:outline-none print:hidden ${activeSection === section.id ? 'bg-slate-50' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg bg-slate-100 ${activeSection === section.id ? 'bg-white shadow-sm' : ''}`}>
                    {section.icon}
                  </div>
                  <span className={`text-sm font-black uppercase tracking-widest ${activeSection === section.id ? 'text-blue-700' : 'text-slate-700'}`}>
                    {section.title}
                  </span>
                </div>
                {activeSection === section.id ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-300" />
                )}
              </button>
              
              {/* Content area - Visible if active OR if printing */}
              <div className={`${activeSection === section.id ? 'block' : 'hidden'} print:block px-8 pb-8 pt-2 animate-in slide-in-from-top-1`}>
                <div className="print:block hidden mb-4 mt-8 pb-2 border-b border-black">
                   <h3 className="text-lg font-black uppercase flex items-center gap-2">{section.title}</h3>
                </div>
                <div className="prose prose-slate prose-sm max-w-none text-slate-600 leading-relaxed font-medium">
                  {section.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer / Contact */}
      <div className="bg-slate-900 rounded-3xl p-8 text-white flex flex-col md:flex-row justify-between items-center gap-6 no-print">
        <div>
          <h4 className="font-black uppercase tracking-widest text-sm mb-2">Need further assistance?</h4>
          <p className="text-xs text-slate-400">Contact the IT Department or your direct supervisor for system training.</p>
        </div>
        <div className="text-right">
          <div className="text-xs font-mono text-slate-500">System Version 5.5</div>
          <div className="text-xs font-mono text-slate-500">Last Updated: March 04, 2026</div>
        </div>
      </div>
    </div>
  );
};

export default SystemGuide;
