import { createHash } from "node:crypto"
import { jsonResponse } from "@/lib/telemetry"
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export function GET(request: Request) {
  const started = performance.now()
  const raw = new URL(request.url).searchParams.get("iterations") ?? "1000"
  const iterations = Number(raw)
  if (!/^\d+$/.test(raw) || !Number.isInteger(iterations) || iterations < 1 || iterations > 20000) {
    return jsonResponse("/api/work", { error: "iterations deve ser um inteiro entre 1 e 20000" }, 400, started)
  }
  let digest = "devops-lab"
  for (let i = 0; i < iterations; i++) digest = createHash("sha256").update(digest).digest("hex")
  return jsonResponse("/api/work", { iterations, digest, durationMs: Math.round((performance.now() - started) * 100) / 100 }, 200, started)
}
