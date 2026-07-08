import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

/* Fontes auto-hospedadas (sem layout shift) e expostas como CSS vars
   que o @theme do Tailwind consome (--font-display/body/mono).
   Arquivos woff2 (variable) versionados em app/fonts/ para não depender
   de fetch ao Google Fonts durante o build na Vercel. */
const archivo = localFont({
  src: "./fonts/archivo-variable.woff2",
  weight: "100 900",
  variable: "--font-archivo",
  display: "swap",
});
const manrope = localFont({
  src: "./fonts/manrope-variable.woff2",
  weight: "100 900",
  variable: "--font-manrope",
  display: "swap",
});
const jetbrains = localFont({
  src: "./fonts/jetbrainsmono-variable.woff2",
  weight: "100 900",
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Precificação para Oficinas - Diego Mensor",
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
