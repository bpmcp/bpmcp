import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

async function readJSON<T>(filePath: string): Promise<T> {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as T;
}

async function readDirJSON<T>(dir: string): Promise<T[]> {
  try {
    const files = await readdir(dir);
    const targets = files.filter((f) => f.endsWith(".json"));
    const payload: T[] = [];
    for (const file of targets) {
      payload.push(await readJSON<T>(path.join(dir, file)));
    }
    return payload;
  } catch (error: any) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function readOptionalJSON<T>(filePath: string): Promise<T | null> {
  try {
    return await readJSON<T>(filePath);
  } catch (error: any) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

async function main(): Promise<void> {
  const bundleDir = process.argv[2];
  if (!bundleDir) {
    throw new Error("Usage: tsx scripts/load_seeds.ts <bundleDir>");
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  const pool = new pg.Pool({ connectionString: dbUrl });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO domains (id, title)
       VALUES ($1, $2)
       ON CONFLICT (id) DO NOTHING`,
      ["p2p", "Procure to Pay"]
    );

    const process = await readJSON<any>(path.join(bundleDir, "process.json"));
    await client.query(
      `INSERT INTO processes (id, domain_id, title, description, version, meta)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, version = EXCLUDED.version, meta = EXCLUDED.meta, updated_at = now()`,
      [
        process.id,
        process.domain_id,
        process.title,
        process.description ?? null,
        process.version ?? "1.0.0",
        process.meta ?? {}
      ]
    );

    const phases = await readDirJSON<any>(path.join(bundleDir, "phases"));
    for (const phase of phases) {
      await client.query(
        `INSERT INTO phases (id, process_id, seq, title)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (id) DO UPDATE SET seq = EXCLUDED.seq, title = EXCLUDED.title`,
        [phase.id, phase.process_id, phase.seq, phase.title]
      );
    }

    const flows = await readDirJSON<any>(path.join(bundleDir, "flows"));
    for (const flow of flows) {
      await client.query(
        `INSERT INTO flows (id, process_id, from_phase_id, to_phase_id)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (id) DO UPDATE SET from_phase_id = EXCLUDED.from_phase_id, to_phase_id = EXCLUDED.to_phase_id`,
        [flow.id, flow.process_id, flow.from_phase_id, flow.to_phase_id]
      );
    }

    const atoms = await readDirJSON<any>(path.join(bundleDir, "atoms"));
    for (const atom of atoms) {
    await client.query(
      `INSERT INTO atoms (id, title, type, platform, source_url, source_rev, prereq, notes, steps, meta)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, type = EXCLUDED.type, platform = EXCLUDED.platform, notes = EXCLUDED.notes, steps = EXCLUDED.steps, meta = EXCLUDED.meta, updated_at = now()`,
      [
        atom.id,
        atom.title,
        atom.type,
        atom.platform,
        atom.source_url ?? null,
        atom.source_rev ?? null,
        atom.prereq ?? null,
        atom.notes ?? [],
        atom.steps ?? [],
        atom.meta ?? {}
      ]
    );
    }

    const atomLinks = await readDirJSON<any>(path.join(bundleDir, "atom_links"));
    for (const link of atomLinks) {
      await client.query(
        `DELETE FROM atom_links
         WHERE atom_id = $1 AND process_id = $2
           AND COALESCE(phase_id, '') = COALESCE($3, '')
           AND COALESCE(flow_id, '') = COALESCE($4, '')`,
        [link.atom_id, link.process_id, link.phase_id ?? null, link.flow_id ?? null]
      );
      await client.query(
        `INSERT INTO atom_links (atom_id, process_id, phase_id, flow_id)
         VALUES ($1,$2,$3,$4)`,
        [link.atom_id, link.process_id, link.phase_id ?? null, link.flow_id ?? null]
      );
    }

    const bindings = await readDirJSON<any>(path.join(bundleDir, "bindings"));
    for (const binding of bindings) {
      await client.query(
        `INSERT INTO bindings (atom_id, process_id, provider, jurisdiction, mcp_server, tool_map, preconditions, version)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (atom_id, process_id, provider, jurisdiction)
         DO UPDATE SET tool_map = EXCLUDED.tool_map, preconditions = EXCLUDED.preconditions, version = EXCLUDED.version`,
        [
          binding.atom_id,
          binding.process_id,
          binding.provider,
          binding.jurisdiction,
          binding.mcp_server,
          binding.tool_map ?? {},
          binding.preconditions ?? [],
          binding.version ?? "1.0.0"
        ]
      );
    }

    const agents = await readDirJSON<any>(path.join(bundleDir, "agents"));
    for (const agent of agents) {
      await client.query(
        `INSERT INTO agents (id, process_id, version, description, capabilities, dependencies, meta)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description, capabilities = EXCLUDED.capabilities, dependencies = EXCLUDED.dependencies, meta = EXCLUDED.meta`,
        [
          agent.id,
          agent.process_id,
          agent.version ?? "1.0.0",
          agent.description ?? null,
          agent.capabilities ?? [],
          agent.dependencies ?? [],
          agent.meta ?? {}
        ]
      );
    }

    const policyDir = path.resolve(path.join(bundleDir, "..", "policy"));
    const perDiemRates = (await readOptionalJSON<any[]>(path.join(policyDir, "per_diem_rates.json"))) ?? [];
    for (const rate of perDiemRates) {
      await client.query(
        `INSERT INTO policy_per_diem_rates (destination, role, currency, amount, valid_from, valid_to)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (destination, role, valid_from)
         DO UPDATE SET currency = EXCLUDED.currency, amount = EXCLUDED.amount, valid_to = EXCLUDED.valid_to`,
        [
          rate.destination,
          rate.role ?? "default",
          rate.currency,
          rate.amount,
          rate.valid_from ?? new Date().toISOString().slice(0, 10),
          rate.valid_to ?? null
        ]
      );
    }

    const mileageRates = (await readOptionalJSON<any[]>(path.join(policyDir, "mileage_rates.json"))) ?? [];
    for (const rate of mileageRates) {
      await client.query(
        `INSERT INTO policy_mileage_rates (vehicle, currency, per_km, valid_from, valid_to)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (vehicle, valid_from)
         DO UPDATE SET currency = EXCLUDED.currency, per_km = EXCLUDED.per_km, valid_to = EXCLUDED.valid_to`,
        [
          rate.vehicle,
          rate.currency,
          rate.per_km,
          rate.valid_from ?? new Date().toISOString().slice(0, 10),
          rate.valid_to ?? null
        ]
      );
    }

    await client.query("COMMIT");
    console.log("✅ Seeds loaded");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
