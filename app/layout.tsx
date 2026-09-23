import type { Metadata, Viewport } from "next";
import { PwaProvider } from "@/components/install-app";
import "./globals.css";
import "./company.css";

export const metadata: Metadata = {
  title: "iSev Agenda",
  description: "Agendamentos, equipe e clientes em um só lugar.",
  manifest: "/manifest.webmanifest",
  applicationName: "iSev Agenda",
  appleWebApp: {
    capable: true,
    title: "iSev Agenda",
    statusBarStyle: "default",
  },
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/app-icons/apple-touch-icon.png",
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0066ff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">
        <PwaProvider>{children}</PwaProvider>
      </body>
    </html>
  );
}
