import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@aptos-labs/wallet-adapter-ant-design/dist/index.css";
import 'react-toastify/ReactToastify.min.css';
import "./globals.css";

import { AppContext } from "./context/AppContext";
import Header from "./(components)/Header";
import Footer from "./(components)/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aptos Rock Paper Scissors",
  description: "Created by Nashki",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppContext>
          <Header />
          {children}
          <Footer />
        </AppContext>
      </body>
    </html>
  );
};