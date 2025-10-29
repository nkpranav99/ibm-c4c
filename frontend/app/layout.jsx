import './globals.css'
import { Inter } from 'next/font/google'
import Navigation from '../components/Navigation'
import { AuthProvider } from '../context/AuthContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Waste Material Marketplace',
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
        </AuthProvider>
      </body>
    </html>
  )
}

