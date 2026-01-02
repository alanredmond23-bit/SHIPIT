// Idea-to-Launch Service
// Manages structured project workflows from ideation to deployment

import { v4 as uuidv4 } from 'uuid';
import {
  ProjectPhase,
  PhaseStatus,
  GateDecision,
  ProjectType,
  ProjectTemplate,
  IdeaToLaunchProject,
  ProjectPhaseData,
  PhaseArtifact,
  PhaseConversation,
  ProjectContext,
  ProjectDecision,
  CreateProjectRequest,
  UpdatePhaseRequest,
  AdvancePhaseRequest,
  GenerateArtifactRequest,
  ProjectSummary,
} from '../types/idea-to-launch';

// Phase order for navigation
const PHASE_ORDER: ProjectPhase[] = [
  'discovery',
  'ideation',
  'specification',
  'planning',
  'implementation',
  'launch',
];

export class IdeaToLaunchService {
  private supabase: any;
  private aiClient: any;

  constructor(supabase: any, aiClient?: any) {
    this.supabase = supabase;
    this.aiClient = aiClient;
  }

  // ============================================================================
  // Template Management
  // ============================================================================

  async getTemplates(options?: {
    type?: ProjectType;
    featured?: boolean;
  }): Promise<ProjectTemplate[]> {
    let query = this.supabase
      .from('idea_project_templates')
      .select('*')
      .order('use_count', { ascending: false });

    if (options?.type) {
      query = query.eq('project_type', options.type);
    }

    if (options?.featured) {
      query = query.eq('is_featured', true);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  }

  async getTemplate(templateId: string): Promise<ProjectTemplate | null> {
    const { data, error } = await this.supabase
      .from('idea_project_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (error) return null;
    return data;
  }

  async incrementTemplateUsage(templateId: string): Promise<void> {
    await this.supabase.rpc('increment_template_usage', {
      template_id: templateId,
    });
  }

  // ============================================================================
  // Project Management
  // ============================================================================

  async createProject(
    request: CreateProjectRequest,
    userId?: string
  ): Promise<IdeaToLaunchProject> {
    const template = await this.getTemplate(request.template_id);
    if (!template) {
      throw new Error('Template not found');
    }

    // Create the project
    const { data: project, error: projectError } = await this.supabase
      .from('idea_projects')
      .insert({
        user_id: userId,
        template_id: request.template_id,
        name: request.name,
        description: request.description,
        project_type: template.project_type,
        current_phase: 'discovery',
        overall_status: 'active',
        context: request.initial_context || {},
      })
      .select()
      .single();

    if (projectError) throw projectError;

    // Increment template usage
    await this.incrementTemplateUsage(request.template_id);

    // Phases are auto-created by trigger, fetch them
    const { data: phases } = await this.supabase
      .from('idea_project_phases')
      .select('*')
      .eq('project_id', project.id)
      .order('phase');

    return {
      ...project,
      phases: phases || [],
      decisions: [],
    };
  }

  async getProject(projectId: string): Promise<IdeaToLaunchProject | null> {
    const { data: project, error } = await this.supabase
      .from('idea_projects')
      .select(`
        *,
        phases:idea_project_phases(*),
        decisions:idea_project_decisions(*)
      `)
      .eq('id', projectId)
      .single();

    if (error) return null;

    // Get artifacts for each phase
    for (const phase of project.phases) {
      const { data: artifacts } = await this.supabase
        .from('idea_phase_artifacts')
        .select('*')
        .eq('phase_id', phase.id);
      phase.outputs = artifacts || [];

      const { data: conversations } = await this.supabase
        .from('idea_phase_conversations')
        .select(`
          *,
          messages:idea_conversation_messages(*)
        `)
        .eq('phase_id', phase.id);
      phase.conversations = conversations || [];
    }

    return project;
  }

  async getUserProjects(
    userId: string,
    options?: {
      status?: string;
      type?: ProjectType;
      limit?: number;
    }
  ): Promise<ProjectSummary[]> {
    let query = this.supabase
      .from('idea_projects')
      .select(`
        id,
        name,
        project_type,
        current_phase,
        overall_status,
        last_activity_at,
        phases:idea_project_phases(status)
      `)
      .eq('user_id', userId)
      .order('last_activity_at', { ascending: false });

    if (options?.status) {
      query = query.eq('overall_status', options.status);
    }

    if (options?.type) {
      query = query.eq('project_type', options.type);
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Calculate progress for each project
    return data.map((project: any) => {
      const completed = project.phases.filter(
        (p: any) => p.status === 'completed'
      ).length;
      const total = project.phases.length;

      return {
        id: project.id,
        name: project.name,
        project_type: project.project_type,
        current_phase: project.current_phase,
        overall_status: project.overall_status,
        progress_percentage: Math.round((completed / total) * 100),
        phases_completed: completed,
        total_phases: total,
        last_activity_at: project.last_activity_at,
      };
    });
  }

  async updateProjectContext(
    projectId: string,
    context: Partial<ProjectContext>
  ): Promise<void> {
    const { error } = await this.supabase
      .from('idea_projects')
      .update({
        context: context,
        last_activity_at: new Date().toISOString(),
      })
      .eq('id', projectId);

    if (error) throw error;
  }

  async archiveProject(projectId: string): Promise<void> {
    const { error } = await this.supabase
      .from('idea_projects')
      .update({
        overall_status: 'archived',
      })
      .eq('id', projectId);

    if (error) throw error;
  }

  // ============================================================================
  // Phase Management
  // ============================================================================

  async getPhase(
    projectId: string,
    phase: ProjectPhase
  ): Promise<ProjectPhaseData | null> {
    const { data, error } = await this.supabase
      .from('idea_project_phases')
      .select(`
        *,
        outputs:idea_phase_artifacts(*),
        conversations:idea_phase_conversations(
          *,
          messages:idea_conversation_messages(*)
        )
      `)
      .eq('project_id', projectId)
      .eq('phase', phase)
      .single();

    if (error) return null;
    return data;
  }

  async updatePhaseInputs(
    projectId: string,
    phase: ProjectPhase,
    inputs: Record<string, any>
  ): Promise<void> {
    const { data: existingPhase } = await this.supabase
      .from('idea_project_phases')
      .select('inputs, started_at')
      .eq('project_id', projectId)
      .eq('phase', phase)
      .single();

    const updates: any = {
      inputs: { ...existingPhase?.inputs, ...inputs },
    };

    // Mark as started if not already
    if (!existingPhase?.started_at) {
      updates.started_at = new Date().toISOString();
    }

    const { error } = await this.supabase
      .from('idea_project_phases')
      .update(updates)
      .eq('project_id', projectId)
      .eq('phase', phase);

    if (error) throw error;
  }

  async advancePhase(request: AdvancePhaseRequest): Promise<{
    success: boolean;
    nextPhase?: ProjectPhase;
    message: string;
  }> {
    // Get current project state
    const project = await this.getProject(request.project_id);
    if (!project) {
      return { success: false, message: 'Project not found' };
    }

    const currentPhaseIndex = PHASE_ORDER.indexOf(project.current_phase);
    const currentPhaseData = project.phases.find(
      (p) => p.phase === project.current_phase
    );

    if (!currentPhaseData) {
      return { success: false, message: 'Current phase not found' };
    }

    // Update current phase gate status
    await this.supabase
      .from('idea_project_phases')
      .update({
        gate_status: request.gate_decision,
        gate_notes: request.gate_notes,
        gate_decided_at: new Date().toISOString(),
        status: request.gate_decision === 'approved' ? 'completed' : 'active',
        completed_at:
          request.gate_decision === 'approved'
            ? new Date().toISOString()
            : null,
      })
      .eq('project_id', request.project_id)
      .eq('phase', project.current_phase);

    // If approved, advance to next phase
    if (request.gate_decision === 'approved') {
      const nextPhaseIndex = currentPhaseIndex + 1;

      if (nextPhaseIndex >= PHASE_ORDER.length) {
        // Project complete
        await this.supabase
          .from('idea_projects')
          .update({
            overall_status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', request.project_id);

        return {
          success: true,
          message: 'Project completed! All phases finished.',
        };
      }

      const nextPhase = PHASE_ORDER[nextPhaseIndex];

      // Unlock next phase
      await this.supabase
        .from('idea_project_phases')
        .update({
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .eq('project_id', request.project_id)
        .eq('phase', nextPhase);

      // Update project current phase
      await this.supabase
        .from('idea_projects')
        .update({
          current_phase: nextPhase,
        })
        .eq('id', request.project_id);

      return {
        success: true,
        nextPhase,
        message: `Advanced to ${nextPhase} phase`,
      };
    }

    return {
      success: true,
      message:
        request.gate_decision === 'rejected'
          ? 'Phase requires revision'
          : 'Gate decision recorded',
    };
  }

  async skipPhase(projectId: string, phase: ProjectPhase): Promise<void> {
    await this.supabase
      .from('idea_project_phases')
      .update({
        status: 'skipped',
        completed_at: new Date().toISOString(),
      })
      .eq('project_id', projectId)
      .eq('phase', phase);

    // Advance to next phase
    await this.advancePhase({
      project_id: projectId,
      gate_decision: 'approved',
      gate_notes: 'Phase skipped',
    });
  }

  // ============================================================================
  // Artifact Management
  // ============================================================================

  async createArtifact(
    projectId: string,
    phase: ProjectPhase,
    artifact: Omit<PhaseArtifact, 'id' | 'created_at' | 'updated_at' | 'revisions'>
  ): Promise<PhaseArtifact> {
    // Get phase id
    const { data: phaseData } = await this.supabase
      .from('idea_project_phases')
      .select('id')
      .eq('project_id', projectId)
      .eq('phase', phase)
      .single();

    if (!phaseData) {
      throw new Error('Phase not found');
    }

    const { data, error } = await this.supabase
      .from('idea_phase_artifacts')
      .insert({
        phase_id: phaseData.id,
        project_id: projectId,
        output_id: artifact.output_id,
        name: artifact.name,
        content: artifact.content,
        format: artifact.format,
        version: 1,
        generated_by: artifact.generated_by,
        ai_model: artifact.ai_model,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateArtifact(
    artifactId: string,
    content: string,
    revisedBy: 'user' | 'ai',
    changeSummary?: string
  ): Promise<PhaseArtifact> {
    // Get current artifact
    const { data: current } = await this.supabase
      .from('idea_phase_artifacts')
      .select('*')
      .eq('id', artifactId)
      .single();

    if (!current) {
      throw new Error('Artifact not found');
    }

    // Create revision of old content
    await this.supabase.from('idea_artifact_revisions').insert({
      artifact_id: artifactId,
      version: current.version,
      content: current.content,
      change_summary: changeSummary,
      revised_by: revisedBy,
    });

    // Update artifact with new content
    const { data, error } = await this.supabase
      .from('idea_phase_artifacts')
      .update({
        content,
        version: current.version + 1,
        generated_by: revisedBy === 'ai' ? 'hybrid' : 'user',
      })
      .eq('id', artifactId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getArtifact(artifactId: string): Promise<PhaseArtifact | null> {
    const { data, error } = await this.supabase
      .from('idea_phase_artifacts')
      .select(`
        *,
        revisions:idea_artifact_revisions(*)
      `)
      .eq('id', artifactId)
      .single();

    if (error) return null;
    return data;
  }

  // ============================================================================
  // AI Generation
  // ============================================================================

  async generateArtifact(
    request: GenerateArtifactRequest,
    userId?: string
  ): Promise<PhaseArtifact> {
    if (!this.aiClient) {
      throw new Error('AI client not configured');
    }

    // Get project and template
    const project = await this.getProject(request.project_id);
    if (!project) {
      throw new Error('Project not found');
    }

    const template = await this.getTemplate(project.template_id);
    if (!template) {
      throw new Error('Template not found');
    }

    // Find the phase template and output definition
    const phaseTemplate = template.phases.find(
      (p: any) => p.phase === request.phase
    );
    if (!phaseTemplate) {
      throw new Error('Phase template not found');
    }

    const outputDef = phaseTemplate.expected_outputs?.find(
      (o: any) => o.id === request.output_id
    );
    if (!outputDef) {
      throw new Error('Output definition not found');
    }

    // Get phase data for context
    const phaseData = project.phases.find((p) => p.phase === request.phase);

    // Build prompt
    const prompt = this.buildGenerationPrompt(
      project,
      phaseData,
      outputDef,
      request.additional_context
    );

    // Call AI
    const response = await this.aiClient.chat({
      model: 'claude-sonnet-4-20250514',
      messages: [
        {
          role: 'system',
          content: `You are an expert project assistant helping to create structured project artifacts.
Generate the requested artifact in ${outputDef.format} format. Be thorough but concise.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      thinking: {
        type: 'enabled',
        budget_tokens: 5000,
      },
    });

    const generatedContent = response.content[0].text;

    // Create the artifact
    const artifact = await this.createArtifact(request.project_id, request.phase, {
      output_id: request.output_id,
      name: outputDef.name,
      content: generatedContent,
      format: outputDef.format,
      version: 1,
      generated_by: 'ai',
      ai_model: 'claude-sonnet-4-20250514',
    });

    return artifact;
  }

  private buildGenerationPrompt(
    project: IdeaToLaunchProject,
    phaseData: ProjectPhaseData | undefined,
    outputDef: any,
    additionalContext?: string
  ): string {
    let prompt = `# Project: ${project.name}\n\n`;

    if (project.description) {
      prompt += `## Description\n${project.description}\n\n`;
    }

    // Add project context
    if (project.context) {
      prompt += `## Context\n`;
      if (project.context.problem_statement) {
        prompt += `- Problem: ${project.context.problem_statement}\n`;
      }
      if (project.context.target_audience) {
        prompt += `- Target Audience: ${project.context.target_audience}\n`;
      }
      if (project.context.tech_stack?.length) {
        prompt += `- Tech Stack: ${project.context.tech_stack.join(', ')}\n`;
      }
      prompt += '\n';
    }

    // Add phase inputs
    if (phaseData?.inputs) {
      prompt += `## Phase Inputs\n`;
      for (const [key, value] of Object.entries(phaseData.inputs)) {
        if (value) {
          prompt += `- ${key}: ${value}\n`;
        }
      }
      prompt += '\n';
    }

    // Add previous artifacts for context
    if (phaseData?.outputs?.length) {
      prompt += `## Previous Artifacts in This Phase\n`;
      for (const artifact of phaseData.outputs) {
        prompt += `### ${artifact.name}\n${artifact.content}\n\n`;
      }
    }

    // Add key decisions
    if (project.decisions?.length) {
      prompt += `## Key Decisions Made\n`;
      for (const decision of project.decisions.filter((d) => d.selected_option)) {
        prompt += `- ${decision.question}: ${decision.selected_option}\n`;
      }
      prompt += '\n';
    }

    // Request
    prompt += `## Task\n`;
    prompt += `Generate the "${outputDef.name}" artifact.\n`;
    prompt += `Description: ${outputDef.description || 'No description provided'}\n`;
    prompt += `Format: ${outputDef.format}\n`;

    if (additionalContext) {
      prompt += `\n## Additional Context\n${additionalContext}\n`;
    }

    return prompt;
  }

  // ============================================================================
  // Conversation Management
  // ============================================================================

  async createConversation(
    projectId: string,
    phase: ProjectPhase,
    topic: string,
    promptId?: string
  ): Promise<PhaseConversation> {
    // Get phase id
    const { data: phaseData } = await this.supabase
      .from('idea_project_phases')
      .select('id')
      .eq('project_id', projectId)
      .eq('phase', phase)
      .single();

    if (!phaseData) {
      throw new Error('Phase not found');
    }

    const { data, error } = await this.supabase
      .from('idea_phase_conversations')
      .insert({
        phase_id: phaseData.id,
        project_id: projectId,
        prompt_id: promptId,
        topic,
      })
      .select()
      .single();

    if (error) throw error;
    return { ...data, messages: [] };
  }

  async addMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    options?: {
      thinking?: string;
      tokens_used?: number;
      model_used?: string;
    }
  ): Promise<void> {
    const { error } = await this.supabase
      .from('idea_conversation_messages')
      .insert({
        conversation_id: conversationId,
        role,
        content,
        thinking: options?.thinking,
        tokens_used: options?.tokens_used || 0,
        model_used: options?.model_used,
      });

    if (error) throw error;

    // Update message count
    await this.supabase.rpc('increment_conversation_messages', {
      conv_id: conversationId,
    });
  }

  async getConversation(conversationId: string): Promise<PhaseConversation | null> {
    const { data, error } = await this.supabase
      .from('idea_phase_conversations')
      .select(`
        *,
        messages:idea_conversation_messages(*)
      `)
      .eq('id', conversationId)
      .single();

    if (error) return null;
    return data;
  }

  // ============================================================================
  // Decision Management
  // ============================================================================

  async addDecision(
    projectId: string,
    phase: ProjectPhase,
    decision: Omit<ProjectDecision, 'id' | 'created_at'>
  ): Promise<ProjectDecision> {
    const { data, error } = await this.supabase
      .from('idea_project_decisions')
      .insert({
        project_id: projectId,
        phase,
        decision_type: decision.decision_type,
        question: decision.question,
        options: decision.options,
        selected_option: decision.selected_option,
        rationale: decision.rationale,
        decided_at: decision.decided_at,
        decided_by: decision.decided_by,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateDecision(
    decisionId: string,
    selectedOption: string,
    rationale?: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('idea_project_decisions')
      .update({
        selected_option: selectedOption,
        rationale,
        decided_at: new Date().toISOString(),
        decided_by: 'user',
      })
      .eq('id', decisionId);

    if (error) throw error;
  }

  // ============================================================================
  // AI-Assisted Decision Making
  // ============================================================================

  async suggestDecision(
    projectId: string,
    decisionId: string
  ): Promise<{
    suggested_option: string;
    rationale: string;
  }> {
    if (!this.aiClient) {
      throw new Error('AI client not configured');
    }

    // Get project and decision
    const project = await this.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }

    const decision = project.decisions.find((d) => d.id === decisionId);
    if (!decision) {
      throw new Error('Decision not found');
    }

    // Build context
    let prompt = `# Project: ${project.name}\n\n`;
    prompt += `## Context\n${JSON.stringify(project.context, null, 2)}\n\n`;
    prompt += `## Decision Required\n`;
    prompt += `Question: ${decision.question}\n\n`;
    prompt += `## Options\n`;
    for (const option of decision.options) {
      prompt += `### ${option.name}\n`;
      prompt += `${option.description}\n`;
      if (option.pros?.length) {
        prompt += `Pros: ${option.pros.join(', ')}\n`;
      }
      if (option.cons?.length) {
        prompt += `Cons: ${option.cons.join(', ')}\n`;
      }
      prompt += '\n';
    }
    prompt += `\nBased on the project context, which option would you recommend and why?`;

    const response = await this.aiClient.chat({
      model: 'claude-sonnet-4-20250514',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert consultant helping make project decisions. Provide clear recommendations with reasoning.',
        },
        { role: 'user', content: prompt },
      ],
    });

    // Parse response to extract suggestion
    const responseText = response.content[0].text;

    // Simple extraction - in production, use structured output
    const suggested = decision.options[0]?.id; // Default to first option

    return {
      suggested_option: suggested,
      rationale: responseText,
    };
  }

  // ============================================================================
  // Search and Analytics
  // ============================================================================

  async searchArtifacts(
    userId: string,
    query: string,
    options?: {
      project_id?: string;
      phase?: ProjectPhase;
      limit?: number;
    }
  ): Promise<PhaseArtifact[]> {
    // For now, simple text search. In production, use vector search
    let searchQuery = this.supabase
      .from('idea_phase_artifacts')
      .select(`
        *,
        project:idea_projects!inner(user_id, name)
      `)
      .eq('project.user_id', userId)
      .ilike('content', `%${query}%`);

    if (options?.project_id) {
      searchQuery = searchQuery.eq('project_id', options.project_id);
    }

    if (options?.limit) {
      searchQuery = searchQuery.limit(options.limit);
    }

    const { data, error } = await searchQuery;

    if (error) throw error;
    return data || [];
  }

  async getProjectStats(userId: string): Promise<{
    total_projects: number;
    active_projects: number;
    completed_projects: number;
    artifacts_created: number;
    decisions_made: number;
    by_type: Record<ProjectType, number>;
  }> {
    const { data: projects } = await this.supabase
      .from('idea_projects')
      .select('id, overall_status, project_type')
      .eq('user_id', userId);

    const { data: artifacts } = await this.supabase
      .from('idea_phase_artifacts')
      .select('id, project_id')
      .in(
        'project_id',
        projects?.map((p: any) => p.id) || []
      );

    const { data: decisions } = await this.supabase
      .from('idea_project_decisions')
      .select('id, project_id')
      .in(
        'project_id',
        projects?.map((p: any) => p.id) || []
      )
      .not('selected_option', 'is', null);

    const byType: Record<string, number> = {};
    for (const project of projects || []) {
      byType[project.project_type] = (byType[project.project_type] || 0) + 1;
    }

    return {
      total_projects: projects?.length || 0,
      active_projects:
        projects?.filter((p: any) => p.overall_status === 'active').length || 0,
      completed_projects:
        projects?.filter((p: any) => p.overall_status === 'completed').length ||
        0,
      artifacts_created: artifacts?.length || 0,
      decisions_made: decisions?.length || 0,
      by_type: byType as Record<ProjectType, number>,
    };
  }
}

export default IdeaToLaunchService;
