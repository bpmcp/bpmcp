-- BPMCP reference schema (Postgres)

-- 1) Core taxonomy
CREATE TABLE IF NOT EXISTS domains (
  id text PRIMARY KEY,
  title text NOT NULL
);

CREATE TABLE IF NOT EXISTS processes (
  id text PRIMARY KEY,
  domain_id text NOT NULL REFERENCES domains(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text,
  version text NOT NULL DEFAULT '1.0.0',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS phases (
  id text PRIMARY KEY,
  process_id text NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
  seq int NOT NULL,
  title text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS phases_process_seq_uk ON phases(process_id, seq);

CREATE TABLE IF NOT EXISTS flows (
  id text PRIMARY KEY,
  process_id text NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
  from_phase_id text NOT NULL REFERENCES phases(id) ON DELETE CASCADE,
  to_phase_id text NOT NULL REFERENCES phases(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS flows_process_idx ON flows(process_id);

-- 2) Provider-agnostic atoms (snippets)
CREATE TABLE IF NOT EXISTS atoms (
  id text PRIMARY KEY,
  title text NOT NULL,
  type text NOT NULL CHECK (type IN ('procedure','reference','concept')),
  platform text NOT NULL CHECK (platform IN ('Mobile','Web','API','Mixed')),
  source_url text,
  source_rev text,
  prereq text,
  notes jsonb NOT NULL DEFAULT '[]'::jsonb,
  steps jsonb NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS atom_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atom_id text NOT NULL REFERENCES atoms(id) ON DELETE CASCADE,
  process_id text NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
  phase_id text REFERENCES phases(id) ON DELETE CASCADE,
  flow_id text REFERENCES flows(id) ON DELETE CASCADE,
  CONSTRAINT atom_links_phase_or_flow_chk
    CHECK ((phase_id IS NOT NULL AND flow_id IS NULL) OR (phase_id IS NULL AND flow_id IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS atom_links_phase_unique ON atom_links(atom_id, process_id, phase_id) WHERE phase_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS atom_links_flow_unique ON atom_links(atom_id, process_id, flow_id) WHERE flow_id IS NOT NULL;

-- 3) Provider bindings (map provider-neutral atom → actual MCP tool names)
CREATE TABLE IF NOT EXISTS bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  atom_id text NOT NULL REFERENCES atoms(id) ON DELETE CASCADE,
  process_id text NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
  provider text NOT NULL,
  jurisdiction text NOT NULL,
  mcp_server text NOT NULL,
  tool_map jsonb NOT NULL,
  preconditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_to timestamptz,
  version text NOT NULL DEFAULT '1.0.0'
);
CREATE INDEX IF NOT EXISTS bindings_lookup_idx ON bindings(process_id, provider, jurisdiction);
CREATE INDEX IF NOT EXISTS bindings_atom_idx ON bindings(atom_id);
CREATE UNIQUE INDEX IF NOT EXISTS bindings_unique ON bindings(atom_id, process_id, provider, jurisdiction);

-- 4) MCP tools registry (schemas only)
CREATE TABLE IF NOT EXISTS mcp_tools (
  id text PRIMARY KEY,
  provider text NOT NULL,
  name text NOT NULL,
  description text,
  input_schema jsonb NOT NULL,
  output_schema jsonb NOT NULL,
  version text NOT NULL DEFAULT '1.0.0',
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- 5) Optional: packaged agents per process
CREATE TABLE IF NOT EXISTS agents (
  id text PRIMARY KEY,
  process_id text NOT NULL REFERENCES processes(id) ON DELETE CASCADE,
  version text NOT NULL DEFAULT '1.0.0',
  description text,
  capabilities jsonb NOT NULL,
  dependencies jsonb NOT NULL DEFAULT '[]'::jsonb,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);

-- 6) Policy reference tables (used by policy-mcp in PG mode)
CREATE TABLE IF NOT EXISTS policy_per_diem_rates (
  destination text NOT NULL,
  role text NOT NULL DEFAULT 'default',
  currency text NOT NULL,
  amount numeric(12,2) NOT NULL,
  valid_from date NOT NULL DEFAULT CURRENT_DATE,
  valid_to date,
  PRIMARY KEY (destination, role, valid_from)
);

CREATE TABLE IF NOT EXISTS policy_mileage_rates (
  vehicle text NOT NULL,
  currency text NOT NULL,
  per_km numeric(12,4) NOT NULL,
  valid_from date NOT NULL DEFAULT CURRENT_DATE,
  valid_to date,
  PRIMARY KEY (vehicle, valid_from)
);

-- 6) Search helpers (FTS)
ALTER TABLE atoms ADD COLUMN IF NOT EXISTS fts tsvector;
CREATE INDEX IF NOT EXISTS atoms_fts_idx ON atoms USING GIN (fts);

CREATE OR REPLACE FUNCTION atoms_fts_update() RETURNS trigger AS $$
BEGIN
  NEW.fts :=
    setweight(to_tsvector('simple', coalesce(NEW.title,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(ARRAY_TO_STRING(ARRAY(
      SELECT elem->>'text' FROM jsonb_array_elements(coalesce(NEW.steps,'[]'::jsonb)) AS elem
    ), ' '),'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(ARRAY_TO_STRING(ARRAY(
      SELECT elem::text FROM jsonb_array_elements_text(coalesce(NEW.notes,'[]'::jsonb)) AS elem
    ), ' '),'')), 'C');
  RETURN NEW;
END$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS atoms_fts_trg ON atoms;
CREATE TRIGGER atoms_fts_trg BEFORE INSERT OR UPDATE ON atoms
FOR EACH ROW EXECUTE FUNCTION atoms_fts_update();

-- Optional pgvector support (commented for OSS default)
-- CREATE EXTENSION IF NOT EXISTS vector;
-- ALTER TABLE atoms ADD COLUMN IF NOT EXISTS embedding vector(1536);
-- CREATE INDEX IF NOT EXISTS atoms_embedding_idx ON atoms USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
