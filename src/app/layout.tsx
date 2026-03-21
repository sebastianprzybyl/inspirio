import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Inspirio — pomysły na content',
  description: 'Twój AI agent do generowania pomysłów na content dla twórców internetowych',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body className="min-h-screen bg-[#0E0E10] flex items-center justify-center p-4">
        <div className="w-full max-w-sm mx-auto min-h-[100dvh] flex flex-col">
          {children}
        </div>
      </body>
    </html>
  )
}
