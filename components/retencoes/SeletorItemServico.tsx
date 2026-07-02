"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

export interface ItemServico {
  codigo: string;
  codigoBase: string;
  descricao: string;
  grupoDescricao: string;
}

export function SeletorItemServico({
  value,
  onChange,
}: {
  value: ItemServico | null;
  onChange: (item: ItemServico) => void;
}) {
  const [termo, setTermo] = useState("");
  const [opcoes, setOpcoes] = useState<ItemServico[]>([]);
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const t = setTimeout(() => {
      fetch(`/api/retencoes/itens?q=${encodeURIComponent(termo)}`)
        .then((r) => r.json())
        .then((d) => setOpcoes(d.itens ?? []));
    }, 200);
    return () => clearTimeout(t);
  }, [termo, aberto]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <Input
        placeholder="Buscar por código ou descrição (ex: 7.05, limpeza, advocacia...)"
        value={aberto ? termo : value ? `${value.codigo} — ${value.descricao}` : ""}
        onFocus={() => { setAberto(true); setTermo(""); }}
        onChange={(e) => setTermo(e.target.value)}
      />
      {aberto && opcoes.length > 0 && (
        <div className="absolute z-10 mt-1 w-full max-h-72 overflow-auto rounded-lg border border-border bg-popover shadow-md">
          {opcoes.map((item) => (
            <button
              key={item.codigo}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted border-b border-border last:border-0"
              onClick={() => { onChange(item); setAberto(false); }}
            >
              <span className="font-medium">{item.codigo}</span> — {item.descricao}
              <p className="text-xs text-muted-foreground">{item.grupoDescricao}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
