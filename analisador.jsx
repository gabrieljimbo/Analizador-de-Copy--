/**
 * ============================================================
 * ANALISADOR DE COPY COM IA — v2.0
 * ============================================================
 *
 * DUAS ABAS DE RESULTADO:
 * -----------------------
 * 1. "Análise" — diagnóstico gerado diretamente pela IA
 * 2. "Variações N8N" — análise aprofundada + variações de copy
 *    reescritas enviadas pelo fluxo n8n (quantidade dinâmica)
 *
 * CONFIGURAÇÃO DO DESENVOLVEDOR:
 * --------------------------------
 * N8N_WEBHOOK_URL → URL do webhook n8n (deixe "" para modo direto)
 *
 * PAYLOAD ENVIADO AO N8N:
 *   { timestamp, formato, nicho, objetivo, copy_texto }
 *
 * JSON ESPERADO DE RETORNO DO N8N (via Respond to Webhook):
 * {
 *   analise: { ...mesmo schema da análise direta... },
 *   variacoes: [
 *     {
 *       titulo: "Variação 1 — Urgência",
 *       copy: "Texto reescrito...",
 *       justificativa: "Por que essa versão é melhor..."
 *     },
 *     { titulo, copy, justificativa },  // quantas o n8n quiser
 *     ...
 *   ]
 * }
 * ============================================================
 */

import { useState } from "react";

// ============================================================
// ⚙️ CONFIGURAÇÃO DO BACKEND — EDITE AQUI
// ============================================================
const N8N_WEBHOOK_URL = ""; // Ex: "https://seu-n8n.com/webhook/analisador-copy"

// ============================================================
// ESTILOS GLOBAIS
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

  body { font-family: 'Syne', sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }

  .grain {
    position: fixed; inset: 0; pointer-events: none; z-index: 100; opacity: 0.03;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  }

  .container { max-width: 960px; margin: 0 auto; padding: 48px 24px; }
  .header { margin-bottom: 56px; }

  .badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(255,77,0,0.1); border: 1px solid rgba(255,77,0,0.3);
    color: var(--accent2); font-family: 'DM Mono', monospace;
    font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase;
    padding: 6px 12px; border-radius: 4px; margin-bottom: 20px;
  }
  .badge-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--accent); animation: pulse 2s infinite; }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }

  h1 { font-size: clamp(36px, 6vw, 64px); font-weight: 800; line-height: 1.05; letter-spacing: -0.03em; }
  h1 span { background: linear-gradient(135deg, var(--accent) 0%, var(--accent2) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
  .subtitle { margin-top: 16px; color: var(--muted); font-size: 16px; max-width: 520px; line-height: 1.6; }

  /* ── TOGGLE DE FORMATO ── */
  .format-label { font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin-bottom: 10px; }
  .format-toggle { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
  .format-btn { display: flex; flex-direction: column; gap: 6px; padding: 16px 18px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; cursor: pointer; transition: all 0.2s; text-align: left; }
  .format-btn:hover { border-color: rgba(255,77,0,0.3); }
  .format-btn.active { border-color: var(--accent); background: rgba(255,77,0,0.06); }
  .format-btn-top { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 600; color: var(--text); }
  .format-btn.active .format-btn-top { color: var(--accent2); }
  .format-btn-desc { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); line-height: 1.5; }

  /* ── INPUT ── */
  .input-section { margin-bottom: 24px; }
  .input-label { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); }
  .char-count { color: var(--accent2); }
  textarea { width: 100%; min-height: 200px; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 20px; color: var(--text); font-family: 'DM Mono', monospace; font-size: 14px; line-height: 1.7; resize: vertical; outline: none; transition: border-color 0.2s; }
  textarea:focus { border-color: rgba(255,77,0,0.4); }
  textarea::placeholder { color: var(--muted); }

  /* ── CONFIG ROW (3 colunas) ── */
  .config-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 24px; }
  .config-field label { display: block; font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--muted); margin-bottom: 8px; }
  .config-field select { width: 100%; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px 16px; color: var(--text); font-family: 'Syne', sans-serif; font-size: 14px; outline: none; transition: border-color 0.2s; appearance: none; cursor: pointer; }
  .config-field select:focus { border-color: rgba(255,77,0,0.4); }

  /* ── BOTÃO ── */
  .btn { width: 100%; padding: 18px; background: var(--accent); border: none; border-radius: 12px; color: #fff; font-family: 'Syne', sans-serif; font-size: 15px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; gap: 10px; }
  .btn:hover:not(:disabled) { background: #ff6620; transform: translateY(-1px); box-shadow: 0 8px 32px rgba(255,77,0,0.3); }
  .btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
  .loading-bar { position: absolute; bottom: 0; left: 0; height: 3px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent); animation: loading 1.5s infinite; }
  @keyframes loading { 0%{left:-60%;width:60%} 100%{left:100%;width:60%} }

  /* ── ABAS DE RESULTADO ── */
  .results { margin-top: 48px; animation: fadeUp 0.5s ease; }
  @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }

  .tabs-bar {
    display: flex; gap: 4px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 4px;
    margin-bottom: 28px;
  }

  /* Cada aba tem badge de notificação quando tem conteúdo */
  .tab-btn {
    flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px;
    padding: 12px 16px; border-radius: 9px; border: none; cursor: pointer;
    font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 600;
    color: var(--muted); background: transparent; transition: all 0.2s;
    position: relative;
  }
  .tab-btn:hover { color: var(--text); }
  .tab-btn.active { background: var(--bg); color: var(--text); box-shadow: 0 1px 8px rgba(0,0,0,0.4); }
  .tab-btn.active.tab-analise { color: var(--accent2); }
  .tab-btn.active.tab-n8n { color: var(--purple); }

  /* Badge numérico (ex: "3 variações") */
  .tab-badge {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 20px; height: 20px; padding: 0 6px;
    border-radius: 10px; font-family: 'DM Mono', monospace; font-size: 10px; font-weight: 600;
  }
  .tab-analise .tab-badge { background: rgba(255,77,0,0.15); color: var(--accent2); }
  .tab-n8n .tab-badge { background: rgba(176,106,255,0.15); color: var(--purple); }
  .tab-badge.pending { background: rgba(107,104,130,0.2); color: var(--muted); }

  /* ── SCORE HERO ── */
  .score-hero { display: flex; align-items: center; gap: 32px; background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 32px; margin-bottom: 24px; position: relative; overflow: hidden; }
  .score-hero::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background: linear-gradient(90deg, var(--accent), var(--accent2)); }
  .score-circle { width: 100px; height: 100px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 3px solid; flex-shrink: 0; }
  .score-number { font-size: 32px; font-weight: 800; line-height: 1; }
  .score-label { font-family: 'DM Mono', monospace; font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; margin-top: 2px; }
  .score-info h2 { font-size: 22px; font-weight: 700; margin-bottom: 8px; }
  .score-info p { color: var(--muted); font-size: 14px; line-height: 1.6; }
  .tags-row { display: flex; gap: 8px; align-items: center; margin-bottom: 12px; flex-wrap: wrap; }
  .verdict-tag { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 4px; font-family: 'DM Mono', monospace; font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.1em; }
  .format-tag { padding: 4px 10px; border-radius: 4px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); text-transform: uppercase; }

  /* ── CARDS DE MÉTRICAS ── */
  .cards-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 24px; }
  .card-header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
  .card-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
  .card-title { font-size: 13px; font-weight: 600; }
  .card-score { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); }
  .mini-bar { height: 4px; background: var(--border); border-radius: 2px; margin-bottom: 16px; overflow: hidden; }
  .mini-bar-fill { height: 100%; border-radius: 2px; transition: width 1s ease; }
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
  /* Card de cada variação de copy retornada pelo n8n */
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
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border);
    background: rgba(176,106,255,0.04);
  }

  .variacao-titulo {
    display: flex; align-items: center; gap: 10px;
    font-size: 14px; font-weight: 600; color: var(--purple);
  }

  .variacao-num {
    width: 24px; height: 24px; border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(176,106,255,0.15);
    font-family: 'DM Mono', monospace; font-size: 11px; color: var(--purple);
    flex-shrink: 0;
  }

  /* Botão de copiar a variação de copy */
  .copy-variacao-btn {
    background: rgba(176,106,255,0.1); border: 1px solid rgba(176,106,255,0.2);
    color: var(--purple); padding: 5px 12px; border-radius: 6px;
    font-family: 'DM Mono', monospace; font-size: 11px; cursor: pointer; transition: all 0.2s;
  }
  .copy-variacao-btn:hover { background: rgba(176,106,255,0.2); }

  .variacao-body { padding: 20px; }

  /* Bloco da copy reescrita — destaque visual */
  .variacao-copy {
    background: rgba(176,106,255,0.04);
    border: 1px solid rgba(176,106,255,0.12);
    border-left: 3px solid var(--purple);
    border-radius: 8px;
    padding: 16px 18px;
    font-family: 'DM Mono', monospace;
    font-size: 13px; color: var(--text); line-height: 1.8;
    margin-bottom: 14px;
    white-space: pre-wrap; /* preserva quebras de linha da copy */
  }

  /* Justificativa da variação */
  .variacao-justificativa {
    font-size: 13px; color: var(--muted); line-height: 1.6;
  }
  .variacao-justificativa strong { color: var(--purple); font-weight: 600; font-size: 11px; font-family: 'DM Mono', monospace; text-transform: uppercase; letter-spacing: 0.05em; }

  /* Estado vazio da aba N8N (antes de ter resultado) */
  .n8n-empty {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 64px 32px; text-align: center;
    border: 1px dashed var(--border); border-radius: 16px;
  }
  .n8n-empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.5; }
  .n8n-empty-title { font-size: 16px; font-weight: 600; color: var(--muted); margin-bottom: 8px; }
  .n8n-empty-desc { font-size: 13px; color: var(--muted); opacity: 0.6; max-width: 320px; line-height: 1.6; }

  /* Análise aprofundada vinda do n8n */
  .n8n-analise-extra {
    background: var(--surface); border: 1px solid rgba(176,106,255,0.2);
    border-radius: 14px; padding: 24px; margin-bottom: 24px;
  }
  .n8n-analise-header { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
  .n8n-analise-title { font-size: 14px; font-weight: 600; color: var(--purple); }
  .n8n-analise-text { font-size: 13px; color: var(--muted); line-height: 1.7; }

  /* Separador de seção dentro da aba n8n */
  .section-label {
    font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.12em;
    text-transform: uppercase; color: var(--muted); margin-bottom: 14px;
    display: flex; align-items: center; gap: 10px;
  }
  .section-label::after { content: ''; flex: 1; height: 1px; background: var(--border); }

  .divider { height: 1px; background: var(--border); margin: 32px 0; }
  .reset-btn { background: transparent; border: 1px solid var(--border); color: var(--muted); padding: 12px 24px; border-radius: 8px; font-family: 'Syne', sans-serif; font-size: 13px; cursor: pointer; transition: all 0.2s; width: 100%; }
  .reset-btn:hover { border-color: var(--accent); color: var(--text); }

  @media (max-width: 700px) {
    .cards-grid { grid-template-columns: 1fr; }
    .config-row { grid-template-columns: 1fr; }
    .format-toggle { grid-template-columns: 1fr; }
    .score-hero { flex-direction: column; text-align: center; }
    .tab-btn { font-size: 12px; padding: 10px 8px; }
  }
`;

// ============================================================
// SYSTEM PROMPTS ADAPTATIVOS POR FORMATO
// ============================================================
const SYSTEM_PROMPTS = {
  landing_page: `Você é um especialista sênior em copywriting para Landing Pages e tráfego pago no mercado brasileiro.
Analise a copy considerando: headline, fluidez, benefícios vs features, prova social, urgência/escassez e CTA para clique.
Retorne APENAS um JSON válido com esta estrutura:`,

  whatsapp: `Você é um especialista sênior em copywriting conversacional e vendas pelo WhatsApp no mercado brasileiro.
Analise a mensagem X1 considerando: personalização, tom de voz (não spam), geração de curiosidade, facilidade de resposta, CTA conversacional e tamanho para mobile.
Retorne APENAS um JSON válido com esta estrutura:`,
};

// Schema JSON fixo — usado tanto no modo direto quanto como referência para o n8n
const JSON_SCHEMA = `
{
  "score_geral": <0-100>,
  "veredicto": "<Fraco|Mediano|Bom|Excelente>",
  "resumo": "<2 frases de diagnóstico geral>",
  "clareza": { "score": <0-100>, "analise": "<2-3 frases>", "sugestao": "<1 sugestão>" },
  "gatilhos_emocionais": { "score": <0-100>, "encontrados": ["..."], "ausentes": ["..."], "analise": "<2-3 frases>" },
  "cta": { "score": <0-100>, "encontrado": "<CTA ou Não identificado>", "analise": "<2-3 frases>", "sugestao": "<CTA melhorado>" },
  "objecoes": { "score": <0-100>, "tratadas": ["..."], "nao_tratadas": ["..."], "analise": "<2 frases>" },
  "proposta_valor": { "score": <0-100>, "analise": "<2-3 frases>", "sugestao": "<sugestão>" },
  "pontos_fortes": ["...", "...", "..."],
  "pontos_criticos": ["...", "...", "..."],
  "reescrita_cta": "<versão melhorada do CTA ou abertura em 1-2 linhas>"
}
Seja direto, específico e brutalmente honesto.`;

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export default function AnalisadorCopy() {

  // Inputs do usuário
  const [copy, setCopy]             = useState("");
  const [formatoCopy, setFormatoCopy] = useState("landing_page");
  const [nicho, setNicho]           = useState("infoproduto");
  const [modelo, setModelo]         = useState("low_ticket"); // modelo de negócio
  const [objetivo, setObjetivo]     = useState("conversao");

  // Estado dos resultados
  const [loading, setLoading]       = useState(false);
  const [analise, setAnalise]       = useState(null);   // resultado da análise (aba 1)
  const [n8nData, setN8nData]       = useState(null);   // retorno completo do n8n (aba 2)
  const [error, setError]           = useState(null);

  // Aba ativa: "analise" | "n8n"
  const [abaAtiva, setAbaAtiva]     = useState("analise");

  // Estado de cópia individual por variação
  const [copiedIdx, setCopiedIdx]   = useState(null);

  // ============================================================
  // FUNÇÃO PRINCIPAL: analisar()
  //
  // MODO N8N (N8N_WEBHOOK_URL preenchida):
  //   → POST payload → n8n processa → Respond to Webhook retorna:
  //     { analise: {...}, variacoes: [...], analise_extra?: "..." }
  //   → aba 1 recebe o campo "analise"
  //   → aba 2 recebe "variacoes" + "analise_extra"
  //
  // MODO DIRETO (URL vazia):
  //   → chama API Anthropic → só preenche aba 1
  //   → aba 2 fica no estado "aguardando n8n"
  // ============================================================
  const analisar = async () => {
    if (!copy.trim()) return;
    setLoading(true);
    setError(null);
    setAnalise(null);
    setN8nData(null);
    setAbaAtiva("analise");

    const payload = {
      timestamp: new Date().toISOString(),
      formato: formatoCopy,       // "landing_page" | "whatsapp"
      nicho,                      // ex: "infoproduto"
      modelo,                     // ex: "low_ticket"
      objetivo,                   // ex: "conversao"
      copy_texto: copy,
    };

    try {
      if (N8N_WEBHOOK_URL) {
        // ── MODO N8N ──────────────────────────────────────────
        // O n8n retorna: { analise: {...}, variacoes: [...], analise_extra?: "..." }
        const response = await fetch(N8N_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!response.ok) throw new Error(`n8n status ${response.status}`);

        const data = await response.json();

        // Extrai a análise principal (campo "analise")
        const analiseData = data.analise || data.result || data;
        setAnalise(analiseData);

        // Armazena o retorno completo do n8n para a aba 2
        setN8nData(data);

      } else {
        // ── MODO DIRETO ───────────────────────────────────────
        // Apenas a aba de análise é preenchida
        const systemPrompt = SYSTEM_PROMPTS[formatoCopy] + JSON_SCHEMA;

        const prompt = [
          `Nicho: ${nicho}`,
          `Modelo de negócio: ${modelo}`,
          `Objetivo: ${objetivo}`,
          `Formato: ${formatoCopy === "landing_page" ? "Landing Page / Anúncio" : "Mensagem X1 WhatsApp"}`,
          ``,
          `Copy para analisar:`,
          ``,
          copy,
        ].join("\n");

        const response = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1500,
            system: systemPrompt,
            messages: [{ role: "user", content: prompt }],
          }),
        });

        const data     = await response.json();
        const text     = data.content?.[0]?.text || "";
        const clean    = text.replace(/```json|```/g, "").trim();
        setAnalise(JSON.parse(clean));
        // n8nData permanece null → aba 2 exibe estado vazio
      }

    } catch (e) {
      console.error("Erro na análise:", e);
      setError("Não foi possível analisar a copy. Tente novamente em instantes.");
    } finally {
      setLoading(false);
    }
  };

  // Copiar texto de uma variação para o clipboard
  const copiarVariacao = (texto, idx) => {
    navigator.clipboard.writeText(texto);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  // Cores baseadas em score
  const getScoreColor = (s) => s >= 75 ? "#00ff87" : s >= 50 ? "#ffd700" : "#ff3d57";
  const getVeredictColor = (v) => ({ Excelente:"#00ff87", Bom:"#00cc6a", Mediano:"#ffd700", Fraco:"#ff3d57" }[v] || "#ffd700");

  // Quantidade de variações no retorno do n8n
  const variacoes  = n8nData?.variacoes || [];
  const analiseExtra = n8nData?.analise_extra || null;

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <>
      <style>{styles}</style>
      <div className="grain" />
      <div className="container">

        {/* ── HEADER ── */}
        <div className="header">
          <div className="badge">
            <span className="badge-dot" />
            Análise com IA · Gratuito
          </div>
          <h1>Analisador de<br /><span>Copy</span> com IA</h1>
          <p className="subtitle">
            Cole seu anúncio ou mensagem. Diagnóstico completo + variações reescritas pela IA.
          </p>
        </div>

        {/* ── TOGGLE DE FORMATO ── */}
        <div style={{ marginBottom: 24 }}>
          <div className="format-label">Tipo de copy</div>
          <div className="format-toggle">
            <button className={`format-btn ${formatoCopy === "landing_page" ? "active" : ""}`} onClick={() => setFormatoCopy("landing_page")}>
              <div className="format-btn-top"><span>🖥️</span> Landing Page</div>
              <div className="format-btn-desc">Anúncio, headline ou copy de página de vendas / captura</div>
            </button>
            <button className={`format-btn ${formatoCopy === "whatsapp" ? "active" : ""}`} onClick={() => setFormatoCopy("whatsapp")}>
              <div className="format-btn-top"><span>💬</span> X1 WhatsApp</div>
              <div className="format-btn-desc">Mensagem individual de abordagem e conversão no WhatsApp</div>
            </button>
          </div>
        </div>

        {/* ── INPUT DA COPY ── */}
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

        {/* ── CONFIGURAÇÕES: NICHO, MODELO DE NEGÓCIO E OBJETIVO (3 colunas) ── */}
        <div className="config-row">

          {/* Nicho de mercado */}
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

          {/* Modelo de negócio */}
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

          {/* Objetivo da campanha */}
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

        {/* ── BOTÃO PRINCIPAL ── */}
        <button className="btn" onClick={analisar} disabled={loading || !copy.trim()}>
          {loading && <span className="loading-bar" />}
          {loading ? "Analisando sua copy..." : "→ Analisar Copy"}
        </button>

        {error && (
          <p style={{ color:"#ff3d57", fontFamily:"'DM Mono',monospace", fontSize:13, marginTop:16, textAlign:"center" }}>
            ⚠ {error}
          </p>
        )}

        {/* ── ÁREA DE RESULTADOS COM ABAS ── */}
        {analise && (
          <div className="results">
            <div className="divider" />

            {/* BARRA DE ABAS */}
            <div className="tabs-bar">

              {/* Aba 1: Análise */}
              <button
                className={`tab-btn tab-analise ${abaAtiva === "analise" ? "active" : ""}`}
                onClick={() => setAbaAtiva("analise")}
              >
                🔎 Análise
                <span className="tab-badge">Score {analise.score_geral}</span>
              </button>

              {/* Aba 2: Variações N8N — badge mostra quantidade ou "aguardando" */}
              <button
                className={`tab-btn tab-n8n ${abaAtiva === "n8n" ? "active" : ""}`}
                onClick={() => setAbaAtiva("n8n")}
              >
                ⚡ Variações N8N
                {variacoes.length > 0
                  ? <span className="tab-badge">{variacoes.length} variações</span>
                  : <span className="tab-badge pending">aguardando</span>
                }
              </button>

            </div>

            {/* ══════════════════════════════════════════
                ABA 1 — ANÁLISE
                Diagnóstico completo gerado pela IA
            ══════════════════════════════════════════ */}
            {abaAtiva === "analise" && (
              <>
                {/* Score Hero */}
                <div className="score-hero">
                  <div className="score-circle" style={{ borderColor: getScoreColor(analise.score_geral), color: getScoreColor(analise.score_geral) }}>
                    <span className="score-number">{analise.score_geral}</span>
                    <span className="score-label">Score</span>
                  </div>
                  <div className="score-info">
                    <div className="tags-row">
                      <div className="verdict-tag" style={{ background:`${getVeredictColor(analise.veredicto)}15`, border:`1px solid ${getVeredictColor(analise.veredicto)}40`, color: getVeredictColor(analise.veredicto) }}>
                        {analise.veredicto}
                      </div>
                      <div className="format-tag">
                        {formatoCopy === "landing_page" ? "🖥️ Landing Page" : "💬 X1 WhatsApp"}
                      </div>
                    </div>
                    <h2>Diagnóstico Geral</h2>
                    <p>{analise.resumo}</p>
                  </div>
                </div>

                {/* Cards de métricas */}
                <div className="cards-grid">

                  {/* Clareza */}
                  <div className="card">
                    <div className="card-header">
                      <div className="card-icon" style={{ background:"rgba(0,150,255,0.1)" }}>🔍</div>
                      <div>
                        <div className="card-title">Clareza</div>
                        <div className="card-score" style={{ color: getScoreColor(analise.clareza.score) }}>{analise.clareza.score}/100</div>
                      </div>
                    </div>
                    <div className="mini-bar"><div className="mini-bar-fill" style={{ width:`${analise.clareza.score}%`, background: getScoreColor(analise.clareza.score) }} /></div>
                    <p className="card-text">{analise.clareza.analise}</p>
                    {analise.clareza.sugestao && <p className="card-text" style={{ marginTop:8, color:"#ff8c42", fontStyle:"italic" }}>💡 {analise.clareza.sugestao}</p>}
                  </div>

                  {/* Gatilhos Emocionais */}
                  <div className="card">
                    <div className="card-header">
                      <div className="card-icon" style={{ background:"rgba(255,77,0,0.1)" }}>⚡</div>
                      <div>
                        <div className="card-title">Gatilhos Emocionais</div>
                        <div className="card-score" style={{ color: getScoreColor(analise.gatilhos_emocionais.score) }}>{analise.gatilhos_emocionais.score}/100</div>
                      </div>
                    </div>
                    <div className="mini-bar"><div className="mini-bar-fill" style={{ width:`${analise.gatilhos_emocionais.score}%`, background: getScoreColor(analise.gatilhos_emocionais.score) }} /></div>
                    <p className="card-text" style={{ marginBottom:8 }}>{analise.gatilhos_emocionais.analise}</p>
                    <div className="tags-list">
                      {analise.gatilhos_emocionais.encontrados?.map((g,i) => <span key={i} className="tag">✓ {g}</span>)}
                      {analise.gatilhos_emocionais.ausentes?.map((g,i) => <span key={i} className="tag bad">✗ {g}</span>)}
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="card">
                    <div className="card-header">
                      <div className="card-icon" style={{ background:"rgba(255,215,0,0.1)" }}>🎯</div>
                      <div>
                        <div className="card-title">Call to Action</div>
                        <div className="card-score" style={{ color: getScoreColor(analise.cta.score) }}>{analise.cta.score}/100</div>
                      </div>
                    </div>
                    <div className="mini-bar"><div className="mini-bar-fill" style={{ width:`${analise.cta.score}%`, background: getScoreColor(analise.cta.score) }} /></div>
                    <p className="card-text">{analise.cta.analise}</p>
                    {analise.cta.sugestao && (
                      <div className="suggestion-box" style={{ background:"rgba(255,215,0,0.06)", border:"1px solid rgba(255,215,0,0.15)" }}>
                        <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11, color:"#ffd700" }}>Sugestão: </span>
                        <span className="card-text" style={{ color:"#ffd700" }}>{analise.cta.sugestao}</span>
                      </div>
                    )}
                  </div>

                  {/* Objeções */}
                  <div className="card">
                    <div className="card-header">
                      <div className="card-icon" style={{ background:"rgba(0,255,135,0.1)" }}>🛡️</div>
                      <div>
                        <div className="card-title">Gestão de Objeções</div>
                        <div className="card-score" style={{ color: getScoreColor(analise.objecoes.score) }}>{analise.objecoes.score}/100</div>
                      </div>
                    </div>
                    <div className="mini-bar"><div className="mini-bar-fill" style={{ width:`${analise.objecoes.score}%`, background: getScoreColor(analise.objecoes.score) }} /></div>
                    <p className="card-text" style={{ marginBottom:8 }}>{analise.objecoes.analise}</p>
                    <div className="tags-list">
                      {analise.objecoes.nao_tratadas?.map((o,i) => <span key={i} className="tag bad">⚠ {o}</span>)}
                    </div>
                  </div>

                  {/* Proposta de Valor */}
                  <div className="card">
                    <div className="card-header">
                      <div className="card-icon" style={{ background:"rgba(150,0,255,0.1)" }}>💎</div>
                      <div>
                        <div className="card-title">Proposta de Valor</div>
                        <div className="card-score" style={{ color: getScoreColor(analise.proposta_valor.score) }}>{analise.proposta_valor.score}/100</div>
                      </div>
                    </div>
                    <div className="mini-bar"><div className="mini-bar-fill" style={{ width:`${analise.proposta_valor.score}%`, background: getScoreColor(analise.proposta_valor.score) }} /></div>
                    <p className="card-text">{analise.proposta_valor.analise}</p>
                    {analise.proposta_valor.sugestao && <p className="card-text" style={{ marginTop:8, color:"#cc88ff", fontStyle:"italic" }}>💡 {analise.proposta_valor.sugestao}</p>}
                  </div>

                  {/* Reescrita / Headline melhorado */}
                  <div className="card rewrite-card">
                    <div className="card-header">
                      <div className="card-icon" style={{ background:"rgba(255,77,0,0.15)" }}>✍️</div>
                      <div className="card-title" style={{ color:"#ff8c42" }}>
                        {formatoCopy === "landing_page" ? "Headline/CTA Melhorado" : "Abertura Melhorada"}
                      </div>
                    </div>
                    <p className="rewrite-text">"{analise.reescrita_cta}"</p>
                  </div>

                  {/* Pontos Fortes e Críticos */}
                  <div className="card card-full">
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>
                      <div>
                        <div className="card-header">
                          <div className="card-icon" style={{ background:"rgba(0,255,135,0.1)" }}>✅</div>
                          <div className="card-title">Pontos Fortes</div>
                        </div>
                        <ul className="list-items">
                          {analise.pontos_fortes?.map((p,i) => (
                            <li key={i} className="list-item">
                              <span className="list-item-icon" style={{ color:"#00ff87" }}>→</span>{p}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="card-header">
                          <div className="card-icon" style={{ background:"rgba(255,61,87,0.1)" }}>⚠️</div>
                          <div className="card-title">Pontos Críticos</div>
                        </div>
                        <ul className="list-items">
                          {analise.pontos_criticos?.map((p,i) => (
                            <li key={i} className="list-item">
                              <span className="list-item-icon" style={{ color:"#ff3d57" }}>→</span>{p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                </div>
              </>
            )}

            {/* ══════════════════════════════════════════
                ABA 2 — VARIAÇÕES N8N
                Análise aprofundada + variações reescritas
                vindas do fluxo n8n (quantidade dinâmica)
            ══════════════════════════════════════════ */}
            {abaAtiva === "n8n" && (
              <>
                {/* Estado vazio: n8n não configurado ou não retornou variações */}
                {!n8nData && (
                  <div className="n8n-empty">
                    <div className="n8n-empty-icon">⚡</div>
                    <div className="n8n-empty-title">Variações não disponíveis</div>
                    <div className="n8n-empty-desc">
                      Configure o webhook n8n no código para receber variações de copy reescritas e análise aprofundada direto do seu fluxo.
                    </div>
                  </div>
                )}

                {/* Conteúdo quando n8n retornou dados */}
                {n8nData && (
                  <>
                    {/* Análise extra/aprofundada (campo opcional do n8n) */}
                    {analiseExtra && (
                      <div className="n8n-analise-extra">
                        <div className="n8n-analise-header">
                          <span style={{ fontSize:18 }}>🧠</span>
                          <div className="n8n-analise-title">Análise Aprofundada</div>
                        </div>
                        <p className="n8n-analise-text">{analiseExtra}</p>
                      </div>
                    )}

                    {/* Lista dinâmica de variações — renderiza quantas o n8n retornar */}
                    {variacoes.length > 0 && (
                      <>
                        <div className="section-label">
                          {variacoes.length} variação{variacoes.length > 1 ? "ões" : ""} gerada{variacoes.length > 1 ? "s" : ""}
                        </div>

                        {variacoes.map((v, idx) => (
                          <div key={idx} className="variacao-card">

                            {/* Header da variação com título e botão copiar */}
                            <div className="variacao-header">
                              <div className="variacao-titulo">
                                <span className="variacao-num">{idx + 1}</span>
                                {v.titulo || `Variação ${idx + 1}`}
                              </div>
                              <button
                                className="copy-variacao-btn"
                                onClick={() => copiarVariacao(v.copy, idx)}
                              >
                                {copiedIdx === idx ? "✓ Copiado!" : "Copiar copy"}
                              </button>
                            </div>

                            <div className="variacao-body">
                              {/* Bloco da copy reescrita */}
                              <div className="variacao-copy">{v.copy}</div>

                              {/* Justificativa da variação */}
                              {v.justificativa && (
                                <div className="variacao-justificativa">
                                  <strong>Por que funciona melhor</strong><br />
                                  {v.justificativa}
                                </div>
                              )}
                            </div>

                          </div>
                        ))}
                      </>
                    )}

                    {/* Caso n8n retornou dados mas sem variações */}
                    {variacoes.length === 0 && (
                      <div className="n8n-empty">
                        <div className="n8n-empty-icon">📭</div>
                        <div className="n8n-empty-title">Nenhuma variação retornada</div>
                        <div className="n8n-empty-desc">
                          O n8n respondeu mas não enviou variações. Verifique se o fluxo está retornando o campo "variacoes" no Respond to Webhook.
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* Botão de nova análise */}
            <div className="divider" />
            <button className="reset-btn" onClick={() => { setAnalise(null); setN8nData(null); setCopy(""); setAbaAtiva("analise"); }}>
              ← Nova análise
            </button>

          </div>
        )}

      </div>
    </>
  );
}
