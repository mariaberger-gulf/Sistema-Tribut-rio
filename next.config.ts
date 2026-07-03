import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse/pdfjs-dist resolvem o worker via caminho relativo em tempo de
  // execução; empacotá-los quebra essa resolução (worker "fake" não encontrado).
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
