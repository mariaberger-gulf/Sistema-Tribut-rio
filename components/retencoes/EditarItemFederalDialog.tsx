"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export interface ItemFederalEditavel {
  id: number;
  codigo: string;
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

export function EditarItemFederalDialog({
  item,
  aberto,
  onOpenChange,
  onSalvo,
}: {
  item: ItemFederalEditavel | null;
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  onSalvo: () => void;
}) {
  const [form, setForm] = useState<ItemFederalEditavel | null>(item);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => setForm(item), [item]);

  if (!form) return null;

  const campo = (chave: keyof ItemFederalEditavel, valor: string) => setForm({ ...form, [chave]: valor });

  const salvar = async () => {
    setSalvando(true);
    await fetch(`/api/retencoes/itens/${form.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSalvando(false);
    onOpenChange(false);
    onSalvo();
  };

  return (
    <Dialog open={aberto} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{form.codigo} — Editar retenção federal</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea value={form.descricao} onChange={(e) => campo("descricao", e.target.value)} rows={2} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>PIS</Label>
              <Input value={form.pis} onChange={(e) => campo("pis", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>COFINS</Label>
              <Input value={form.cofins} onChange={(e) => campo("cofins", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>CSLL</Label>
              <Input value={form.csll} onChange={(e) => campo("csll", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>IRRF 1,5%</Label>
              <Input value={form.irrf15} onChange={(e) => campo("irrf15", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>IRRF 1,0%</Label>
              <Input value={form.irrf10} onChange={(e) => campo("irrf10", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>INSS</Label>
              <Input value={form.inss} onChange={(e) => campo("inss", e.target.value)} />
            </div>
          </div>

          <p className="text-xs text-muted-foreground">Use "SIM", "NÃO" ou um texto livre (ex: "SIM/NÃO", "NÃO SALVO coop/assoc BC 60%") quando a retenção depender do caso concreto.</p>

          <div className="space-y-1.5">
            <Label>Observação federal (PIS/COFINS/CSLL/IRRF)</Label>
            <Textarea value={form.observacaoFederal} onChange={(e) => campo("observacaoFederal", e.target.value)} rows={2} />
          </div>

          <div className="space-y-1.5">
            <Label>Observação INSS</Label>
            <Textarea value={form.observacaoInss} onChange={(e) => campo("observacaoInss", e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={salvar} disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
