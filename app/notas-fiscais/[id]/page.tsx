"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoeda, formatData } from "@/lib/utils";

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
  ncm: string; cfop: string; cst: string; csosn: string;
  quantidade: number; valorUnitario: number; valorProduto: number;
  icmsValor: number; ipiValor: number; pisValor: number; cofinsValor: number;
  validacoes: Validacao[]; creditos: Credito[]; simulacoes: Simulacao[];
}
interface NotaDetalhe {
  id: number; numero: string; serie: string; dataEmissao: string;
  emitNome: string; emitCnpj: string; emitUf: string;
  destNome: string; destCnpj: string; destUf: string;
  tpNF: number; valorTotal: number; status: string;
  itens: Item[];
}

export default function NotaFiscalDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [nota, setNota] = useState<NotaDetalhe | null>(null);
  const [ano, setAno] = useState(2027);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/notas-fiscais/${id}`)
      .then((r) => r.json())
      .then((d) => setNota(d.nota ?? null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-8 text-muted-foreground">Carregando...</div>;
  if (!nota) return <div className="p-8 text-muted-foreground">Nota fiscal não encontrada.</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <Link href="/notas-fiscais" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
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

          return (
            <Card key={item.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <CardTitle>{item.numeroItem}. {item.descricao}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      NCM {item.ncm} · CFOP {item.cfop} · {item.cst ? `CST ${item.cst}` : `CSOSN ${item.csosn}`} · {item.quantidade}x {formatMoeda(item.valorUnitario)}
                    </p>
                  </div>
                  <p className="font-semibold whitespace-nowrap">{formatMoeda(item.valorProduto)}</p>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-6">
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
                      <p>Categoria: <Badge variant="outline">{simulacao.categoriaAliquota}</Badge></p>
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
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
