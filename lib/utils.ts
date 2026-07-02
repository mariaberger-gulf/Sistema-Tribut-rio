import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatData(data: Date | string): string {
  const d = typeof data === "string" ? new Date(data) : data;
  return d.toLocaleDateString("pt-BR");
}

const LABELS_CATEGORIA_ALIQUOTA: Record<string, string> = {
  padrao: "Padrão",
  reduzida40: "Reduzida 40%",
  reduzida60: "Reduzida 60%",
  isenta: "Isenta",
};

export function labelCategoriaAliquota(valor: string): string {
  return LABELS_CATEGORIA_ALIQUOTA[valor] ?? valor;
}

export function formatCnpj(cnpj: string): string {
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14) return cnpj;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12, 14)}`;
}
