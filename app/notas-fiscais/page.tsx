"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { UploadXml } from "@/components/notas-fiscais/UploadXml";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoeda, formatData } from "@/lib/utils";

interface NotaResumo {
  id: number;
  numero: string;
  serie: string;
  dataEmissao: string;
  emitNome: string;
  destNome: string;
  tpNF: number;
  valorTotal: number;
  status: string;
  totalItens: number;
  totalErros: number;
  totalAvisos: number;
}

export default function NotasFiscaisPage() {
  const [notas, setNotas] = useState<NotaResumo[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/notas-fiscais");
    const data = await res.json();
    setNotas(data.notas ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Notas Fiscais</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Importe XMLs de NF-e para validar classificação fiscal, apurar crédito tributário e simular a Reforma Tributária.
        </p>
      </div>

      <UploadXml onSucesso={carregar} />

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Emitente</TableHead>
              <TableHead>Destinatário</TableHead>
              <TableHead>Emissão</TableHead>
              <TableHead>Operação</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead>Consistência</TableHead>
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
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma nota fiscal importada ainda.</TableCell>
              </TableRow>
            )}
            {notas.map((n) => (
              <TableRow key={n.id} className="cursor-pointer">
                <TableCell>
                  <Link href={`/notas-fiscais/${n.id}`} className="font-medium text-primary hover:underline">
                    {n.numero}/{n.serie}
                  </Link>
                </TableCell>
                <TableCell className="max-w-48 truncate" title={n.emitNome}>{n.emitNome}</TableCell>
                <TableCell className="max-w-48 truncate" title={n.destNome}>{n.destNome}</TableCell>
                <TableCell>{formatData(n.dataEmissao)}</TableCell>
                <TableCell>
                  <Badge variant={n.tpNF === 0 ? "secondary" : "outline"}>{n.tpNF === 0 ? "Entrada" : "Saída"}</Badge>
                </TableCell>
                <TableCell>{formatMoeda(n.valorTotal)}</TableCell>
                <TableCell>{n.totalItens}</TableCell>
                <TableCell>
                  {n.status === "Revisão Pendente" ? (
                    <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200"><AlertTriangle />Revisão pendente (PDF)</Badge>
                  ) : n.totalErros > 0 ? (
                    <Badge variant="destructive"><AlertTriangle />{n.totalErros} erro(s)</Badge>
                  ) : n.totalAvisos > 0 ? (
                    <Badge variant="outline"><AlertTriangle />{n.totalAvisos} aviso(s)</Badge>
                  ) : (
                    <Badge variant="secondary"><CheckCircle2 />OK</Badge>
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
