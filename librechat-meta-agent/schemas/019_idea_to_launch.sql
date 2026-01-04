-- Idea-to-Launch Framework Schema
-- Structured project workflows from ideation to deployment
-- Schema 019

-- ============================================================================
-- Project Templates
-- ============================================================================

CREATE TABLE IF NOT EXISTS idea_project_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    project_type VARCHAR(50) NOT NULL DEFAULT 'custom',
    icon VARCHAR(50) DEFAULT 'rocket',
    color VARCHAR(50) DEFAULT '#6366f1',
    -- Phase configurations stored as JSONB
    phases JSONB NOT NULL DEFAULT '[]',
    -- Default settings
    default_platform VARCHAR(100),
    suggested_stack TEXT[],
    estimated_duration VARCHAR(50),
    -- Metadata
    is_featured BOOLEAN DEFAULT false,
    is_system BOOLEAN DEFAULT false, -- System templates can't be deleted
    use_count INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Projects (Instances of Templates)
-- ============================================================================

CREATE TABLE IF NOT EXISTS idea_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    template_id UUID REFERENCES idea_project_templates(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    project_type VARCHAR(50) NOT NULL DEFAULT 'custom',
    -- Current state
    current_phase VARCHAR(50) NOT NULL DEFAULT 'discovery',
    overall_status VARCHAR(50) NOT NULL DEFAULT 'active',
    -- Context and high-level decisions
    context JSONB DEFAULT '{}',
    -- Metadata
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_phase CHECK (current_phase IN ('discovery', 'ideation', 'specification', 'planning', 'implementation', 'launch')),
    CONSTRAINT valid_status CHECK (overall_status IN ('active', 'paused', 'completed', 'archived'))
);

-- ============================================================================
-- Project Phases (Phase-specific data for each project)
-- ============================================================================

CREATE TABLE IF NOT EXISTS idea_project_phases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES idea_projects(id) ON DELETE CASCADE,
    phase VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'locked',
    -- User inputs for this phase
    inputs JSONB DEFAULT '{}',
    -- Gate status
    gate_status VARCHAR(50) DEFAULT 'pending',
    gate_notes TEXT,
    gate_decided_at TIMESTAMPTZ,
    gate_decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    -- Timing
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    time_spent_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(project_id, phase),
    CONSTRAINT valid_phase CHECK (phase IN ('discovery', 'ideation', 'specification', 'planning', 'implementation', 'launch')),
    CONSTRAINT valid_phase_status CHECK (status IN ('locked', 'active', 'completed', 'skipped')),
    CONSTRAINT valid_gate_status CHECK (gate_status IN ('approved', 'rejected', 'needs_revision', 'pending'))
);

-- ============================================================================
-- Phase Artifacts (Generated outputs for each phase)
-- ============================================================================

CREATE TABLE IF NOT EXISTS idea_phase_artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id UUID NOT NULL REFERENCES idea_project_phases(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES idea_projects(id) ON DELETE CASCADE,
    output_id VARCHAR(100), -- Reference to template output definition
    name VARCHAR(255) NOT NULL,
    content TEXT,
    format VARCHAR(50) DEFAULT 'markdown',
    version INTEGER DEFAULT 1,
    -- Generation metadata
    generated_by VARCHAR(20) DEFAULT 'user',
    ai_model VARCHAR(100),
    ai_prompt_used TEXT,
    -- Embedding for semantic search
    content_embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_generated_by CHECK (generated_by IN ('user', 'ai', 'hybrid'))
);

-- ============================================================================
-- Artifact Revisions (Version history)
-- ============================================================================

CREATE TABLE IF NOT EXISTS idea_artifact_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artifact_id UUID NOT NULL REFERENCES idea_phase_artifacts(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    content TEXT NOT NULL,
    change_summary TEXT,
    revised_by VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(artifact_id, version),
    CONSTRAINT valid_revised_by CHECK (revised_by IN ('user', 'ai'))
);

-- ============================================================================
-- Phase Conversations (AI interactions within a phase)
-- ============================================================================

CREATE TABLE IF NOT EXISTS idea_phase_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id UUID NOT NULL REFERENCES idea_project_phases(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES idea_projects(id) ON DELETE CASCADE,
    prompt_id VARCHAR(100), -- Reference to template AI prompt
    topic VARCHAR(255),
    outcome TEXT,
    message_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- Conversation Messages
-- ============================================================================

CREATE TABLE IF NOT EXISTS idea_conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES idea_phase_conversations(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    thinking TEXT, -- Extended thinking content
    tokens_used INTEGER DEFAULT 0,
    model_used VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_role CHECK (role IN ('user', 'assistant', 'system'))
);

-- ============================================================================
-- Project Decisions (Key decisions made during the project)
-- ============================================================================

CREATE TABLE IF NOT EXISTS idea_project_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES idea_projects(id) ON DELETE CASCADE,
    phase VARCHAR(50) NOT NULL,
    decision_type VARCHAR(50) NOT NULL,
    question TEXT NOT NULL,
    options JSONB DEFAULT '[]',
    selected_option VARCHAR(255),
    rationale TEXT,
    decided_at TIMESTAMPTZ,
    decided_by VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_decision_type CHECK (decision_type IN ('technical', 'business', 'design', 'scope', 'timeline')),
    CONSTRAINT valid_decided_by CHECK (decided_by IS NULL OR decided_by IN ('user', 'ai_suggested'))
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_idea_projects_user ON idea_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_idea_projects_template ON idea_projects(template_id);
CREATE INDEX IF NOT EXISTS idx_idea_projects_status ON idea_projects(overall_status);
CREATE INDEX IF NOT EXISTS idx_idea_projects_phase ON idea_projects(current_phase);
CREATE INDEX IF NOT EXISTS idx_idea_projects_last_activity ON idea_projects(last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_idea_phases_project ON idea_project_phases(project_id);
CREATE INDEX IF NOT EXISTS idx_idea_phases_status ON idea_project_phases(status);

CREATE INDEX IF NOT EXISTS idx_idea_artifacts_project ON idea_phase_artifacts(project_id);
CREATE INDEX IF NOT EXISTS idx_idea_artifacts_phase ON idea_phase_artifacts(phase_id);

CREATE INDEX IF NOT EXISTS idx_idea_conversations_project ON idea_phase_conversations(project_id);
CREATE INDEX IF NOT EXISTS idx_idea_conversations_phase ON idea_phase_conversations(phase_id);

CREATE INDEX IF NOT EXISTS idx_idea_decisions_project ON idea_project_decisions(project_id);
CREATE INDEX IF NOT EXISTS idx_idea_decisions_phase ON idea_project_decisions(phase);

-- Vector similarity search on artifacts
CREATE INDEX IF NOT EXISTS idx_idea_artifacts_embedding ON idea_phase_artifacts
    USING ivfflat (content_embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================================
-- Row Level Security
-- ============================================================================

ALTER TABLE idea_project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_phase_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_artifact_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_phase_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE idea_project_decisions ENABLE ROW LEVEL SECURITY;

-- Templates: Anyone can read, only creators can modify their own
CREATE POLICY "Templates are viewable by everyone" ON idea_project_templates
    FOR SELECT USING (true);

CREATE POLICY "Users can create templates" ON idea_project_templates
    FOR INSERT WITH CHECK (auth.uid() = created_by OR created_by IS NULL);

CREATE POLICY "Users can update their templates" ON idea_project_templates
    FOR UPDATE USING (auth.uid() = created_by AND NOT is_system);

CREATE POLICY "Users can delete their templates" ON idea_project_templates
    FOR DELETE USING (auth.uid() = created_by AND NOT is_system);

-- Projects: Users can only access their own
CREATE POLICY "Users can view their projects" ON idea_projects
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create projects" ON idea_projects
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their projects" ON idea_projects
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their projects" ON idea_projects
    FOR DELETE USING (auth.uid() = user_id);

-- Phases: Access through project ownership
CREATE POLICY "Users can access their project phases" ON idea_project_phases
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM idea_projects
            WHERE idea_projects.id = idea_project_phases.project_id
            AND idea_projects.user_id = auth.uid()
        )
    );

-- Artifacts: Access through project ownership
CREATE POLICY "Users can access their phase artifacts" ON idea_phase_artifacts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM idea_projects
            WHERE idea_projects.id = idea_phase_artifacts.project_id
            AND idea_projects.user_id = auth.uid()
        )
    );

-- Revisions: Access through artifact ownership
CREATE POLICY "Users can access their artifact revisions" ON idea_artifact_revisions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM idea_phase_artifacts a
            JOIN idea_projects p ON p.id = a.project_id
            WHERE a.id = idea_artifact_revisions.artifact_id
            AND p.user_id = auth.uid()
        )
    );

-- Conversations: Access through project ownership
CREATE POLICY "Users can access their phase conversations" ON idea_phase_conversations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM idea_projects
            WHERE idea_projects.id = idea_phase_conversations.project_id
            AND idea_projects.user_id = auth.uid()
        )
    );

-- Messages: Access through conversation ownership
CREATE POLICY "Users can access their conversation messages" ON idea_conversation_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM idea_phase_conversations c
            JOIN idea_projects p ON p.id = c.project_id
            WHERE c.id = idea_conversation_messages.conversation_id
            AND p.user_id = auth.uid()
        )
    );

-- Decisions: Access through project ownership
CREATE POLICY "Users can access their project decisions" ON idea_project_decisions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM idea_projects
            WHERE idea_projects.id = idea_project_decisions.project_id
            AND idea_projects.user_id = auth.uid()
        )
    );

-- ============================================================================
-- Triggers for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_idea_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_idea_templates_updated
    BEFORE UPDATE ON idea_project_templates
    FOR EACH ROW EXECUTE FUNCTION update_idea_timestamp();

CREATE TRIGGER trigger_idea_projects_updated
    BEFORE UPDATE ON idea_projects
    FOR EACH ROW EXECUTE FUNCTION update_idea_timestamp();

CREATE TRIGGER trigger_idea_phases_updated
    BEFORE UPDATE ON idea_project_phases
    FOR EACH ROW EXECUTE FUNCTION update_idea_timestamp();

CREATE TRIGGER trigger_idea_artifacts_updated
    BEFORE UPDATE ON idea_phase_artifacts
    FOR EACH ROW EXECUTE FUNCTION update_idea_timestamp();

CREATE TRIGGER trigger_idea_conversations_updated
    BEFORE UPDATE ON idea_phase_conversations
    FOR EACH ROW EXECUTE FUNCTION update_idea_timestamp();

-- ============================================================================
-- Function to update project last_activity_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_project_activity()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE idea_projects
    SET last_activity_at = NOW()
    WHERE id = COALESCE(NEW.project_id, OLD.project_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_phase_activity
    AFTER INSERT OR UPDATE ON idea_project_phases
    FOR EACH ROW EXECUTE FUNCTION update_project_activity();

CREATE TRIGGER trigger_artifact_activity
    AFTER INSERT OR UPDATE ON idea_phase_artifacts
    FOR EACH ROW EXECUTE FUNCTION update_project_activity();

CREATE TRIGGER trigger_conversation_activity
    AFTER INSERT OR UPDATE ON idea_phase_conversations
    FOR EACH ROW EXECUTE FUNCTION update_project_activity();

-- ============================================================================
-- Default System Templates
-- ============================================================================

INSERT INTO idea_project_templates (name, description, project_type, icon, color, is_system, is_featured, phases, default_platform, suggested_stack) VALUES
-- Product Template
(
    'New Product',
    'Launch a new product from idea to deployment',
    'product',
    'package',
    '#6366f1',
    true,
    true,
    '[
        {
            "phase": "discovery",
            "name": "Discovery",
            "description": "Identify the problem and validate the opportunity",
            "required_inputs": [
                {"id": "initial_idea", "name": "Initial Idea", "input_type": "textarea", "required": true, "ai_assisted": true},
                {"id": "target_users", "name": "Target Users", "input_type": "textarea", "required": true, "ai_assisted": true},
                {"id": "problem", "name": "Problem Statement", "input_type": "textarea", "required": true, "ai_assisted": true}
            ],
            "expected_outputs": [
                {"id": "problem_doc", "name": "Problem Statement Document", "output_type": "document", "format": "markdown"},
                {"id": "user_personas", "name": "User Personas", "output_type": "document", "format": "markdown"},
                {"id": "competitive_analysis", "name": "Competitive Analysis", "output_type": "document", "format": "markdown"}
            ],
            "gate_criteria": [
                {"id": "problem_validated", "name": "Problem Validated", "criterion_type": "checklist", "required": true},
                {"id": "users_identified", "name": "Target Users Identified", "criterion_type": "checklist", "required": true}
            ]
        },
        {
            "phase": "ideation",
            "name": "Ideation",
            "description": "Brainstorm and refine solution approaches",
            "required_inputs": [
                {"id": "solution_ideas", "name": "Solution Ideas", "input_type": "textarea", "required": true, "ai_assisted": true},
                {"id": "constraints", "name": "Constraints", "input_type": "textarea", "required": false, "ai_assisted": true}
            ],
            "expected_outputs": [
                {"id": "solution_brief", "name": "Solution Brief", "output_type": "document", "format": "markdown"},
                {"id": "feature_list", "name": "Feature List", "output_type": "checklist", "format": "markdown"}
            ],
            "gate_criteria": [
                {"id": "solution_selected", "name": "Solution Selected", "criterion_type": "checklist", "required": true}
            ]
        },
        {
            "phase": "specification",
            "name": "Specification",
            "description": "Define technical requirements and architecture",
            "required_inputs": [
                {"id": "tech_requirements", "name": "Technical Requirements", "input_type": "textarea", "required": true, "ai_assisted": true}
            ],
            "expected_outputs": [
                {"id": "spec_doc", "name": "Technical Specification", "output_type": "document", "format": "markdown"},
                {"id": "architecture", "name": "Architecture Diagram", "output_type": "diagram", "format": "mermaid"},
                {"id": "data_model", "name": "Data Model", "output_type": "document", "format": "markdown"}
            ],
            "gate_criteria": [
                {"id": "spec_complete", "name": "Specification Complete", "criterion_type": "artifact_exists", "required": true}
            ]
        },
        {
            "phase": "planning",
            "name": "Planning",
            "description": "Create implementation plan and task breakdown",
            "required_inputs": [
                {"id": "timeline", "name": "Target Timeline", "input_type": "text", "required": false},
                {"id": "team_size", "name": "Team Size", "input_type": "text", "required": false}
            ],
            "expected_outputs": [
                {"id": "plan_doc", "name": "Implementation Plan", "output_type": "document", "format": "markdown"},
                {"id": "tasks", "name": "Task Breakdown", "output_type": "checklist", "format": "markdown"},
                {"id": "milestones", "name": "Milestones", "output_type": "document", "format": "markdown"}
            ],
            "gate_criteria": [
                {"id": "plan_approved", "name": "Plan Approved", "criterion_type": "approval", "required": true}
            ]
        },
        {
            "phase": "implementation",
            "name": "Implementation",
            "description": "Build the solution",
            "required_inputs": [
                {"id": "repo_url", "name": "Repository URL", "input_type": "text", "required": false}
            ],
            "expected_outputs": [
                {"id": "codebase", "name": "Codebase", "output_type": "code", "format": "typescript"},
                {"id": "tests", "name": "Test Suite", "output_type": "code", "format": "typescript"},
                {"id": "docs", "name": "Documentation", "output_type": "document", "format": "markdown"}
            ],
            "gate_criteria": [
                {"id": "tests_passing", "name": "Tests Passing", "criterion_type": "metric", "required": true},
                {"id": "code_reviewed", "name": "Code Reviewed", "criterion_type": "checklist", "required": true}
            ]
        },
        {
            "phase": "launch",
            "name": "Launch",
            "description": "Deploy and go live",
            "required_inputs": [],
            "expected_outputs": [
                {"id": "launch_checklist", "name": "Launch Checklist", "output_type": "checklist", "format": "markdown"},
                {"id": "deployment_url", "name": "Deployment URL", "output_type": "artifact", "format": "text"},
                {"id": "handoff", "name": "Handoff Document", "output_type": "document", "format": "markdown"}
            ],
            "gate_criteria": [
                {"id": "deployed", "name": "Successfully Deployed", "criterion_type": "checklist", "required": true}
            ]
        }
    ]'::jsonb,
    'github',
    ARRAY['Next.js', 'Supabase', 'TypeScript', 'Tailwind CSS']
),

-- Marketing Campaign Template
(
    'Marketing Campaign',
    'Plan and execute a marketing campaign',
    'marketing',
    'megaphone',
    '#ec4899',
    true,
    true,
    '[
        {
            "phase": "discovery",
            "name": "Research",
            "description": "Understand the market and audience",
            "required_inputs": [
                {"id": "campaign_goal", "name": "Campaign Goal", "input_type": "textarea", "required": true, "ai_assisted": true},
                {"id": "target_audience", "name": "Target Audience", "input_type": "textarea", "required": true, "ai_assisted": true},
                {"id": "budget", "name": "Budget", "input_type": "text", "required": false}
            ],
            "expected_outputs": [
                {"id": "audience_analysis", "name": "Audience Analysis", "output_type": "document", "format": "markdown"},
                {"id": "competitor_ads", "name": "Competitor Ad Analysis", "output_type": "document", "format": "markdown"}
            ],
            "gate_criteria": [
                {"id": "audience_defined", "name": "Audience Defined", "criterion_type": "checklist", "required": true}
            ]
        },
        {
            "phase": "ideation",
            "name": "Creative Ideation",
            "description": "Develop campaign concepts and messaging",
            "required_inputs": [
                {"id": "key_messages", "name": "Key Messages", "input_type": "textarea", "required": true, "ai_assisted": true}
            ],
            "expected_outputs": [
                {"id": "campaign_concepts", "name": "Campaign Concepts", "output_type": "document", "format": "markdown"},
                {"id": "messaging_guide", "name": "Messaging Guide", "output_type": "document", "format": "markdown"}
            ],
            "gate_criteria": [
                {"id": "concept_approved", "name": "Concept Approved", "criterion_type": "approval", "required": true}
            ]
        },
        {
            "phase": "specification",
            "name": "Asset Specs",
            "description": "Define creative assets and channels",
            "required_inputs": [
                {"id": "channels", "name": "Marketing Channels", "input_type": "multi_select", "options": ["Social Media", "Email", "PPC", "Content", "PR"], "required": true}
            ],
            "expected_outputs": [
                {"id": "asset_list", "name": "Asset List", "output_type": "checklist", "format": "markdown"},
                {"id": "channel_strategy", "name": "Channel Strategy", "output_type": "document", "format": "markdown"}
            ],
            "gate_criteria": [
                {"id": "assets_defined", "name": "Assets Defined", "criterion_type": "checklist", "required": true}
            ]
        },
        {
            "phase": "planning",
            "name": "Campaign Calendar",
            "description": "Schedule and coordinate campaign activities",
            "required_inputs": [
                {"id": "launch_date", "name": "Launch Date", "input_type": "text", "required": true}
            ],
            "expected_outputs": [
                {"id": "campaign_calendar", "name": "Campaign Calendar", "output_type": "document", "format": "markdown"},
                {"id": "content_schedule", "name": "Content Schedule", "output_type": "document", "format": "markdown"}
            ],
            "gate_criteria": [
                {"id": "calendar_approved", "name": "Calendar Approved", "criterion_type": "approval", "required": true}
            ]
        },
        {
            "phase": "implementation",
            "name": "Asset Creation",
            "description": "Create and prepare all campaign assets",
            "required_inputs": [],
            "expected_outputs": [
                {"id": "creative_assets", "name": "Creative Assets", "output_type": "artifact", "format": "markdown"},
                {"id": "copy_docs", "name": "Copy Documents", "output_type": "document", "format": "markdown"}
            ],
            "gate_criteria": [
                {"id": "assets_ready", "name": "Assets Ready", "criterion_type": "checklist", "required": true}
            ]
        },
        {
            "phase": "launch",
            "name": "Go Live",
            "description": "Launch and monitor the campaign",
            "required_inputs": [],
            "expected_outputs": [
                {"id": "launch_checklist", "name": "Launch Checklist", "output_type": "checklist", "format": "markdown"},
                {"id": "tracking_setup", "name": "Tracking Setup", "output_type": "document", "format": "markdown"},
                {"id": "performance_dashboard", "name": "Performance Dashboard", "output_type": "artifact", "format": "markdown"}
            ],
            "gate_criteria": [
                {"id": "campaign_live", "name": "Campaign Live", "criterion_type": "checklist", "required": true}
            ]
        }
    ]'::jsonb,
    NULL,
    ARRAY['Google Ads', 'Meta Ads', 'Mailchimp', 'Hootsuite']
),

-- Lead Gen System Template
(
    'Lead Generation System',
    'Build an automated lead generation system',
    'lead_gen',
    'users',
    '#10b981',
    true,
    true,
    '[
        {
            "phase": "discovery",
            "name": "Lead Analysis",
            "description": "Understand ideal customer profile",
            "required_inputs": [
                {"id": "icp", "name": "Ideal Customer Profile", "input_type": "textarea", "required": true, "ai_assisted": true},
                {"id": "lead_sources", "name": "Current Lead Sources", "input_type": "textarea", "required": false},
                {"id": "conversion_goals", "name": "Conversion Goals", "input_type": "textarea", "required": true, "ai_assisted": true}
            ],
            "expected_outputs": [
                {"id": "icp_doc", "name": "ICP Document", "output_type": "document", "format": "markdown"},
                {"id": "funnel_analysis", "name": "Funnel Analysis", "output_type": "document", "format": "markdown"}
            ],
            "gate_criteria": [
                {"id": "icp_defined", "name": "ICP Defined", "criterion_type": "checklist", "required": true}
            ]
        },
        {
            "phase": "ideation",
            "name": "Strategy Design",
            "description": "Design lead gen strategy and funnels",
            "required_inputs": [
                {"id": "lead_magnets", "name": "Lead Magnet Ideas", "input_type": "textarea", "required": true, "ai_assisted": true}
            ],
            "expected_outputs": [
                {"id": "funnel_design", "name": "Funnel Design", "output_type": "diagram", "format": "mermaid"},
                {"id": "lead_magnet_spec", "name": "Lead Magnet Specs", "output_type": "document", "format": "markdown"}
            ],
            "gate_criteria": [
                {"id": "strategy_approved", "name": "Strategy Approved", "criterion_type": "approval", "required": true}
            ]
        },
        {
            "phase": "specification",
            "name": "Technical Spec",
            "description": "Define integrations and automation",
            "required_inputs": [
                {"id": "crm", "name": "CRM System", "input_type": "select", "options": ["HubSpot", "Salesforce", "Pipedrive", "Other"], "required": true}
            ],
            "expected_outputs": [
                {"id": "integration_spec", "name": "Integration Spec", "output_type": "document", "format": "markdown"},
                {"id": "automation_flows", "name": "Automation Flows", "output_type": "diagram", "format": "mermaid"}
            ],
            "gate_criteria": [
                {"id": "spec_complete", "name": "Spec Complete", "criterion_type": "artifact_exists", "required": true}
            ]
        },
        {
            "phase": "planning",
            "name": "Implementation Plan",
            "description": "Plan the build and launch",
            "required_inputs": [],
            "expected_outputs": [
                {"id": "task_list", "name": "Task List", "output_type": "checklist", "format": "markdown"},
                {"id": "timeline", "name": "Timeline", "output_type": "document", "format": "markdown"}
            ],
            "gate_criteria": [
                {"id": "plan_approved", "name": "Plan Approved", "criterion_type": "approval", "required": true}
            ]
        },
        {
            "phase": "implementation",
            "name": "Build & Connect",
            "description": "Build landing pages and set up automation",
            "required_inputs": [],
            "expected_outputs": [
                {"id": "landing_pages", "name": "Landing Pages", "output_type": "artifact", "format": "markdown"},
                {"id": "email_sequences", "name": "Email Sequences", "output_type": "document", "format": "markdown"},
                {"id": "integrations", "name": "Integration Setup", "output_type": "document", "format": "markdown"}
            ],
            "gate_criteria": [
                {"id": "system_tested", "name": "System Tested", "criterion_type": "checklist", "required": true}
            ]
        },
        {
            "phase": "launch",
            "name": "Go Live",
            "description": "Launch and optimize",
            "required_inputs": [],
            "expected_outputs": [
                {"id": "launch_checklist", "name": "Launch Checklist", "output_type": "checklist", "format": "markdown"},
                {"id": "tracking_doc", "name": "Tracking Setup", "output_type": "document", "format": "markdown"}
            ],
            "gate_criteria": [
                {"id": "system_live", "name": "System Live", "criterion_type": "checklist", "required": true}
            ]
        }
    ]'::jsonb,
    NULL,
    ARRAY['HubSpot', 'Webflow', 'Zapier', 'Mailchimp']
),

-- AI Bot Template
(
    'AI Bot / Assistant',
    'Create an AI-powered chatbot or assistant',
    'bot',
    'bot',
    '#8b5cf6',
    true,
    true,
    '[
        {
            "phase": "discovery",
            "name": "Use Case Analysis",
            "description": "Define bot purpose and capabilities",
            "required_inputs": [
                {"id": "bot_purpose", "name": "Bot Purpose", "input_type": "textarea", "required": true, "ai_assisted": true},
                {"id": "user_scenarios", "name": "User Scenarios", "input_type": "textarea", "required": true, "ai_assisted": true},
                {"id": "knowledge_sources", "name": "Knowledge Sources", "input_type": "textarea", "required": false}
            ],
            "expected_outputs": [
                {"id": "use_case_doc", "name": "Use Case Document", "output_type": "document", "format": "markdown"},
                {"id": "conversation_flows", "name": "Conversation Flows", "output_type": "diagram", "format": "mermaid"}
            ],
            "gate_criteria": [
                {"id": "use_cases_defined", "name": "Use Cases Defined", "criterion_type": "checklist", "required": true}
            ]
        },
        {
            "phase": "ideation",
            "name": "Personality & Tone",
            "description": "Design bot personality and responses",
            "required_inputs": [
                {"id": "personality", "name": "Bot Personality", "input_type": "textarea", "required": true, "ai_assisted": true}
            ],
            "expected_outputs": [
                {"id": "persona_doc", "name": "Bot Persona", "output_type": "document", "format": "markdown"},
                {"id": "sample_dialogues", "name": "Sample Dialogues", "output_type": "document", "format": "markdown"}
            ],
            "gate_criteria": [
                {"id": "persona_approved", "name": "Persona Approved", "criterion_type": "approval", "required": true}
            ]
        },
        {
            "phase": "specification",
            "name": "Technical Design",
            "description": "Define architecture and integrations",
            "required_inputs": [
                {"id": "model_choice", "name": "AI Model", "input_type": "select", "options": ["GPT-4", "Claude", "Gemini", "Custom"], "required": true},
                {"id": "integrations", "name": "Integrations Needed", "input_type": "multi_select", "options": ["Slack", "Discord", "Web Widget", "API", "WhatsApp"], "required": true}
            ],
            "expected_outputs": [
                {"id": "architecture", "name": "Architecture", "output_type": "diagram", "format": "mermaid"},
                {"id": "prompt_templates", "name": "Prompt Templates", "output_type": "document", "format": "markdown"},
                {"id": "api_spec", "name": "API Specification", "output_type": "document", "format": "markdown"}
            ],
            "gate_criteria": [
                {"id": "spec_complete", "name": "Spec Complete", "criterion_type": "artifact_exists", "required": true}
            ]
        },
        {
            "phase": "planning",
            "name": "Development Plan",
            "description": "Plan implementation phases",
            "required_inputs": [],
            "expected_outputs": [
                {"id": "dev_plan", "name": "Development Plan", "output_type": "document", "format": "markdown"},
                {"id": "test_plan", "name": "Test Plan", "output_type": "document", "format": "markdown"}
            ],
            "gate_criteria": [
                {"id": "plan_approved", "name": "Plan Approved", "criterion_type": "approval", "required": true}
            ]
        },
        {
            "phase": "implementation",
            "name": "Build & Train",
            "description": "Build bot and train on knowledge",
            "required_inputs": [],
            "expected_outputs": [
                {"id": "bot_code", "name": "Bot Code", "output_type": "code", "format": "typescript"},
                {"id": "knowledge_base", "name": "Knowledge Base", "output_type": "artifact", "format": "markdown"},
                {"id": "test_results", "name": "Test Results", "output_type": "document", "format": "markdown"}
            ],
            "gate_criteria": [
                {"id": "bot_tested", "name": "Bot Tested", "criterion_type": "checklist", "required": true}
            ]
        },
        {
            "phase": "launch",
            "name": "Deploy & Monitor",
            "description": "Deploy bot and set up monitoring",
            "required_inputs": [],
            "expected_outputs": [
                {"id": "deployment_doc", "name": "Deployment Documentation", "output_type": "document", "format": "markdown"},
                {"id": "monitoring_setup", "name": "Monitoring Setup", "output_type": "document", "format": "markdown"}
            ],
            "gate_criteria": [
                {"id": "bot_live", "name": "Bot Live", "criterion_type": "checklist", "required": true}
            ]
        }
    ]'::jsonb,
    'github',
    ARRAY['LangChain', 'OpenAI', 'Pinecone', 'Next.js']
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to initialize project phases when a project is created
CREATE OR REPLACE FUNCTION initialize_project_phases()
RETURNS TRIGGER AS $$
DECLARE
    phase_name TEXT;
    phase_order INTEGER := 0;
BEGIN
    FOR phase_name IN SELECT unnest(ARRAY['discovery', 'ideation', 'specification', 'planning', 'implementation', 'launch'])
    LOOP
        INSERT INTO idea_project_phases (project_id, phase, status)
        VALUES (
            NEW.id,
            phase_name,
            CASE WHEN phase_order = 0 THEN 'active' ELSE 'locked' END
        );
        phase_order := phase_order + 1;
    END LOOP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_initialize_phases
    AFTER INSERT ON idea_projects
    FOR EACH ROW EXECUTE FUNCTION initialize_project_phases();

-- Function to calculate project progress
CREATE OR REPLACE FUNCTION get_project_progress(project_uuid UUID)
RETURNS TABLE(
    phases_completed INTEGER,
    total_phases INTEGER,
    progress_percentage NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::INTEGER as phases_completed,
        COUNT(*)::INTEGER as total_phases,
        ROUND((COUNT(CASE WHEN status = 'completed' THEN 1 END)::NUMERIC / COUNT(*) * 100), 1) as progress_percentage
    FROM idea_project_phases
    WHERE project_id = project_uuid;
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE idea_project_templates IS 'Project templates for structured idea-to-launch workflows';
COMMENT ON TABLE idea_projects IS 'User projects following the idea-to-launch framework';
COMMENT ON TABLE idea_project_phases IS 'Phase-specific data for each project';
COMMENT ON TABLE idea_phase_artifacts IS 'Generated artifacts and documents for each phase';
COMMENT ON TABLE idea_project_decisions IS 'Key decisions made during project lifecycle';
