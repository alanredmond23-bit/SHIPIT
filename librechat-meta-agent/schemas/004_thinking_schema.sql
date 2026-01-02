-- Extended Thinking Engine Schema
-- Superior reasoning system with visual thought trees, confidence scoring,
-- self-critique loops, and parallel exploration

-- ============================================================================
-- Thinking Sessions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS thinking_sessions (
  id UUID PRIMARY KEY,
  user_id UUID,
  project_id TEXT NOT NULL,
  query TEXT NOT NULL,
  root_node_id UUID NOT NULL,
  current_node_id UUID NOT NULL,
  config JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('thinking', 'paused', 'completed', 'error')),
  stats JSONB NOT NULL,
  final_conclusion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ============================================================================
-- Thought Nodes Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS thought_nodes (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES thinking_sessions(id) ON DELETE CASCADE,
  parent_id UUID,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'observation',
    'hypothesis',
    'analysis',
    'critique',
    'conclusion',
    'question',
    'evidence',
    'alternative',
    'synthesis'
  )),
  confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  depth INTEGER NOT NULL CHECK (depth >= 0),
  children JSONB NOT NULL DEFAULT '[]',
  metadata JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('exploring', 'completed', 'abandoned', 'bookmarked', 'revised')),
  reasoning TEXT,
  alternatives JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  FOREIGN KEY (parent_id) REFERENCES thought_nodes(id) ON DELETE SET NULL
);

-- ============================================================================
-- Reasoning Templates Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS thinking_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  steps JSONB NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Bookmarked Thoughts Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS bookmarked_thoughts (
  id UUID PRIMARY KEY,
  user_id UUID,
  session_id UUID NOT NULL REFERENCES thinking_sessions(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES thought_nodes(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Thinking Sessions Indexes
CREATE INDEX IF NOT EXISTS idx_thinking_sessions_user_id ON thinking_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_thinking_sessions_project_id ON thinking_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_thinking_sessions_status ON thinking_sessions(status);
CREATE INDEX IF NOT EXISTS idx_thinking_sessions_created_at ON thinking_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_thinking_sessions_user_project ON thinking_sessions(user_id, project_id);

-- Thought Nodes Indexes
CREATE INDEX IF NOT EXISTS idx_thought_nodes_session_id ON thought_nodes(session_id);
CREATE INDEX IF NOT EXISTS idx_thought_nodes_parent_id ON thought_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_thought_nodes_type ON thought_nodes(type);
CREATE INDEX IF NOT EXISTS idx_thought_nodes_status ON thought_nodes(status);
CREATE INDEX IF NOT EXISTS idx_thought_nodes_confidence ON thought_nodes(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_thought_nodes_depth ON thought_nodes(depth);
CREATE INDEX IF NOT EXISTS idx_thought_nodes_session_depth ON thought_nodes(session_id, depth);

-- Bookmarked Thoughts Indexes
CREATE INDEX IF NOT EXISTS idx_bookmarked_thoughts_user_id ON bookmarked_thoughts(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarked_thoughts_session_id ON bookmarked_thoughts(session_id);
CREATE INDEX IF NOT EXISTS idx_bookmarked_thoughts_node_id ON bookmarked_thoughts(node_id);

-- Templates Indexes
CREATE INDEX IF NOT EXISTS idx_thinking_templates_category ON thinking_templates(category);

-- ============================================================================
-- Useful Functions
-- ============================================================================

-- Function to get all nodes in a thinking path
CREATE OR REPLACE FUNCTION get_thinking_path(p_node_id UUID)
RETURNS TABLE (
  id UUID,
  parent_id UUID,
  content TEXT,
  type TEXT,
  confidence INTEGER,
  depth INTEGER,
  status TEXT,
  reasoning TEXT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE path AS (
    -- Start with the specified node
    SELECT
      n.id,
      n.parent_id,
      n.content,
      n.type,
      n.confidence,
      n.depth,
      n.status,
      n.reasoning,
      n.created_at
    FROM thought_nodes n
    WHERE n.id = p_node_id

    UNION ALL

    -- Recursively get parent nodes
    SELECT
      n.id,
      n.parent_id,
      n.content,
      n.type,
      n.confidence,
      n.depth,
      n.status,
      n.reasoning,
      n.created_at
    FROM thought_nodes n
    INNER JOIN path p ON n.id = p.parent_id
  )
  SELECT * FROM path ORDER BY depth ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get all descendants of a node
CREATE OR REPLACE FUNCTION get_thinking_subtree(p_node_id UUID)
RETURNS TABLE (
  id UUID,
  parent_id UUID,
  content TEXT,
  type TEXT,
  confidence INTEGER,
  depth INTEGER,
  status TEXT,
  children JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE subtree AS (
    -- Start with the specified node
    SELECT
      n.id,
      n.parent_id,
      n.content,
      n.type,
      n.confidence,
      n.depth,
      n.status,
      n.children,
      n.created_at
    FROM thought_nodes n
    WHERE n.id = p_node_id

    UNION ALL

    -- Recursively get child nodes
    SELECT
      n.id,
      n.parent_id,
      n.content,
      n.type,
      n.confidence,
      n.depth,
      n.status,
      n.children,
      n.created_at
    FROM thought_nodes n
    INNER JOIN subtree s ON n.parent_id = s.id
  )
  SELECT * FROM subtree ORDER BY depth ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate session statistics
CREATE OR REPLACE FUNCTION calculate_session_stats(p_session_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT jsonb_build_object(
    'totalNodes', COUNT(*),
    'maxDepth', MAX(depth),
    'avgConfidence', ROUND(AVG(confidence), 2),
    'nodesByType', (
      SELECT jsonb_object_agg(type, count)
      FROM (
        SELECT type, COUNT(*) as count
        FROM thought_nodes
        WHERE session_id = p_session_id
        GROUP BY type
      ) type_counts
    ),
    'nodesByStatus', (
      SELECT jsonb_object_agg(status, count)
      FROM (
        SELECT status, COUNT(*) as count
        FROM thought_nodes
        WHERE session_id = p_session_id
        GROUP BY status
      ) status_counts
    ),
    'highConfidenceNodes', (
      SELECT COUNT(*)
      FROM thought_nodes
      WHERE session_id = p_session_id AND confidence >= 80
    ),
    'lowConfidenceNodes', (
      SELECT COUNT(*)
      FROM thought_nodes
      WHERE session_id = p_session_id AND confidence < 60
    ),
    'bookmarkedNodes', (
      SELECT COUNT(*)
      FROM thought_nodes
      WHERE session_id = p_session_id AND status = 'bookmarked'
    )
  ) INTO v_stats
  FROM thought_nodes
  WHERE session_id = p_session_id;

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql;

-- Function to find high-confidence branches
CREATE OR REPLACE FUNCTION find_high_confidence_branches(
  p_session_id UUID,
  p_min_confidence INTEGER DEFAULT 80,
  p_min_depth INTEGER DEFAULT 3
)
RETURNS TABLE (
  node_id UUID,
  path_text TEXT,
  avg_confidence NUMERIC,
  max_depth INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE branches AS (
    -- Start with root nodes
    SELECT
      n.id,
      n.parent_id,
      n.confidence,
      n.depth,
      n.content,
      ARRAY[n.id] as path
    FROM thought_nodes n
    WHERE n.session_id = p_session_id AND n.parent_id IS NULL

    UNION ALL

    -- Recursively build branches
    SELECT
      n.id,
      n.parent_id,
      n.confidence,
      n.depth,
      n.content,
      b.path || n.id
    FROM thought_nodes n
    INNER JOIN branches b ON n.parent_id = b.id
    WHERE n.session_id = p_session_id
  ),
  branch_stats AS (
    SELECT
      path[1] as root_id,
      MAX(depth) as max_depth,
      AVG(confidence) as avg_confidence
    FROM branches
    GROUP BY path[1]
    HAVING MAX(depth) >= p_min_depth AND AVG(confidence) >= p_min_confidence
  )
  SELECT
    bs.root_id as node_id,
    n.content as path_text,
    bs.avg_confidence,
    bs.max_depth
  FROM branch_stats bs
  JOIN thought_nodes n ON n.id = bs.root_id
  ORDER BY bs.avg_confidence DESC, bs.max_depth DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to update session updated_at timestamp
CREATE OR REPLACE FUNCTION update_thinking_session_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE thinking_sessions
  SET updated_at = NOW()
  WHERE id = NEW.session_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update session timestamp when nodes change
CREATE TRIGGER trigger_update_session_on_node_change
  AFTER INSERT OR UPDATE ON thought_nodes
  FOR EACH ROW
  EXECUTE FUNCTION update_thinking_session_timestamp();

-- ============================================================================
-- Seed Data: Pre-built Reasoning Templates
-- ============================================================================

INSERT INTO thinking_templates (id, name, description, steps, category, created_at, updated_at)
VALUES
  (
    'problem-solving',
    'Problem Solving',
    'Systematic approach to breaking down and solving complex problems',
    '[
      {"order": 1, "type": "observation", "prompt": "What is the core problem? Break it down into its fundamental components.", "minConfidence": 70},
      {"order": 2, "type": "analysis", "prompt": "What are the constraints, requirements, and boundaries of this problem?", "minConfidence": 65},
      {"order": 3, "type": "hypothesis", "prompt": "What are possible solution approaches? Generate at least 3 different strategies.", "minConfidence": 60},
      {"order": 4, "type": "analysis", "prompt": "Evaluate each solution approach against the constraints. What are the pros and cons?", "minConfidence": 70},
      {"order": 5, "type": "critique", "prompt": "What are the weaknesses in each approach? What could go wrong?", "minConfidence": 65},
      {"order": 6, "type": "conclusion", "prompt": "Select the best approach and explain why. What is the implementation plan?", "minConfidence": 75}
    ]'::jsonb,
    'general',
    NOW(),
    NOW()
  ),
  (
    'code-review',
    'Code Review',
    'Comprehensive code analysis for bugs, security, and performance',
    '[
      {"order": 1, "type": "observation", "prompt": "Understand the code: What is its purpose? What does it do?", "minConfidence": 80},
      {"order": 2, "type": "analysis", "prompt": "Find potential bugs: Logic errors, edge cases, null checks, type safety.", "minConfidence": 70},
      {"order": 3, "type": "analysis", "prompt": "Security check: Input validation, SQL injection, XSS, authentication, authorization.", "minConfidence": 75},
      {"order": 4, "type": "analysis", "prompt": "Performance analysis: Time complexity, space complexity, bottlenecks, optimizations.", "minConfidence": 65},
      {"order": 5, "type": "critique", "prompt": "Code quality: Readability, maintainability, best practices, design patterns.", "minConfidence": 70},
      {"order": 6, "type": "conclusion", "prompt": "Prioritized list of improvements with specific code suggestions.", "minConfidence": 75}
    ]'::jsonb,
    'development',
    NOW(),
    NOW()
  ),
  (
    'research',
    'Research Analysis',
    'Structured approach to research questions and hypothesis testing',
    '[
      {"order": 1, "type": "question", "prompt": "What is the research question? What are we trying to discover?", "minConfidence": 75},
      {"order": 2, "type": "hypothesis", "prompt": "Generate hypotheses: What are the possible answers or explanations?", "minConfidence": 65},
      {"order": 3, "type": "evidence", "prompt": "Gather evidence: What data, facts, or information supports or refutes each hypothesis?", "minConfidence": 70},
      {"order": 4, "type": "analysis", "prompt": "Analyze the evidence: What patterns emerge? What contradictions exist?", "minConfidence": 70},
      {"order": 5, "type": "critique", "prompt": "Challenge the analysis: What biases might exist? What alternative interpretations?", "minConfidence": 65},
      {"order": 6, "type": "conclusion", "prompt": "Draw conclusions: What can we confidently say? What remains uncertain?", "minConfidence": 75}
    ]'::jsonb,
    'analysis',
    NOW(),
    NOW()
  ),
  (
    'creative',
    'Creative Ideation',
    'Divergent thinking for generating novel ideas and solutions',
    '[
      {"order": 1, "type": "observation", "prompt": "What is the creative challenge or opportunity?", "minConfidence": 70},
      {"order": 2, "type": "hypothesis", "prompt": "Brainstorm wildly: Generate as many ideas as possible without judgment.", "minConfidence": 50},
      {"order": 3, "type": "synthesis", "prompt": "Combine ideas: Can we merge concepts to create something new?", "minConfidence": 60},
      {"order": 4, "type": "analysis", "prompt": "Refine the ideas: Make them more concrete and actionable.", "minConfidence": 65},
      {"order": 5, "type": "critique", "prompt": "Evaluate novelty: How original is each idea? Has it been done before?", "minConfidence": 70},
      {"order": 6, "type": "conclusion", "prompt": "Select the most promising ideas and create an execution plan.", "minConfidence": 75}
    ]'::jsonb,
    'creative',
    NOW(),
    NOW()
  ),
  (
    'debugging',
    'Systematic Debugging',
    'Methodical approach to finding and fixing bugs',
    '[
      {"order": 1, "type": "observation", "prompt": "Reproduce the bug: What are the exact steps? What is the expected vs actual behavior?", "minConfidence": 80},
      {"order": 2, "type": "analysis", "prompt": "Isolate the problem: What component or function is responsible?", "minConfidence": 70},
      {"order": 3, "type": "hypothesis", "prompt": "Hypothesize the root cause: What could be causing this behavior?", "minConfidence": 65},
      {"order": 4, "type": "evidence", "prompt": "Test the hypothesis: Add logging, breakpoints, or tests to verify.", "minConfidence": 75},
      {"order": 5, "type": "conclusion", "prompt": "Implement the fix: Write the corrected code.", "minConfidence": 80},
      {"order": 6, "type": "critique", "prompt": "Verify the fix: Test thoroughly. Could this fix cause other issues?", "minConfidence": 85}
    ]'::jsonb,
    'development',
    NOW(),
    NOW()
  ),
  (
    'decision-making',
    'Decision Analysis',
    'Structured framework for making complex decisions',
    '[
      {"order": 1, "type": "observation", "prompt": "Define the decision: What needs to be decided? What are the stakes?", "minConfidence": 75},
      {"order": 2, "type": "analysis", "prompt": "Define criteria: What factors matter most? How should we weight them?", "minConfidence": 70},
      {"order": 3, "type": "hypothesis", "prompt": "List all options: What are the possible choices?", "minConfidence": 65},
      {"order": 4, "type": "analysis", "prompt": "Score each option against the criteria. Create a decision matrix.", "minConfidence": 70},
      {"order": 5, "type": "critique", "prompt": "Sensitivity analysis: How would the decision change if our assumptions change?", "minConfidence": 65},
      {"order": 6, "type": "conclusion", "prompt": "Make the decision and explain the reasoning behind it.", "minConfidence": 75}
    ]'::jsonb,
    'analysis',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE thinking_sessions IS 'Extended thinking sessions with visual thought trees';
COMMENT ON TABLE thought_nodes IS 'Individual thought nodes in the reasoning tree';
COMMENT ON TABLE thinking_templates IS 'Pre-built reasoning templates for common tasks';
COMMENT ON TABLE bookmarked_thoughts IS 'User-bookmarked thought branches';

COMMENT ON COLUMN thinking_sessions.config IS 'Thinking configuration (maxTokens, maxDepth, style, etc.)';
COMMENT ON COLUMN thinking_sessions.stats IS 'Session statistics (tokens, duration, branches, confidence)';
COMMENT ON COLUMN thinking_sessions.status IS 'Session status: thinking, paused, completed, error';

COMMENT ON COLUMN thought_nodes.type IS 'Type of thought: observation, hypothesis, analysis, critique, conclusion, question, evidence, alternative, synthesis';
COMMENT ON COLUMN thought_nodes.confidence IS 'Confidence level 0-100';
COMMENT ON COLUMN thought_nodes.depth IS 'Depth in the tree (0 = root)';
COMMENT ON COLUMN thought_nodes.children IS 'Array of child node IDs';
COMMENT ON COLUMN thought_nodes.alternatives IS 'Array of alternative branch node IDs';
COMMENT ON COLUMN thought_nodes.status IS 'Node status: exploring, completed, abandoned, bookmarked, revised';

COMMENT ON FUNCTION get_thinking_path(UUID) IS 'Get all nodes from root to specified node';
COMMENT ON FUNCTION get_thinking_subtree(UUID) IS 'Get all descendant nodes of a specified node';
COMMENT ON FUNCTION calculate_session_stats(UUID) IS 'Calculate comprehensive statistics for a thinking session';
COMMENT ON FUNCTION find_high_confidence_branches(UUID, INTEGER, INTEGER) IS 'Find thought branches with high average confidence and sufficient depth';
