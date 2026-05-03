import type { Metadata } from 'next'
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google'
import { auth } from '@/lib/auth'
import { Providers } from '@/components/Providers'
import './globals.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'EasyFilerComplaint — File a Privacy Complaint in 5 Minutes',
  description: 'File a formal privacy complaint with the California Attorney General for $1.99. We generate the paperwork, fax it to the AG, and email you a copy.',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const session = await auth()
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-body bg-bg text-text antialiased">
        <Providers session={session}>
          {children}
        </Providers>
      </body>
    </html>
  )
}
