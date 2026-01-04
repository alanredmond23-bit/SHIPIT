'use client';

import React, { useState, useEffect } from 'react';
import {
  Rocket,
  ArrowLeft,
  Plus,
  Settings,
  HelpCircle,
} from 'lucide-react';
import {
  ProjectList,
  TemplateSelector,
  PhaseNavigator,
  PhaseView,
  ArtifactViewer,
} from '../../components/IdeaToLaunch';

type ViewMode = 'list' | 'template-select' | 'project' | 'create';

// Mock data for development - replace with API calls
const MOCK_TEMPLATES = [
  {
    id: '1',
    name: 'New Product',
    description: 'Launch a new product from idea to deployment',
    project_type: 'product',
    icon: 'package',
    color: '#6366f1',
    phases: [
      { phase: 'discovery', name: 'Discovery', description: 'Identify the problem', required_inputs: [], expected_outputs: [], gate_criteria: [] },
      { phase: 'ideation', name: 'Ideation', description: 'Brainstorm solutions', required_inputs: [], expected_outputs: [], gate_criteria: [] },
      { phase: 'specification', name: 'Specification', description: 'Define requirements', required_inputs: [], expected_outputs: [], gate_criteria: [] },
      { phase: 'planning', name: 'Planning', description: 'Plan implementation', required_inputs: [], expected_outputs: [], gate_criteria: [] },
      { phase: 'implementation', name: 'Implementation', description: 'Build the solution', required_inputs: [], expected_outputs: [], gate_criteria: [] },
      { phase: 'launch', name: 'Launch', description: 'Deploy and go live', required_inputs: [], expected_outputs: [], gate_criteria: [] },
    ],
    default_platform: 'github',
    suggested_stack: ['Next.js', 'Supabase', 'TypeScript', 'Tailwind CSS'],
    estimated_duration: '4-8 weeks',
    is_featured: true,
    use_count: 156,
  },
  {
    id: '2',
    name: 'Marketing Campaign',
    description: 'Plan and execute a marketing campaign',
    project_type: 'marketing',
    icon: 'megaphone',
    color: '#ec4899',
    phases: [
      { phase: 'discovery', name: 'Research', description: 'Understand the market', required_inputs: [], expected_outputs: [], gate_criteria: [] },
      { phase: 'ideation', name: 'Creative Ideation', description: 'Develop concepts', required_inputs: [], expected_outputs: [], gate_criteria: [] },
      { phase: 'specification', name: 'Asset Specs', description: 'Define assets', required_inputs: [], expected_outputs: [], gate_criteria: [] },
      { phase: 'planning', name: 'Campaign Calendar', description: 'Schedule activities', required_inputs: [], expected_outputs: [], gate_criteria: [] },
      { phase: 'implementation', name: 'Asset Creation', description: 'Create assets', required_inputs: [], expected_outputs: [], gate_criteria: [] },
      { phase: 'launch', name: 'Go Live', description: 'Launch campaign', required_inputs: [], expected_outputs: [], gate_criteria: [] },
    ],
    suggested_stack: ['Google Ads', 'Meta Ads', 'Mailchimp'],
    is_featured: true,
    use_count: 89,
  },
  {
    id: '3',
    name: 'Lead Generation System',
    description: 'Build an automated lead generation system',
    project_type: 'lead_gen',
    icon: 'users',
    color: '#10b981',
    phases: [
      { phase: 'discovery', name: 'Lead Analysis', description: 'Understand ICP', required_inputs: [], expected_outputs: [], gate_criteria: [] },
      { phase: 'ideation', name: 'Strategy Design', description: 'Design funnels', required_inputs: [], expected_outputs: [], gate_criteria: [] },
      { phase: 'specification', name: 'Technical Spec', description: 'Define integrations', required_inputs: [], expected_outputs: [], gate_criteria: [] },
      { phase: 'planning', name: 'Implementation Plan', description: 'Plan the build', required_inputs: [], expected_outputs: [], gate_criteria: [] },
      { phase: 'implementation', name: 'Build & Connect', description: 'Build system', required_inputs: [], expected_outputs: [], gate_criteria: [] },
      { phase: 'launch', name: 'Go Live', description: 'Launch and optimize', required_inputs: [], expected_outputs: [], gate_criteria: [] },
    ],
    suggested_stack: ['HubSpot', 'Webflow', 'Zapier'],
    is_featured: true,
    use_count: 67,
  },
  {
    id: '4',
    name: 'AI Bot / Assistant',
    description: 'Create an AI-powered chatbot or assistant',
    project_type: 'bot',
    icon: 'bot',
    color: '#8b5cf6',
    phases: [
      { phase: 'discovery', name: 'Use Case Analysis', description: 'Define purpose', required_inputs: [], expected_outputs: [], gate_criteria: [] },
      { phase: 'ideation', name: 'Personality & Tone', description: 'Design persona', required_inputs: [], expected_outputs: [], gate_criteria: [] },
      { phase: 'specification', name: 'Technical Design', description: 'Define architecture', required_inputs: [], expected_outputs: [], gate_criteria: [] },
      { phase: 'planning', name: 'Development Plan', description: 'Plan phases', required_inputs: [], expected_outputs: [], gate_criteria: [] },
      { phase: 'implementation', name: 'Build & Train', description: 'Build bot', required_inputs: [], expected_outputs: [], gate_criteria: [] },
      { phase: 'launch', name: 'Deploy & Monitor', description: 'Deploy bot', required_inputs: [], expected_outputs: [], gate_criteria: [] },
    ],
    suggested_stack: ['LangChain', 'OpenAI', 'Pinecone'],
    is_featured: true,
    use_count: 124,
  },
];

const MOCK_PROJECTS = [
  {
    id: 'p1',
    name: 'AI Customer Support Bot',
    project_type: 'bot',
    current_phase: 'specification',
    overall_status: 'active',
    progress_percentage: 33,
    phases_completed: 2,
    total_phases: 6,
    last_activity_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'p2',
    name: 'Q1 Marketing Campaign',
    project_type: 'marketing',
    current_phase: 'implementation',
    overall_status: 'active',
    progress_percentage: 67,
    phases_completed: 4,
    total_phases: 6,
    last_activity_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'p3',
    name: 'SaaS MVP Launch',
    project_type: 'product',
    current_phase: 'launch',
    overall_status: 'completed',
    progress_percentage: 100,
    phases_completed: 6,
    total_phases: 6,
    last_activity_at: new Date(Date.now() - 604800000).toISOString(),
  },
];

export default function LaunchPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [projects, setProjects] = useState(MOCK_PROJECTS);
  const [currentPhase, setCurrentPhase] = useState<string>('discovery');

  const handleNewProject = () => {
    setViewMode('template-select');
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    setViewMode('create');
    // In production, create project via API and navigate to it
    // For now, simulate project creation
    const template = MOCK_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      const newProject = {
        id: `p${Date.now()}`,
        name: `New ${template.name}`,
        project_type: template.project_type,
        current_phase: 'discovery',
        overall_status: 'active',
        progress_percentage: 0,
        phases_completed: 0,
        total_phases: 6,
        last_activity_at: new Date().toISOString(),
      };
      setProjects([newProject, ...projects]);
      setSelectedProject(newProject.id);
      setCurrentPhase('discovery');
      setViewMode('project');
    }
  };

  const handleSelectProject = (projectId: string) => {
    setSelectedProject(projectId);
    const project = projects.find((p) => p.id === projectId);
    if (project) {
      setCurrentPhase(project.current_phase);
    }
    setViewMode('project');
  };

  const handleBack = () => {
    if (viewMode === 'project') {
      setSelectedProject(null);
      setViewMode('list');
    } else if (viewMode === 'template-select' || viewMode === 'create') {
      setSelectedTemplate(null);
      setViewMode('list');
    }
  };

  // Mock phase data
  const mockPhaseData = {
    phase: currentPhase,
    status: 'active',
    inputs: {},
    outputs: [],
    gate_status: 'pending',
  };

  const mockPhaseTemplate = {
    phase: currentPhase as any,
    name: currentPhase.charAt(0).toUpperCase() + currentPhase.slice(1),
    description: 'Phase description here',
    required_inputs: [
      {
        id: 'initial_idea',
        name: 'Initial Idea',
        input_type: 'textarea',
        required: true,
        ai_assisted: true,
        placeholder: 'Describe your initial idea...',
      },
      {
        id: 'target_users',
        name: 'Target Users',
        input_type: 'textarea',
        required: true,
        ai_assisted: true,
        placeholder: 'Who are your target users?',
      },
    ],
    expected_outputs: [
      {
        id: 'problem_doc',
        name: 'Problem Statement Document',
        output_type: 'document',
        format: 'markdown',
        description: 'A clear definition of the problem being solved',
      },
      {
        id: 'user_personas',
        name: 'User Personas',
        output_type: 'document',
        format: 'markdown',
        description: 'Detailed profiles of target users',
      },
    ],
    gate_criteria: [
      {
        id: 'problem_validated',
        name: 'Problem Validated',
        criterion_type: 'checklist',
        required: true,
      },
      {
        id: 'artifacts_complete',
        name: 'All Artifacts Created',
        criterion_type: 'artifact_exists',
        required: true,
      },
    ],
  };

  const mockPhases = [
    { phase: 'discovery', status: currentPhase === 'discovery' ? 'active' : 'completed' },
    { phase: 'ideation', status: currentPhase === 'ideation' ? 'active' : currentPhase === 'discovery' ? 'locked' : 'completed' },
    { phase: 'specification', status: currentPhase === 'specification' ? 'active' : ['discovery', 'ideation'].includes(currentPhase) ? 'locked' : 'completed' },
    { phase: 'planning', status: currentPhase === 'planning' ? 'active' : ['discovery', 'ideation', 'specification'].includes(currentPhase) ? 'locked' : 'completed' },
    { phase: 'implementation', status: currentPhase === 'implementation' ? 'active' : currentPhase === 'launch' ? 'completed' : 'locked' },
    { phase: 'launch', status: currentPhase === 'launch' ? 'active' : 'locked' },
  ] as any[];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              {viewMode !== 'list' && (
                <button
                  onClick={handleBack}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <div className="flex items-center gap-2">
                <Rocket className="w-6 h-6 text-indigo-500" />
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Idea to Launch
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <HelpCircle className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === 'list' && (
          <ProjectList
            projects={projects}
            onSelectProject={handleSelectProject}
            onNewProject={handleNewProject}
          />
        )}

        {viewMode === 'template-select' && (
          <TemplateSelector
            templates={MOCK_TEMPLATES}
            onSelectTemplate={handleSelectTemplate}
            onBack={handleBack}
          />
        )}

        {viewMode === 'project' && selectedProject && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Phase Navigator Sidebar */}
            <div className="lg:col-span-1">
              <PhaseNavigator
                phases={mockPhases}
                currentPhase={currentPhase as any}
                onPhaseSelect={(phase) => setCurrentPhase(phase)}
              />
            </div>

            {/* Phase Content */}
            <div className="lg:col-span-3">
              <PhaseView
                template={mockPhaseTemplate as any}
                data={mockPhaseData as any}
                onInputChange={(id, value) => console.log('Input change:', id, value)}
                onGenerateArtifact={(outputId) => console.log('Generate:', outputId)}
                onViewArtifact={(id) => console.log('View:', id)}
                onEditArtifact={(id) => console.log('Edit:', id)}
                onAdvancePhase={() => {
                  const phases = ['discovery', 'ideation', 'specification', 'planning', 'implementation', 'launch'];
                  const currentIndex = phases.indexOf(currentPhase);
                  if (currentIndex < phases.length - 1) {
                    setCurrentPhase(phases[currentIndex + 1]);
                  }
                }}
                onAIAssist={(inputId) => console.log('AI Assist:', inputId)}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
