import Fastify from "fastify";
import { loadEnv } from "./env.js";
import { makePool } from "./db.js";
import { route } from "./router.js";

const env = loadEnv();

if (env.MODE === "pg" && !env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set when MODE=pg");
}

const app = Fastify({ logger: true });
const pool = env.MODE === "pg" ? makePool(env.DATABASE_URL!) : undefined;

function requireAuth(header?: string) {
  const token = (header || "").replace(/^Bearer\s+/i, "").trim();
  if (!token || token !== env.ARFITI_API_KEY_SINGLE) {
    const err: any = new Error("unauthorized");
    err.statusCode = 401;
    throw err;
  }
}

app.get("/healthz", async () => ({ ok: true, mode: env.MODE }));

app.post("/", async (request, reply) => {
  try {
    requireAuth(request.headers["authorization"] as string | undefined);
    const response = await route(request.body, env, pool);
    return response;
  } catch (error: any) {
    request.log.error(error);
    reply.status(error.statusCode || 400);
    return { error: { code: error.code || "bad_request", message: error.message } };
  }
});

app.listen({ port: env.PORT, host: "0.0.0.0" }).then(() => {
  app.log.info(`catalog-mcp listening on :${env.PORT} (mode=${env.MODE})`);
});
