'use client'

import React from 'react'
import Link from 'next/link'
import { useAuth } from '../context/AuthContext'
import { useRouter, usePathname } from 'next/navigation'

export default function Navigation() {
  const { user, logout, isAuthenticated } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  const displayName = user?.username || user?.email?.split('@')[0] || user?.email || 'Member'
  const secondaryLine = user?.company_name && user?.company_name !== displayName ? user.company_name : null

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-2xl font-bold text-primary-600">
              ♻️ WasteMarket
            </Link>
            {isAuthenticated && (
              <>
                <Link href="/dashboard" className="text-gray-700 hover:text-primary-600 transition">
                  Dashboard
                </Link>
                <Link href="/auctions/live" className="text-gray-700 hover:text-primary-600 transition">
                  Live Auctions
                </Link>
                <Link href="/listings" className="text-gray-700 hover:text-primary-600 transition">
                  Browse Materials
                </Link>
                {user?.role === 'buyer' && (
                  <Link href="/orders/history" className="text-gray-700 hover:text-primary-600 transition">
                    Order History
                  </Link>
                )}
                {user?.role === 'admin' && (
                  <Link href="/admin" className="text-gray-700 hover:text-primary-600 transition">
                    Admin Panel
                  </Link>
                )}
              </>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {isAuthenticated && pathname !== '/login' && pathname !== '/signup' ? (
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-700">{displayName}</p>
                  {secondaryLine && <p className="text-xs text-gray-500">{secondaryLine}</p>}
                </div>
                <button
                  onClick={handleLogout}
                  className="btn-secondary text-sm px-4 py-2"
                >
                  Logout
                </button>
              </div>
            ) : pathname !== '/login' && pathname !== '/signup' ? (
              <>
                <Link href="/login" className="text-gray-700 hover:text-primary-600 transition">
                  Login
                </Link>
                <Link href="/signup" className="btn-primary">
                  Sign Up
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  )
}

