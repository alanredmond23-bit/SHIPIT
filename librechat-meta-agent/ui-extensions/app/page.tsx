'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Home,
  ListTodo,
  Users,
  FileBox,
  Settings,
  Plus,
  Play,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import clsx from 'clsx';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100';

// API functions
const api = {
  getDashboard: () => fetch(`${API_BASE}/api/dashboard`).then(r => r.json()),
  getProjects: () => fetch(`${API_BASE}/api/projects`).then(r => r.json()),
  getTasks: (status?: string) => fetch(`${API_BASE}/api/tasks${status ? `?status=${status}` : ''}`).then(r => r.json()),
  getAgents: () => fetch(`${API_BASE}/api/agents`).then(r => r.json()),
  executeTask: (id: string) => fetch(`${API_BASE}/api/tasks/${id}/execute`, { method: 'POST' }).then(r => r.json()),
  createProject: (data: any) => fetch(`${API_BASE}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(r => r.json()),
};

type Tab = 'dashboard' | 'tasks' | 'agents' | 'artifacts';

export default function MissionControl() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [showNewProject, setShowNewProject] = useState(false);
  const queryClient = useQueryClient();

  const { data: dashboard, isLoading: loadingDashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: api.getDashboard,
    refetchInterval: 5000,
  });

  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => api.getTasks(),
    refetchInterval: 3000,
  });

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: api.getAgents,
    refetchInterval: 5000,
  });

  const executeTaskMutation = useMutation({
    mutationFn: api.executeTask,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const tabs = [
    { id: 'dashboard' as Tab, icon: Home, label: 'Dashboard' },
    { id: 'tasks' as Tab, icon: ListTodo, label: 'Tasks' },
    { id: 'agents' as Tab, icon: Users, label: 'Agents' },
    { id: 'artifacts' as Tab, icon: FileBox, label: 'Files' },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />;
      case 'done': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'queued': return <Clock className="w-4 h-4 text-slate-400" />;
      case 'blocked': return <AlertCircle className="w-4 h-4 text-amber-400" />;
      default: return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-lg border-b border-slate-800 px-4 py-3 sticky top-0 z-50">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Mission Control
          </h1>
          <button
            onClick={() => setShowNewProject(true)}
            className="p-2 bg-indigo-600 rounded-full tap-target"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 pb-24 scroll-container">
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="card">
                <div className="text-3xl font-bold text-indigo-400">
                  {dashboard?.data?.projects || 0}
                </div>
                <div className="text-sm text-slate-400">Projects</div>
              </div>
              <div className="card">
                <div className="text-3xl font-bold text-green-400">
                  {dashboard?.data?.tasksByStatus?.done || 0}
                </div>
                <div className="text-sm text-slate-400">Completed</div>
              </div>
              <div className="card">
                <div className="text-3xl font-bold text-blue-400">
                  {dashboard?.data?.tasksByStatus?.running || 0}
                </div>
                <div className="text-sm text-slate-400">Running</div>
              </div>
              <div className="card">
                <div className="text-3xl font-bold text-amber-400">
                  {dashboard?.data?.tasksByStatus?.queued || 0}
                </div>
                <div className="text-sm text-slate-400">Queued</div>
              </div>
            </div>

            {/* Recent Tasks */}
            <div className="card">
              <h2 className="font-semibold mb-3 flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-indigo-400" />
                Recent Tasks
              </h2>
              <div className="space-y-2">
                {dashboard?.data?.recentTasks?.slice(0, 5).map((task: any) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(task.status)}
                      <div>
                        <div className="font-medium text-sm">{task.title}</div>
                        <div className="text-xs text-slate-500 capitalize">{task.status.replace('_', ' ')}</div>
                      </div>
                    </div>
                    {task.status === 'queued' && (
                      <button
                        onClick={() => executeTaskMutation.mutate(task.id)}
                        className="p-2 bg-indigo-600/20 rounded-lg tap-target"
                      >
                        <Play className="w-4 h-4 text-indigo-400" />
                      </button>
                    )}
                  </div>
                ))}
                {(!dashboard?.data?.recentTasks || dashboard.data.recentTasks.length === 0) && (
                  <div className="text-center py-8 text-slate-500">
                    No tasks yet. Create a project to get started!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-3">
            <h2 className="font-semibold text-lg">All Tasks</h2>
            {tasks?.data?.map((task: any) => (
              <div key={task.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(task.status)}
                      <span className="font-medium">{task.title}</span>
                    </div>
                    {task.description && (
                      <p className="text-sm text-slate-400 line-clamp-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <span className={clsx(
                        'px-2 py-0.5 rounded-full text-xs',
                        `status-${task.status}`
                      )}>
                        {task.status.replace('_', ' ')}
                      </span>
                      {task.assigned_agent && (
                        <span className="text-xs text-slate-500">{task.assigned_agent}</span>
                      )}
                    </div>
                  </div>
                  {task.status === 'queued' && (
                    <button
                      onClick={() => executeTaskMutation.mutate(task.id)}
                      disabled={executeTaskMutation.isPending}
                      className="btn-primary py-2 px-4 text-sm"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {(!tasks?.data || tasks.data.length === 0) && (
              <div className="text-center py-12 text-slate-500">
                No tasks found
              </div>
            )}
          </div>
        )}

        {activeTab === 'agents' && (
          <div className="space-y-3">
            <h2 className="font-semibold text-lg">Agent Status</h2>
            {agents?.data?.map((agent: any) => (
              <div key={agent.id} className="card">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{agent.name}</div>
                    <div className="text-sm text-slate-400">{agent.id}</div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {agent.capabilities?.slice(0, 3).map((cap: string) => (
                        <span key={cap} className="px-2 py-0.5 bg-slate-800 rounded text-xs">
                          {cap}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className={clsx(
                    'px-3 py-1 rounded-full text-sm font-medium',
                    agent.status === 'running' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-700 text-slate-300'
                  )}>
                    {agent.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'artifacts' && (
          <div className="space-y-3">
            <h2 className="font-semibold text-lg">Artifacts</h2>
            <div className="text-center py-12 text-slate-500">
              <FileBox className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Artifacts will appear here as agents create them</p>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-lg border-t border-slate-800 px-4 py-2 pb-[calc(0.5rem+var(--safe-area-inset-bottom))]">
        <div className="flex justify-around">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex flex-col items-center py-2 px-4 rounded-xl transition-colors tap-target',
                activeTab === tab.id
                  ? 'text-indigo-400 bg-indigo-500/10'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              <tab.icon className="w-6 h-6" />
              <span className="text-xs mt-1">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* New Project Modal */}
      {showNewProject && (
        <NewProjectModal onClose={() => setShowNewProject(false)} />
      )}
    </div>
  );
}

function NewProjectModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: api.createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      createMutation.mutate({ name, description });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end">
      <div className="bg-slate-900 rounded-t-3xl w-full p-6 pb-[calc(1.5rem+var(--safe-area-inset-bottom))]">
        <div className="w-12 h-1 bg-slate-700 rounded-full mx-auto mb-6" />
        <h2 className="text-xl font-bold mb-4">New Project</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My AI Project"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What do you want to build?"
              rows={3}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || createMutation.isPending}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
