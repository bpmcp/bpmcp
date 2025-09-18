import pg from "pg";

export function makePool(url: string) {
  return new pg.Pool({ connectionString: url });
}
