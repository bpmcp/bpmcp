import { z } from "zod";
import type { Env } from "../env.js";
import type pg from "pg";
import { memory } from "../memory.js";

export const inputSchema = z.object({
  destination: z.string().min(1),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  role: z.string().default("default"),
  partial_days: z
    .object({
      first_day_pct: z.number().min(0).max(1).default(1),
      last_day_pct: z.number().min(0).max(1).default(1)
    })
    .optional()
});

export type Input = z.infer<typeof inputSchema>;

function daysBetween(start: string, end: string) {
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  const ms = e.getTime() - s.getTime();
  return Math.max(1, Math.floor(ms / 86400000) + 1);
}

export async function handle(input: Input, env: Env, pool?: pg.Pool) {
  const days = daysBetween(input.start_date, input.end_date);
  const firstPct = input.partial_days?.first_day_pct ?? 1;
  const lastPct = input.partial_days?.last_day_pct ?? 1;

  if (env.MODE === "memory") {
    const match = memory.perDiemRates.find(
      (rate) =>
        rate.destination.toLowerCase() === input.destination.toLowerCase() &&
        rate.role === input.role
    );
    if (!match) {
      throw Object.assign(new Error("rate_not_found"), { statusCode: 404 });
    }
    const daily = match.amount;
    const amount =
      days === 1
        ? daily * Math.max(firstPct, lastPct)
        : daily * (firstPct + Math.max(days - 2, 0) + (days > 1 ? lastPct : 0));

    return {
      destination: input.destination,
      role: input.role,
      currency: match.currency,
      days,
      daily_amount: daily,
      amount_total: Number(amount.toFixed(2)),
      breakdown: {
        first_day: Number((daily * firstPct).toFixed(2)),
        middle_days: days > 2 ? Number((daily * (days - 2)).toFixed(2)) : 0,
        last_day: days > 1 ? Number((daily * lastPct).toFixed(2)) : 0
      }
    };
  }

  const client = await pool!.connect();
  try {
    const { rows } = await client.query(
      `SELECT currency, amount
         FROM policy_per_diem_rates
        WHERE destination = $1 AND role = $2
          AND valid_from <= $3::date
          AND (valid_to IS NULL OR valid_to >= $4::date)
        ORDER BY valid_from DESC
        LIMIT 1`,
      [input.destination, input.role, input.start_date, input.end_date]
    );
    if (!rows.length) {
      throw Object.assign(new Error("rate_not_found"), { statusCode: 404 });
    }
    const { currency, amount } = rows[0];
    const daily = Number(amount);
    const total =
      days === 1
        ? daily * Math.max(firstPct, lastPct)
        : daily * (firstPct + Math.max(days - 2, 0) + (days > 1 ? lastPct : 0));

    return {
      destination: input.destination,
      role: input.role,
      currency,
      days,
      daily_amount: daily,
      amount_total: Number(total.toFixed(2)),
      breakdown: {
        first_day: Number((daily * firstPct).toFixed(2)),
        middle_days: days > 2 ? Number((daily * (days - 2)).toFixed(2)) : 0,
        last_day: days > 1 ? Number((daily * lastPct).toFixed(2)) : 0
      }
    };
  } finally {
    client.release();
  }
}
