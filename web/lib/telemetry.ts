import { randomUUID } from "node:crypto"

export function runtimeInfo() {
  return {
    environment: process.env.APP_ENVIRONMENT || "local",
    revision: process.env.APP_REVISION || "development",
    instance: process.env.CONTAINER_APP_REPLICA_NAME || "local",
    uptimeSeconds: Math.floor(process.uptime()),
    node: process.version,
  }
}

export function jsonResponse(path: string, payload: Record<string, unknown>, status = 200, started = performance.now()) {
  const requestId = randomUUID()
  const durationMs = Math.round((performance.now() - started) * 100) / 100
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), level: status >= 400 ? "warn" : "info", path, status, requestId, durationMs, revision: process.env.APP_REVISION || "development" }))
  return Response.json({ ...payload, requestId }, {
    status,
    headers: { "Cache-Control": "no-store", "X-Request-ID": requestId, "Server-Timing": `app;dur=${durationMs}` },
  })
}
