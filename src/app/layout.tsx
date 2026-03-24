import type { Metadata } from 'next'
import { Playfair_Display, Source_Serif_4, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-source-serif',
  display: 'swap',
})

const ibmPlexMono = IBM_Plex_Mono({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-ibm-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'EasyFilerComplaint — File Official Complaints With One Form',
  description: 'File official complaints with FCC, FTC, CFPB, FDA, EPA, DOJ/ADA and more. One form, seven agencies.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${sourceSerif.variable} ${ibmPlexMono.variable}`}>
      <body className="font-body bg-cream text-ink antialiased">
        {children}
      </body>
    </html>
  )
}
