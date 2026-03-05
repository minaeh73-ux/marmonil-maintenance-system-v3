import React, { useState, useMemo, useEffect } from 'react';
import { Ticket, Machine, User, ProductionLog, MachineRiskProfile, KPIMetrics, BackendReportData } from '../types';
import { GoogleGenAI, Type } from "@google/genai";
import { 
  Presentation, 
  BrainCircuit, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign, 
  RefreshCcw, 
  Download, 
  Mail, 
  Activity, 
  Target, 
  ShieldAlert,
  Zap,
  Clock,
  Layers,
  Calendar,
  CheckCircle2,
  XCircle,
  FileText,
  Clock9,
  UserCheck,
  Factory,
  Hourglass,
  Gauge,
  CalendarDays,
  CalendarOff,
  TrendingDown,
  Loader2,
  BarChart3, 
  Wrench, 
  Microscope, 
  Package, 
  Users
} from 'lucide-react';
// Added missing imports from 'recharts'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import * as XLSX from 'xlsx';

interface AIAdvancedReportProps {
  tickets: Ticket[]; 
  machines: Machine[]; // These should now be pre-filtered for active+approved versions
  users: User[];
  productionLogs: ProductionLog[];
  currentUser: User;
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#64748b'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SHIFTS = ['Shift A (00-08)', 'Shift B (08-16)', 'Shift C (16-24)'];

// Moved MOCK_BACKEND_REPORT_DATA definition here
const MOCK_BACKEND_REPORT_DATA: BackendReportData = {
  kpis: {
    globalOEE: 78.4,
    avgAvailability: 88.2,
    avgPerformance: 85.1,
    avgQuality: 92.5,
    totalDowntimeMonthly: 320,
    plannedVsActualHours: [],
    maintenanceResponseTime: 45,
    maintenanceResolutionTime: 180,
    techEfficiencyScores: [],
    oeePerMachine: [],
    oeePerLine: [],
    thisMonth: { downtime: 320, oee: 78.4 },
    lastMonth: { downtime: 300, oee: 79.1 },
    avgMTBF: 120,
    avgMTTR: 45,
  },
  failureAnalysis: {
    topMachinesByFrequency: [],
    topFaultTypes: [],
    topRootCauses: [],
    breakdownByShift: [],
    breakdownByWeekday: [],
    breakdownByProductionLine: [],
    monthlyTrend: [],
    heatmap: []
  },
  riskAnalysis: { machineRisks: [] },
  costImpact: {
    estimatedProductionLoss: 120000,
    mostExpensiveMachines: [],
    sparePartsConsumptionImpact: 45000,
    technicianLaborHoursCost: 30000,
    monthlyLossSummary: [],
    annualProjection: 450000,
  },
  executiveSummary: "Mock Summary Content...",
  generatedAt: new Date().toISOString(),
};

async function callGoogleScript(action: string, payload: any, userRole: string): Promise<any> {
  const scriptUrl = 'YOUR_APPS_SCRIPT_WEB_APP_URL'; 
  if (scriptUrl === 'YOUR_APPS_SCRIPT_WEB_APP_URL') {
      console.warn("Google Apps Script Web App URL is not configured. Using mock data.");
      return new Promise(resolve => setTimeout(() => resolve(MOCK_BACKEND_REPORT_DATA), 1500));
  }

  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, payload, userRole }),
    });
    const data = await response.json();
    if (data.success) {
      return data.data;
    } else {
      throw new Error(data.error || 'Unknown error from backend');
    }
  } catch (error) {
    console.error("Backend call failed:", error);
    throw error;
  }
}

const AIAdvancedReport: React.FC<AIAdvancedReportProps> = ({ tickets, machines, users, productionLogs, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'FAILURE' | 'KPI' | 'RISK' | 'COST'>('OVERVIEW');
  const [reportData, setReportData] = useState<BackendReportData | null>(null);
  const [loadingBackend, setLoadingBackend] = useState(false);
  const [loadingAiSummary, setLoadingAiSummary] = useState(false);
  const [aiSummaryText, setAiSummaryText] = useState<string>('');
  const [lastRefreshed, setLastRefreshed] = useState(Date.now());

  const fetchReportData = async () => {
    setLoadingBackend(true);
    try {
      // Pass all machines to the backend, let the backend filter for active+approved versions
      const data = await callGoogleScript('REPORT_GET_ADVANCED_DATA', { machines: machines }, currentUser.role);
      setReportData(data);
      setAiSummaryText(data.executiveSummary || "Generating AI Summary...");
    } catch (error) {
      console.error("Failed to fetch advanced report data:", error);
      setReportData(null);
      setAiSummaryText("System Alert: Failed to load report data from backend.");
    } finally {
      setLoadingBackend(false);
    }
  };

  const generateExecutiveSummary = async (data: BackendReportData) => {
    setLoadingAiSummary(true);
    try {
      // Always use `const ai = new GoogleGenAI({apiKey: process.env.API_KEY});`
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `
        Act as a Senior Maintenance Analyst for Marmonil Factory. Analyze the provided structured data and generate a concise, professional, 3-paragraph executive summary for management.

        Current Report Data:
        - Generated At: ${data.generatedAt}
        - Global OEE: ${(data.kpis.globalOEE || 0).toFixed(1)}% (Last Month: ${(data.kpis.lastMonth?.oee || 0).toFixed(1)}%)
        - Total Downtime (This Month): ${(data.kpis.thisMonth?.downtime || 0).toFixed(1)} hours (Last Month: ${(data.kpis.lastMonth?.downtime || 0).toFixed(1)} hours)
        - Avg. Maintenance Response Time: ${(data.kpis.maintenanceResponseTime || 0).toFixed(0)} minutes
        - Top 3 Failing Machines (Frequency): ${data.failureAnalysis.topMachinesByFrequency.slice(0,3).map(m => `${m.name} (${m.count} failures)`).join(', ')}
        - Top Risk Machine: ${data.riskAnalysis.machineRisks[0]?.machineName} (Score: ${data.riskAnalysis.machineRisks[0]?.riskScore}, Level: ${data.riskAnalysis.machineRisks[0]?.riskLevel})
        - Most Expensive Breakdown Machine: ${data.costImpact.mostExpensiveMachines[0]?.name} (Cost: $${(data.costImpact.mostExpensiveMachines[0]?.cost || 0).toLocaleString()})
        - Annual Cost Projection: $${(data.costImpact.annualProjection || 0).toLocaleString()}

        Recommendations from AI: ${JSON.stringify(data.riskAnalysis.machineRisks.slice(0,2).map(r => r.recommendedAction))}

        Structure the summary as:
        1.  Operational Performance Overview
        2.  Critical Areas & Identified Risks
        3.  Actionable Recommendations & Outlook

        Maintain a tone of urgency and strategic foresight.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt
      });
      
      setAiSummaryText(response.text || "AI Analysis unavailable.");
    } catch (e) {
      setAiSummaryText("System Alert: AI Service unreachable for summary generation.");
    } finally {
      setLoadingAiSummary(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [lastRefreshed, machines]); // Depend on machines to re-fetch if filter changes

  useEffect(() => {
    if (reportData && !reportData.executiveSummary && !loadingBackend) {
      generateExecutiveSummary(reportData);
    } else if (reportData?.executiveSummary) {
      setAiSummaryText(reportData.executiveSummary);
    }
  }, [reportData, loadingBackend]);

  if (loadingBackend && !reportData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] space-y-6">
        <div className="relative">
          <div className="w-24 h-24 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
          <BrainCircuit className="w-10 h-10 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Loading Advanced Analytics Engine</h3>
          <p className="text-sm text-slate-400 font-bold uppercase tracking-widest animate-pulse">Aggregating Data & Calculating KPIs...</p>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] space-y-6 text-slate-500">
        <AlertTriangle className="w-20 h-20 opacity-30" />
        <h3 className="text-xl font-black text-slate-800 uppercase">Report Data Unavailable</h3>
        <button onClick={() => setLastRefreshed(Date.now())} className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest bg-blue-600 text-white hover:bg-blue-700 transition-colors">
          <RefreshCcw className="w-4 h-4 mr-2" /> Try Refreshing
        </button>
      </div>
    );
  }

  const kpis = reportData.kpis;
  const failureAnalysis = reportData.failureAnalysis;
  const riskAnalysis = reportData.riskAnalysis;
  const costImpact = reportData.costImpact;

  const currentMonthOEE = kpis.thisMonth?.oee || 0;
  const lastMonthOEE = kpis.lastMonth?.oee || 0;
  const oeeTrend = currentMonthOEE - lastMonthOEE;
  const oeeTrendStatus = oeeTrend > 0 ? "success" : oeeTrend < 0 ? "danger" : "warning";
  const oeeTrendValue = (oeeTrend || 0).toFixed(1);

  const currentMonthDowntime = kpis.thisMonth?.downtime || 0;
  const lastMonthDowntime = kpis.lastMonth?.downtime || 0;
  const downtimeTrend = currentMonthDowntime - lastMonthDowntime;
  const downtimeTrendStatus = downtimeTrend < 0 ? "success" : downtimeTrend > 0 ? "danger" : "warning";
  const downtimeTrendValue = (downtimeTrend || 0).toFixed(1);

  return (
    <div className="space-y-8 pb-20">
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden no-print">
        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-900/50">
              <Presentation className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-3xl font-black uppercase tracking-tight">AI Advanced Report</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest">Live Intelligence</span>
                <span className="text-xs text-slate-400 font-bold">Last Updated: {new Date(reportData.generatedAt).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => generateExecutiveSummary(reportData)} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
              <RefreshCcw className={`w-4 h-4 ${loadingAiSummary ? 'animate-spin' : ''}`} /> Refresh AI Summary
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all">
              <Download className="w-4 h-4" /> Export PDF
            </button>
          </div>
        </div>
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl"></div>
      </div>

      <div className="border-b border-slate-200 flex gap-6 overflow-x-auto no-print">
        {[
          { id: 'OVERVIEW', label: 'Executive Overview', icon: BrainCircuit },
          { id: 'KPI', label: 'KPI Performance', icon: Gauge },
          { id: 'FAILURE', label: 'Failure Analysis', icon: AlertTriangle },
          { id: 'RISK', label: 'Risk Assessment', icon: ShieldAlert },
          { id: 'COST', label: 'Cost Impact', icon: DollarSign },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`py-4 px-2 font-black text-[10px] uppercase tracking-widest whitespace-nowrap transition-all border-b-2 flex items-center gap-2 ${activeTab === tab.id ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* ======================= EXECUTIVE OVERVIEW TAB ======================= */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-8">
            <div className="card-industrial p-8">
              <div className="flex items-center gap-3 mb-6">
                <BrainCircuit className="w-6 h-6 text-blue-600" />
                <h3 className="font-black text-slate-800 text-lg uppercase tracking-tight">AI Generated Executive Summary</h3>
              </div>
              {loadingAiSummary ? (
                <div className="flex items-center justify-center py-10 text-slate-500">
                  <Loader2 className="w-6 h-6 animate-spin mr-2" />
                  <span className="text-sm font-bold">Generating Summary...</span>
                </div>
              ) : (
                <p className="prose prose-sm max-w-none text-slate-700 leading-relaxed font-medium whitespace-pre-line">{aiSummaryText}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <SummaryKPICard 
                title="Global OEE (This Month)" 
                value={`${kpis.globalOEE.toFixed(1)}%`} 
                icon={<Gauge className="text-blue-600" />} 
                trendValue={`${oeeTrendValue}%`}
                trendStatus={oeeTrendStatus}
                subtext="vs Last Month"
              />
              <SummaryKPICard 
                title="Total Downtime (This Month)" 
                value={`${kpis.totalDowntimeMonthly.toFixed(0)} Hrs`} 
                icon={<Clock className="text-red-600" />} 
                trendValue={`${downtimeTrendValue} Hrs`}
                trendStatus={downtimeTrendStatus}
                subtext="vs Last Month"
              />
              <SummaryKPICard 
                title="Avg. MTTR" 
                value={`${kpis.avgMTTR.toFixed(0)} min`} 
                icon={<Hourglass className="text-amber-600" />} 
                subtext="Mean Time to Repair"
              />
              <SummaryKPICard 
                title="Avg. MTBF" 
                value={`${kpis.avgMTBF.toFixed(0)} Hrs`} 
                icon={<RefreshCcw className="text-green-600" />} 
                subtext="Mean Time Between Failures"
              />
            </div>
          </div>
        )}

        {/* ======================= KPI PERFORMANCE TAB ======================= */}
        {activeTab === 'KPI' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard title="Avg. Availability" value={`${kpis.avgAvailability.toFixed(1)}%`} icon={<CheckCircle2 className="text-green-500" />} />
              <KPICard title="Avg. Performance" value={`${kpis.avgPerformance.toFixed(1)}%`} icon={<TrendingUp className="text-purple-500" />} />
              <KPICard title="Avg. Quality" value={`${kpis.avgQuality.toFixed(1)}%`} icon={<Target className="text-orange-500" />} />
              <KPICard title="Global OEE" value={`${kpis.globalOEE.toFixed(1)}%`} icon={<BarChart3 className="text-blue-500" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="card-industrial p-6 min-h-[400px] flex flex-col">
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
                  <LineChart className="w-5 h-5 text-indigo-600" /> Monthly OEE Trend
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={kpis.oeePerLine}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" fontSize={11} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                    <YAxis fontSize={11} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} domain={[0, 100]} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey="oee" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 8 }} name="OEE %" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="card-industrial p-6 min-h-[400px] flex flex-col">
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
                  <BarChart className="w-5 h-5 text-green-600" /> OEE Per Machine
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={kpis.oeePerMachine}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="machineName" fontSize={11} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} angle={-30} textAnchor="end" height={60} />
                    <YAxis fontSize={11} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} domain={[0, 100]} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="oee" fill="#10b981" radius={[4, 4, 0, 0]} name="OEE %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ======================= FAILURE ANALYSIS TAB ======================= */}
        {activeTab === 'FAILURE' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <KPICard title="Top Fault Type" value={failureAnalysis.topFaultTypes[0]?.name || 'N/A'} icon={<Wrench className="text-blue-600" />} />
              <KPICard title="Top Root Cause" value={failureAnalysis.topRootCauses[0]?.name || 'N/A'} icon={<Microscope className="text-green-600" />} />
              <KPICard title="Avg. Machine Failures" value={`${(kpis.avgMTBF > 0 ? (168 / kpis.avgMTBF) : 0).toFixed(1)}/week`} icon={<AlertTriangle className="text-red-600" />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="card-industrial p-6 min-h-[400px] flex flex-col">
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
                  <BarChart className="w-5 h-5 text-blue-600" /> Top Machines by Failure Frequency
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={failureAnalysis.topMachinesByFrequency}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" fontSize={11} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} angle={-30} textAnchor="end" height={60} />
                    <YAxis fontSize={11} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Failures" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card-industrial p-6 min-h-[400px] flex flex-col">
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-orange-600" /> Breakdown by Fault Type
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={failureAnalysis.topFaultTypes}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {failureAnalysis.topFaultTypes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="card-industrial p-6 min-h-[400px] flex flex-col">
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
                  <BarChart className="w-5 h-5 text-purple-600" /> Breakdown by Shift
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={failureAnalysis.breakdownByShift}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="shift" fontSize={11} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                    <YAxis fontSize={11} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Failures" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="card-industrial p-6 min-h-[400px] flex flex-col">
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
                  <AreaChart className="w-5 h-5 text-teal-600" /> Breakdown by Weekday
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={failureAnalysis.breakdownByWeekday}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="day" fontSize={11} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                    <YAxis fontSize={11} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Area type="monotone" dataKey="count" stroke="#14b8a6" fill="url(#colorCount)" strokeWidth={2} name="Failures" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ======================= RISK ASSESSMENT TAB ======================= */}
        {activeTab === 'RISK' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <KPICard title="High Risk Machines" value={riskAnalysis.machineRisks.filter(r => r.riskLevel === 'HIGH').length} icon={<AlertTriangle className="text-red-600" />} />
              <KPICard title="Avg Risk Score" value={`${(riskAnalysis.machineRisks.reduce((sum, r) => sum + r.riskScore, 0) / Math.max(1, riskAnalysis.machineRisks.length)).toFixed(1)}`} icon={<ShieldAlert className="text-amber-600" />} />
              <KPICard title="Proactive Interventions" value="12" icon={<Zap className="text-blue-600" />} /> {/* Mock data */}
            </div>

            <div className="card-industrial p-6 overflow-hidden">
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
                <BarChart className="w-5 h-5 text-red-600" /> Machine Risk Profiles
              </h3>
              <div className="table-responsive">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] uppercase text-slate-500 font-black tracking-widest border-b border-slate-100">
                      <th className="px-6 py-4">Machine</th>
                      <th className="px-6 py-4 text-center">Risk Score</th>
                      <th className="px-6 py-4 text-center">Risk Level</th>
                      <th className="px-6 py-4">Recommended Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {riskAnalysis.machineRisks.sort((a, b) => b.riskScore - a.riskScore).map(risk => (
                      <tr key={risk.machineId} className="hover:bg-red-50/10">
                        <td className="px-6 py-4 font-black text-slate-800">{risk.machineName}</td>
                        <td className="px-6 py-4 text-center font-bold text-slate-700">{risk.riskScore.toFixed(0)}</td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                            risk.riskLevel === 'HIGH' ? 'bg-red-100 text-red-700' :
                            risk.riskLevel === 'MEDIUM' ? 'bg-amber-100 text-amber-700' :
                            'bg-green-100 text-green-700'
                          }`}>{risk.riskLevel}</span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600 max-w-md">{risk.recommendedAction}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================= COST IMPACT TAB ======================= */}
        {activeTab === 'COST' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPICard title="Est. Production Loss" value={`$${costImpact.estimatedProductionLoss.toLocaleString()}`} icon={<TrendingDown className="text-red-600" />} />
              <KPICard title="Spare Parts Cost" value={`$${costImpact.sparePartsConsumptionImpact.toLocaleString()}`} icon={<Package className="text-amber-600" />} />
              <KPICard title="Technician Labor Cost" value={`$${costImpact.technicianLaborHoursCost.toLocaleString()}`} icon={<Users className="text-blue-600" />} />
              <KPICard title="Annual Loss Projection" value={`$${costImpact.annualProjection.toLocaleString()}`} icon={<DollarSign className="text-green-600" />} />
            </div>

            <div className="card-industrial p-6 min-h-[400px] flex flex-col">
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-widest mb-6 flex items-center gap-2">
                <BarChart className="w-5 h-5 text-blue-600" /> Most Expensive Machines by Downtime
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={costImpact.mostExpensiveMachines}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" fontSize={11} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} angle={-30} textAnchor="end" height={60} />
                  <YAxis fontSize={11} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="cost" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Cost ($)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const KPICard = ({ title, value, icon }: { title: string; value: string; icon: React.ReactNode; }) => (
  <div className="card-industrial p-5 flex items-center gap-4 transition-transform hover:scale-[1.02] duration-200">
    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex-shrink-0">{icon}</div>
    <div className="min-w-0">
       <h5 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest truncate">{title}</h5>
       <div className="text-2xl font-black text-slate-800 leading-none my-1">{value}</div>
    </div>
  </div>
);

const SummaryKPICard = ({ title, value, icon, trendValue, trendStatus, subtext }: { title: string; value: string; icon: React.ReactNode; trendValue?: string; trendStatus?: 'success' | 'danger' | 'warning'; subtext: string }) => {
  const trendColor = trendStatus === 'success' ? 'text-green-500' : trendStatus === 'danger' ? 'text-red-500' : 'text-amber-500';
  const trendIcon = trendStatus === 'success' ? <TrendingUp className="w-4 h-4" /> : trendStatus === 'danger' ? <TrendingDown className="w-4 h-4" /> : null;

  return (
    <div className="card-industrial p-6 flex flex-col justify-between h-40">
      <div className="flex justify-between items-start">
        <div>
          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</h5>
          <div className="text-3xl font-black text-slate-800 mt-1 leading-none">{value}</div>
        </div>
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex-shrink-0">{icon}</div>
      </div>
      <div className="flex items-center gap-2 mt-4 text-xs font-bold text-slate-500">
        {trendIcon && <span className={trendColor}>{trendIcon}</span>}
        {trendValue && <span className={trendColor}>{trendValue}</span>}
        <span>{subtext}</span>
      </div>
    </div>
  );
};


export default AIAdvancedReport;