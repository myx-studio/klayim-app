import type { Metadata } from "next";
import localFont from "next/font/local";
import { PublicEnvScript } from "next-runtime-env";

import AppProvider from "../components/providers/app-provider";
import "./globals.css";

const nhaasGrotesk = localFont({
  src: [
    {
      path: "./fonts/NHaasGrotesk/NHaasGroteskDSStd-45Lt.otf",
      weight: "200",
      style: "normal",
    },
    {
      path: "./fonts/NHaasGrotesk/NHaasGroteskDSStd-45Lt.otf",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/NHaasGrotesk/NHaasGroteskDSStd-55Rg.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/NHaasGrotesk/NHaasGroteskDSStd-55Rg.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/NHaasGrotesk/NHaasGroteskDSStd-55Rg.otf",
      weight: "600",
      style: "normal",
    },
    {
      path: "./fonts/NHaasGrotesk/NHaasGroteskDSStd-65Md.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "./fonts/NHaasGrotesk/NHaasGroteskDSStd-65Md.otf",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-nhaas-grotesk",
});

export const metadata: Metadata = {
  title: "Klayim",
  description: "Klayim Web App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <PublicEnvScript />
      </head>
      <body className={`${nhaasGrotesk.variable} antialiased`}>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
