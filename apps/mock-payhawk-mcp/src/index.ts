import Fastify from "fastify";
import { z } from "zod";

const app = Fastify({ logger: true });
const PORT = Number(process.env.PORT || 4010);
const API_KEY = process.env.ARFITI_API_KEY_SINGLE || "arf_live_dev";

function requireAuth(header?: string) {
  const token = (header || "").replace(/^Bearer\s+/i, "").trim();
  if (!token || token !== API_KEY) {
    const err: any = new Error("unauthorized");
    err.statusCode = 401;
    throw err;
  }
}

function ok(json: any) {
  return { content: [{ type: "json", json }] };
}

app.get("/healthz", async () => ({ ok: true }));

app.post("/", async (request, reply) => {
  try {
    requireAuth(request.headers["authorization"] as string | undefined);
    const body = request.body as any;
    const tool = body?.tool;
    const input = body?.input ?? {};

    switch (tool) {
      case "payhawk.attach_document":
      case "brex.attach_receipt": {
        const schema = z.object({ expense_id: z.string(), file_id: z.string() });
        const { expense_id, file_id } = schema.parse(input);
        return ok({ document_id: `doc_${file_id}`, expense_id, status: "attached" });
      }
      case "payhawk.extract_fields":
      case "brex.extract_fields": {
        const schema = z.object({ file_id: z.string() });
        const { file_id } = schema.parse(input);
        return ok({ file_id, fields: { destination: "Germany", start_date: "2025-10-02", end_date: "2025-10-04" } });
      }
      case "payhawk.set_per_diem_dates":
      case "brex.set_per_diem_dates": {
        const schema = z.object({ per_diem_id: z.string(), destination: z.string(), start_date: z.string(), end_date: z.string() });
        const { per_diem_id, destination, start_date, end_date } = schema.parse(input);
        return ok({ per_diem_id, destination, start_date, end_date, status: "updated" });
      }
      case "payhawk.submit_for_approval":
      case "brex.submit_for_approval": {
        const schema = z.object({ per_diem_id: z.string() });
        const { per_diem_id } = schema.parse(input);
        return ok({ per_diem_id, status: "submitted", approver: "manager_123" });
      }
      case "payhawk.post_per_diem":
      case "brex.post_per_diem": {
        const schema = z.object({ per_diem_id: z.string(), gl_account: z.string().optional() });
        const { per_diem_id, gl_account } = schema.parse(input);
        return ok({ per_diem_id, journal_entry_id: `je_${per_diem_id}`, gl_account: gl_account ?? "6200", status: "posted" });
      }
      case "payhawk.pay_reimbursement":
      case "brex.pay_reimbursement": {
        const schema = z.object({ per_diem_id: z.string(), method: z.enum(["sepa", "wire", "manual"]).default("sepa") });
        const { per_diem_id, method } = schema.parse(input);
        return ok({ per_diem_id, payment_id: `pay_${per_diem_id}`, method, status: "paid" });
      }
      default: {
        reply.status(400);
        return { error: { code: "unknown_tool", message: `No such tool ${tool}` } };
      }
    }
  } catch (error: any) {
    request.log.error(error);
    reply.status(error.statusCode || 400);
    return { error: { code: error.code || "bad_request", message: error.message } };
  }
});

app.listen({ port: PORT, host: "0.0.0.0" }).then(() => {
  app.log.info(`mock-payhawk-mcp on :${PORT}`);
});
