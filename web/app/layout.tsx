import type { Metadata } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { Header } from "@/components/shell/Header";
import { Sidebar } from "@/components/shell/Sidebar";
import { Backdrop } from "@/components/ui/glass";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "YYC taxPod",
  description: "Client CRM with a cited Malaysian tax knowledge assistant",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jakarta.variable} ${jetbrainsMono.variable} antialiased`}>
      <head>
        {/* Icon font: display=block avoids flashing ligature names like "smart_toy" as text. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font, @next/next/google-font-display */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,300..500,0..1,0&display=block"
        />
      </head>
      <body>
        <Backdrop />
        <Header />
        <Sidebar />
        <div className="relative min-h-screen pt-16 lg:pl-64">
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
