import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GhostQueue — Human Process Abandonment Intelligence",
  description: "Find where people disappear. Understand why. Test what could change.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
