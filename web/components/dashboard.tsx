"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Activity, ArrowDownToLine, ArrowRight, Box, Check, CircleDot, Cloud, Code2, ExternalLink, GitBranch, Layers3, Loader2, Play, Radio, RefreshCw, Server, ShieldCheck, Terminal, Workflow } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type Health = { status: string; environment: string; revision: string; instance: string; uptimeSeconds: number; node: string }
type Sample = { time: string; path: string; status: number; ms: number; requestId: string }
const pipeline = [
  { title: "Commit", detail: "Código versionado", icon: GitBranch },
  { title: "Validate", detail: "Lint, tipos e smoke", icon: ShieldCheck },
  { title: "Build", detail: "Imagem multi-stage", icon: Box },
  { title: "Deploy", detail: "Container Apps", icon: Cloud },
]

export function Dashboard() {
  const [health, setHealth] = useState<Health | null>(null)
  const [samples, setSamples] = useState<Sample[]>([])
  const [error, setError] = useState("")
  const [testing, setTesting] = useState(false)
  const [checking, setChecking] = useState(false)
  const [tab, setTab] = useState("overview")
  const [completed, setCompleted] = useState(0)
  const running = useRef(false)

  const probe = useCallback(async (path: string, signal?: AbortSignal) => {
    const started = performance.now()
    let status = 0, requestId = "network-error"
    try {
      const response = await fetch(path, { cache: "no-store", signal: signal ?? AbortSignal.timeout(15000) })
      status = response.status
      const data = await response.json()
      requestId = data.requestId || "—"
      if (path === "/api/health") {
        if (!response.ok) throw new Error(`HTTP ${status}`)
        setHealth(data); setError("")
      }
    } catch (e) {
      if (signal?.aborted) return
      if (path === "/api/health") { setError(e instanceof Error ? e.message : "Falha de conexão"); setHealth(null) }
    }
    setSamples(previous => [...previous.slice(-119), { time: new Date().toISOString(), path, status, ms: Math.round(performance.now() - started), requestId }])
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const initial = setTimeout(() => void probe("/api/health", controller.signal), 0)
    const timer = setInterval(() => void probe("/api/health", controller.signal), 15000)
    return () => { controller.abort(); clearTimeout(initial); clearInterval(timer) }
  }, [probe])

  async function runTest() {
    if (running.current) return
    running.current = true; setTesting(true); setCompleted(0)
    try {
      for (let wave = 0; wave < 5; wave++) {
        await Promise.all(Array.from({ length: 4 }, () => probe("/api/work?iterations=1000")))
        setCompleted((wave + 1) * 4)
      }
    } finally { setTesting(false); running.current = false }
  }

  function exportSamples() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(samples, null, 2)], { type: "application/json" }))
    const link = document.createElement("a"); link.href = url; link.download = "devops-lab-samples.json"; link.click(); URL.revokeObjectURL(url)
  }

  const latencies = samples.map(s => s.ms).sort((a, b) => a - b)
  const p95 = latencies.length ? latencies[Math.ceil(latencies.length * .95) - 1] : null
  const success = samples.filter(s => s.status >= 200 && s.status < 400).length
  const latest = samples.at(-1)
  const chartSamples = samples.slice(-40)
  const max = Math.max(50, ...chartSamples.map(s => s.ms))

  return <div className="lab-shell">
    <aside className="lab-sidebar">
      <Link className="brand" href="/"><span className="brand-symbol"><Layers3 size={21} /></span><span>devops<span className="text-muted-foreground">/</span>lab<small>AZURE WORKSPACE</small></span></Link>
      <div className="workspace"><span className="workspace-avatar">M</span><div>Meu laboratório<small>Ambiente de aprendizado</small></div></div>
      <div className="nav-label">WORKSPACE</div>
      <nav aria-label="Navegação principal">
        {[{ id: "overview", label: "Visão geral", icon: Activity }, { id: "delivery", label: "Entrega contínua", icon: Workflow }, { id: "playbook", label: "Playbook", icon: Terminal }].map(({ id, label, icon: Icon }) => <button key={id} className={`nav-item ${tab === id ? "active" : ""}`} onClick={() => setTab(id)} aria-current={tab === id ? "page" : undefined}><Icon size={17} />{label}{tab === id && <span className="nav-dot" />}</button>)}
      </nav>
      <div className="sidebar-bottom"><ShieldCheck size={18} className="text-emerald-400" /><strong>Pequeno por design</strong><p>0–2 réplicas na infraestrutura.<br />Sem credenciais no frontend.</p><a href="https://portal.azure.com/#view/Microsoft_Azure_CostManagement/Menu/~/overview" target="_blank" rel="noreferrer">Abrir custos na Azure <ExternalLink size={12} /></a></div>
      <div className="sidebar-footer"><span className="status-dot" /> Laboratório pessoal <span className="ml-auto">v0.1</span></div>
    </aside>
    <div className="lab-main">
      <header className="topbar"><div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">Workspace</span><span className="text-muted-foreground">/</span><span>Mission control</span></div><Badge variant="outline"><CircleDot size={12} /> {health?.environment ?? "Conectando"}</Badge></header>
      <main className="lab-content">
        <div className="page-heading"><div><div className="eyebrow"><span /> INFRAESTRUTURA, SOB CONTROLE</div><h1>Mission control<span>.</span></h1><p>Do primeiro commit à próxima revisão. Observe cada etapa.</p></div><Button variant="outline" disabled={checking} onClick={async () => { setChecking(true); try { await probe("/api/health") } finally { setChecking(false) } }}><RefreshCw size={14} className={checking ? "animate-spin" : ""} /> Verificar API</Button></div>
        <div className="environment-strip"><div className="flex items-center gap-3"><span className={`status-dot ${error ? "error" : !health ? "pending" : ""}`} /><strong>{error ? "API indisponível" : health ? "API operacional" : "Aguardando resposta da API"}</strong><span className="hidden text-muted-foreground sm:inline">{error || "Verificação automática a cada 15 segundos"}</span></div><span className="font-mono text-xs text-muted-foreground">{health?.revision ?? "—"}</span></div>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList variant="line" className="mb-7"><TabsTrigger value="overview">Visão geral</TabsTrigger><TabsTrigger value="delivery">Entrega contínua</TabsTrigger><TabsTrigger value="playbook">Playbook</TabsTrigger></TabsList>
          <TabsContent value="overview">
            <div className="metrics-grid">
              {[{ label: "Latência p95", value: p95 === null ? "—" : `${p95}`, unit: "ms", caption: "Ida e volta, neste navegador", icon: Activity }, { label: "Requisições", value: `${samples.length}`, unit: "", caption: "Últimas 120 amostras da sessão", icon: Radio }, { label: "Sucesso na sessão", value: samples.length ? `${Math.round(success / samples.length * 100)}` : "—", unit: "%", caption: `${success} respostas HTTP 2xx / 3xx`, icon: ShieldCheck }, { label: "Uptime do processo", value: health ? `${Math.floor(health.uptimeSeconds / 60)}` : "—", unit: "min", caption: "Da instância que respondeu", icon: Server }].map(({ label, value, unit, caption, icon: Icon }) => <Card key={label} className="metric-card"><CardContent><div className="metric-label">{label}<Icon size={16} /></div><div className="metric-value">{value}<span>{unit}</span></div><p>{caption}</p></CardContent></Card>)}
            </div>
            <div className="overview-grid">
              <Card className="latency-card"><CardHeader><div className="section-heading"><div><CardTitle>O pulso da aplicação</CardTitle><p>Latência observada · últimas 40 requisições</p></div><Badge variant="outline" className="text-emerald-400"><span className="status-dot" /> Ao vivo</Badge></div></CardHeader><CardContent><div className="chart-caption"><span>Tempo de resposta</span><span>{max} ms</span></div><div className="latency-chart" role="img" aria-label={`Gráfico de latência: ${chartSamples.length} amostras, p95 de ${p95 ?? 0} milissegundos`}>
                <svg viewBox="0 0 700 180" preserveAspectRatio="none"><defs><linearGradient id="fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#36d5a0" stopOpacity="0.22" /><stop offset="100%" stopColor="#36d5a0" stopOpacity="0" /></linearGradient></defs>{[15, 65, 115, 165].map(y => <line key={y} x1="0" x2="700" y1={y} y2={y} stroke="#263039" strokeDasharray="4 5" />)}{chartSamples.length > 0 && <><polygon fill="url(#fill)" points={`0,180 ${chartSamples.map((s, i) => `${i * 700 / Math.max(1, chartSamples.length - 1)},${165 - s.ms / max * 150}`).join(" ")} 700,180`} /><polyline fill="none" stroke="#36d5a0" strokeWidth="2.5" vectorEffect="non-scaling-stroke" points={chartSamples.map((s, i) => `${i * 700 / Math.max(1, chartSamples.length - 1)},${165 - s.ms / max * 150}`).join(" ")} /></>}</svg>{chartSamples.length < 2 && <span className="chart-empty">Coletando amostras. Execute o teste para preencher o gráfico.</span>}</div><div className="chart-caption"><span>Início da janela</span><span>Agora</span></div><div className="chart-footer"><span className="legend-line" /> Requisições deste navegador<span className="ml-auto">{latest ? `${latest.ms} ms na última resposta` : "Sem amostras"}</span></div></CardContent></Card>
              <Card className="test-card"><CardHeader><span className="feature-icon"><Terminal size={20} /></span><CardTitle>Coloque à prova.</CardTitle><p>Envie uma pequena rajada e veja a API trabalhar em tempo real.</p></CardHeader><CardContent><div className="test-spec"><span>Requisições</span><strong>20</strong><span>Concorrência</span><strong>4</strong><span>Trabalho por requisição</span><strong>1.000 hashes</strong></div><Button className="w-full bg-emerald-400 text-slate-950 hover:bg-emerald-300" disabled={testing} onClick={runTest}>{testing ? <Loader2 className="animate-spin" /> : <Play size={14} />} {testing ? `Executando ${completed}/20` : "Executar teste"}</Button><p className="test-note" aria-live="polite">{completed === 20 && !testing ? "Teste concluído. Confira as respostas abaixo." : "Carga limitada à própria API. Sem serviços externos."}</p></CardContent></Card>
            </div>
            <Card className="requests-card"><CardHeader><div className="section-heading"><div><CardTitle>Atividade recente</CardTitle><p>Respostas reais, identificadores rastreáveis.</p></div><Button variant="ghost" size="sm" disabled={!samples.length} onClick={exportSamples}><ArrowDownToLine size={14} /> Exportar</Button></div></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>HORÁRIO</TableHead><TableHead>ENDPOINT</TableHead><TableHead>STATUS</TableHead><TableHead>LATÊNCIA</TableHead><TableHead className="hidden md:table-cell">REQUEST ID</TableHead></TableRow></TableHeader><TableBody>{samples.slice(-6).reverse().map(s => <TableRow key={s.requestId + s.time}><TableCell className="font-mono text-muted-foreground">{s.time.slice(11, 19)} UTC</TableCell><TableCell className="font-mono">{s.path.split("?")[0]}</TableCell><TableCell><span className={`http-status ${s.status === 200 ? "ok" : "fail"}`}>{s.status || "ERR"}</span></TableCell><TableCell className="font-mono">{s.ms} <span className="text-muted-foreground">ms</span></TableCell><TableCell className="hidden font-mono text-xs text-muted-foreground md:table-cell">{s.requestId.slice(0, 18)}</TableCell></TableRow>)}{!samples.length && <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Aguardando a primeira resposta da API…</TableCell></TableRow>}</TableBody></Table></CardContent></Card>
          </TabsContent>
          <TabsContent value="delivery"><Card><CardHeader><CardTitle>Uma entrega, quatro etapas.</CardTitle><p className="text-muted-foreground">Arquitetura do pipeline incluído no repositório. O estado das execuções é consultado no GitHub Actions.</p></CardHeader><CardContent><div className="pipeline-grid">{pipeline.map(({ title, detail, icon: Icon }, i) => <div className="pipeline-step" key={title}><span>0{i + 1}</span><Icon size={25} /><strong>{title}</strong><p>{detail}</p>{i < 3 && <ArrowRight className="pipeline-arrow" size={16} />}</div>)}</div><div className="delivery-details"><h3>Revisão em execução</h3><code>{health?.revision ?? "Aguardando API"}</code><p>Deploy manual pelo workflow, autenticado via OIDC. Cada imagem usa o SHA do commit. O Terraform gerencia a infraestrutura; o pipeline publica a revisão da aplicação.</p><h3>Rollback</h3><p>Execute novamente o workflow com a tag SHA de uma imagem anterior. O smoke test confirma a versão após a atualização.</p></div></CardContent></Card></TabsContent>
          <TabsContent value="playbook"><div className="playbook-grid">{[{ title: "01 / Desenvolver", icon: Code2, command: "cd web\nnpm ci\nnpm run dev", text: "Interface e API na mesma aplicação Next.js." }, { title: "02 / Validar o container", icon: Box, command: "docker compose up --build -d\nnode scripts/smoke.mjs http://localhost:3000", text: "Imagem multi-stage, usuário sem privilégios e healthcheck." }, { title: "03 / Provisionar", icon: Cloud, command: "terraform -chdir=infra init\nterraform -chdir=infra plan -out=lab.tfplan\nterraform -chdir=infra apply lab.tfplan", text: "Preencha terraform.tfvars com a assinatura correta antes de executar." }, { title: "04 / Encerrar", icon: Check, command: "terraform -chdir=infra plan -destroy -out=destroy.tfplan\nterraform -chdir=infra apply destroy.tfplan", text: "Exporte o que quiser guardar antes de remover. A tag de expiração é um lembrete, sem exclusão automática." }].map(({ title, icon: Icon, command, text }) => <Card key={title}><CardHeader><Icon size={22} className="text-emerald-400" /><CardTitle>{title}</CardTitle><p className="text-sm text-muted-foreground">{text}</p></CardHeader><CardContent><pre>{command}</pre></CardContent></Card>)}</div></TabsContent>
        </Tabs>
        <footer className="page-footer"><span><span className="status-dot" /> Feito para aprender. Preparado para evoluir.</span><span>Next.js <span> / </span> shadcn/ui <span> / </span> Azure</span></footer>
      </main>
    </div>
  </div>
}
