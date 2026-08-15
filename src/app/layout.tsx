import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Red de Rescate y Mascotas Cali — Emergencia Sismo",
  description: "Plataforma de emergencia para reencuentro de perros y gatos tras el sismo en Cali, Colombia.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mascotas Cali",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className="bg-[#0a0a0c] text-white min-h-screen selection:bg-amber-500 selection:text-black">
        {children}
      </body>
    </html>
  );
}
