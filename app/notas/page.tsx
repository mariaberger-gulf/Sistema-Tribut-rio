"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Trash2 } from "lucide-react";
import { UploadXml } from "@/components/notas-fiscais/UploadXml";
import { UploadNotaServico } from "@/components/notas-servico/UploadNotaServico";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoeda, formatData } from "@/lib/utils";

interface RetencaoResumo {
  calculado: number;
  declarado: number | null;
  divergente: boolean;
}

interface NotaResumo {
  tipo: "fiscal" | "servico";
  id: number;
  documento: string;
  contraparte: string;
  dataEmissao: string | null;
  valor: number | null;
  status: "ok" | "erro" | "aviso" | "revisao";
  totalItens: number | null;
  totalErros: number;
  totalAvisos: number;
  retencao: RetencaoResumo | null;
}

function CelulaRetencao({ nota }: { nota: NotaResumo }) {
  if (nota.tipo === "fiscal") {
    return <span className="text-muted-foreground">não se aplica</span>;
  }
  if (!nota.retencao) {
    return <span className="text-muted-foreground" title="Sem item da lista de serviços (LC 116) vinculado — não é possível calcular.">—</span>;
  }
  if (nota.retencao.calculado <= 0) {
    return <span className="text-muted-foreground">não</span>;
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className={nota.retencao.divergente ? "text-red-600 font-medium" : ""}>{formatMoeda(nota.retencao.calculado)}</span>
      {nota.retencao.divergente && (
        <span title={`Declarado na nota: ${formatMoeda(nota.retencao.declarado ?? 0)} — divergente do calculado`}>
          <AlertTriangle className="size-4 text-red-600 shrink-0" />
        </span>
      )}
    </div>
  );
}

function CelulaStatus({ nota }: { nota: NotaResumo }) {
  if (nota.status === "revisao") {
    return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200"><AlertTriangle />Revisão pendente</Badge>;
  }
  if (nota.status === "erro") {
    return <Badge variant="destructive"><AlertTriangle />{nota.totalErros} erro(s)</Badge>;
  }
  if (nota.status === "aviso") {
    return <Badge variant="outline"><AlertTriangle />{nota.totalAvisos} aviso(s)</Badge>;
  }
  return <Badge variant="secondary"><CheckCircle2 />OK</Badge>;
}

export default function NotasPage() {
  const [notas, setNotas] = useState<NotaResumo[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/notas");
    const data = await res.json();
    setNotas(data.notas ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const excluir = async (nota: NotaResumo) => {
    if (!confirm(`Excluir esta nota (${nota.documento})? Esta ação não pode ser desfeita.`)) return;
    const endpoint = nota.tipo === "fiscal" ? `/api/notas-fiscais/${nota.id}` : `/api/notas-servico/${nota.id}`;
    await fetch(endpoint, { method: "DELETE" });
    await carregar();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Notas</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Notas fiscais de mercadoria (NF-e) e notas de serviço (NFS-e/NFCom) num só lugar — classificação fiscal,
          crédito tributário, simulação da reforma e conferência de retenção na fonte.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <UploadXml onSucesso={carregar} />
        <UploadNotaServico onSucesso={carregar} />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Contraparte</TableHead>
              <TableHead>Emissão</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Retenção</TableHead>
              <TableHead>Consistência</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">Carregando...</TableCell>
              </TableRow>
            )}
            {!loading && notas.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma nota importada ainda.</TableCell>
              </TableRow>
            )}
            {notas.map((n) => (
              <TableRow key={`${n.tipo}-${n.id}`}>
                <TableCell>
                  <Badge variant="outline">{n.tipo === "fiscal" ? "Mercadoria" : "Serviço"}</Badge>
                </TableCell>
                <TableCell>
                  <Link
                    href={n.tipo === "fiscal" ? `/notas-fiscais/${n.id}` : `/notas-servico/${n.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {n.documento}
                  </Link>
                </TableCell>
                <TableCell className="max-w-48 truncate" title={n.contraparte}>{n.contraparte || "—"}</TableCell>
                <TableCell>{n.dataEmissao ? formatData(n.dataEmissao) : "—"}</TableCell>
                <TableCell>{n.valor !== null ? formatMoeda(n.valor) : "—"}</TableCell>
                <TableCell><CelulaRetencao nota={n} /></TableCell>
                <TableCell><CelulaStatus nota={n} /></TableCell>
                <TableCell>
                  <button
                    onClick={() => excluir(n)}
                    className="text-muted-foreground hover:text-red-600"
                    title="Excluir nota"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
