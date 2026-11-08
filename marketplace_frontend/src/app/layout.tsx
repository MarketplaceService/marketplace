import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import QueryProvider from "@/providers/query-provider";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: {
    default: "Servigo",
    template: "%s | Servigo - Nền tảng đặt lịch dịch vụ & sửa chữa tại nhà",
  },
  description:
    "Kết nối chuyên gia và nhà cung cấp dịch vụ sửa chữa, bảo trì uy tín, nhanh chóng và an toàn",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="vi"
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <QueryProvider>
          {children}
          <Toaster
            position="bottom-right"
            richColors
          />
        </QueryProvider>
      </body>
    </html>
  );
}
