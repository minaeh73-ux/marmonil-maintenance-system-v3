

import React, { useState, useEffect, useMemo } from 'react';
import { Ticket, Machine, User } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import { performGroundedSearch } from '../services/geminiService';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, Cell, LineChart, Line
} from 'recharts';
import { 
  BrainCircuit, 
  Sparkles, 
  AlertTriangle, 
  ShieldCheck, 
  TrendingUp, 
  Zap, 
  Activity, 
  Loader2,
  RefreshCcw,
  Gauge,
  Cpu,
  Microscope,
  Lightbulb,
  ArrowRight,
  TrendingDown,
  Download,
  Search
} from 'lucide-react';

interface AIReportViewProps {
  tickets: Ticket[];
  machines: Machine[]; // These should now be pre-filtered for active+approved versions
  users: User[];
}

interface AIAnalysis {
  executiveSummary: string;
  machineRisks: Array<{
    machineId: string;
    machineName: string;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    probability: number;
    urgency: string;
    reason: string;
  }>;
  recommendations: Array<{
    category: 'Operational' | 'Strategic' | 'Tactical';
    action: string;
    impact: string;
  }>;
  patterns: Array<{
    observation: string;
    confidence: number;
  }>;
}

const AIReportView: React.FC<AIReportViewProps> = ({ tickets, machines, users }) => {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{text: string, sources: any[]} | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const result = await performGroundedSearch(searchQuery);
      setSearchResults(result);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const runFullAnalysis = async () => {
    setLoading(true);
    try {
      // Always use `const ai = new GoogleGenAI({apiKey: process.env.API_KEY});`
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Summarize data for AI context without overloading tokens
      const ticketsSummary = tickets.slice(0, 50).map(t => ({
        m: t.machineName,
        p: t.priority,
        f: t.faultType,
        d: t.description,
        dt: (t.totalActiveMinutes + t.totalHoldMinutes) / 60
      }));

      const machinesSummary = machines.map(m => ({
        id: m.id,
        name: m.name,
        status: m.status
      }));

      // Use `ai.models.generateContent` to query GenAI with both the model name and prompt.
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview", // Use recommended model based on task type
        contents: `Analyze this factory maintenance data and provide predictive insights. 
        Machines: ${JSON.stringify(machinesSummary)}
        Recent Tickets: ${JSON.stringify(ticketsSummary)}
        
        Predict next possible breakdown machines, high-risk assets, and suggest preventive schedules.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              executiveSummary: { type: Type.STRING },
              machineRisks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    machineId: { type: Type.STRING },
                    machineName: { type: Type.STRING },
                    riskLevel: { type: Type.STRING, description: "LOW, MEDIUM, or HIGH" },
                    probability: { type: Type.NUMBER, description: "0 to 100" },
                    urgency: { type: Type.STRING },
                    reason: { type: Type.STRING }
                  },
                  required: ["machineId", "machineName", "riskLevel", "probability", "urgency", "reason"]
                }
              },
              recommendations: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    action: { type: Type.STRING },
                    impact: { type: Type.STRING }
                  },
                  required: ["category", "action", "impact"]
                }
              },
              patterns: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    observation: { type: Type.STRING },
                    confidence: { type: Type.NUMBER }
                  },
                  required: ["observation", "confidence"]
                }
              }
            },
            required: ["executiveSummary", "machineRisks", "recommendations", "patterns"]
          }
        }
      });

      // Extracting Text Output from GenerateContentResponse using the .text property
      const result = JSON.parse(response.text || '{}') as AIAnalysis;
      setAnalysis(result);
    } catch (error) {
      console.error("AI Insights failed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!analysis) runFullAnalysis();
  }, []);

  // Calculate Threshold Alerts locally
  const alerts = useMemo(() => {
    const list = [];
    machines.forEach(m => { // machines are already filtered
      const weekStart = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const mTickets = tickets.filter(t => t.machineId === m.id && t.createdAt > weekStart);
      const downtimeHrs = mTickets.reduce((acc, t) => acc + ((t.totalActiveMinutes + t.totalHoldMinutes) / 60), 0);
      const utilization = m.plannedHours ? ((m.plannedHours - downtimeHrs) / m.plannedHours) * 100 : 100;

      if (utilization < 70) list.push({ type: 'utilization', name: m.name, val: `${utilization.toFixed(1)}%` });
      if (mTickets.length >= 3) list.push({ type: 'frequency', name: m.name, val: `${mTickets.length} faults/week` });
    });
    return list;
  }, [tickets, machines]);

  const riskChartData = useMemo(() => {
    if (!analysis) return [];
    return analysis.machineRisks
      .sort((a, b) => b.probability - a.probability)
      .slice(0, 6);
  }, [analysis]);

  if (loading && !analysis) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] space-y-6">
        <div className="relative">
          <div className="w-24 h-24 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
          <BrainCircuit className="w-10 h-10 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">AI Analytics Engine Active</h3>
          <p className="text-sm text-slate-400 font-bold uppercase tracking-widest animate-pulse">Processing complex data patterns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="bg-gradient-to-br from-violet-600 to-indigo-600 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden no-print">
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm border border-white/20">
              <Cpu className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tight">AI Risk Summary</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">Live Intelligence</span>
                <span className="text-xs text-indigo-200 font-bold">Last Updated: {new Date().toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={runFullAnalysis} className="btn-industrial bg-white/10 hover:bg-white/20 text-white px-6 py-4">
              <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Analysis
            </button>
            <button onClick={() => window.print()} className="btn-industrial bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 shadow-lg shadow-blue-900/40">
              <Download className="w-4 h-4" /> Export PDF
            </button>
          </div>
        </div>
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl"></div>
      </div>

      {analysis && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="card-industrial p-8 flex flex-col">
              <div className="flex items-center gap-3 mb-6">
                <Microscope className="w-6 h-6 text-indigo-600" />
                <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">AI Executive Summary</h3>
              </div>
              <p className="prose prose-sm max-w-none text-slate-700 leading-relaxed font-medium whitespace-pre-line">{analysis.executiveSummary}</p>
            </div>

            {/* Search Grounding Section */}
            <div className="card-industrial p-8 bg-slate-900 text-white">
              <div className="flex items-center gap-3 mb-6">
                <Search className="w-6 h-6 text-blue-400" />
                <h3 className="font-black text-lg uppercase tracking-tight">AI Industry Research</h3>
              </div>
              <div className="flex gap-3 mb-6">
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for technical specs, standards, or manuals..."
                  className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm font-bold focus:outline-none focus:border-blue-400"
                />
                <button 
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="btn-industrial bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 disabled:opacity-50 shadow-lg shadow-blue-500/20"
                >
                  {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Search
                </button>
              </div>
              {searchResults && (
                <div className="bg-white/5 rounded-2xl p-6 border border-white/10 space-y-4">
                  <p className="text-sm font-medium text-slate-300 whitespace-pre-line leading-relaxed">{searchResults.text}</p>
                  {searchResults.sources.length > 0 && (
                    <div className="pt-4 border-t border-white/10">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Verified Sources:</span>
                      <div className="flex flex-wrap gap-3">
                        {searchResults.sources.map((s, i) => (
                          <a key={i} href={s.web?.uri} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1">
                            <ArrowRight className="w-3 h-3" /> {s.web?.title || 'External Resource'}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="card-industrial p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Top Risk Asset</span>
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div className="text-xl font-black text-slate-800">{analysis.machineRisks[0]?.machineName || 'N/A'}</div>
              <div className="text-xs font-bold text-slate-400 mt-1">Score: {analysis.machineRisks[0]?.probability || 0} ({analysis.machineRisks[0]?.riskLevel})</div>
            </div>
            <div className="card-industrial p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Key Observation</span>
                <Lightbulb className="w-5 h-5 text-amber-500" />
              </div>
              <div className="text-sm font-bold text-slate-800 line-clamp-2">{analysis.patterns[0]?.observation || 'No clear patterns identified.'}</div>
              <div className="text-xs font-bold text-slate-400 mt-1">Confidence: {(analysis.patterns[0]?.confidence || 0).toFixed(0)}%</div>
            </div>
          </div>
        </div>
      )}

      {analysis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="card-industrial p-8 h-[450px] flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <Gauge className="w-6 h-6 text-red-500" />
              <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">Machine Risk Probability</h3>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="machineName" angle={-45} textAnchor="end" interval={0} fontSize={10} />
                <YAxis domain={[0, 100]} fontSize={10} />
                <Tooltip />
                <Bar dataKey="probability" name="Probability %" radius={[4, 4, 0, 0]}>
                  {riskChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.riskLevel === 'HIGH' ? '#ef4444' : entry.riskLevel === 'MEDIUM' ? '#f59e0b' : '#10b981'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="card-industrial p-8 h-[450px] flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <BrainCircuit className="w-6 h-6 text-blue-600" />
              <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">AI Recommendations</h3>
            </div>
            <div className="space-y-4 flex-1 overflow-y-auto custom-scrollbar pr-2">
              {analysis.recommendations.length > 0 ? (
                analysis.recommendations.map((rec, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowRight className="w-4 h-4 text-blue-600" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{rec.category}</span>
                    </div>
                    <p className="text-sm font-bold text-slate-700 leading-snug">{rec.action}</p>
                    <p className="text-xs font-bold text-slate-400 mt-2">Impact: {rec.impact}</p>
                  </div>
                ))
              ) : (
                <div className="text-center text-slate-400 text-xs font-black uppercase py-10">No recommendations available.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="card-industrial overflow-hidden mt-8">
          <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest">Active System Alerts</h3>
          </div>
          <ul className="divide-y divide-slate-100">
            {alerts.map((alert, idx) => (
              <li key={idx} className="p-4 flex items-center justify-between hover:bg-red-50/20 transition-colors">
                <div>
                  <p className="text-sm font-bold text-slate-800">{alert.name}</p>
                  <p className="text-xs text-slate-500">Threshold breached: {alert.type}</p>
                </div>
                <span className="text-red-600 font-bold text-sm">{alert.val}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AIReportView;
