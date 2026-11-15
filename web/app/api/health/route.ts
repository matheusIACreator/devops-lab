import { jsonResponse, runtimeInfo } from "@/lib/telemetry"
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export function GET() {
  return jsonResponse("/api/health", { status: "ok", timestamp: new Date().toISOString(), ...runtimeInfo() })
}
