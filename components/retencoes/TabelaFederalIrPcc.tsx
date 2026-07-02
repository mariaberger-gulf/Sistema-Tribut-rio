"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ItemFederal {
  id: number;
  codigo: string;
  codigoBase: string;
  itemGrupo: string;
  grupoDescricao: string;
  descricao: string;
  pis: string;
  cofins: string;
  csll: string;
  irrf15: string;
  irrf10: string;
  observacaoFederal: string;
  inss: string;
  observacaoInss: string;
}

function numeroOrdenacao(codigoBase: string): number {
  const [grupo, sub] = codigoBase.split(".").map(Number);
  return (grupo || 0) * 1000 + (sub || 0);
}

function BadgeStatus({ valor }: { valor: string }) {
  const v = valor.trim().toUpperCase();
  const variant = v === "SIM" ? "secondary" : v === "NÃO" || v === "—" || v === "-" ? "outline" : "default";
  const className = v === "SIM" ? "bg-emerald-100 text-emerald-800 border-emerald-200" : v.includes("SIM") || v.includes("SALVO") ? "bg-amber-100 text-amber-800 border-amber-200" : "";
  return <Badge variant={variant} className={className}>{valor}</Badge>;
}

export function TabelaFederalIrPcc() {
  const [itens, setItens] = useState<ItemFederal[]>([]);
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/retencoes/itens?all=1")
      .then((r) => r.json())
      .then((d) => setItens(d.itens ?? []))
      .finally(() => setLoading(false));
  }, []);

  const itensOrdenados = useMemo(
    () => [...itens].sort((a, b) => numeroOrdenacao(a.codigoBase) - numeroOrdenacao(b.codigoBase) || a.codigo.localeCompare(b.codigo)),
    [itens]
  );

  const itensFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return itensOrdenados;
    return itensOrdenados.filter(
      (i) => i.codigo.toLowerCase().includes(termo) || i.descricao.toLowerCase().includes(termo) || i.grupoDescricao.toLowerCase().includes(termo)
    );
  }, [itensOrdenados, busca]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Retenção na fonte por item da Lista de Serviços da LC 116/2003 — IRRF (RIR/2018) e PCC (PIS/COFINS/CSLL, Lei 10.833/2003).
          {!loading && ` ${itensFiltrados.length} de ${itens.length} itens.`}
        </p>
      </div>

      <Input
        placeholder="Buscar por código, descrição ou grupo (ex: 7.05, limpeza, engenharia...)"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="max-w-md"
      />

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Item</TableHead>
              <TableHead>Descrição do serviço</TableHead>
              <TableHead>PIS</TableHead>
              <TableHead>COFINS</TableHead>
              <TableHead>CSLL</TableHead>
              <TableHead>IRRF 1,5%</TableHead>
              <TableHead>IRRF 1,0%</TableHead>
              <TableHead>INSS</TableHead>
              <TableHead>Observações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            )}
            {!loading && itensFiltrados.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhum item encontrado.</TableCell></TableRow>
            )}
            {itensFiltrados.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono font-medium whitespace-nowrap align-top">{item.codigo}</TableCell>
                <TableCell className="whitespace-normal min-w-64 align-top">
                  <p>{item.descricao}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.grupoDescricao}</p>
                </TableCell>
                <TableCell className="align-top"><BadgeStatus valor={item.pis} /></TableCell>
                <TableCell className="align-top"><BadgeStatus valor={item.cofins} /></TableCell>
                <TableCell className="align-top"><BadgeStatus valor={item.csll} /></TableCell>
                <TableCell className="align-top"><BadgeStatus valor={item.irrf15} /></TableCell>
                <TableCell className="align-top"><BadgeStatus valor={item.irrf10} /></TableCell>
                <TableCell className="align-top"><BadgeStatus valor={item.inss} /></TableCell>
                <TableCell className="whitespace-normal min-w-56 text-xs text-muted-foreground align-top">
                  {item.observacaoFederal && item.observacaoFederal !== "—" && <p>{item.observacaoFederal}</p>}
                  {item.observacaoInss && <p className="mt-1">INSS: {item.observacaoInss}</p>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
