"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface TabelaItem {
  id: number;
  prefixoNcm: string;
  descricao: string;
  categoria: string;
  seletivo: boolean;
  aliquotaSeletivo: number;
  ativo: boolean;
}

const CATEGORIAS = [
  { value: "padrao", label: "Padrão" },
  { value: "reduzida40", label: "Reduzida 40%" },
  { value: "reduzida60", label: "Reduzida 60%" },
  { value: "isenta", label: "Isenta" },
];

export default function ConfiguracaoPage() {
  const [tabela, setTabela] = useState<TabelaItem[]>([]);
  const [cbs, setCbs] = useState("8.8");
  const [ibs, setIbs] = useState("17.7");
  const [salvandoAliquotas, setSalvandoAliquotas] = useState(false);

  const [novoPrefixo, setNovoPrefixo] = useState("");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [novaCategoria, setNovaCategoria] = useState("padrao");

  const carregar = useCallback(async () => {
    const [resTabela, resConfig] = await Promise.all([
      fetch("/api/configuracao/tabela-aliquota"),
      fetch("/api/configuracao/reforma"),
    ]);
    const dataTabela = await resTabela.json();
    const dataConfig = await resConfig.json();
    setTabela(dataTabela.tabela ?? []);
    if (dataConfig.configuracao) {
      setCbs(String(dataConfig.configuracao.aliquotaPadraoCbs));
      setIbs(String(dataConfig.configuracao.aliquotaPadraoIbs));
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const salvarAliquotas = async () => {
    setSalvandoAliquotas(true);
    await fetch("/api/configuracao/reforma", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aliquotaPadraoCbs: Number(cbs), aliquotaPadraoIbs: Number(ibs) }),
    });
    setSalvandoAliquotas(false);
  };

  const adicionarLinha = async () => {
    if (!novaDescricao) return;
    await fetch("/api/configuracao/tabela-aliquota", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefixoNcm: novoPrefixo, descricao: novaDescricao, categoria: novaCategoria }),
    });
    setNovoPrefixo("");
    setNovaDescricao("");
    setNovaCategoria("padrao");
    carregar();
  };

  const alternarAtivo = async (item: TabelaItem) => {
    await fetch(`/api/configuracao/tabela-aliquota/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !item.ativo }),
    });
    carregar();
  };

  const remover = async (id: number) => {
    await fetch(`/api/configuracao/tabela-aliquota/${id}`, { method: "DELETE" });
    carregar();
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configuração</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Ajuste as alíquotas padrão de CBS/IBS e a tabela de categorias por NCM usadas na simulação da Reforma Tributária.
          A regulamentação ainda está em transição — mantenha estes valores atualizados.
        </p>
      </div>

      <Card className="max-w-md">
        <CardHeader><CardTitle>Alíquotas padrão</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>CBS padrão (%)</Label>
            <Input type="number" step="0.01" value={cbs} onChange={(e) => setCbs(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>IBS padrão (%)</Label>
            <Input type="number" step="0.01" value={ibs} onChange={(e) => setIbs(e.target.value)} />
          </div>
          <Button onClick={salvarAliquotas} disabled={salvandoAliquotas}>
            {salvandoAliquotas ? "Salvando..." : "Salvar alíquotas"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Tabela de categorias por NCM</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="space-y-1.5">
              <Label>Prefixo NCM</Label>
              <Input placeholder="ex: 1006 (vazio = padrão)" value={novoPrefixo} onChange={(e) => setNovoPrefixo(e.target.value)} className="w-48" />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input placeholder="ex: Arroz (cesta básica)" value={novaDescricao} onChange={(e) => setNovaDescricao(e.target.value)} className="w-64" />
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={novaCategoria} onValueChange={(v) => setNovaCategoria(v ?? "padrao")}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={adicionarLinha}><Plus />Adicionar</Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Prefixo NCM</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Seletivo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tabela.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono">{item.prefixoNcm || "(padrão)"}</TableCell>
                  <TableCell>{item.descricao}</TableCell>
                  <TableCell><Badge variant="outline">{item.categoria}</Badge></TableCell>
                  <TableCell>{item.seletivo ? `Sim (${item.aliquotaSeletivo}%)` : "Não"}</TableCell>
                  <TableCell>
                    <button onClick={() => alternarAtivo(item)}>
                      <Badge variant={item.ativo ? "secondary" : "outline"}>{item.ativo ? "Ativo" : "Inativo"}</Badge>
                    </button>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon-sm" onClick={() => remover(item.id)}>
                      <Trash2 className="text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
