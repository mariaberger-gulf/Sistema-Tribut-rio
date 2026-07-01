interface KPICardProps {
  label: string;
  valor: string;
  descricao?: string;
  cor?: "default" | "emerald" | "blue" | "yellow" | "red";
}

// No dark mode, todos os cards ficam com o mesmo fundo cinza uniforme
const COR_CLASSES: Record<NonNullable<KPICardProps["cor"]>, string> = {
  default: "bg-white dark:bg-zinc-700 border-zinc-200 dark:border-zinc-600",
  emerald: "bg-emerald-50 border-emerald-200 dark:bg-zinc-700 dark:border-zinc-600",
  blue:    "bg-blue-50 border-blue-200 dark:bg-zinc-700 dark:border-zinc-600",
  yellow:  "bg-yellow-50 border-yellow-200 dark:bg-zinc-700 dark:border-zinc-600",
  red:     "bg-red-50 border-red-200 dark:bg-zinc-700 dark:border-zinc-600",
};

const LABEL_COR: Record<NonNullable<KPICardProps["cor"]>, string> = {
  default: "text-zinc-500 dark:text-zinc-200",
  emerald: "text-emerald-700 dark:text-emerald-300",
  blue:    "text-blue-700 dark:text-blue-300",
  yellow:  "text-yellow-700 dark:text-yellow-300",
  red:     "text-red-700 dark:text-red-300",
};

export function KPICard({
  label,
  valor,
  descricao,
  cor = "default",
}: KPICardProps) {
  return (
    <div className={`rounded-xl border p-5 ${COR_CLASSES[cor]}`}>
      <p className={`text-xs font-semibold uppercase tracking-wider mb-1 ${LABEL_COR[cor]}`}>
        {label}
      </p>
      <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{valor}</p>
      {descricao && (
        <p className="text-xs text-zinc-400 dark:text-zinc-300 mt-1">{descricao}</p>
      )}
    </div>
  );
}
