"use client";

import { useRef, useState } from "react";
import { Upload, Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResultadoUpload {
  arquivo: string;
  ok: boolean;
  notaFiscalId?: number;
  erro?: string;
}

export function UploadXml({ onSucesso }: { onSucesso: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [resultados, setResultados] = useState<ResultadoUpload[]>([]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setEnviando(true);
    setResultados([]);

    const formData = new FormData();
    Array.from(files).forEach((f) => formData.append("arquivos", f));

    try {
      const res = await fetch("/api/notas-fiscais/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        setResultados(data.resultados ?? []);
        if ((data.resultados ?? []).some((r: ResultadoUpload) => r.ok)) onSucesso();
      } else {
        setResultados([{ arquivo: "-", ok: false, erro: data.error ?? "Erro ao enviar arquivos." }]);
      }
    } catch {
      setResultados([{ arquivo: "-", ok: false, erro: "Erro de conexão." }]);
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept=".xml"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button onClick={() => inputRef.current?.click()} disabled={enviando}>
        {enviando ? <Loader2 className="animate-spin" /> : <Upload />}
        {enviando ? "Processando..." : "Importar XML de NF-e"}
      </Button>

      {resultados.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-3 text-sm space-y-1.5 max-w-lg">
          {resultados.map((r, i) => (
            <div key={i} className="flex items-start gap-2">
              {r.ok ? (
                <CheckCircle2 className="size-4 text-emerald-600 mt-0.5 shrink-0" />
              ) : (
                <XCircle className="size-4 text-red-600 mt-0.5 shrink-0" />
              )}
              <span className="truncate">
                <span className="font-medium">{r.arquivo}</span>
                {r.ok ? " — importada com sucesso." : ` — ${r.erro}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
