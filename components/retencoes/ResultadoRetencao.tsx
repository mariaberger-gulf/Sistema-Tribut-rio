import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatMoeda } from "@/lib/utils";

interface Tributo {
  tributo: string;
  status: "elegivel" | "nao_elegivel" | "condicional";
  valor: number;
  aliquota: number | null;
  motivo: string;
}

interface Resultado {
  pcc: Tributo[];
  irrf: Tributo;
  inss: Tributo;
  iss: Tributo;
  valorTotalRetido: number;
  atencao: string[];
}

function LinhaTributo({ t }: { t: Tributo }) {
  const Icon = t.status === "elegivel" ? CheckCircle2 : t.status === "condicional" ? AlertTriangle : XCircle;
  const cor = t.status === "elegivel" ? "text-emerald-600" : t.status === "condicional" ? "text-amber-600" : "text-muted-foreground";

  return (
    <div className="flex items-start gap-2 py-2 border-b border-border last:border-0">
      <Icon className={`size-4 mt-0.5 shrink-0 ${cor}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{t.tributo}</span>
          {t.aliquota !== null && <Badge variant="outline">{t.aliquota.toFixed(2)}%</Badge>}
          {t.valor > 0 && <span className="text-sm font-semibold">{formatMoeda(t.valor)}</span>}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{t.motivo}</p>
      </div>
    </div>
  );
}

export function ResultadoRetencao({ resultado }: { resultado: Resultado }) {
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">PCC — PIS/COFINS/CSLL (4,65%)</p>
        {resultado.pcc.map((t) => <LinhaTributo key={t.tributo} t={t} />)}
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">IRRF</p>
        <LinhaTributo t={resultado.irrf} />
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">INSS</p>
        <LinhaTributo t={resultado.inss} />
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">ISS</p>
        <LinhaTributo t={resultado.iss} />
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <span className="text-sm font-semibold">Total retido</span>
        <span className="text-lg font-bold">{formatMoeda(resultado.valorTotalRetido)}</span>
      </div>

      {resultado.atencao.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-1.5">
          {resultado.atencao.map((a, i) => (
            <p key={i} className="text-xs text-amber-800 flex items-start gap-1.5">
              <AlertTriangle className="size-3.5 mt-0.5 shrink-0" /> {a}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
