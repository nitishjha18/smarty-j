// app/layout.tsx
import { ClerkProvider } from "@clerk/nextjs"
import { Inter } from "next/font/google"
import "./globals.css"
import Providers from "./providers"

const inter = Inter({ subsets: ["latin"] })

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClerkProvider>
          <Providers>{children}</Providers>
        </ClerkProvider>
      </body>
    </html>
  )
}
