"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCnpj } from "@/lib/utils";

interface CnaeSecundario { id: number; codigo: string; descricao: string; }
interface ObjetoSocialItem { id: number; descricao: string; origem: string; }
interface Empresa {
  id: number;
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  municipio: string;
  uf: string;
  regimeTributario: string;
  cnaePrincipalCodigo: string;
  cnaePrincipalDescricao: string;
  cnaesSecundarios: CnaeSecundario[];
  objetoSocial: ObjetoSocialItem[];
}

const REGIMES = ["Simples Nacional", "Lucro Presumido", "Lucro Real"];

export default function EmpresaPage() {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [novoCnaeCodigo, setNovoCnaeCodigo] = useState("");
  const [novoCnaeDescricao, setNovoCnaeDescricao] = useState("");
  const [novoObjetoDescricao, setNovoObjetoDescricao] = useState("");
  const [novoObjetoOrigem, setNovoObjetoOrigem] = useState("");

  const carregar = useCallback(async () => {
    const res = await fetch("/api/empresa");
    const data = await res.json();
    setEmpresa(data.empresa ?? null);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const atualizarCampo = (campo: keyof Empresa, valor: string) => {
    setEmpresa((prev) => (prev ? { ...prev, [campo]: valor } : prev));
  };

  const salvar = async () => {
    if (!empresa) return;
    setSalvando(true);
    await fetch("/api/empresa", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: empresa.id,
        razaoSocial: empresa.razaoSocial,
        nomeFantasia: empresa.nomeFantasia,
        municipio: empresa.municipio,
        uf: empresa.uf,
        regimeTributario: empresa.regimeTributario,
        cnaePrincipalCodigo: empresa.cnaePrincipalCodigo,
        cnaePrincipalDescricao: empresa.cnaePrincipalDescricao,
      }),
    });
    setSalvando(false);
  };

  const adicionarCnae = async () => {
    if (!empresa || !novoCnaeCodigo || !novoCnaeDescricao) return;
    await fetch("/api/empresa/cnae", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresaId: empresa.id, codigo: novoCnaeCodigo, descricao: novoCnaeDescricao }),
    });
    setNovoCnaeCodigo("");
    setNovoCnaeDescricao("");
    carregar();
  };

  const removerCnae = async (id: number) => {
    await fetch(`/api/empresa/cnae/${id}`, { method: "DELETE" });
    carregar();
  };

  const adicionarObjeto = async () => {
    if (!empresa || !novoObjetoDescricao) return;
    await fetch("/api/empresa/objeto-social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresaId: empresa.id, descricao: novoObjetoDescricao, origem: novoObjetoOrigem }),
    });
    setNovoObjetoDescricao("");
    setNovoObjetoOrigem("");
    carregar();
  };

  const removerObjeto = async (id: number) => {
    await fetch(`/api/empresa/objeto-social/${id}`, { method: "DELETE" });
    carregar();
  };

  if (!empresa) return <div className="p-8 text-muted-foreground">Carregando...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Empresa</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Dados cadastrais, CNAEs registrados na Receita Federal e objeto social conforme o Estatuto Social.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Dados cadastrais</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>CNPJ</Label>
            <Input value={formatCnpj(empresa.cnpj)} disabled />
          </div>
          <div className="space-y-1.5">
            <Label>Razão social</Label>
            <Input value={empresa.razaoSocial} onChange={(e) => atualizarCampo("razaoSocial", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Nome fantasia</Label>
            <Input value={empresa.nomeFantasia} onChange={(e) => atualizarCampo("nomeFantasia", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Regime tributário</Label>
            <Select value={empresa.regimeTributario} onValueChange={(v) => v && atualizarCampo("regimeTributario", v)}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {REGIMES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Município</Label>
            <Input value={empresa.municipio} onChange={(e) => atualizarCampo("municipio", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>UF</Label>
            <Input value={empresa.uf} maxLength={2} onChange={(e) => atualizarCampo("uf", e.target.value.toUpperCase())} />
          </div>
          <div className="col-span-2">
            <Button onClick={salvar} disabled={salvando}>{salvando ? "Salvando..." : "Salvar dados cadastrais"}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>CNAE principal</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Código</Label>
            <Input value={empresa.cnaePrincipalCodigo} onChange={(e) => atualizarCampo("cnaePrincipalCodigo", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Input value={empresa.cnaePrincipalDescricao} onChange={(e) => atualizarCampo("cnaePrincipalDescricao", e.target.value)} />
          </div>
          <div className="col-span-2">
            <Button onClick={salvar} disabled={salvando}>{salvando ? "Salvando..." : "Salvar CNAE principal"}</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>CNAEs secundários</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="space-y-1.5">
              <Label>Código</Label>
              <Input placeholder="ex: 45.20-0-07" value={novoCnaeCodigo} onChange={(e) => setNovoCnaeCodigo(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1.5 flex-1">
              <Label>Descrição</Label>
              <Input placeholder="Descrição da atividade" value={novoCnaeDescricao} onChange={(e) => setNovoCnaeDescricao(e.target.value)} />
            </div>
            <Button onClick={adicionarCnae}><Plus />Adicionar</Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {empresa.cnaesSecundarios.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono whitespace-nowrap">{c.codigo}</TableCell>
                  <TableCell className="whitespace-normal">{c.descricao}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon-sm" onClick={() => removerCnae(c.id)}>
                      <Trash2 className="text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Objeto social</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="space-y-1.5 flex-1">
              <Label>Descrição da atividade</Label>
              <Input placeholder="ex: Comércio de componentes eletrônicos e rastreadores" value={novoObjetoDescricao} onChange={(e) => setNovoObjetoDescricao(e.target.value)} />
            </div>
            <div className="space-y-1.5 w-64">
              <Label>Origem (opcional)</Label>
              <Input placeholder="ex: Alteração 5.1 do Estatuto Social" value={novoObjetoOrigem} onChange={(e) => setNovoObjetoOrigem(e.target.value)} />
            </div>
            <Button onClick={adicionarObjeto}><Plus />Adicionar</Button>
          </div>

          <div className="space-y-2">
            {empresa.objetoSocial.map((o) => (
              <div key={o.id} className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
                <div>
                  <p className="text-sm">{o.descricao}</p>
                  {o.origem && <p className="text-xs text-muted-foreground mt-1">{o.origem}</p>}
                </div>
                <Button variant="ghost" size="icon-sm" onClick={() => removerObjeto(o.id)}>
                  <Trash2 className="text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
