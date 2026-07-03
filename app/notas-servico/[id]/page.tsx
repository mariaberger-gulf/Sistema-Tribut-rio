"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SeletorItemServico, type ItemServico } from "@/components/retencoes/SeletorItemServico";
import { formatMoeda, formatData } from "@/lib/utils";

interface NotaServico {
  id: number;
  arquivoOrigem: string;
  tipoDocumento: string;
  status: string;
  chaveAcesso: string | null;
  numero: string;
  dataEmissao: string | null;
  competencia: string;
  prestadorCnpj: string;
  prestadorNome: string;
  prestadorMunicipio: string;
  prestadorSimplesNacional: boolean;
  tomadorCnpj: string;
  tomadorNome: string;
  tomadorMunicipio: string;
  itemServicoCodigoBase: string | null;
  descricaoServico: string;
  valorServico: number | null;
  aliquotaIss: number | null;
  issRetido: boolean | null;
  valorIss: number | null;
  irrfDeclarado: number | null;
  pccDeclarado: number | null;
  valorLiquido: number | null;
  camposNaoEncontrados: string[];
}

interface ItemServicoRef { codigo: string; codigoBase: string; descricao: string; grupoDescricao: string; }
interface Tributo { tributo: string; status: string; valor: number; aliquota: number | null; motivo: string; }
interface Apuracao { pcc: Tributo[]; irrf: Tributo; valorTotalRetido: number; atencao: string[]; }

function LinhaComparativo({ label, calculado, declarado }: { label: string; calculado: number | null; declarado: number | null }) {
  const divergente = calculado !== null && declarado !== null && Math.abs(calculado - declarado) > 0.02;
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border last:border-0 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <span>Calculado: <strong>{calculado !== null ? formatMoeda(calculado) : "—"}</strong></span>
        <span className={divergente ? "text-red-600 font-medium" : ""}>Declarado: <strong>{declarado !== null ? formatMoeda(declarado) : "—"}</strong></span>
        {divergente && <AlertTriangle className="size-4 text-red-600" />}
      </div>
    </div>
  );
}

export default function NotaServicoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [nota, setNota] = useState<NotaServico | null>(null);
  const [itemServico, setItemServico] = useState<ItemServicoRef | null>(null);
  const [apuracao, setApuracao] = useState<Apuracao | null>(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const carregar = async () => {
    const res = await fetch(`/api/notas-servico/${id}`);
    const data = await res.json();
    setNota(data.nota ?? null);
    setItemServico(data.itemServico ?? null);
    setApuracao(data.apuracao ?? null);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, [id]);

  const campo = (chave: keyof NotaServico, valor: unknown) => setNota((prev) => (prev ? { ...prev, [chave]: valor } : prev));

  const salvar = async (statusOverride?: string) => {
    if (!nota) return;
    setSalvando(true);
    await fetch(`/api/notas-servico/${nota.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...nota, status: statusOverride ?? nota.status }),
    });
    setSalvando(false);
    await carregar();
  };

  const selecionarItem = (item: ItemServico) => {
    campo("itemServicoCodigoBase", item.codigoBase);
    setItemServico(item);
  };

  if (loading) return <div className="p-8 text-muted-foreground">Carregando...</div>;
  if (!nota) return <div className="p-8 text-muted-foreground">Nota de serviço não encontrada.</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <Link href="/notas-servico" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Voltar
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">NFS-e {nota.numero || nota.arquivoOrigem}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Arquivo: {nota.arquivoOrigem} {nota.dataEmissao && `· Emitida em ${formatData(nota.dataEmissao)}`}
          </p>
        </div>
        {nota.status === "Confirmada" ? (
          <Badge variant="secondary"><CheckCircle2 />Confirmada</Badge>
        ) : (
          <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200"><AlertTriangle />Necessita revisão</Badge>
        )}
      </div>

      {nota.camposNaoEncontrados.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
          <p className="text-sm font-medium text-amber-800">Campos que não foram encontrados automaticamente — confira e preencha:</p>
          <p className="text-xs text-amber-700 mt-1">{nota.camposNaoEncontrados.join(", ")}</p>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Prestador</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>CNPJ</Label><Input value={nota.prestadorCnpj} onChange={(e) => campo("prestadorCnpj", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Nome</Label><Input value={nota.prestadorNome} onChange={(e) => campo("prestadorNome", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Município</Label><Input value={nota.prestadorMunicipio} onChange={(e) => campo("prestadorMunicipio", e.target.value)} /></div>
          <label className="flex items-center gap-2 text-sm mt-6">
            <input type="checkbox" checked={nota.prestadorSimplesNacional} onChange={(e) => campo("prestadorSimplesNacional", e.target.checked)} />
            Optante pelo Simples Nacional
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Tomador</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>CNPJ</Label><Input value={nota.tomadorCnpj} onChange={(e) => campo("tomadorCnpj", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Nome</Label><Input value={nota.tomadorNome} onChange={(e) => campo("tomadorNome", e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Município</Label><Input value={nota.tomadorMunicipio} onChange={(e) => campo("tomadorMunicipio", e.target.value)} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Serviço</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Item da lista de serviços (LC 116)</Label>
            <SeletorItemServico
              value={itemServico ? { codigo: itemServico.codigo, codigoBase: itemServico.codigoBase, descricao: itemServico.descricao, grupoDescricao: itemServico.grupoDescricao } : null}
              onChange={selecionarItem}
            />
          </div>
          <div className="space-y-1.5"><Label>Descrição do serviço</Label><Input value={nota.descricaoServico} onChange={(e) => campo("descricaoServico", e.target.value)} /></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5"><Label>Valor do serviço (R$)</Label><Input type="number" step="0.01" value={nota.valorServico ?? ""} onChange={(e) => campo("valorServico", e.target.value ? Number(e.target.value) : null)} /></div>
            <div className="space-y-1.5"><Label>Alíquota ISS (%)</Label><Input type="number" step="0.01" value={nota.aliquotaIss ?? ""} onChange={(e) => campo("aliquotaIss", e.target.value ? Number(e.target.value) : null)} /></div>
            <div className="space-y-1.5"><Label>Valor ISS (R$)</Label><Input type="number" step="0.01" value={nota.valorIss ?? ""} onChange={(e) => campo("valorIss", e.target.value ? Number(e.target.value) : null)} /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Retenções declaradas na nota</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>IRRF declarado (R$)</Label><Input type="number" step="0.01" value={nota.irrfDeclarado ?? ""} onChange={(e) => campo("irrfDeclarado", e.target.value ? Number(e.target.value) : null)} /></div>
          <div className="space-y-1.5"><Label>PCC declarado (R$) — PIS+COFINS+CSLL</Label><Input type="number" step="0.01" value={nota.pccDeclarado ?? ""} onChange={(e) => campo("pccDeclarado", e.target.value ? Number(e.target.value) : null)} /></div>
        </CardContent>
      </Card>

      {apuracao && (
        <Card>
          <CardHeader><CardTitle>Comparativo: calculado pelo sistema vs. declarado na nota</CardTitle></CardHeader>
          <CardContent>
            <LinhaComparativo label="PCC (PIS+COFINS+CSLL)" calculado={apuracao.pcc.reduce((a, t) => a + t.valor, 0)} declarado={nota.pccDeclarado} />
            <LinhaComparativo label="IRRF" calculado={apuracao.irrf.valor} declarado={nota.irrfDeclarado} />
            {apuracao.atencao.length > 0 && (
              <div className="mt-3 space-y-1">
                {apuracao.atencao.map((a, i) => <p key={i} className="text-xs text-amber-700">{a}</p>)}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2">
        <Button onClick={() => salvar()} disabled={salvando} variant="outline">{salvando ? "Salvando..." : "Salvar alterações"}</Button>
        {nota.status !== "Confirmada" && (
          <Button onClick={() => salvar("Confirmada")} disabled={salvando}>Salvar e confirmar</Button>
        )}
      </div>
    </div>
  );
}
