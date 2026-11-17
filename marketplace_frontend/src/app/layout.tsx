import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Lora, Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
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

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin", "vietnamese"],
  style: ["normal", "italic"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin", "vietnamese"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
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
      suppressHydrationWarning
      className={`${inter.variable} ${spaceGrotesk.variable} ${lora.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col font-sans"
      >
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
