import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { ConditionalSidebar } from "@/components/layout/ConditionalSidebar";
import { ThemeProvider } from "@/components/layout/ThemeProvider";

const geist = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ecotruck — Reforma Tributária",
  description: "Classificação fiscal, apuração de crédito e simulação da Reforma Tributária para notas fiscais da Ecotruck",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${geist.variable} h-full antialiased`}>
      <body className="h-full flex bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
        <ThemeProvider>
          <ConditionalSidebar />
          <main className="flex-1 overflow-auto bg-zinc-50 dark:bg-zinc-900">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  );
}
