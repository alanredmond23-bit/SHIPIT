-- Deep Research Schema
-- Comprehensive research system with multi-source search, fact verification, and knowledge graphs

-- Research Sessions table - stores each research query
CREATE TABLE IF NOT EXISTS research_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  project_id UUID NOT NULL,
  query TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'researching' CHECK (status IN ('researching', 'analyzing', 'synthesizing', 'completed', 'failed')),

  -- Configuration
  depth TEXT NOT NULL DEFAULT 'standard' CHECK (depth IN ('quick', 'standard', 'deep', 'exhaustive')),
  max_sources INTEGER DEFAULT 20,
  include_academic BOOLEAN DEFAULT true,
  include_news BOOLEAN DEFAULT true,
  include_forums BOOLEAN DEFAULT false,
  date_range_start TIMESTAMPTZ,
  date_range_end TIMESTAMPTZ,
  required_domains TEXT[],
  excluded_domains TEXT[],
  citation_style TEXT DEFAULT 'apa' CHECK (citation_style IN ('apa', 'mla', 'chicago', 'ieee')),
  generate_report BOOLEAN DEFAULT true,
  report_format TEXT DEFAULT 'detailed' CHECK (report_format IN ('summary', 'detailed', 'academic')),

  -- Stats
  sources_searched INTEGER DEFAULT 0,
  sources_used INTEGER DEFAULT 0,
  facts_extracted INTEGER DEFAULT 0,
  contradictions_found INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  duration_ms INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Indexes
  CONSTRAINT fk_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_research_sessions_user_id ON research_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_research_sessions_project_id ON research_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_research_sessions_status ON research_sessions(status);
CREATE INDEX IF NOT EXISTS idx_research_sessions_created_at ON research_sessions(created_at DESC);

-- Research Sources table - stores each source found during research
CREATE TABLE IF NOT EXISTS research_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,

  -- Source details
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  snippet TEXT,
  author TEXT,
  publish_date TIMESTAMPTZ,

  -- Source type and provider
  source_type TEXT NOT NULL DEFAULT 'web' CHECK (source_type IN ('web', 'academic', 'news', 'forum', 'wikipedia', 'reddit', 'stackoverflow', 'arxiv')),
  provider TEXT NOT NULL, -- 'google', 'bing', 'scholar', 'arxiv', etc.

  -- Credibility scoring
  authority_score FLOAT DEFAULT 0.5 CHECK (authority_score >= 0 AND authority_score <= 1),
  recency_score FLOAT DEFAULT 0.5 CHECK (recency_score >= 0 AND recency_score <= 1),
  bias_score FLOAT DEFAULT 0.5 CHECK (bias_score >= 0 AND bias_score <= 1), -- 0 = unbiased, 1 = highly biased
  overall_credibility FLOAT DEFAULT 0.5 CHECK (overall_credibility >= 0 AND overall_credibility <= 1),

  -- Processing status
  is_processed BOOLEAN DEFAULT false,
  is_used BOOLEAN DEFAULT false,
  processing_error TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,

  CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES research_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_research_sources_session_id ON research_sources(session_id);
CREATE INDEX IF NOT EXISTS idx_research_sources_credibility ON research_sources(overall_credibility DESC);
CREATE INDEX IF NOT EXISTS idx_research_sources_is_used ON research_sources(is_used) WHERE is_used = true;

-- Research Facts table - stores extracted facts from sources
CREATE TABLE IF NOT EXISTS research_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,

  -- Fact content
  statement TEXT NOT NULL,
  context TEXT, -- Surrounding context from source

  -- Verification
  confidence FLOAT DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  verification_status TEXT DEFAULT 'unverified' CHECK (verification_status IN ('verified', 'unverified', 'contradicted', 'needs_review')),
  verification_count INTEGER DEFAULT 1, -- How many sources support this fact

  -- Metadata
  extracted_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES research_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_research_facts_session_id ON research_facts(session_id);
CREATE INDEX IF NOT EXISTS idx_research_facts_verification_status ON research_facts(verification_status);
CREATE INDEX IF NOT EXISTS idx_research_facts_confidence ON research_facts(confidence DESC);

-- Fact-Source relationship (many-to-many)
CREATE TABLE IF NOT EXISTS fact_sources (
  fact_id UUID NOT NULL,
  source_id UUID NOT NULL,

  PRIMARY KEY (fact_id, source_id),
  CONSTRAINT fk_fact FOREIGN KEY (fact_id) REFERENCES research_facts(id) ON DELETE CASCADE,
  CONSTRAINT fk_source FOREIGN KEY (source_id) REFERENCES research_sources(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fact_sources_fact_id ON fact_sources(fact_id);
CREATE INDEX IF NOT EXISTS idx_fact_sources_source_id ON fact_sources(source_id);

-- Fact Contradictions table - stores conflicting facts
CREATE TABLE IF NOT EXISTS fact_contradictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  fact_id_1 UUID NOT NULL,
  fact_id_2 UUID NOT NULL,

  explanation TEXT, -- AI-generated explanation of the contradiction
  severity TEXT DEFAULT 'minor' CHECK (severity IN ('minor', 'moderate', 'major')),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES research_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_fact_1 FOREIGN KEY (fact_id_1) REFERENCES research_facts(id) ON DELETE CASCADE,
  CONSTRAINT fk_fact_2 FOREIGN KEY (fact_id_2) REFERENCES research_facts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_fact_contradictions_session_id ON fact_contradictions(session_id);

-- Knowledge Graph Nodes table
CREATE TABLE IF NOT EXISTS knowledge_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,

  entity TEXT NOT NULL, -- The name/label of the entity
  entity_type TEXT NOT NULL CHECK (entity_type IN ('person', 'organization', 'concept', 'event', 'place', 'thing')),

  -- Properties stored as JSONB for flexibility
  properties JSONB DEFAULT '{}',

  -- Importance score for visualization
  importance FLOAT DEFAULT 0.5 CHECK (importance >= 0 AND importance <= 1),

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES research_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_session_id ON knowledge_nodes(session_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_entity_type ON knowledge_nodes(entity_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_importance ON knowledge_nodes(importance DESC);

-- Knowledge Graph Relationships table
CREATE TABLE IF NOT EXISTS knowledge_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  source_node_id UUID NOT NULL,
  target_node_id UUID NOT NULL,

  relationship_type TEXT NOT NULL, -- e.g., 'founded', 'located_in', 'caused', 'related_to'
  properties JSONB DEFAULT '{}',
  strength FLOAT DEFAULT 0.5 CHECK (strength >= 0 AND strength <= 1), -- Relationship strength

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES research_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_source_node FOREIGN KEY (source_node_id) REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  CONSTRAINT fk_target_node FOREIGN KEY (target_node_id) REFERENCES knowledge_nodes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_session_id ON knowledge_relationships(session_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_source_node ON knowledge_relationships(source_node_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_relationships_target_node ON knowledge_relationships(target_node_id);

-- Follow-up Questions table
CREATE TABLE IF NOT EXISTS research_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,

  question TEXT NOT NULL,
  rationale TEXT, -- Why this question is relevant
  priority FLOAT DEFAULT 0.5 CHECK (priority >= 0 AND priority <= 1),

  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'researched', 'skipped')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  researched_at TIMESTAMPTZ,

  CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES research_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_research_follow_ups_session_id ON research_follow_ups(session_id);
CREATE INDEX IF NOT EXISTS idx_research_follow_ups_status ON research_follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_research_follow_ups_priority ON research_follow_ups(priority DESC);

-- Research Reports table
CREATE TABLE IF NOT EXISTS research_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL UNIQUE,

  title TEXT NOT NULL,
  abstract TEXT,

  -- Report content stored as structured JSON
  sections JSONB NOT NULL DEFAULT '[]', -- Array of {title, content, citations[]}
  key_findings TEXT[],
  limitations TEXT[],
  bibliography TEXT[],

  -- Metadata
  word_count INTEGER,
  generated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES research_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_research_reports_session_id ON research_reports(session_id);

-- Research Events table - for SSE streaming progress updates
CREATE TABLE IF NOT EXISTS research_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,

  event_type TEXT NOT NULL, -- 'source_found', 'fact_extracted', 'contradiction_detected', 'status_change', etc.
  event_data JSONB NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_session FOREIGN KEY (session_id) REFERENCES research_sessions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_research_events_session_id ON research_events(session_id);
CREATE INDEX IF NOT EXISTS idx_research_events_created_at ON research_events(session_id, created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_research_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_research_session_timestamp
  BEFORE UPDATE ON research_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_research_session_timestamp();

-- Function to calculate overall credibility score
CREATE OR REPLACE FUNCTION calculate_credibility_score(
  p_authority FLOAT,
  p_recency FLOAT,
  p_bias FLOAT
)
RETURNS FLOAT AS $$
BEGIN
  -- Weighted average: authority 40%, recency 30%, low bias 30%
  RETURN (p_authority * 0.4) + (p_recency * 0.3) + ((1.0 - p_bias) * 0.3);
END;
$$ LANGUAGE plpgsql;

-- Function to get research session summary
CREATE OR REPLACE FUNCTION get_research_summary(p_session_id UUID)
RETURNS TABLE (
  session_id UUID,
  query TEXT,
  status TEXT,
  total_sources INTEGER,
  verified_facts INTEGER,
  contradictions INTEGER,
  top_sources JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    rs.id,
    rs.query,
    rs.status,
    COUNT(DISTINCT src.id)::INTEGER as total_sources,
    COUNT(DISTINCT CASE WHEN f.verification_status = 'verified' THEN f.id END)::INTEGER as verified_facts,
    COUNT(DISTINCT fc.id)::INTEGER as contradictions,
    (
      SELECT jsonb_agg(jsonb_build_object(
        'title', title,
        'url', url,
        'credibility', overall_credibility
      ))
      FROM (
        SELECT title, url, overall_credibility
        FROM research_sources
        WHERE session_id = p_session_id AND is_used = true
        ORDER BY overall_credibility DESC
        LIMIT 5
      ) top
    ) as top_sources
  FROM research_sessions rs
  LEFT JOIN research_sources src ON src.session_id = rs.id
  LEFT JOIN research_facts f ON f.session_id = rs.id
  LEFT JOIN fact_contradictions fc ON fc.session_id = rs.id
  WHERE rs.id = p_session_id
  GROUP BY rs.id;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE research_sessions IS 'Stores deep research sessions with configuration and stats';
COMMENT ON TABLE research_sources IS 'Stores sources found during research with credibility scoring';
COMMENT ON TABLE research_facts IS 'Stores extracted facts with verification status and confidence';
COMMENT ON TABLE knowledge_nodes IS 'Knowledge graph nodes representing entities';
COMMENT ON TABLE knowledge_relationships IS 'Knowledge graph edges representing relationships';
COMMENT ON TABLE research_reports IS 'Generated research reports with structured content';
