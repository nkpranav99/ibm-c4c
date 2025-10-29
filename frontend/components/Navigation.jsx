'use client'

import React from 'react'
import Link from 'next/link'
import { useAuth } from '../context/AuthContext'
import { useRouter } from 'next/navigation'

export default function Navigation() {
  const { user, logout, isAuthenticated } = useAuth()
  const router = useRouter()

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
                <Link href="/listings" className="text-gray-700 hover:text-primary-600 transition">
                  Browse Materials
                </Link>
                <Link href="/dashboard" className="text-gray-700 hover:text-primary-600 transition">
                  Dashboard
                </Link>
                {user?.role === 'admin' && (
                  <Link href="/admin" className="text-gray-700 hover:text-primary-600 transition">
                    Admin Panel
                  </Link>
                )}
              </>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  {user?.company_name || user?.username}
                </span>
                <button
                  onClick={handleLogout}
                  className="btn-secondary text-sm px-4 py-2"
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
                <Link href="/login" className="text-gray-700 hover:text-primary-600 transition">
                  Login
                </Link>
                <Link href="/signup" className="btn-primary">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

