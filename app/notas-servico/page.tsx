"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { UploadNotaServico } from "@/components/notas-servico/UploadNotaServico";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoeda, formatData } from "@/lib/utils";

interface NotaResumo {
  id: number;
  arquivoOrigem: string;
  tipoDocumento: string;
  status: string;
  numero: string;
  dataEmissao: string | null;
  prestadorNome: string;
  prestadorCnpj: string;
  valorServico: number | null;
  itemServicoCodigoBase: string | null;
}

const LABEL_TIPO: Record<string, string> = {
  danfse_nacional: "DANFSe (padrão nacional)",
  nfcom: "NFCom",
  municipal_generico: "NFS-e (layout municipal)",
};

export default function NotasServicoPage() {
  const [notas, setNotas] = useState<NotaResumo[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/notas-servico");
    const data = await res.json();
    setNotas(data.notas ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Notas de Serviço</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Importe PDFs de NFS-e (padrão nacional ou layout municipal) e NFCom para conferir a retenção federal
          (IRRF/PCC) contra o que foi declarado na nota.
        </p>
      </div>

      <UploadNotaServico onSucesso={carregar} />

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Prestador</TableHead>
              <TableHead>Emissão</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Item LC 116</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            )}
            {!loading && notas.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma nota de serviço importada ainda.</TableCell></TableRow>
            )}
            {notas.map((n) => (
              <TableRow key={n.id}>
                <TableCell>
                  <Link href={`/notas-servico/${n.id}`} className="font-medium text-primary hover:underline">
                    {n.numero || n.arquivoOrigem}
                  </Link>
                </TableCell>
                <TableCell className="max-w-56 truncate" title={n.prestadorNome}>{n.prestadorNome || "—"}</TableCell>
                <TableCell>{n.dataEmissao ? formatData(n.dataEmissao) : "—"}</TableCell>
                <TableCell><Badge variant="outline">{LABEL_TIPO[n.tipoDocumento] ?? n.tipoDocumento}</Badge></TableCell>
                <TableCell className="font-mono">{n.itemServicoCodigoBase ?? "—"}</TableCell>
                <TableCell>{n.valorServico !== null ? formatMoeda(n.valorServico) : "—"}</TableCell>
                <TableCell>
                  {n.status === "Confirmada" ? (
                    <Badge variant="secondary"><CheckCircle2 />Confirmada</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200"><AlertTriangle />Necessita revisão</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
