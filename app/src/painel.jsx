import React, { useMemo, useState, useEffect } from "react";
// Single-file React app (Etapa 1) — Painel Secretaria-IA
// Tailwind UI; persiste em localStorage; sem backend ainda
// Placeholders suportados: {NOME_REP}, {MARCA}, {DATA_BASE}

/**************************************
 * Utils & Consts
 **************************************/
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

const TZ = "America/Sao_Paulo";

const initialConfig = {
  numeroTeste: "55",
  timezone: TZ,
  janela: { inicio: "08:00", fim: "19:00", diasUteis: true },
};

const Tab = {
  MARCAS: "MARCAS",
  REPS: "REPS",
  SOLIC: "SOLIC",
  CONFIG: "CONFIG",
};

const TipoAgenda = {
  DIARIO: "DIARIO",
  SEMANAL: "SEMANAL",
  MENSAL: "MENSAL",
  CUSTOM: "CUSTOM",
};

function todayBR() {
  const d = new Date();
  return d.toLocaleDateString("pt-BR", { timeZone: TZ });
}

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

function validateE164BR(v) {
  const raw = String(v).replace(/\D/g, "");
  if (!raw) return { ok: false, msg: "Obrigatório" };
  if (!raw.startsWith("55")) return { ok: false, msg: "Deve iniciar com 55" };
  if (raw.length < 12 || raw.length > 15) return { ok: false, msg: "Entre 12 e 15 dígitos" };
  return { ok: true, value: raw };
}

function nextOccurrences({ tipo, hora, diasSemana = [], diaMes = 1 }, count = 3) {
  const now = new Date();
  const [h, m] = (hora || "09:00").split(":").map(Number);
  const out = [];
  let cursor = new Date(now);
  function pushIfFuture(d) { if (d.getTime() > now.getTime()) out.push(new Date(d)); }

  if (tipo === TipoAgenda.DIARIO) {
    while (out.length < count) {
      const d = new Date(cursor); d.setHours(h, m, 0, 0);
      if (d <= now) d.setDate(d.getDate() + 1);
      pushIfFuture(d);
      cursor = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
    }
  } else if (tipo === TipoAgenda.SEMANAL) {
    const dias0 = (diasSemana || []).map((x) => x % 7);
    while (out.length < count) {
      for (let i = 0; i < 14 && out.length < count; i++) {
        const d = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + i);
        if (dias0.includes(d.getDay())) {
          d.setHours(h, m, 0, 0);
          if (d > now) out.push(d);
        }
      }
      cursor.setDate(cursor.getDate() + 14);
    }
  } else if (tipo === TipoAgenda.MENSAL) {
    while (out.length < count) {
      const y = cursor.getFullYear();
      const mo = cursor.getMonth();
      const d = new Date(y, mo, Math.min(diaMes || 1, 28), h, m, 0, 0);
      if (d <= now) d.setMonth(d.getMonth() + 1);
      pushIfFuture(d);
      cursor = new Date(d.getFullYear(), d.getMonth() + 1, 1);
    }
  }
  return out;
}

function prettyAgenda(a) {
  if (!a) return "—";
  const h = a.hora || "09:00";
  if (a.tipo === TipoAgenda.DIARIO) return `Diário às ${h}`;
  if (a.tipo === TipoAgenda.SEMANAL) {
    const dias = (a.diasSemana || []).map((d) => ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"][d % 7]).join(", ");
    return `Semanal (${dias}) às ${h}`;
  }
  if (a.tipo === TipoAgenda.MENSAL) return `Mensal (dia ${a.diaMes || 1}) às ${h}`;
  if (a.tipo === TipoAgenda.CUSTOM) return `Custom (RRULE)`;
  return "—";
}

function replacePlaceholders(msg, { repNome, marcaNome, dataBase }) {
  return (msg || "")
    .replaceAll("{NOME_REP}", repNome || "—")
    .replaceAll("{MARCA}", marcaNome || "—")
    .replaceAll("{DATA_BASE}", dataBase || todayBR());
}

/**************************************
 * Self-tests (light runtime assertions)
 **************************************/
function runSelfTests() {
  const notes = [];
  try {
    // validateE164BR
    console.assert(validateE164BR("5561987654321").ok === true, "E.164 válido deve passar");
    console.assert(validateE164BR("51987654321").ok === false, "Sem 55 deve falhar");
    notes.push("validateE164BR ok");

    // replacePlaceholders
    const r = replacePlaceholders("Olá {NOME_REP} da {MARCA} em {DATA_BASE}", { repNome: "Ana", marcaNome: "MarcaX", dataBase: "01/01/2025" });
    console.assert(r.includes("Ana") && r.includes("MarcaX") && r.includes("01/01/2025"), "Placeholders devem substituir");
    notes.push("replacePlaceholders ok");

    // nextOccurrences basic
    const occD = nextOccurrences({ tipo: TipoAgenda.DIARIO, hora: "09:00" }, 3);
    console.assert(occD.length === 3, "DIARIO deve gerar 3 ocorrências");
    const occW = nextOccurrences({ tipo: TipoAgenda.SEMANAL, hora: "10:00", diasSemana: [1,3,5] }, 3);
    console.assert(occW.length === 3, "SEMANAL deve gerar 3 ocorrências");
    notes.push("nextOccurrences ok");

    // prettyAgenda
    console.assert(prettyAgenda({ tipo: TipoAgenda.DIARIO, hora: "09:00" }).startsWith("Diário"), "prettyAgenda diário");
    notes.push("prettyAgenda ok");

    return { ok: true, notes };
  } catch (e) {
    return { ok: false, notes: notes.concat(String(e)) };
  }
}

/**************************************
 * Component
 **************************************/
export default function PainelSecretariaIA() {
  // persistence
  const [brands, setBrands] = useState(() => JSON.parse(localStorage.getItem("psia_brands") || "[]"));
  const [reps, setReps] = useState(() => JSON.parse(localStorage.getItem("psia_reps") || "[]"));
  const [solics, setSolics] = useState(() => JSON.parse(localStorage.getItem("psia_solics") || "[]"));
  const [config, setConfig] = useState(() => JSON.parse(localStorage.getItem("psia_config") || JSON.stringify(initialConfig)));
  const [tab, setTab] = useState(Tab.SOLIC);
  const [testStatus, setTestStatus] = useState({ ok: true, notes: [] });

  useEffect(() => localStorage.setItem("psia_brands", JSON.stringify(brands)), [brands]);
  useEffect(() => localStorage.setItem("psia_reps", JSON.stringify(reps)), [reps]);
  useEffect(() => localStorage.setItem("psia_solics", JSON.stringify(solics)), [solics]);
  useEffect(() => localStorage.setItem("psia_config", JSON.stringify(config)), [config]);

  useEffect(() => {
    const res = runSelfTests();
    setTestStatus(res);
    if (!res.ok) console.error("Self-tests falharam:", res.notes);
    else console.log("Self-tests OK:", res.notes);
  }, []);

  // forms state
  const [brandForm, setBrandForm] = useState({ nome: "", ativa: true });
  const [repForm, setRepForm] = useState({ nome: "", whatsapp: "55", email: "", marcas: [], brandConfigs: {} });
  const [showRepWizard, setShowRepWizard] = useState(false);
  const [repStep, setRepStep] = useState(1);

  // solicitation wizard
  const emptySolic = {
    marcaId: "",
    titulo: "",
    mensagem: "Bom dia, {NOME_REP}! Pode enviar o saldo de estoque da {MARCA} de {DATA_BASE}?",
    reps: [],
    agenda: { tipo: TipoAgenda.DIARIO, hora: "09:00", diasUteis: true, pularFeriados: false, diasSemana: [1], diaMes: 1, rrule: "" },
    ativo: true,
  };
  const [solWizard, setSolWizard] = useState(emptySolic);
  const [solStep, setSolStep] = useState(1);
  const [filter, setFilter] = useState("");
  const [toast, setToast] = useState(null);

  const selectedBrand = brands.find((b) => b.id === solWizard.marcaId);
  const previewRep = reps.find((r) => solWizard.reps[0] === r.id);
  const previewText = replacePlaceholders(solWizard.mensagem, {
    repNome: previewRep?.nome,
    marcaNome: selectedBrand?.nome,
    dataBase: todayBR(),
  });

  const occurrences = useMemo(() => {
    if (solWizard.agenda.tipo === TipoAgenda.CUSTOM) return [];
    return nextOccurrences(solWizard.agenda, 3);
  }, [solWizard.agenda]);

  function addBrand() {
    const name = brandForm.nome.trim();
    if (name.length < 2) return setToast({ type: "error", msg: "Nome da marca muito curto" });
    if (brands.some((b) => b.nome.toLowerCase() === name.toLowerCase())) return setToast({ type: "error", msg: "Marca já existe" });
    setBrands([...brands, { id: uid(), nome: name, ativa: !!brandForm.ativa }]);
    setBrandForm({ nome: "", ativa: true });
    setToast({ type: "ok", msg: "Marca criada" });
  }

  function addRepQuick() {
    const nome = repForm.nome.trim();
    const val = validateE164BR(repForm.whatsapp);
    if (nome.length < 2) return setToast({ type: "error", msg: "Nome do representante inválido" });
    if (!val.ok) return setToast({ type: "error", msg: `WhatsApp: ${val.msg}` });
    if (reps.some((r) => r.whatsapp === val.value)) return setToast({ type: "error", msg: "WhatsApp já cadastrado" });
    setReps([{ id: uid(), nome, whatsapp: val.value, email: repForm.email.trim(), marcas: repForm.marcas, brandConfigs: repForm.brandConfigs }, ...reps]);
    setRepForm({ nome: "", whatsapp: "55", email: "", marcas: [], brandConfigs: {} });
    setToast({ type: "ok", msg: "Representante adicionado" });
  }

  function saveRepFromWizard() {
    const nome = repForm.nome.trim();
    const val = validateE164BR(repForm.whatsapp);
    if (nome.length < 2) return setToast({ type: "error", msg: "Nome do representante inválido" });
    if (!val.ok) return setToast({ type: "error", msg: `WhatsApp: ${val.msg}` });
    if (!repForm.marcas.length) return setToast({ type: "error", msg: "Selecione ao menos uma marca" });
    const newRep = { id: uid(), nome, whatsapp: val.value, email: repForm.email.trim(), marcas: repForm.marcas.slice(), brandConfigs: repForm.brandConfigs };
    setReps([newRep, ...reps]);
    setShowRepWizard(false); setRepStep(1);
    setRepForm({ nome: "", whatsapp: "55", email: "", marcas: [], brandConfigs: {} });
    setToast({ type: "ok", msg: "Representante cadastrado com frequências por marca" });
  }

  function saveSolicitation() {
    if (!solWizard.marcaId) return setToast({ type: "error", msg: "Selecione a marca" });
    if (!solWizard.titulo.trim()) return setToast({ type: "error", msg: "Informe o título" });
    if (!solWizard.mensagem || solWizard.mensagem.length < 10) return setToast({ type: "error", msg: "Mensagem muito curta" });
    if (!solWizard.reps.length) return setToast({ type: "error", msg: "Escolha ao menos um representante" });
    if (!solWizard.agenda.hora) return setToast({ type: "error", msg: "Defina a hora" });
    if (solWizard.agenda.tipo === TipoAgenda.SEMANAL && !(solWizard.agenda.diasSemana?.length)) return setToast({ type: "error", msg: "Escolha ao menos um dia da semana" });
    if (solWizard.agenda.tipo === TipoAgenda.MENSAL && !solWizard.agenda.diaMes) return setToast({ type: "error", msg: "Defina o dia do mês" });
    if (solWizard.agenda.tipo === TipoAgenda.CUSTOM && !solWizard.agenda.rrule) return setToast({ type: "error", msg: "Informe a RRULE" });

    const entry = { id: uid(), ...solWizard };
    setSolics([entry, ...solics]); setSolWizard(emptySolic); setSolStep(1);
    setToast({ type: "ok", msg: "Solicitação criada" });
  }

  function sendTest(solic) {
    const rep = reps.find((r) => solic.reps[0] === r.id);
    const brand = brands.find((b) => b.id === solic.marcaId);
    const msg = replacePlaceholders(solic.mensagem, { repNome: rep?.nome, marcaNome: brand?.nome, dataBase: todayBR() });
    const destino = (config?.numeroTeste || "55").replace(/\\D/g, "");
    console.log("[ENVIO TESTE]", { destino, msg });
    setToast({ type: "ok", msg: `Teste enviado para ${destino}` });
  }

  function brandName(id) { return brands.find((b) => b.id === id)?.nome || "—"; }

  const filteredSolics = solics.filter((s) => {
    const q = filter.trim().toLowerCase(); if (!q) return true;
    return ((s.titulo || "").toLowerCase().includes(q) || brandName(s.marcaId).toLowerCase().includes(q));
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="font-semibold text-lg">Secretária-IA • Etapa 1</div>
          <nav className="ml-6 hidden sm:flex gap-1">
            {[Tab.SOLIC, Tab.MARCAS, Tab.REPS, Tab.CONFIG].map((t) => (
              <button key={t} onClick={() => setTab(t)} className={classNames("px-3 py-1.5 rounded-md text-sm", tab===t?"bg-slate-900 text-white":"hover:bg-slate-100")}>
                {t === Tab.SOLIC?"Solicitações":t===Tab.MARCAS?"Marcas":t===Tab.REPS?"Representantes":"Configurações"}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {tab === Tab.SOLIC && (<>
              <input value={filter} onChange={(e)=>setFilter(e.target.value)} placeholder="Buscar…" className="px-3 py-1.5 rounded-md border text-sm"/>
              <button onClick={()=>{setSolWizard(emptySolic); setSolStep(1); setTab(Tab.SOLIC);}} className="px-3 py-1.5 rounded-md bg-slate-900 text-white text-sm">Nova Solicitação</button>
            </>)}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* MARCAS */}
        {tab === Tab.MARCAS && (
          <section className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <div className="p-4 bg-white rounded-2xl shadow-sm border">
                <h2 className="font-semibold mb-3">Nova marca</h2>
                <label className="block text-sm mb-1">Nome</label>
                <input value={brandForm.nome} onChange={(e)=>setBrandForm({...brandForm, nome:e.target.value})} className="w-full px-3 py-2 rounded-md border mb-3" placeholder="Ex.: Marca A"/>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={brandForm.ativa} onChange={(e)=>setBrandForm({...brandForm, ativa:e.target.checked})}/> Ativa
                </label>
                <button onClick={addBrand} className="mt-4 w-full px-3 py-2 rounded-md bg-slate-900 text-white">Salvar</button>
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="p-4 bg-white rounded-2xl shadow-sm border">
                <h2 className="font-semibold mb-3">Marcas</h2>
                {!brands.length && <p className="text-sm text-slate-500">Nenhuma marca cadastrada.</p>}
                <ul className="divide-y">
                  {brands.map((b)=> (
                    <li key={b.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{b.nome}</div>
                        <div className="text-xs text-slate-500">{b.ativa?"Ativa":"Inativa"}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={()=> setBrands(brands.map(x=> x.id===b.id?{...x, ativa:!x.ativa}:x))} className="px-2 py-1 rounded border text-sm">{b.ativa?"Desativar":"Ativar"}</button>
                        <button onClick={()=>{ setBrandForm({ nome: b.nome, ativa: b.ativa }); setBrands(brands.filter(x=>x.id!==b.id)); }} className="px-2 py-1 rounded border text-sm">Editar</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* REPS */}
        {tab === Tab.REPS && (
          <section className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <div className="p-4 bg-white rounded-2xl shadow-sm border">
                <h2 className="font-semibold mb-3">Novo representante</h2>
                <p className="text-xs text-slate-500 mb-3">Cadastro rápido ou abra o assistente guiado.</p>
                <div className="flex gap-2 mb-4">
                  <button onClick={()=> setShowRepWizard(true)} className="px-3 py-1.5 rounded-md border text-sm">Cadastro guiado</button>
                </div>
                <label className="block text-sm mb-1">Nome</label>
                <input value={repForm.nome} onChange={(e)=>setRepForm({...repForm, nome:e.target.value})} className="w-full px-3 py-2 rounded-md border mb-3" placeholder="Ex.: Ana Silva"/>
                <label className="block text-sm mb-1">WhatsApp (E.164)</label>
                <input value={repForm.whatsapp} onChange={(e)=>setRepForm({...repForm, whatsapp:e.target.value})} className="w-full px-3 py-2 rounded-md border mb-3" placeholder="Ex.: 55629…"/>
                <label className="block text-sm mb-1">E-mail (opcional)</label>
                <input value={repForm.email} onChange={(e)=>setRepForm({...repForm, email:e.target.value})} className="w-full px-3 py-2 rounded-md border mb-3" placeholder="exemplo@empresa.com"/>
                <label className="block text-sm mb-1">Marcas atendidas</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {brands.map((b)=> (
                    <label key={b.id} className="text-sm inline-flex items-center gap-2">
                      <input type="checkbox" checked={repForm.marcas.includes(b.id)} onChange={(e)=>{
                        setRepForm((s)=> ({...s, marcas: e.target.checked? [...s.marcas, b.id]: s.marcas.filter(id=>id!==b.id)}));
                      }}/>
                      {b.nome}
                    </label>
                  ))}
                </div>
                <button onClick={addRepQuick} className="mt-2 w-full px-3 py-2 rounded-md bg-slate-900 text-white">Salvar (rápido)</button>
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="p-4 bg-white rounded-2xl shadow-sm border">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold mb-3">Representantes</h2>
                </div>
                {!reps.length && <p className="text-sm text-slate-500">Nenhum representante cadastrado.</p>}
                <ul className="divide-y">
                  {reps.map((r)=> (
                    <li key={r.id} className="py-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{r.nome}</div>
                        <div className="text-xs text-slate-500">{r.whatsapp}{r.email?` · ${r.email}`:""}</div>
                        {!!r.marcas?.length && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {r.marcas.map((bid)=> (<span key={bid} className="text-xs bg-slate-100 border rounded px-2 py-0.5">{brandName(bid)}</span>))}
                          </div>
                        )}
                        {!!r.brandConfigs && Object.keys(r.brandConfigs).length>0 && (
                          <div className="mt-1 text-xs text-slate-500">Frequências por marca configuradas</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={()=>{
                          setRepForm({ nome:r.nome, whatsapp:r.whatsapp, email: r.email||"", marcas: r.marcas||[], brandConfigs: r.brandConfigs||{} });
                          setReps(reps.filter(x=>x.id!==r.id));
                          setShowRepWizard(true); setRepStep(1);
                        }} className="px-2 py-1 rounded border text-sm">Editar</button>
                        <button onClick={()=> setReps(reps.filter(x=>x.id!==r.id))} className="px-2 py-1 rounded border text-sm">Excluir</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* SOLICITAÇÕES */}
        {tab === Tab.SOLIC && (
          <section className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="p-4 bg-white rounded-2xl shadow-sm border">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold">Nova solicitação</h2>
                  <div className="text-sm text-slate-500">Passo {solStep}/3</div>
                </div>

                {solStep === 1 && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm mb-1">Marca</label>
                      <select value={solWizard.marcaId} onChange={(e)=> setSolWizard({...solWizard, marcaId: e.target.value})} className="w-full px-3 py-2 border rounded-md">
                        <option value="">Selecione…</option>
                        {brands.map((b)=> <option key={b.id} value={b.id}>{b.nome}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Título</label>
                      <input value={solWizard.titulo} onChange={(e)=> setSolWizard({...solWizard, titulo: e.target.value})} className="w-full px-3 py-2 border rounded-md" placeholder="Ex.: Estoque diário"/>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm mb-1">Mensagem (use {`{NOME_REP}`}, {`{MARCA}`}, {`{DATA_BASE}`})</label>
                      <textarea value={solWizard.mensagem} onChange={(e)=> setSolWizard({...solWizard, mensagem: e.target.value})} rows={4} className="w-full px-3 py-2 border rounded-md"/>
                    </div>
                  </div>
                )}

                {solStep === 2 && (
                  <div>
                    <label className="block text-sm mb-2">Representantes</label>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {reps.map((r)=> (
                        <label key={r.id} className={classNames("border rounded-md p-2 flex items-center gap-2 cursor-pointer", solWizard.reps.includes(r.id)?"bg-slate-50 border-slate-400":"hover:bg-slate-50")}>
                          <input type="checkbox" checked={solWizard.reps.includes(r.id)} onChange={(e)=>{
                            setSolWizard((s)=> ({...s, reps: e.target.checked? [...s.reps, r.id] : s.reps.filter(id=> id!==r.id)}));
                          }}/>
                          <div>
                            <div className="font-medium text-sm">{r.nome}</div>
                            <div className="text-xs text-slate-500">{r.whatsapp}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {solStep === 3 && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm mb-1">Tipo</label>
                      <select value={solWizard.agenda.tipo} onChange={(e)=> setSolWizard({...solWizard, agenda: {...solWizard.agenda, tipo: e.target.value}})} className="w-full px-3 py-2 border rounded-md">
                        {Object.values(TipoAgenda).map((t)=> <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm mb-1">Hora</label>
                      <input type="time" value={solWizard.agenda.hora} onChange={(e)=> setSolWizard({...solWizard, agenda: {...solWizard.agenda, hora: e.target.value}})} className="w-full px-3 py-2 border rounded-md"/>
                    </div>

                    {solWizard.agenda.tipo === TipoAgenda.SEMANAL && (
                      <div className="md:col-span-2">
                        <div className="text-sm mb-1">Dias da semana</div>
                        <div className="flex flex-wrap gap-2">
                          {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((d, idx)=> (
                            <label key={d} className={classNames("px-3 py-1.5 rounded-md border text-sm cursor-pointer", solWizard.agenda.diasSemana.includes(idx)?"bg-slate-900 text-white border-slate-900":"hover:bg-slate-50")} onClick={()=>{
                              setSolWizard((s)=> ({...s, agenda: {...s.agenda, diasSemana: s.agenda.diasSemana.includes(idx) ? s.agenda.diasSemana.filter(x=>x!==idx) : [...s.agenda.diasSemana, idx] }}));
                            }}>{d}</label>
                          ))}
                        </div>
                      </div>
                    )}

                    {solWizard.agenda.tipo === TipoAgenda.MENSAL && (
                      <div>
                        <label className="block text-sm mb-1">Dia do mês</label>
                        <input type="number" min={1} max={31} value={solWizard.agenda.diaMes} onChange={(e)=> setSolWizard({...solWizard, agenda: {...solWizard.agenda, diaMes: Number(e.target.value)}})} className="w-full px-3 py-2 border rounded-md"/>
                      </div>
                    )}

                    {solWizard.agenda.tipo === TipoAgenda.CUSTOM && (
                      <div className="md:col-span-2">
                        <label className="block text-sm mb-1">RRULE (avançado)</label>
                        <input value={solWizard.agenda.rrule} onChange={(e)=> setSolWizard({...solWizard, agenda: {...solWizard.agenda, rrule: e.target.value}})} placeholder="RRULE:FREQ=WEEKLY;BYDAY=MO;BYHOUR=10;BYMINUTE=0;BYSECOND=0" className="w-full px-3 py-2 border rounded-md"/>
                        <p className="text-xs text-slate-500 mt-1">Usado na Etapa 2 para agendamentos reais.</p>
                      </div>
                    )}

                    <div className="md:col-span-2 flex items-center gap-3">
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={solWizard.agenda.diasUteis} onChange={(e)=> setSolWizard({...solWizard, agenda: {...solWizard.agenda, diasUteis: e.target.checked}})} /> Seg–Sex somente
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={solWizard.agenda.pularFeriados} onChange={(e)=> setSolWizard({...solWizard, agenda: {...solWizard.agenda, pularFeriados: e.target.checked}})} /> Pular feriados
                      </label>
                    </div>

                    <div className="md:col-span-2">
                      <div className="text-sm font-medium mb-1">Resumo</div>
                      <div className="text-sm text-slate-700">{prettyAgenda(solWizard.agenda)}</div>
                      {solWizard.agenda.tipo !== TipoAgenda.CUSTOM && (
                        <div className="mt-2 text-xs text-slate-500">
                          Próximas ocorrências: {occurrences.map((d,i)=> <span key={i} className="inline-block bg-slate-100 px-2 py-0.5 rounded border mr-1">{d.toLocaleString("pt-BR", { timeZone: TZ })}</span>)}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-4 flex justify-between">
                  <div className="flex gap-2">
                    <button disabled={solStep===1} onClick={()=> setSolStep((s)=> Math.max(1, s-1))} className={classNames("px-3 py-2 rounded-md border", solStep===1 && "opacity-40 cursor-not-allowed")}>Voltar</button>
                    <button disabled={solStep===3} onClick={()=> setSolStep((s)=> Math.min(3, s+1))} className={classNames("px-3 py-2 rounded-md border", solStep===3 && "opacity-40 cursor-not-allowed")}>Avançar</button>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=> saveSolicitation()} className="px-3 py-2 rounded-md bg-slate-900 text-white">Salvar</button>
                    <button onClick={()=> { saveSolicitation(); }} className="px-3 py-2 rounded-md border">Salvar e fechar</button>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-white rounded-2xl shadow-sm border">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold">Solicitações</h2>
                  <span className="text-sm text-slate-500">{filteredSolics.length} itens</span>
                </div>
                {!filteredSolics.length && <p className="text-sm text-slate-500">Ainda não há solicitações.</p>}
                <ul className="grid md:grid-cols-2 gap-3">
                  {filteredSolics.map((s)=> (
                    <li key={s.id} className="border rounded-xl p-3 bg-white">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm text-slate-500">{brandName(s.marcaId)}</div>
                          <div className="font-semibold">{s.titulo}</div>
                          <div className="text-xs text-slate-500 mt-1">{prettyAgenda(s.agenda)}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs inline-flex items-center gap-2">
                            <input type="checkbox" checked={s.ativo} onChange={(e)=> setSolics(solics.map(x=> x.id===s.id?{...x, ativo:e.target.checked}:x))}/> Ativo
                          </label>
                          <button onClick={()=> sendTest(s)} className="px-2 py-1 rounded-md border text-sm">Enviar teste</button>
                        </div>
                      </div>
                      <div className="mt-2 text-sm bg-slate-50 rounded p-2 border">
                        {replacePlaceholders(s.mensagem, { repNome: reps.find(r=>r.id===s.reps[0])?.nome, marcaNome: brandName(s.marcaId), dataBase: todayBR() })}
                      </div>
                      {!!s.reps?.length && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {s.reps.map((rid)=> (<span key={rid} className="text-xs bg-slate-100 border rounded px-2 py-0.5">{reps.find(r=>r.id===rid)?.nome || "Rep"}</span>))}
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <button onClick={()=>{ setSolWizard(s); setSolStep(1); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="px-2 py-1 rounded-md border text-sm">Editar</button>
                        <button onClick={()=> setSolics(solics.filter(x=> x.id!==s.id))} className="px-2 py-1 rounded-md border text-sm">Excluir</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <aside className="lg:col-span-1">
              <div className="p-4 bg-white rounded-2xl shadow-sm border sticky top-20">
                <h3 className="font-semibold mb-2">Pré-visualização</h3>
                <div className="text-xs text-slate-500 mb-2">Render com placeholders</div>
                <div className="p-3 rounded-md bg-slate-50 border text-sm whitespace-pre-wrap">{previewText}</div>
                <div className="mt-3 text-xs text-slate-500">
                  <div><strong>Rep:</strong> {previewRep?.nome || "—"}</div>
                  <div><strong>Marca:</strong> {selectedBrand?.nome || "—"}</div>
                  <div><strong>Data base:</strong> {todayBR()}</div>
                </div>
              </div>
            </aside>
          </section>
        )}

        {/* CONFIG */}
        {tab === Tab.CONFIG && (
          <section className="max-w-2xl">
            <div className="p-4 bg-white rounded-2xl shadow-sm border">
              <h2 className="font-semibold mb-4">Configurações</h2>
              <label className="block text-sm mb-1">Número de teste (E.164)</label>
              <input value={config.numeroTeste} onChange={(e)=> setConfig({...config, numeroTeste: e.target.value})} className="w-full px-3 py-2 border rounded-md mb-4" placeholder="Ex.: 55629…"/>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Timezone</label>
                  <input value={config.timezone} readOnly className="w-full px-3 py-2 border rounded-md bg-slate-50 text-slate-500"/>
                </div>
                <div>
                  <label className="block text-sm mb-1">Janela (somente exibição)</label>
                  <input value={`${config.janela.inicio}–${config.janela.fim} (Seg–Sex)`} readOnly className="w-full px-3 py-2 border rounded-md bg-slate-50 text-slate-500"/>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">Obs.: Nesta etapa o botão "Enviar teste" apenas simula o envio (log no console). Na Etapa 2 conectaremos ao WppConnect/Backend.</p>
            </div>
          </section>
        )}
      </main>

      {/* Modal: Wizard de Representante (2 passos) */}
      {showRepWizard && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-xl border p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">Cadastro de Representante — Passo {repStep}/2</h3>
              <button onClick={()=> setShowRepWizard(false)} className="text-sm px-2 py-1 border rounded">Fechar</button>
            </div>

            {repStep === 1 && (
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1">Nome</label>
                  <input value={repForm.nome} onChange={(e)=>setRepForm({...repForm, nome:e.target.value})} className="w-full px-3 py-2 rounded-md border" placeholder="Ex.: Ana Silva"/>
                </div>
                <div>
                  <label className="block text-sm mb-1">WhatsApp (E.164)</label>
                  <input value={repForm.whatsapp} onChange={(e)=>setRepForm({...repForm, whatsapp:e.target.value})} className="w-full px-3 py-2 rounded-md border" placeholder="Ex.: 55629…"/>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm mb-1">E-mail (opcional)</label>
                  <input value={repForm.email} onChange={(e)=>setRepForm({...repForm, email:e.target.value})} className="w-full px-3 py-2 rounded-md border" placeholder="exemplo@empresa.com"/>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm mb-1">Marcas representadas</label>
                  <div className="flex flex-wrap gap-2">
                    {brands.map((b)=> (
                      <label key={b.id} className={"px-3 py-1.5 rounded-md border text-sm cursor-pointer " + (repForm.marcas.includes(b.id)?"bg-slate-900 text-white border-slate-900":"hover:bg-slate-50")} onClick={()=>{
                        setRepForm((s)=> ({...s, marcas: s.marcas.includes(b.id)? s.marcas.filter(x=>x!==b.id) : [...s.marcas, b.id]}));
                      }}>{b.nome}</label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {repStep === 2 && (
              <div className="space-y-3">
                <p className="text-sm text-slate-600">Defina a <strong>frequência de disparos por marca</strong>. Isso ficará salvo para a Etapa 2.</p>
                {repForm.marcas.length === 0 && (<div className="text-sm text-red-600">Selecione ao menos uma marca no Passo 1.</div>)}
                {repForm.marcas.map((bid)=> {
                  const cfg = repForm.brandConfigs[bid] || { tipo: TipoAgenda.DIARIO, hora: "09:00", diasUteis: true, pularFeriados: false, diasSemana: [1], diaMes: 1, rrule: "" };
                  const setCfg = (next)=> setRepForm((s)=> ({...s, brandConfigs: { ...s.brandConfigs, [bid]: { ...s.brandConfigs[bid], ...next }}}));
                  const occ = cfg.tipo === TipoAgenda.CUSTOM ? [] : nextOccurrences(cfg, 3);
                  return (
                    <div key={bid} className="border rounded-xl p-3">
                      <div className="font-medium mb-2">{brands.find(b=>b.id===bid)?.nome}</div>
                      <div className="grid md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm mb-1">Tipo</label>
                          <select value={cfg.tipo} onChange={(e)=> setCfg({ tipo: e.target.value })} className="w-full px-3 py-2 border rounded-md">
                            {Object.values(TipoAgenda).map((t)=> <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm mb-1">Hora</label>
                          <input type="time" value={cfg.hora} onChange={(e)=> setCfg({ hora: e.target.value })} className="w-full px-3 py-2 border rounded-md"/>
                        </div>
                        {cfg.tipo === TipoAgenda.SEMANAL && (
                          <div className="md:col-span-2">
                            <div className="text-sm mb-1">Dias</div>
                            <div className="flex flex-wrap gap-2">
                              {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map((d, idx)=> (
                                <label key={d} className={"px-3 py-1.5 rounded-md border text-sm cursor-pointer " + (cfg.diasSemana?.includes(idx)?"bg-slate-900 text-white border-slate-900":"hover:bg-slate-50")} onClick={()=>{
                                  const ds = cfg.diasSemana || [];
                                  const next = ds.includes(idx)? ds.filter(x=>x!==idx) : [...ds, idx];
                                  setCfg({ diasSemana: next });
                                }}>{d}</label>
                              ))}
                            </div>
                          </div>
                        )}
                        {cfg.tipo === TipoAgenda.MENSAL && (
                          <div>
                            <label className="block text-sm mb-1">Dia do mês</label>
                            <input type="number" min={1} max={31} value={cfg.diaMes} onChange={(e)=> setCfg({ diaMes: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-md"/>
                          </div>
                        )}
                        {cfg.tipo === TipoAgenda.CUSTOM && (
                          <div className="md:col-span-2">
                            <label className="block text-sm mb-1">RRULE</label>
                            <input value={cfg.rrule} onChange={(e)=> setCfg({ rrule: e.target.value })} placeholder="RRULE:FREQ=WEEKLY;BYDAY=MO;BYHOUR=10;BYMINUTE=0;BYSECOND=0" className="w-full px-3 py-2 border rounded-md"/>
                          </div>
                        )}
                        <div className="md:col-span-2 flex items-center gap-3">
                          <label className="inline-flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={!!cfg.diasUteis} onChange={(e)=> setCfg({ diasUteis: e.target.checked })}/> Seg–Sex
                          </label>
                          <label className="inline-flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={!!cfg.pularFeriados} onChange={(e)=> setCfg({ pularFeriados: e.target.checked })}/> Pular feriados
                          </label>
                        </div>
                        <div className="md:col-span-2 text-xs text-slate-500">
                          {cfg.tipo !== TipoAgenda.CUSTOM && (
                            <div>Próximas: {occ.map((d,i)=> <span key={i} className="inline-block bg-slate-100 px-2 py-0.5 rounded border mr-1">{d.toLocaleString("pt-BR", { timeZone: TZ })}</span>)}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-4 flex justify-between">
              <button disabled={repStep===1} onClick={()=> setRepStep((s)=> Math.max(1, s-1))} className={"px-3 py-2 rounded-md border " + (repStep===1?"opacity-40 cursor-not-allowed":"")}>Voltar</button>
              <div className="flex gap-2">
                {repStep<2 && (<button onClick={()=> setRepStep(2)} className="px-3 py-2 rounded-md border">Avançar</button>)}
                {repStep===2 && (<button onClick={saveRepFromWizard} className="px-3 py-2 rounded-md bg-slate-900 text-white">Salvar representante</button>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-white border shadow-lg rounded-xl px-4 py-2 text-sm">
          <div className={toast.type === 'error' ? 'text-red-600' : 'text-emerald-700'}>{toast.msg}</div>
        </div>
      )}

      {/* Self-test badge */}
      <div className="fixed bottom-4 right-4 text-xs">
        <span className={classNames("px-2 py-1 rounded-full border", testStatus.ok?"bg-emerald-50 text-emerald-700 border-emerald-200":"bg-red-50 text-red-700 border-red-200")}>{testStatus.ok?"Self-tests: OK":"Self-tests: Falhou"}</span>
      </div>
    </div>
  );
}
