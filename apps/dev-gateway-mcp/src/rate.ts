const buckets = new Map<string, { window: number; count: number }>();

function bucketKey(key: string, klass: string) {
  return `${key}:${klass}`;
}

export function allow(key: string, klass: "read" | "write", limit: number): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  const id = bucketKey(key, klass);
  const bucket = buckets.get(id);
  if (!bucket || now - bucket.window >= windowMs) {
    buckets.set(id, { window: now, count: 1 });
    return true;
  }

  if (bucket.count >= limit) {
    return false;
  }
  bucket.count += 1;
  return true;
}
