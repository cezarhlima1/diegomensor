import type { Metadata, Viewport } from "next";
import { Archivo, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/* Fontes auto-hospedadas (sem layout shift) e expostas como CSS vars
   que o @theme do Tailwind consome (--font-display/body/mono). */
const archivo = Archivo({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-archivo",
  display: "swap",
});
const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["500", "700"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Precificação para Oficinas — Diego Mensor",
  description:
    "Descubra quanto sua oficina realmente custa, quanto deveria cobrar e onde você está deixando dinheiro na mesa. 7 passos práticos. Acesso imediato e vitalício.",
};

export const viewport: Viewport = {
  themeColor: "#0F1115",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${archivo.variable} ${manrope.variable} ${jetbrains.variable}`}>
        {children}
      </body>
    </html>
  );
}
