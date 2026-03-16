// app/layout.tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import StyledComponentsRegistry from "@/lib/AntdRegistry"
import QueryProvider from "@/providers/QueryProvider"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Pharmacy Admin",
  description: "Quản lý nhà thuốc",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <body className={inter.className}>
        <StyledComponentsRegistry>
          <QueryProvider>
            {children}
          </QueryProvider>
        </StyledComponentsRegistry>
      </body>
    </html>
  )
}