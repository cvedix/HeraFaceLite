import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HeraFace Lite Console",
  description: "Edge identity administration",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
