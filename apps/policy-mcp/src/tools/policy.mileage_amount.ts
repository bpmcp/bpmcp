import { z } from "zod";
import type { Env } from "../env.js";
import type pg from "pg";
import { memory } from "../memory.js";

export const inputSchema = z.object({
  km: z.number().positive(),
  vehicle: z.string().default("car"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
});

export type Input = z.infer<typeof inputSchema>;

export async function handle(input: Input, env: Env, pool?: pg.Pool) {
  if (env.MODE === "memory") {
    const rate = memory.mileageRates.find((entry) => entry.vehicle === input.vehicle);
    if (!rate) {
      throw Object.assign(new Error("rate_not_found"), { statusCode: 404 });
    }
    const total = Number((rate.per_km * input.km).toFixed(2));
    return {
      currency: rate.currency,
      per_km: rate.per_km,
      km: input.km,
      amount_total: total
    };
  }

  const client = await pool!.connect();
  try {
    const { rows } = await client.query(
      `SELECT currency, per_km
         FROM policy_mileage_rates
        WHERE vehicle = $1
          AND valid_from <= COALESCE($2::date, CURRENT_DATE)
          AND (valid_to IS NULL OR valid_to >= COALESCE($2::date, CURRENT_DATE))
        ORDER BY valid_from DESC
        LIMIT 1`,
      [input.vehicle, input.date ?? null]
    );
    if (!rows.length) {
      throw Object.assign(new Error("rate_not_found"), { statusCode: 404 });
    }
    const { currency, per_km } = rows[0];
    const rate = Number(per_km);
    const total = Number((rate * input.km).toFixed(2));
    return {
      currency,
      per_km: rate,
      km: input.km,
      amount_total: total
    };
  } finally {
    client.release();
  }
}
