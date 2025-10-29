'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { authAPI } from '../lib/api'

const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (token) {
      try {
        const userData = await authAPI.getCurrentUser()
        setUser(userData)
      } catch (error) {
        localStorage.removeItem('token')
        setUser(null)
      }
    } else if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
      // Seed a mock user to bypass login in mock mode
      setUser({ id: 1, username: 'mock_user', role: 'seller' })
    }
    setLoading(false)
  }

  const login = async (credentials) => {
    const { access_token } = await authAPI.login(credentials)
    localStorage.setItem('token', access_token)
    const userData = await authAPI.getCurrentUser()
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

