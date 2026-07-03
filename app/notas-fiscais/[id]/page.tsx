"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, CheckCircle2, XCircle, Pencil, Trash2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatMoeda, formatData, labelCategoriaAliquota } from "@/lib/utils";

const ANOS = [2026, 2027, 2028, 2029, 2030, 2031, 2032, 2033];

interface Validacao { id: number; regra: string; severidade: string; mensagem: string; }
interface Credito { id: number; tipoImposto: string; elegivel: boolean; valorCredito: number; motivo: string; }
interface Simulacao {
  id: number; anoReferencia: number; categoriaAliquota: string;
  aliquotaCbs: number; aliquotaIbs: number; aliquotaIs: number;
  valorCbs: number; valorIbs: number; valorIs: number;
  valorAtual: number; valorReforma: number; delta: number;
}
interface Item {
  id: number; numeroItem: number; codigoProduto: string; descricao: string;
  ncm: string; cest: string; cfop: string; unidade: string; origem: number;
  cst: string; csosn: string;
  quantidade: number; valorUnitario: number; valorProduto: number;
  icmsBase: number; icmsAliquota: number; icmsValor: number;
  ipiValor: number; pisValor: number; cofinsValor: number;
  validacoes: Validacao[]; creditos: Credito[]; simulacoes: Simulacao[];
}
interface NotaDetalhe {
  id: number; numero: string; serie: string; dataEmissao: string;
  emitNome: string; emitCnpj: string; emitUf: string;
  destNome: string; destCnpj: string; destUf: string;
  tpNF: number; valorTotal: number; status: string;
  itens: Item[];
}

interface FormItem {
  codigoProduto: string; descricao: string; ncm: string; cest: string; cfop: string; unidade: string;
  quantidade: string; valorUnitario: string; valorProduto: string;
  origem: string; cst: string; csosn: string;
  icmsBase: string; icmsAliquota: string; icmsValor: string;
}

const FORM_VAZIO: FormItem = {
  codigoProduto: "", descricao: "", ncm: "", cest: "", cfop: "", unidade: "UN",
  quantidade: "", valorUnitario: "", valorProduto: "",
  origem: "0", cst: "", csosn: "",
  icmsBase: "", icmsAliquota: "", icmsValor: "",
};

function itemParaForm(item: Item): FormItem {
  return {
    codigoProduto: item.codigoProduto,
    descricao: item.descricao,
    ncm: item.ncm,
    cest: item.cest,
    cfop: item.cfop,
    unidade: item.unidade,
    quantidade: String(item.quantidade),
    valorUnitario: String(item.valorUnitario),
    valorProduto: String(item.valorProduto),
    origem: String(item.origem),
    cst: item.cst,
    csosn: item.csosn,
    icmsBase: String(item.icmsBase),
    icmsAliquota: String(item.icmsAliquota),
    icmsValor: String(item.icmsValor),
  };
}

function formParaPayload(f: FormItem) {
  const num = (v: string) => (v.trim() === "" ? 0 : Number(v.replace(",", ".")));
  return {
    codigoProduto: f.codigoProduto,
    descricao: f.descricao,
    ncm: f.ncm,
    cest: f.cest,
    cfop: f.cfop,
    unidade: f.unidade,
    quantidade: num(f.quantidade),
    valorUnitario: num(f.valorUnitario),
    valorProduto: num(f.valorProduto),
    origem: num(f.origem),
    cst: f.cst,
    csosn: f.csosn,
    icmsBase: num(f.icmsBase),
    icmsAliquota: num(f.icmsAliquota),
    icmsValor: num(f.icmsValor),
  };
}

function CamposItemForm({ form, onChange }: { form: FormItem; onChange: (campo: keyof FormItem, valor: string) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3">
        <div className="space-y-1"><Label className="text-xs">Código do produto</Label><Input value={form.codigoProduto} onChange={(e) => onChange("codigoProduto", e.target.value)} /></div>
        <div className="col-span-3 space-y-1"><Label className="text-xs">Descrição</Label><Input value={form.descricao} onChange={(e) => onChange("descricao", e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        <div className="space-y-1"><Label className="text-xs">NCM</Label><Input value={form.ncm} onChange={(e) => onChange("ncm", e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">CEST</Label><Input value={form.cest} onChange={(e) => onChange("cest", e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">CFOP</Label><Input value={form.cfop} onChange={(e) => onChange("cfop", e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Unidade</Label><Input value={form.unidade} onChange={(e) => onChange("unidade", e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1"><Label className="text-xs">Quantidade</Label><Input type="number" step="0.0001" value={form.quantidade} onChange={(e) => onChange("quantidade", e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Valor unitário (R$)</Label><Input type="number" step="0.01" value={form.valorUnitario} onChange={(e) => onChange("valorUnitario", e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Valor do produto (R$)</Label><Input type="number" step="0.01" value={form.valorProduto} onChange={(e) => onChange("valorProduto", e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1"><Label className="text-xs">Origem</Label><Input value={form.origem} onChange={(e) => onChange("origem", e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">CST (regime normal)</Label><Input value={form.cst} onChange={(e) => onChange("cst", e.target.value)} placeholder="deixe vazio se Simples" /></div>
        <div className="space-y-1"><Label className="text-xs">CSOSN (Simples Nacional)</Label><Input value={form.csosn} onChange={(e) => onChange("csosn", e.target.value)} placeholder="deixe vazio se regime normal" /></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1"><Label className="text-xs">Base ICMS (R$)</Label><Input type="number" step="0.01" value={form.icmsBase} onChange={(e) => onChange("icmsBase", e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Alíquota ICMS (%)</Label><Input type="number" step="0.01" value={form.icmsAliquota} onChange={(e) => onChange("icmsAliquota", e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Valor ICMS (R$)</Label><Input type="number" step="0.01" value={form.icmsValor} onChange={(e) => onChange("icmsValor", e.target.value)} /></div>
      </div>
      <p className="text-xs text-muted-foreground">PIS, COFINS e IPI geralmente não constam no DANFE e permanecem zerados após a leitura do PDF.</p>
    </div>
  );
}

export default function NotaFiscalDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [nota, setNota] = useState<NotaDetalhe | null>(null);
  const [ano, setAno] = useState(2027);
  const [loading, setLoading] = useState(true);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [formEdicao, setFormEdicao] = useState<FormItem>(FORM_VAZIO);
  const [adicionando, setAdicionando] = useState(false);
  const [formNovo, setFormNovo] = useState<FormItem>(FORM_VAZIO);
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    const res = await fetch(`/api/notas-fiscais/${id}`);
    const data = await res.json();
    setNota(data.nota ?? null);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, [id]);

  const iniciarEdicao = (item: Item) => {
    setEditandoId(item.id);
    setFormEdicao(itemParaForm(item));
  };

  const salvarEdicao = async (itemId: number) => {
    setSalvando(true);
    await fetch(`/api/notas-fiscais/${id}/itens/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formParaPayload(formEdicao)),
    });
    setSalvando(false);
    setEditandoId(null);
    await carregar();
  };

  const removerItem = async (itemId: number) => {
    if (!confirm("Remover este item da nota fiscal?")) return;
    await fetch(`/api/notas-fiscais/${id}/itens/${itemId}`, { method: "DELETE" });
    await carregar();
  };

  const adicionarItem = async () => {
    setSalvando(true);
    await fetch(`/api/notas-fiscais/${id}/itens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formParaPayload(formNovo)),
    });
    setSalvando(false);
    setAdicionando(false);
    setFormNovo(FORM_VAZIO);
    await carregar();
  };

  if (loading) return <div className="p-8 text-muted-foreground">Carregando...</div>;
  if (!nota) return <div className="p-8 text-muted-foreground">Nota fiscal não encontrada.</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <Link href="/notas" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Voltar
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">NF-e {nota.numero}/{nota.serie}</h1>
          <p className="text-sm text-muted-foreground mt-1">Emitida em {formatData(nota.dataEmissao)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Ano de simulação da reforma:</span>
          <Select value={String(ano)} onValueChange={(v) => v && setAno(Number(v))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ANOS.map((a) => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {nota.status === "Revisão Pendente" && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
          <AlertTriangle className="size-4 text-amber-700 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">
            Esta nota foi lida a partir de um PDF e alguns dados podem não ter sido extraídos corretamente. Confira os itens abaixo e edite ou adicione o que faltar.
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>Emitente</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-medium">{nota.emitNome}</p>
            <p className="text-muted-foreground">{nota.emitCnpj} · {nota.emitUf}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Destinatário</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-medium">{nota.destNome}</p>
            <p className="text-muted-foreground">{nota.destCnpj} · {nota.destUf}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Totais</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-medium">{formatMoeda(nota.valorTotal)}</p>
            <p className="text-muted-foreground">{nota.tpNF === 0 ? "Entrada" : "Saída"} · {nota.itens.length} item(ns)</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {nota.itens.map((item) => {
          const simulacao = item.simulacoes.find((s) => s.anoReferencia === ano);
          const erros = item.validacoes.filter((v) => v.severidade === "erro");
          const avisos = item.validacoes.filter((v) => v.severidade === "aviso");
          const emEdicao = editandoId === item.id;

          return (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>{item.numeroItem}. {item.descricao || "(sem descrição)"}</CardTitle>
                    {!emEdicao && (
                      <p className="text-xs text-muted-foreground mt-1">
                        NCM {item.ncm || "—"} · CFOP {item.cfop || "—"} · {item.cst ? `CST ${item.cst}` : item.csosn ? `CSOSN ${item.csosn}` : "sem CST/CSOSN"} · {item.quantidade}x {formatMoeda(item.valorUnitario)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!emEdicao && <p className="font-semibold whitespace-nowrap">{formatMoeda(item.valorProduto)}</p>}
                    {!emEdicao ? (
                      <>
                        <Button size="icon" variant="ghost" onClick={() => iniciarEdicao(item)} title="Editar item"><Pencil className="size-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => removerItem(item.id)} title="Remover item"><Trash2 className="size-4" /></Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {emEdicao ? (
                  <div className="space-y-4">
                    <CamposItemForm form={formEdicao} onChange={(campo, valor) => setFormEdicao((f) => ({ ...f, [campo]: valor }))} />
                    <div className="flex items-center gap-2">
                      <Button onClick={() => salvarEdicao(item.id)} disabled={salvando}>{salvando ? "Salvando..." : "Salvar item"}</Button>
                      <Button variant="outline" onClick={() => setEditandoId(null)} disabled={salvando}>Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-6">
                    {/* Classificação */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Classificação Fiscal</p>
                      {item.validacoes.length === 0 ? (
                        <p className="flex items-center gap-1.5 text-sm text-emerald-600"><CheckCircle2 className="size-4" /> Sem inconsistências</p>
                      ) : (
                        <div className="space-y-1.5">
                          {erros.map((v) => (
                            <p key={v.id} className="flex items-start gap-1.5 text-sm text-red-600">
                              <XCircle className="size-4 mt-0.5 shrink-0" /> {v.mensagem}
                            </p>
                          ))}
                          {avisos.map((v) => (
                            <p key={v.id} className="flex items-start gap-1.5 text-sm text-amber-600">
                              <AlertTriangle className="size-4 mt-0.5 shrink-0" /> {v.mensagem}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Crédito */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Crédito Tributário</p>
                      <div className="space-y-2">
                        {item.creditos.map((c) => (
                          <div key={c.id} className="text-sm">
                            <div className="flex items-center gap-1.5">
                              <Badge variant={c.elegivel ? "secondary" : "outline"}>{c.tipoImposto}</Badge>
                              <span className={c.elegivel ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
                                {c.elegivel ? formatMoeda(c.valorCredito) : "sem crédito"}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{c.motivo}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Simulação da Reforma */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Simulação {ano}</p>
                      {simulacao ? (
                        <div className="text-sm space-y-1">
                          <p>Categoria: <Badge variant="outline">{labelCategoriaAliquota(simulacao.categoriaAliquota)}</Badge></p>
                          <p className="text-muted-foreground">CBS ({simulacao.aliquotaCbs.toFixed(2)}%): {formatMoeda(simulacao.valorCbs)}</p>
                          <p className="text-muted-foreground">IBS ({simulacao.aliquotaIbs.toFixed(2)}%): {formatMoeda(simulacao.valorIbs)}</p>
                          {simulacao.valorIs > 0 && (
                            <p className="text-muted-foreground">Imposto Seletivo: {formatMoeda(simulacao.valorIs)}</p>
                          )}
                          <p className="pt-1 border-t border-border mt-1.5">
                            Atual: {formatMoeda(simulacao.valorAtual)} → Reforma: {formatMoeda(simulacao.valorReforma)}
                          </p>
                          <p className={simulacao.delta > 0.01 ? "text-red-600 font-medium" : simulacao.delta < -0.01 ? "text-emerald-600 font-medium" : "text-muted-foreground"}>
                            {simulacao.delta > 0 ? "+" : ""}{formatMoeda(simulacao.delta)}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Sem simulação para o ano selecionado.</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {adicionando ? (
          <Card>
            <CardHeader><CardTitle>Novo item</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <CamposItemForm form={formNovo} onChange={(campo, valor) => setFormNovo((f) => ({ ...f, [campo]: valor }))} />
              <div className="flex items-center gap-2">
                <Button onClick={adicionarItem} disabled={salvando}>{salvando ? "Adicionando..." : "Adicionar item"}</Button>
                <Button variant="outline" onClick={() => { setAdicionando(false); setFormNovo(FORM_VAZIO); }} disabled={salvando}>Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Button variant="outline" onClick={() => setAdicionando(true)} className="w-full">
            <Plus className="size-4" /> Adicionar item manualmente
          </Button>
        )}
      </div>
    </div>
  );
}
