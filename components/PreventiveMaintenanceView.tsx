

import React, { useState, useMemo, useEffect } from 'react';
import { PreventiveMaintenanceTask, Ticket, Machine } from '../types';
import { MACHINE_CATEGORIES } from '../constants';
import { Calendar, Plus, CheckCircle2, Clock, AlertCircle, Filter, X } from 'lucide-react';

interface PreventiveMaintenanceViewProps {
  tasks: PreventiveMaintenanceTask[];
  tickets: Ticket[];
  machines: Machine[]; // These should now be pre-filtered for active+approved versions
  onAddTask: (task: Omit<PreventiveMaintenanceTask, 'id' | 'lastPerformed' | 'nextDue'>) => void;
  onGenerateTicket: (task: PreventiveMaintenanceTask) => void;
  initialMachineId?: string | null;
}

const PreventiveMaintenanceView: React.FC<PreventiveMaintenanceViewProps> = ({ 
  tasks, 
  tickets, 
  machines,
  onAddTask,
  onGenerateTicket,
  initialMachineId
}) => {
  const [showForm, setShowForm] = useState(false);
  
  // Form State
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [taskName, setTaskName] = useState('');
  const [frequency, setFrequency] = useState<number>(30);
  const [specialty, setSpecialty] = useState<'ELECTRICAL' | 'MECHANICAL'>('MECHANICAL');

  // List Filter State
  const [listFilterCategory, setListFilterCategory] = useState<string>('');
  const [listFilterMachineId, setListFilterMachineId] = useState<string>('');

  // Handle Initial Machine Pre-selection from other views
  useEffect(() => {
    if (initialMachineId) {
      const machine = machines.find(m => m.id === initialMachineId);
      if (machine) {
        setSelectedCategory(machine.category);
        setSelectedMachineId(machine.id);
        setShowForm(true);
      }
    }
  }, [initialMachineId, machines]);

  const filteredMachinesForForm = machines.filter(m => m.category === selectedCategory);
  const filteredMachinesForList = machines.filter(m => m.category === listFilterCategory);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const machine = machines.find(m => m.id === selectedMachineId);
    if (machine && taskName) {
      onAddTask({
        machineId: machine.id,
        machineName: machine.name,
        taskName,
        frequencyDays: frequency,
        specialty
      });
      setShowForm(false);
      // Reset form
      setTaskName('');
      setFrequency(30);
    }
  };

  const getStatus = (task: PreventiveMaintenanceTask) => {
    const now = Date.now();
    const daysUntilDue = Math.ceil((task.nextDue - now) / (1000 * 60 * 60 * 24));
    
    const activeTicket = tickets.find(t => t.pmTaskId === task.id && t.status !== 'CLOSED');

    if (activeTicket) return { label: 'In Progress', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: Clock };
    if (daysUntilDue < 0) return { label: `Overdue (${Math.abs(daysUntilDue)}d)`, color: 'text-red-600 bg-red-50 border-red-200', icon: AlertCircle };
    if (daysUntilDue <= 3) return { label: `Due Soon (${daysUntilDue}d)`, color: 'text-amber-600 bg-amber-50 border-amber-200', icon: Clock };
    return { label: `Good (${daysUntilDue}d)`, color: 'text-green-600 bg-green-50 border-green-200', icon: CheckCircle2 };
  };

  const visibleTasks = useMemo(() => {
    return tasks.filter(task => {
      const actualMachine = machines.find(m => m.id === task.machineId); // machines are already filtered
      const categoryMatch = !listFilterCategory || actualMachine?.category === listFilterCategory;
      const machineMatch = !listFilterMachineId || task.machineId === listFilterMachineId;
      return categoryMatch && machineMatch;
    });
  }, [tasks, listFilterCategory, listFilterMachineId, machines]);

  return (
    <div className="space-y-6">
      
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Scheduled Tasks</h2>
          <p className="text-slate-500 text-sm">Automated maintenance schedule</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="btn-industrial btn-primary"
        >
          <Plus className="w-5 h-5" />
          <span>New Schedule</span>
        </button>
      </div>

      {/* Add New Task Form */}
      {showForm && (
        <div className="card-industrial animate-in fade-in slide-in-from-top-4">
          <h3 className="font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">Create New Preventive Maintenance Task</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Workcenter</label>
              <select 
                className="w-full rounded-lg border-slate-300 border p-2.5 text-sm"
                value={selectedCategory}
                onChange={(e) => { setSelectedCategory(e.target.value); setSelectedMachineId(''); }}
                required
              >
                <option value="">Select Area</option>
                {Array.from(new Set(machines.map(m => m.category))).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Machine</label>
              <select 
                className="w-full rounded-lg border-slate-300 border p-2.5 text-sm"
                value={selectedMachineId}
                onChange={(e) => setSelectedMachineId(e.target.value)}
                disabled={!selectedCategory}
                required
              >
                <option value="">Select Machine</option>
                {filteredMachinesForForm.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Task Name</label>
              <input 
                type="text" 
                className="w-full rounded-lg border-slate-300 border p-2.5 text-sm"
                placeholder="e.g. Change Oil, Check Belts"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Frequency (Days)</label>
              <input 
                type="number" 
                min="1"
                className="w-full rounded-lg border-slate-300 border p-2.5 text-sm"
                value={frequency}
                onChange={(e) => setFrequency(parseInt(e.target.value))}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Specialty</label>
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setSpecialty('MECHANICAL')}
                  className={`flex-1 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${specialty === 'MECHANICAL' ? 'btn-secondary shadow-lg' : 'btn-outline !text-slate-500'}`}
                >
                  MECHANICAL
                </button>
                <button 
                  type="button" 
                  onClick={() => setSpecialty('ELECTRICAL')}
                  className={`flex-1 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${specialty === 'ELECTRICAL' ? 'btn-secondary shadow-lg' : 'btn-outline !text-slate-500'}`}
                >
                  ELECTRICAL
                </button>
              </div>
            </div>

            <div className="flex items-end">
              <button type="submit" className="w-full btn-industrial btn-primary py-4">
                Save Schedule
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Task List Controls */}
      <div className="card-industrial p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-slate-600">
           <Filter className="w-4 h-4" />
           <span className="text-sm font-bold uppercase tracking-wider">Filters:</span>
        </div>
        
        <div className="flex gap-4 items-center">
           <select 
             className="rounded-md border-slate-300 border py-1.5 px-3 text-xs font-medium focus:ring-blue-500 focus:border-blue-500"
             value={listFilterCategory}
             onChange={(e) => { setListFilterCategory(e.target.value); setListFilterMachineId(''); }}
           >
             <option value="">All Workcenters</option>
             {Array.from(new Set(machines.map(m => m.category))).map(cat => (
               <option key={cat} value={cat}>{cat}</option>
             ))}
           </select>

           <select 
             className="rounded-md border-slate-300 border py-1.5 px-3 text-xs font-medium focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
             value={listFilterMachineId}
             onChange={(e) => setListFilterMachineId(e.target.value)}
             disabled={!listFilterCategory}
           >
             <option value="">All Machines</option>
             {filteredMachinesForList.map(m => (
               <option key={m.id} value={m.id}>{m.name}</option>
             ))}
           </select>

           {(listFilterCategory || listFilterMachineId) && (
              <button 
                onClick={() => { setListFilterCategory(''); setListFilterMachineId(''); }}
                className="btn-industrial !text-red-500 !bg-white !border-slate-100 !text-[10px] hover:!bg-red-50"
                title="Clear Filters"
              >
                <X className="w-4 h-4" />
                <span>Reset</span>
              </button>
           )}
        </div>

        <div className="ml-auto text-[10px] font-bold text-slate-400 uppercase tracking-widest">
           Showing {visibleTasks.length} of {tasks.length} tasks
        </div>
      </div>

      {/* Task List */}
      <div className="card-industrial">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
              <th className="px-6 py-4">Machine</th>
              <th className="px-6 py-4">Task</th>
              <th className="px-6 py-4">Freq</th>
              <th className="px-6 py-4">Last Done</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleTasks.map(task => {
              const status = getStatus(task);
              const Icon = status.icon;
              const hasActiveTicket = tickets.some(t => t.pmTaskId === task.id && t.status !== 'CLOSED');

              return (
                <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{task.machineName}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-700">{task.taskName}</div>
                    <div className="text-xs text-slate-400">{task.specialty}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    Every {task.frequencyDays} days
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {task.lastPerformed > 0 ? new Date(task.lastPerformed).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${status.color}`}>
                      <Icon className="w-3 h-3 mr-1" />
                      {status.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {!hasActiveTicket && (
                      <button 
                        onClick={() => onGenerateTicket(task)}
                        className="btn-industrial !text-blue-600 !bg-transparent !border-none !text-[10px] hover:!text-blue-800 hover:underline"
                      >
                        Create Ticket Now
                      </button>
                    )}
                    {hasActiveTicket && (
                      <span className="text-xs text-slate-400 font-medium italic">Ticket Active</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {visibleTasks.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            {tasks.length > 0 ? (
               <>
                 <Filter className="w-12 h-12 mx-auto mb-3 opacity-20" />
                 <p>No tasks match the selected filters.</p>
               </>
            ) : (
              <>
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No preventive maintenance tasks scheduled.</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PreventiveMaintenanceView;