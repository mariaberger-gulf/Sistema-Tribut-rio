"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SeletorItemServico, type ItemServico } from "@/components/retencoes/SeletorItemServico";
import { ResultadoRetencao } from "@/components/retencoes/ResultadoRetencao";
import { TabelaFederalIrPcc } from "@/components/retencoes/TabelaFederalIrPcc";
import { Loader2 } from "lucide-react";

export default function RetencoesPage() {
  const [municipios, setMunicipios] = useState<string[]>([]);
  const [item, setItem] = useState<ItemServico | null>(null);
  const [municipio, setMunicipio] = useState("");
  const [valorServico, setValorServico] = useState("");
  const [simplesNacional, setSimplesNacional] = useState(false);
  const [cessaoMaoDeObra, setCessaoMaoDeObra] = useState(false);
  const [aliquotaNf, setAliquotaNf] = useState("");
  const [resultado, setResultado] = useState<{ resultado: import("@/lib/retencoes-fonte/apurar").ResultadoApuracao } | null>(null);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/retencoes/municipios").then((r) => r.json()).then((d) => setMunicipios(d.municipios ?? []));
  }, []);

  const apurar = async () => {
    setErro("");
    setResultado(null);
    if (!item || !municipio || !valorServico) {
      setErro("Preencha o item de serviço, o município e o valor.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/retencoes/apurar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemCodigo: item.codigo,
          municipio,
          valorServico: Number(valorServico),
          prestadorSimplesNacional: simplesNacional,
          cessaoMaoDeObra,
          aliquotaIssInformadaNaNf: aliquotaNf,
        }),
      });
      const data = await res.json();
      if (res.ok) setResultado(data);
      else setErro(data.error ?? "Erro ao apurar retenções.");
    } catch {
      setErro("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Retenções na Fonte</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Apuração de IRRF, PIS/COFINS/CSLL (PCC), INSS e ISS ao pagar prestadores de serviço, por item da
          lista de serviços da LC 116/2003 e por município do tomador.
        </p>
      </div>

      <Tabs defaultValue="apuracao">
        <TabsList>
          <TabsTrigger value="apuracao">Apuração</TabsTrigger>
          <TabsTrigger value="tabela-federal">Tabela Federal (IR-PCC)</TabsTrigger>
        </TabsList>

        <TabsContent value="apuracao">
          <div className="grid grid-cols-2 gap-6 max-w-5xl">
            <Card>
              <CardHeader><CardTitle>Dados do serviço</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Item da lista de serviços (LC 116)</Label>
                  <SeletorItemServico value={item} onChange={setItem} />
                </div>

                <div className="space-y-1.5">
                  <Label>Município do tomador (Ecotruck)</Label>
                  <Select value={municipio} onValueChange={(v) => v && setMunicipio(v)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Selecione o município" /></SelectTrigger>
                    <SelectContent>
                      {municipios.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Valor do serviço (R$)</Label>
                  <Input type="number" step="0.01" value={valorServico} onChange={(e) => setValorServico(e.target.value)} />
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={simplesNacional} onChange={(e) => setSimplesNacional(e.target.checked)} />
                  Prestador é optante pelo Simples Nacional
                </label>

                {simplesNacional && (
                  <div className="space-y-1.5 pl-6">
                    <Label>Alíquota de ISS informada na NF do prestador (%)</Label>
                    <Input type="number" step="0.01" value={aliquotaNf} onChange={(e) => setAliquotaNf(e.target.value)} />
                  </div>
                )}

                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={cessaoMaoDeObra} onChange={(e) => setCessaoMaoDeObra(e.target.checked)} />
                  Serviço prestado mediante cessão de mão de obra ou empreitada
                </label>

                {erro && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{erro}</p>}

                <Button onClick={apurar} disabled={loading} className="w-full">
                  {loading ? <Loader2 className="animate-spin" /> : null}
                  {loading ? "Apurando..." : "Apurar retenções"}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Resultado</CardTitle></CardHeader>
              <CardContent>
                {resultado ? (
                  <ResultadoRetencao resultado={resultado.resultado} />
                ) : (
                  <p className="text-sm text-muted-foreground">Preencha os dados ao lado e clique em "Apurar retenções".</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tabela-federal">
          <TabelaFederalIrPcc />
        </TabsContent>
      </Tabs>
    </div>
  );
}
