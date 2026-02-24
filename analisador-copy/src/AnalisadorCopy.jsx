/**
 * ============================================================
 * ANALISADOR DE COPY COM IA — v2.3 (N8N ONLY) — ENVELOPE FIX + UI SAFE
 * ============================================================
 *
 * ✅ Puxa 100% do n8n via webhook (sem modo direto).
 * ✅ Corrige AbortError (timeout) com:
 *    - Timeout maior
 *    - Retry automático quando for AbortError
 *    - fetchWithTimeout centralizado
 *
 * ✅ FIX CRÍTICO (SEU CASO):
 * - n8n pode responder como: [ { output: "```json ...```" } ]
 * - Faz unwrap desse envelope e parseia o JSON interno
 * - Se "analise" vier inválida, ainda renderiza a aba "Variações N8N"
 *   (antes quebrava e não mostrava nada)
 *
 * ============================================================
 */

import { useState } from "react";

// ============================================================
// ⚙️ CONFIGURAÇÃO DO BACKEND — EDITE AQUI
// ============================================================
const N8N_WEBHOOK_URL = "https://webhook.merendinhafeliz.com.br/webhook/analisador-copy";

// Token simples anti-flood (configure o mesmo valor no n8n)
const N8N_WEBHOOK_TOKEN = "SEU_TOKEN_FORTE_AQUI";

// ✅ Timeout maior para IA + n8n
const N8N_TIMEOUT_MS = 120000; // 120s

// ✅ Quantas tentativas se der timeout (AbortError)
const N8N_MAX_RETRIES = 2;

// ============================================================
// ESTILOS GLOBAIS (✅ RESPONSIVO MOBILE/TABLET/DESKTOP)
// ============================================================
const styles = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap');

* { margin: 0; padding: 0; box-sizing: border-box; }

:root {
  --bg: #0a0a0f;
  --surface: #111118;
  --border: #1e1e2e;
  --accent: #ff4d00;
  --accent2: #ff8c42;
  --text: #f0ede8;
  --muted: #6b6882;
  --green: #00ff87;
  --yellow: #ffd700;
  --red: #ff3d57;
  --purple: #b06aff;
}

html, body { height: 100%; }
body { font-family: 'Syne', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }

img, svg { max-width: 100%; height: auto; }
button, input, select, textarea { font: inherit; }
button { -webkit-tap-highlight-color: transparent; }

.grain {
  position: fixed; inset: 0; pointer-events: none; z-index: 100; opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
}

/* ✅ container adaptativo (mobile safe + desktop confortável) */
.container {
  width: min(960px, 100%);
  margin: 0 auto;
  padding: clamp(18px, 3.5vw, 48px) clamp(14px, 3vw, 24px);
}

/* ✅ CENTRALIZA HEADER */
.header{
  margin-bottom: clamp(28px, 5vw, 56px);
  text-align:center;
  display:flex;
  flex-direction:column;
  align-items:center;
}

.badge {
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(255,77,0,0.1); border: 1px solid rgba(255,77,0,0.3);
  color: var(--accent2); font-family: 'DM Mono', monospace;
  font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase;
  padding: 6px 12px; border-radius: 4px; margin-bottom: 18px;
}
.badge-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); animation: pulse 2s infinite; }
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }

h1 {
  font-size: clamp(30px, 6vw, 64px);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.03em;
  text-wrap: balance;
}
h1 span { background: linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

.subtitle {
  margin-top: 14px;
  color: var(--muted);
  font-size: clamp(14px, 2.2vw, 16px);
  max-width: 520px;
  line-height: 1.65;
  text-align:center;
  margin-left:auto;
  margin-right:auto;
  text-wrap: pretty;
}

/* ── TOGGLE DE FORMATO ── */
.format-label { font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin-bottom: 10px; }
.format-toggle { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 22px; }
.format-btn {
  display: flex; flex-direction: column; gap: 6px;
  padding: 16px 18px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  min-height: 72px; /* ✅ touch-friendly */
}
.format-btn:hover { border-color: rgba(255,77,0,0.3); }
.format-btn.active { border-color: var(--accent); background: rgba(255,77,0,0.06); }
.format-btn-top { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: var(--text); }
.format-btn.active .format-btn-top { color: var(--accent2); }
.format-btn-desc { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.5; }

/* ── INPUT ── */
.input-section { margin-bottom: 22px; }
.input-label {
  display: flex; align-items: center; justify-content: space-between;
  gap: 10px; flex-wrap: wrap;
  margin-bottom: 10px;
  font-family: 'DM Mono', monospace; font-size: 11px;
  letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted);
}
.char-count { color: var(--accent2); }

textarea {
  width: 100%;
  min-height: clamp(170px, 26vh, 260px);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 18px;
  color: var(--text);
  font-family: 'DM Mono', monospace;
  font-size: 14px;
  line-height: 1.7;
  resize: vertical;
  outline: none;
  transition: border-color 0.2s;
}
textarea:focus { border-color: rgba(255,77,0,0.4); }
textarea::placeholder { color: var(--muted); }

/* ── CONFIG ROW ── */
.config-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 16px;
  margin-bottom: 22px;
}

.config-field label {
  display: block;
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--muted);
  margin-bottom: 8px;
}

.config-field select {
  width: 100%;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 12px 14px;
  color: var(--text);
  font-family: 'Syne', sans-serif;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
  appearance: none;
  cursor: pointer;
  min-height: 44px; /* ✅ touch-friendly */
}
.config-field select:focus { border-color: rgba(255,77,0,0.4); }

/* ── BOTÃO ── */
.btn {
  width: 100%;
  padding: 18px;
  background: var(--accent);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-family: 'Syne', sans-serif;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 52px; /* ✅ */
}
.btn:hover:not(:disabled) { background: #ff6620; transform: translateY(-1px); box-shadow: 0 8px 32px rgba(255,77,0,0.3); }
.btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.loading-bar { position: absolute; bottom: 0; left: 0; height: 3px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent); animation: loading 1.5s infinite; }
@keyframes loading { 0%{left:-60%;width:60%} 100%{left:100%;width:60%} }

/* ── ABAS DE RESULTADO ── */
.results { margin-top: 44px; animation: fadeUp 0.5s ease; }
@keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }

/* ✅ tabs responsivas (wrap no mobile) */
.tabs-bar {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 6px;
  margin-bottom: 22px;
}

.tab-btn {
  flex: 1 1 240px; /* ✅ quebra em 2 linhas no mobile */
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 12px 14px;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  font-family: 'Syne', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
  background: transparent;
  transition: all 0.2s;
  position: relative;
  min-height: 44px;
}
.tab-btn:hover { color: var(--text); }
.tab-btn.active { background: var(--bg); color: var(--text); box-shadow: 0 1px 8px rgba(0,0,0,0.4); }
.tab-btn.active.tab-analise { color: var(--accent2); }
.tab-btn.active.tab-n8n { color: var(--purple); }

.tab-badge {
  display: inline-flex; align-items: center; justify-content: center;
  min-width: 20px; height: 20px; padding: 0 6px;
  border-radius: 10px; font-family: 'DM Mono', monospace; font-size: 10px; font-weight: 600;
  white-space: nowrap;
}
.tab-analise .tab-badge { background: rgba(255,77,0,0.15); color: var(--accent2); }
.tab-n8n .tab-badge { background: rgba(176,106,255,0.15); color: var(--purple); }
.tab-badge.pending { background: rgba(107,104,130,0.2); color: var(--muted); }

/* ── SCORE HERO ── */
.score-hero {
  display: flex;
  align-items: center;
  gap: 24px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: clamp(18px, 3vw, 32px);
  margin-bottom: 18px;
  position: relative;
  overflow: hidden;
}
.score-hero::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background: linear-gradient(90deg, var(--accent), var(--accent2)); }
.score-circle { width: 100px; height: 100px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 3px solid; flex-shrink: 0; }
.score-number { font-size: 32px; font-weight: 800; line-height: 1; }
.score-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 2px; }

.score-info { min-width: 0; }
.score-info h2 { font-size: clamp(18px, 2.8vw, 22px); font-weight: 700; margin-bottom: 8px; }
.score-info p { color: var(--muted); font-size: 14px; line-height: 1.6; }

.tags-row { display: flex; gap: 8px; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }
.verdict-tag { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 4px; font-family: 'DM Mono', monospace; font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.1em; }
.format-tag { padding: 4px 10px; border-radius: 4px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); text-transform: uppercase; }

/* ── CARDS DE MÉTRICAS ── */
.cards-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 22px; }
.card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.card-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
.card-title { font-size: 13px; font-weight: 600; }
.card-score { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); }
.mini-bar { height: 4px; background: var(--border); border-radius: 2px; margin-bottom: 16px; overflow: hidden; }
.mini-bar-fill { height: 100%; border-radius: 2px; transition: width 0.6s ease; }
.card-text { font-size: 13px; color: var(--muted); line-height: 1.6; }
.card-full { grid-column: 1 / -1; }

.tags-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.tag { padding: 4px 10px; border-radius: 20px; font-family: 'DM Mono', monospace; font-size: 11px; background: rgba(255,77,0,0.1); border: 1px solid rgba(255,77,0,0.2); color: var(--accent2); }
.tag.bad { background: rgba(255,61,87,0.08); border-color: rgba(255,61,87,0.2); color: var(--red); }

.suggestion-box { margin-top: 12px; padding: 10px 14px; border-radius: 8px; }
.rewrite-card { background: rgba(255,77,0,0.05) !important; border-color: rgba(255,77,0,0.2) !important; }
.rewrite-text { font-family: 'DM Mono', monospace; font-size: 14px; color: #ff8c42; line-height: 1.6; }

.list-items { list-style: none; display: flex; flex-direction: column; gap: 10px; }
.list-item { display: flex; gap: 10px; align-items: flex-start; font-size: 13px; color: var(--muted); line-height: 1.5; }
.list-item-icon { flex-shrink: 0; margin-top: 1px; }

/* ── ABA N8N: VARIAÇÕES ── */
.variacao-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 14px;
  overflow: hidden;
  margin-bottom: 16px;
  transition: border-color 0.2s;
}
.variacao-card:hover { border-color: rgba(176,106,255,0.3); }

.variacao-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--border);
  background: rgba(176,106,255,0.04);
  flex-wrap: wrap; /* ✅ quebra no mobile */
}

.variacao-titulo {
  display: flex; align-items: center; gap: 10px;
  font-size: 14px; font-weight: 600; color: var(--purple);
  min-width: 0;
}

.variacao-num {
  width: 24px; height: 24px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(176,106,255,0.15);
  font-family: 'DM Mono', monospace; font-size: 11px; color: var(--purple);
  flex-shrink: 0;
}

.copy-variacao-btn {
  background: rgba(176,106,255,0.1); border: 1px solid rgba(176,106,255,0.2);
  color: var(--purple); padding: 8px 12px; border-radius: 8px;
  font-family: 'DM Mono', monospace; font-size: 11px;
  cursor: pointer; transition: all 0.2s;
  min-height: 38px;
}
.copy-variacao-btn:hover { background: rgba(176,106,255,0.2); }

.variacao-body { padding: 18px; }

.variacao-copy {
  background: rgba(176,106,255,0.04);
  border: 1px solid rgba(176,106,255,0.12);
  border-left: 3px solid var(--purple);
  border-radius: 8px;
  padding: 14px 14px;
  font-family: 'DM Mono', monospace;
  font-size: 13px; color: var(--text); line-height: 1.8;
  margin-bottom: 14px;
  white-space: pre-wrap;
  overflow-wrap: anywhere; /* ✅ não estoura */
}

.variacao-justificativa {
  font-size: 13px; color: var(--muted); line-height: 1.6;
}
.variacao-justificativa strong { color: var(--purple); font-weight: 600; font-size: 11px; font-family: 'DM Mono', monospace; text-transform: uppercase; letter-spacing: 0.05em; }

.n8n-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: clamp(36px, 6vw, 64px) clamp(18px, 4vw, 32px);
  text-align: center;
  border: 1px dashed var(--border);
  border-radius: 16px;
}
.n8n-empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.5; }
.n8n-empty-title { font-size: 16px; font-weight: 600; color: var(--muted); margin-bottom: 8px; }
.n8n-empty-desc { font-size: 13px; color: var(--muted); opacity: 0.6; max-width: 420px; line-height: 1.6; }

.n8n-analise-extra {
  background: var(--surface);
  border: 1px solid rgba(176,106,255,0.2);
  border-radius: 14px;
  padding: clamp(16px, 3vw, 24px);
  margin-bottom: 18px;
}
.n8n-analise-header { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
.n8n-analise-title { font-size: 14px; font-weight: 600; color: var(--purple); }
.n8n-analise-text { font-size: 13px; color: var(--muted); line-height: 1.7; }

.section-label {
  font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--muted); margin-bottom: 14px;
  display: flex; align-items: center; gap: 10px;
}
.section-label::after { content: ''; flex: 1; height: 1px; background: var(--border); }

.divider { height: 1px; background: var(--border); margin: 28px 0; }

.reset-btn {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--muted);
  padding: 12px 18px;
  border-radius: 10px;
  font-family: 'Syne', sans-serif;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  width: 100%;
  min-height: 46px;
}
.reset-btn:hover { border-color: var(--accent); color: var(--text); }

/* ✅ BREAKPOINT TABLET (até 980px) */
@media (max-width: 980px) {
  .cards-grid { grid-template-columns: 1fr; }
  .config-row { grid-template-columns: 1fr 1fr; }
  .format-toggle { grid-template-columns: 1fr 1fr; }
}

/* ✅ BREAKPOINT MOBILE (até 700px) */
@media (max-width: 700px) {
  .format-toggle { grid-template-columns: 1fr; }
  .config-row { grid-template-columns: 1fr; }
  .score-hero { flex-direction: column; text-align: center; }
  .score-circle { width: 92px; height: 92px; }
  .tab-btn { flex: 1 1 100%; } /* ✅ tabs 1 por linha */
}

/* ✅ EXTRA SMALL (até 380px) */
@media (max-width: 380px) {
  .badge { font-size: 10px; }
  .tab-badge { display: none; } /* ✅ evita esmagar */
  textarea { padding: 16px; }
  .card { padding: 18px; }
}
`;

// ============================================================
// HELPERS (resiliência + validação)
// ============================================================
function makeRequestId() {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

/**
 * ✅ fetch com timeout (centralizado)
 */
async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        return res;
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * ✅ FIX: lê como texto e tenta parsear JSON mesmo se:
 * - Content-Type não for application/json
 * - vier embrulhado em ```json ... ```
 */
async function safeReadJson(response) {
    const raw = await response.text().catch(() => "");

    try {
        return JSON.parse(raw);
    } catch { }

    const clean = raw.replace(/```json/gi, "").replace(/```/g, "").trim();

    try {
        return JSON.parse(clean);
    } catch {
        const ct = response.headers.get("content-type") || "";
        throw new Error(
            `Resposta inválida do n8n (não parseou JSON). Content-Type: ${ct}. Body: ${raw.slice(0, 300)}`
        );
    }
}

/**
 * ✅ FIX DO SEU CASO:
 * n8n retorna: [ { output: "```json ... ```" } ]
 */
function unwrapN8nEnvelope(data) {
    let d = data;

    if (Array.isArray(d)) d = d[0];

    if (d && typeof d === "object" && typeof d.output === "string") {
        const clean = d.output.replace(/```json/gi, "").replace(/```/g, "").trim();
        try {
            return JSON.parse(clean);
        } catch {
            return d;
        }
    }

    return d;
}

function isValidAnalise(obj) {
    if (!obj || typeof obj !== "object") return false;
    if (typeof obj.score_geral !== "number") return false;
    if (typeof obj.veredicto !== "string") return false;

    const ok =
        obj.clareza?.score != null &&
        obj.gatilhos_emocionais?.score != null &&
        obj.cta?.score != null &&
        obj.objecoes?.score != null &&
        obj.proposta_valor?.score != null;

    return !!ok;
}

function normalizeN8nResponse(data) {
    const analise = data?.analise ?? data?.result?.analise ?? data?.data?.analise ?? null;
    const variacoes = data?.variacoes ?? data?.result?.variacoes ?? data?.data?.variacoes ?? [];
    const analise_extra = data?.analise_extra ?? data?.result?.analise_extra ?? data?.data?.analise_extra ?? null;
    return { raw: data, analise, variacoes, analise_extra };
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function AnalisadorCopy() {
    const [copy, setCopy] = useState("");
    const [formatoCopy, setFormatoCopy] = useState("landing_page");
    const [nicho, setNicho] = useState("infoproduto");
    const [modelo, setModelo] = useState("low_ticket");
    const [objetivo, setObjetivo] = useState("conversao");

    const [loading, setLoading] = useState(false);
    const [analise, setAnalise] = useState(null);

    const [n8nRaw, setN8nRaw] = useState(null);
    const [variacoes, setVariacoes] = useState([]);
    const [analiseExtra, setAnaliseExtra] = useState(null);

    const [error, setError] = useState(null);
    const [abaAtiva, setAbaAtiva] = useState("analise");
    const [copiedIdx, setCopiedIdx] = useState(null);

    const analisar = async () => {
        if (!copy.trim()) return;

        if (!N8N_WEBHOOK_URL || !N8N_WEBHOOK_URL.startsWith("http")) {
            setError("Configure o N8N_WEBHOOK_URL corretamente no código.");
            return;
        }

        setLoading(true);
        setError(null);
        setAnalise(null);
        setN8nRaw(null);
        setVariacoes([]);
        setAnaliseExtra(null);
        setAbaAtiva("analise");

        const request_id = makeRequestId();

        const payload = {
            schema_version: "2.3",
            request_id,
            timestamp: new Date().toISOString(),
            formato: formatoCopy,
            nicho,
            modelo,
            objetivo,
            copy_texto: copy,
        };

        const options = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-webhook-token": N8N_WEBHOOK_TOKEN || "",
                "x-request-id": request_id,
            },
            body: JSON.stringify(payload),
        };

        try {
            let lastErr;

            for (let attempt = 0; attempt <= N8N_MAX_RETRIES; attempt++) {
                try {
                    const response = await fetchWithTimeout(N8N_WEBHOOK_URL, options, N8N_TIMEOUT_MS);

                    if (!response.ok) {
                        const fallbackText = await response.text().catch(() => "");
                        throw new Error(`n8n status ${response.status}. Body: ${fallbackText.slice(0, 300)}`);
                    }

                    const data = await safeReadJson(response);
                    const unwrapped = unwrapN8nEnvelope(data);

                    setN8nRaw({ envelope: data, parsed: unwrapped });

                    if (unwrapped?.error?.message) {
                        throw new Error(unwrapped.error.message);
                    }

                    const normalized = normalizeN8nResponse(unwrapped);

                    setVariacoes(Array.isArray(normalized.variacoes) ? normalized.variacoes : []);
                    setAnaliseExtra(normalized.analise_extra || null);

                    if (!isValidAnalise(normalized.analise)) {
                        setAnalise(null);
                        setAbaAtiva("n8n");
                        setError(
                            "⚠ O n8n respondeu, mas o campo 'analise' veio inválido/incompleto (schema). Mesmo assim, estou exibindo as variações/analise extra."
                        );
                        return;
                    }

                    setAnalise(normalized.analise);
                    setAbaAtiva("analise");
                    return;
                } catch (e) {
                    lastErr = e;

                    const isAbort = e?.name === "AbortError";
                    const isLast = attempt === N8N_MAX_RETRIES;

                    if (isAbort && !isLast) {
                        await sleep(900 * (attempt + 1));
                        continue;
                    }

                    throw e;
                }
            }

            throw lastErr;
        } catch (e) {
            console.error("Erro na análise (n8n):", e);

            const msg =
                e?.name === "AbortError"
                    ? "Tempo esgotado. O n8n demorou demais para responder."
                    : e?.message || "Não foi possível analisar a copy. Tente novamente.";

            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const copiarVariacao = (texto, idx) => {
        navigator.clipboard.writeText(texto || "");
        setCopiedIdx(idx);
        setTimeout(() => setCopiedIdx(null), 2000);
    };

    const getScoreColor = (s) => (s >= 75 ? "#00ff87" : s >= 50 ? "#ffd700" : "#ff3d57");
    const getVeredictColor = (v) =>
        ({ Excelente: "#00ff87", Bom: "#00cc6a", Mediano: "#ffd700", Fraco: "#ff3d57" }[v] || "#ffd700");

    const canShowResults = !!analise || !!n8nRaw;

    return (
        <>
            <style>{styles}</style>
            <div className="grain" />
            <div className="container">
                <div className="header">
                    <div className="badge">
                        <span className="badge-dot" />
                        Análise com IA · X1Bot
                    </div>
                    <h1>
                        Analisador de
                        <br />
                        <span>Copy</span> com IA
                    </h1>
                    <p className="subtitle">Cole seu anúncio ou mensagem. Diagnóstico completo + variações reescritas pela IA.</p>
                </div>

                <div style={{ marginBottom: 24 }}>
                    <div className="format-label">Tipo de copy</div>
                    <div className="format-toggle">
                        <button
                            className={`format-btn ${formatoCopy === "landing_page" ? "active" : ""}`}
                            onClick={() => setFormatoCopy("landing_page")}
                            type="button"
                        >
                            <div className="format-btn-top">
                                <span>🖥️</span> Landing Page
                            </div>
                            <div className="format-btn-desc">Anúncio, headline ou copy de página de vendas / captura</div>
                        </button>

                        <button
                            className={`format-btn ${formatoCopy === "whatsapp" ? "active" : ""}`}
                            onClick={() => setFormatoCopy("whatsapp")}
                            type="button"
                        >
                            <div className="format-btn-top">
                                <span>💬</span> X1 WhatsApp
                            </div>
                            <div className="format-btn-desc">Mensagem individual de abordagem e conversão no WhatsApp</div>
                        </button>
                    </div>
                </div>

                <div className="input-section">
                    <div className="input-label">
                        <span>{formatoCopy === "landing_page" ? "Cole sua copy / headline aqui" : "Cole sua mensagem X1 aqui"}</span>
                        <span className="char-count">{copy.length} caracteres</span>
                    </div>
                    <textarea
                        value={copy}
                        onChange={(e) => setCopy(e.target.value)}
                        placeholder={
                            formatoCopy === "landing_page"
                                ? "Ex: Você já sonhou em ter uma renda extra fazendo bolos artesanais? Descubra o método que já transformou a vida de mais de 2.000 confeiteiras..."
                                : "Ex: Oi [nome]! Vi que você tem interesse em confeitaria. Tenho algo que pode mudar o jogo pra você... Posso te contar em 2 minutos?"
                        }
                    />
                </div>

                <div className="config-row">
                    <div className="config-field">
                        <label>Nicho</label>
                        <select value={nicho} onChange={(e) => setNicho(e.target.value)}>
                            <option value="infoproduto">Infoproduto</option>
                            <option value="ecommerce">E-commerce</option>
                            <option value="servico_local">Serviço Local</option>
                            <option value="saude_beleza">Saúde & Beleza</option>
                            <option value="financeiro">Financeiro</option>
                            <option value="espiritualidade">Espiritualidade</option>
                            <option value="alimentacao">Alimentação</option>
                            <option value="outro">Outro</option>
                        </select>
                    </div>

                    <div className="config-field">
                        <label>Modelo de negócio</label>
                        <select value={modelo} onChange={(e) => setModelo(e.target.value)}>
                            <option value="low_ticket">Low Ticket</option>
                            <option value="lancamento">Lançamento</option>
                            <option value="high_ticket">High Ticket</option>
                            <option value="perpetuo">Perpétuo</option>
                            <option value="assinatura">Assinatura / Recorrência</option>
                            <option value="servico">Serviço / Consultoria</option>
                            <option value="ecommerce">E-commerce / Produto físico</option>
                        </select>
                    </div>

                    <div className="config-field">
                        <label>Objetivo</label>
                        <select value={objetivo} onChange={(e) => setObjetivo(e.target.value)}>
                            <option value="conversao">Conversão direta</option>
                            <option value="captura_lead">Captura de lead</option>
                            <option value="engajamento">Engajamento</option>
                            <option value="consciencia">Consciência de marca</option>
                            <option value="remarketing">Remarketing</option>
                        </select>
                    </div>
                </div>

                <button className="btn" onClick={analisar} disabled={loading || !copy.trim()} type="button">
                    {loading && <span className="loading-bar" />}
                    {loading ? "Analisando sua copy..." : "→ Analisar Copy"}
                </button>

                {error && (
                    <p
                        style={{
                            color: "#ff3d57",
                            fontFamily: "'DM Mono',monospace",
                            fontSize: 13,
                            marginTop: 16,
                            textAlign: "center",
                            whiteSpace: "pre-wrap",
                        }}
                    >
                        {error}
                    </p>
                )}

                {canShowResults && (
                    <div className="results">
                        <div className="divider" />

                        <div className="tabs-bar">
                            <button
                                className={`tab-btn tab-analise ${abaAtiva === "analise" ? "active" : ""}`}
                                onClick={() => setAbaAtiva("analise")}
                                type="button"
                                disabled={!analise}
                                style={!analise ? { opacity: 0.45, cursor: "not-allowed" } : undefined}
                            >
                                🔎 Análise
                                <span className="tab-badge">{analise ? `Score ${analise.score_geral}` : "indisponível"}</span>
                            </button>

                            <button
                                className={`tab-btn tab-n8n ${abaAtiva === "n8n" ? "active" : ""}`}
                                onClick={() => setAbaAtiva("n8n")}
                                type="button"
                            >
                                ⚡ Variações
                                {variacoes.length > 0 ? (
                                    <span className="tab-badge">{variacoes.length} variações</span>
                                ) : (
                                    <span className="tab-badge pending">aguardando</span>
                                )}
                            </button>
                        </div>

                        {abaAtiva === "analise" && analise && (
                            <>
                                <div className="score-hero">
                                    <div
                                        className="score-circle"
                                        style={{ borderColor: getScoreColor(analise.score_geral), color: getScoreColor(analise.score_geral) }}
                                    >
                                        <span className="score-number">{analise.score_geral}</span>
                                        <span className="score-label">Score</span>
                                    </div>

                                    <div className="score-info">
                                        <div className="tags-row">
                                            <div
                                                className="verdict-tag"
                                                style={{
                                                    background: `${getVeredictColor(analise.veredicto)}15`,
                                                    border: `1px solid ${getVeredictColor(analise.veredicto)}40`,
                                                    color: getVeredictColor(analise.veredicto),
                                                }}
                                            >
                                                {analise.veredicto}
                                            </div>
                                            <div className="format-tag">{formatoCopy === "landing_page" ? "🖥️ Landing Page" : "💬 X1 WhatsApp"}</div>
                                        </div>
                                        <h2>Diagnóstico Geral</h2>
                                        <p>{analise.resumo}</p>
                                    </div>
                                </div>

                                <div className="cards-grid">
                                    <div className="card">
                                        <div className="card-header">
                                            <div className="card-icon" style={{ background: "rgba(0,150,255,0.1)" }}>🔍</div>
                                            <div>
                                                <div className="card-title">Clareza</div>
                                                <div className="card-score" style={{ color: getScoreColor(analise.clareza.score) }}>
                                                    {analise.clareza.score}/100
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mini-bar">
                                            <div className="mini-bar-fill" style={{ width: `${analise.clareza.score}%`, background: getScoreColor(analise.clareza.score) }} />
                                        </div>
                                        <p className="card-text">{analise.clareza.analise}</p>
                                        {analise.clareza.sugestao && (
                                            <p className="card-text" style={{ marginTop: 8, color: "#ff8c42", fontStyle: "italic" }}>
                                                💡 {analise.clareza.sugestao}
                                            </p>
                                        )}
                                    </div>

                                    <div className="card">
                                        <div className="card-header">
                                            <div className="card-icon" style={{ background: "rgba(255,77,0,0.1)" }}>⚡</div>
                                            <div>
                                                <div className="card-title">Gatilhos Emocionais</div>
                                                <div className="card-score" style={{ color: getScoreColor(analise.gatilhos_emocionais.score) }}>
                                                    {analise.gatilhos_emocionais.score}/100
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mini-bar">
                                            <div
                                                className="mini-bar-fill"
                                                style={{
                                                    width: `${analise.gatilhos_emocionais.score}%`,
                                                    background: getScoreColor(analise.gatilhos_emocionais.score),
                                                }}
                                            />
                                        </div>
                                        <p className="card-text" style={{ marginBottom: 8 }}>
                                            {analise.gatilhos_emocionais.analise}
                                        </p>
                                        <div className="tags-list">
                                            {analise.gatilhos_emocionais.encontrados?.map((g, i) => (
                                                <span key={i} className="tag">✓ {g}</span>
                                            ))}
                                            {analise.gatilhos_emocionais.ausentes?.map((g, i) => (
                                                <span key={i} className="tag bad">✗ {g}</span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="card">
                                        <div className="card-header">
                                            <div className="card-icon" style={{ background: "rgba(255,215,0,0.1)" }}>🎯</div>
                                            <div>
                                                <div className="card-title">Call to Action</div>
                                                <div className="card-score" style={{ color: getScoreColor(analise.cta.score) }}>
                                                    {analise.cta.score}/100
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mini-bar">
                                            <div className="mini-bar-fill" style={{ width: `${analise.cta.score}%`, background: getScoreColor(analise.cta.score) }} />
                                        </div>
                                        <p className="card-text">{analise.cta.analise}</p>
                                        {analise.cta.sugestao && (
                                            <div className="suggestion-box" style={{ background: "rgba(255,215,0,0.06)", border: "1px solid rgba(255,215,0,0.15)" }}>
                                                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "#ffd700" }}>Sugestão: </span>
                                                <span className="card-text" style={{ color: "#ffd700" }}>{analise.cta.sugestao}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="card">
                                        <div className="card-header">
                                            <div className="card-icon" style={{ background: "rgba(0,255,135,0.1)" }}>🛡️</div>
                                            <div>
                                                <div className="card-title">Gestão de Objeções</div>
                                                <div className="card-score" style={{ color: getScoreColor(analise.objecoes.score) }}>
                                                    {analise.objecoes.score}/100
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mini-bar">
                                            <div className="mini-bar-fill" style={{ width: `${analise.objecoes.score}%`, background: getScoreColor(analise.objecoes.score) }} />
                                        </div>
                                        <p className="card-text" style={{ marginBottom: 8 }}>{analise.objecoes.analise}</p>
                                        <div className="tags-list">
                                            {analise.objecoes.nao_tratadas?.map((o, i) => (
                                                <span key={i} className="tag bad">⚠ {o}</span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="card">
                                        <div className="card-header">
                                            <div className="card-icon" style={{ background: "rgba(150,0,255,0.1)" }}>💎</div>
                                            <div>
                                                <div className="card-title">Proposta de Valor</div>
                                                <div className="card-score" style={{ color: getScoreColor(analise.proposta_valor.score) }}>
                                                    {analise.proposta_valor.score}/100
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mini-bar">
                                            <div className="mini-bar-fill" style={{ width: `${analise.proposta_valor.score}%`, background: getScoreColor(analise.proposta_valor.score) }} />
                                        </div>
                                        <p className="card-text">{analise.proposta_valor.analise}</p>
                                        {analise.proposta_valor.sugestao && (
                                            <p className="card-text" style={{ marginTop: 8, color: "#cc88ff", fontStyle: "italic" }}>
                                                💡 {analise.proposta_valor.sugestao}
                                            </p>
                                        )}
                                    </div>

                                    <div className="card rewrite-card">
                                        <div className="card-header">
                                            <div className="card-icon" style={{ background: "rgba(255,77,0,0.15)" }}>✍️</div>
                                            <div className="card-title" style={{ color: "#ff8c42" }}>
                                                {formatoCopy === "landing_page" ? "Headline/CTA Melhorado" : "Abertura Melhorada"}
                                            </div>
                                        </div>
                                        <p className="rewrite-text">"{analise.reescrita_cta}"</p>
                                    </div>

                                    <div className="card card-full">
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                                            <div>
                                                <div className="card-header">
                                                    <div className="card-icon" style={{ background: "rgba(0,255,135,0.1)" }}>✅</div>
                                                    <div className="card-title">Pontos Fortes</div>
                                                </div>
                                                <ul className="list-items">
                                                    {analise.pontos_fortes?.map((p, i) => (
                                                        <li key={i} className="list-item">
                                                            <span className="list-item-icon" style={{ color: "#00ff87" }}>→</span>{p}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            <div>
                                                <div className="card-header">
                                                    <div className="card-icon" style={{ background: "rgba(255,61,87,0.1)" }}>⚠️</div>
                                                    <div className="card-title">Pontos Críticos</div>
                                                </div>
                                                <ul className="list-items">
                                                    {analise.pontos_criticos?.map((p, i) => (
                                                        <li key={i} className="list-item">
                                                            <span className="list-item-icon" style={{ color: "#ff3d57" }}>→</span>{p}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        {abaAtiva === "n8n" && (
                            <>
                                {!n8nRaw && (
                                    <div className="n8n-empty">
                                        <div className="n8n-empty-icon">⚡</div>
                                        <div className="n8n-empty-title">Variações não disponíveis</div>
                                        <div className="n8n-empty-desc">Rode uma análise para o n8n retornar as variações no campo <b>variacoes</b>.</div>
                                    </div>
                                )}

                                {n8nRaw && (
                                    <>
                                        {analiseExtra && (
                                            <div className="n8n-analise-extra">
                                                <div className="n8n-analise-header">
                                                    <span style={{ fontSize: 18 }}>🧠</span>
                                                    <div className="n8n-analise-title">Análise Aprofundada</div>
                                                </div>
                                                <p className="n8n-analise-text">{analiseExtra}</p>
                                            </div>
                                        )}

                                        {variacoes.length > 0 ? (
                                            <>
                                                <div className="section-label">
                                                    {variacoes.length} variação{variacoes.length > 1 ? "ões" : ""} gerada{variacoes.length > 1 ? "s" : ""}
                                                </div>

                                                {variacoes.map((v, idx) => (
                                                    <div key={idx} className="variacao-card">
                                                        <div className="variacao-header">
                                                            <div className="variacao-titulo">
                                                                <span className="variacao-num">{idx + 1}</span>
                                                                {v?.titulo || `Variação ${idx + 1}`}
                                                            </div>
                                                            <button className="copy-variacao-btn" onClick={() => copiarVariacao(v?.copy || "", idx)} type="button">
                                                                {copiedIdx === idx ? "✓ Copiado!" : "Copiar copy"}
                                                            </button>
                                                        </div>

                                                        <div className="variacao-body">
                                                            <div className="variacao-copy">{v?.copy || ""}</div>

                                                            {v?.justificativa && (
                                                                <div className="variacao-justificativa">
                                                                    <strong>Por que funciona melhor</strong>
                                                                    <br />
                                                                    {v.justificativa}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </>
                                        ) : (
                                            <div className="n8n-empty">
                                                <div className="n8n-empty-icon">📭</div>
                                                <div className="n8n-empty-title">Nenhuma variação retornada</div>
                                                <div className="n8n-empty-desc">
                                                    O n8n respondeu, mas não enviou o campo <b>variacoes</b>. Verifique o <b>Respond to Webhook</b>.
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </>
                        )}

                        <div className="divider" />
                        <button
                            className="reset-btn"
                            onClick={() => {
                                setAnalise(null);
                                setN8nRaw(null);
                                setVariacoes([]);
                                setAnaliseExtra(null);
                                setCopy("");
                                setAbaAtiva("analise");
                                setError(null);
                            }}
                            type="button"
                        >
                            ← Nova análise
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}