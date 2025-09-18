import { readFileSync } from "node:fs";
import yaml from "yaml";

export type ProviderConfig = {
  catalog: { base_url: string; auth?: "passthrough" };
  policy: { base_url: string; auth?: "passthrough" };
  providers: Record<string, { servers: Record<string, { base_url: string; auth?: "passthrough" }> }>;
};

export function loadConfig(path: string): ProviderConfig {
  const file = readFileSync(path, "utf8");
  const parsed = yaml.parse(file) as ProviderConfig;
  return parsed;
}
