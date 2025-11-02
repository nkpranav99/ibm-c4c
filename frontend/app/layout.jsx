import './globals.css'
import { Inter } from 'next/font/google'
import Navigation from '../components/Navigation'
import Chatbot from '../components/Chatbot'
import { AuthProvider } from '../context/AuthContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Scraps2Stacks',
  description: 'Turning Industrial Waste into Opportunity',
}

export default function RootLayout({
  children,
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <Navigation />
          {children}
          <Chatbot />
        </AuthProvider>
      </body>
    </html>
  )
}

