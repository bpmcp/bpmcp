import Fastify from "fastify";
import { loadEnv } from "./env.js";
import { loadConfig } from "./config.js";
import { allow } from "./rate.js";
import { callUpstream } from "./proxy.js";

const env = loadEnv();
let config = loadConfig(env.PROVIDERS_FILE);

const app = Fastify({ logger: true });

function refreshConfig() {
  try {
    config = loadConfig(env.PROVIDERS_FILE);
  } catch (error) {
    app.log.error(error, "failed to reload provider config");
  }
}

function requireAuth(header?: string) {
  const token = (header || "").replace(/^Bearer\s+/i, "").trim();
  if (!token || token !== env.API_KEY) {
    const err: any = new Error("unauthorized");
    err.statusCode = 401;
    throw err;
  }
  return token;
}

function classify(tool: string): "read" | "write" {
  if (tool.startsWith("catalog.") || tool === "process.topology" || tool === "agents.describe" || tool.startsWith("policy.")) {
    return "read";
  }
  return "write";
}

function resolveTarget(tool: string, mcpServer?: string) {
  if (tool.startsWith("catalog.") || tool === "process.topology" || tool === "agents.describe") {
    return { baseUrl: config.catalog.base_url };
  }
  if (tool.startsWith("policy.")) {
    return { baseUrl: config.policy.base_url };
  }
  const provider = tool.split(".")[0];
  const serverKey = mcpServer || "default";
  const baseUrl = config.providers?.[provider]?.servers?.[serverKey]?.base_url;
  if (!baseUrl) {
    const err: any = new Error(`unknown_provider_or_server: ${provider}/${serverKey}`);
    err.statusCode = 400;
    throw err;
  }
  return { baseUrl };
}

app.get("/healthz", async () => ({ ok: true, updated: Date.now() }));

app.post("/mcp", async (request, reply) => {
  try {
    const key = requireAuth(request.headers["authorization"] as string | undefined);
    const body = (request.body as any) ?? {};
    const { tool, input, mcp_server: mcpServer } = body;
    if (!tool) {
      throw Object.assign(new Error("missing_tool"), { statusCode: 400 });
    }

    refreshConfig();

    const klass = classify(tool);
    const limit = klass === "read" ? env.RATE_READ_RPM : env.RATE_WRITE_RPM;
    if (!allow(key, klass, limit)) {
      reply.status(429);
      return { error: { code: "rate_limited", message: "Rate limit exceeded" } };
    }

    const target = resolveTarget(tool, mcpServer);
    const upstream = await callUpstream(
      { baseUrl: target.baseUrl, timeoutMs: env.UPSTREAM_TIMEOUT_MS, apiKey: env.API_KEY },
      tool,
      input
    );

    if ((upstream as any)?.error) {
      reply.status(400);
      return upstream;
    }

    return {
      content: (upstream as any)?.content ?? [{ type: "json", json: upstream }]
    };
  } catch (error: any) {
    request.log.error(error);
    reply.status(error.statusCode || 400);
    return { error: { code: error.code || "bad_request", message: error.message } };
  }
});

app.listen({ port: env.PORT, host: "0.0.0.0" }).then(() => {
  app.log.info(`dev-gateway-mcp listening on :${env.PORT}`);
});
