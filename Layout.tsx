
import React, { useState, useEffect } from 'react';
import { User, Role } from './types';
import { 
  LogOut, LayoutDashboard, PlusSquare, Wrench, Package, BarChart3, CalendarClock, Users, HardHat, FileText, Settings, Menu, X, ChevronRight, Clock8, BrainCircuit, ClipboardList, UserCheck, History, BookOpen, Database, Activity, Target, ShieldAlert, LineChart, Hammer, Presentation, Cpu, GraduationCap, Factory, Database as MasterDataIcon, RefreshCcw
} from 'lucide-react';

interface LayoutProps {
  user: User;
  currentView: string;
  onChangeView: (view: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ user, currentView, onChangeView, onLogout, children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => { if (window.innerWidth > 992) setIsSidebarOpen(false); };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const getNavItems = (role: Role) => {
    const items = [
      { id: 'planning', label: 'Factory Status', icon: LayoutDashboard, access: ['ALL'], tourId: 'nav-planning' },
      { id: 'production', label: 'Create Ticket', icon: PlusSquare, access: ['PRODUCTION', 'ADMIN'], tourId: 'nav-create-ticket' },
      { id: 'maintenance', label: 'Maintenance Tasks', icon: Wrench, access: ['MAINTENANCE', 'ADMIN'], tourId: 'nav-maintenance' },
      { id: 'master-data-setup', label: 'Master Data Setup', icon: MasterDataIcon, access: ['ADMIN', 'PLANNING', 'MAINTENANCE', 'PRODUCTION'] },
      { id: 'production-kpi-entry', label: 'Production KPI Entry', icon: Target, access: ['PRODUCTION', 'ADMIN'] },
      { id: 'production-kpi', label: 'Production KPI Dashboard', icon: Activity, access: ['ADMIN', 'PLANNING', 'PRODUCTION'] },
      { id: 'ai-advanced-report', label: 'AI Advanced Report', icon: Presentation, access: ['ADMIN', 'MAINTENANCE', 'PLANNING'] }, 
      { id: 'predictive', label: 'Predictive Maint.', icon: BrainCircuit, access: ['ADMIN', 'MAINTENANCE', 'PLANNING'] },
      { id: 'team', label: 'Maintenance Team', icon: UserCheck, access: ['ADMIN', 'MAINTENANCE', 'PLANNING'] },
      { id: 'technician-analytics', label: 'Tech Performance', icon: LineChart, access: ['ADMIN', 'MAINTENANCE'] },
      { id: 'operating-hours', label: 'Operating Hours', icon: Clock8, access: ['PLANNING', 'ADMIN', 'PRODUCTION'], tourId: 'nav-hours' },
      { id: 'preventive', label: 'Preventive Maint.', icon: CalendarClock, access: ['MAINTENANCE', 'ADMIN'] },
      { id: 'spare-parts-tracking', label: 'Spare Part Flows', icon: ClipboardList, access: ['MAINTENANCE', 'ADMIN', 'STORE'] },
      { id: 'store', label: 'Inventory (Store)', icon: Package, access: ['STORE', 'ADMIN', 'MAINTENANCE'] },
      { id: 'failure-history', label: 'Failure History', icon: History, access: ['ADMIN', 'PLANNING', 'MAINTENANCE'] },
      { id: 'reports', label: 'Standard Reports', icon: FileText, access: ['ADMIN', 'PLANNING', 'MAINTENANCE'], tourId: 'nav-reports' },
      { id: 'audit-log', label: 'Audit Logs', icon: ShieldAlert, access: ['ADMIN'] },
      { id: 'bulk-machine-import', label: 'Bulk Machine Import', icon: Database, access: ['ADMIN'] }, // Updated ID and Label
      { id: 'system-builder', label: 'System Builder', icon: Hammer, access: ['ADMIN'] },
      { id: 'system-reset', label: 'System Reset', icon: RefreshCcw, access: ['ADMIN'] },
      { id: 'resources', label: 'System Config', icon: Settings, access: ['ADMIN'] },
      { id: 'users', label: 'User Accounts', icon: Users, access: ['ADMIN'] },
      { id: 'kpi', label: 'Live KPIs', icon: BarChart3, access: ['ADMIN', 'PLANNING', 'MAINTENANCE'] },
      { id: 'guide', label: 'System Guide', icon: BookOpen, access: ['ALL'], tourId: 'nav-guide' },
    ];
    return items.filter(item => item.access.includes('ALL') || item.access.includes(role));
  };

  const navItems = getNavItems(user.role);
  const handleNavClick = (id: string) => { onChangeView(id); setIsSidebarOpen(false); };

  return (
    <div className={`flex h-screen bg-slate-50 overflow-hidden ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      {isSidebarOpen && <div className="fixed inset-0 bg-slate-950/40 z-40 lg:hidden backdrop-blur-sm transition-opacity" onClick={() => setIsSidebarOpen(false)}></div>}
      <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out desktop-sidebar min-[993px]:relative min-[993px]:translate-x-0 no-print">
        <div className="p-8 bg-slate-950/50 border-b border-slate-800 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
               <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center"><Factory className="w-5 h-5" /></div>
               MARMONIL
            </h1>
            <p className="text-[9px] text-blue-500 uppercase tracking-[0.3em] font-black mt-1">Smart Engine v5.5</p>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="min-[993px]:hidden p-2 text-slate-400 hover:text-white"><X className="w-6 h-6" /></button>
        </div>
        <div className="px-8 py-4 bg-slate-900 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-blue-500 font-black">{user.name.charAt(0)}</div>
          <div className="min-w-0">
             <div className="font-bold text-xs truncate text-white">{user.name}</div>
             <div className="text-[8px] text-slate-500 uppercase font-black tracking-widest">{user.role}</div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button key={item.id} onClick={() => handleNavClick(item.id)} className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group relative ${isActive ? 'bg-blue-600/10 text-blue-400 shadow-sm border border-blue-600/20' : 'text-slate-500 hover:bg-slate-800/40 hover:text-slate-300'}`}>
                {isActive && <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>}
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-500' : 'text-slate-600 group-hover:text-blue-400'}`} />
                  <span className="font-bold text-xs tracking-tight uppercase">{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3 h-3 text-blue-500" />}
              </button>
            );
          })}
        </nav>
        <div className="p-4 bg-slate-950/30 border-t border-slate-800">
          <button onClick={onLogout} className="w-full btn-industrial text-red-500 hover:bg-red-500/10 transition-colors border border-red-500/10">
            <LogOut className="w-3 h-3" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-8 py-4 sticky top-0 z-30 flex justify-between items-center no-print shrink-0">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsSidebarOpen(true)} className="min-[993px]:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-xl"><Menu className="w-6 h-6" /></button>
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tighter uppercase">{navItems.find(i => i.id === currentView)?.label || 'Dashboard'}</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Authorized Session Active</p>
            </div>
          </div>
          <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
             <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Secure Link</span>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8 custom-scrollbar">
          <div className="max-w-[1600px] mx-auto w-full">{children}</div>
        </div>
      </div>
    </div>
  );
};

export default Layout;
