import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Files",
  description: "Envía archivos grandes con un enlace.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
