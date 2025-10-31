'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI } from '../lib/api'
import {
  authenticateMockUser,
  clearMockSession,
  getMockSession,
  getMockUserByEmail,
  isMockAuthEnabled,
  setMockSession,
} from '../lib/mockAuth'

const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const useMockAuth = isMockAuthEnabled()
  const router = useRouter()

  const mapMockUserToAuthUser = (mockUser) =>
    mockUser
      ? {
          id: mockUser.id,
          email: mockUser.email,
          username: mockUser.username,
          role: mockUser.role,
          company_name: mockUser.company_name,
        }
      : null

  const tryRestoreMockSession = () => {
    const sessionEmail = getMockSession()
    if (!sessionEmail) {
      return false
    }

    const mockUser = getMockUserByEmail(sessionEmail)
    if (!mockUser) {
      clearMockSession()
      return false
    }

    setUser(mapMockUserToAuthUser(mockUser))
    return true
  }

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    if (useMockAuth) {
      const sessionEmail = getMockSession()
      if (sessionEmail) {
        const mockUser = getMockUserByEmail(sessionEmail)
        setUser(mapMockUserToAuthUser(mockUser))
      } else {
        setUser(null)
      }
      setLoading(false)
      return
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    if (token) {
      try {
        const userData = await authAPI.getCurrentUser()
        setUser(userData)
      } catch (error) {
        localStorage.removeItem('token')
        if (!tryRestoreMockSession()) {
          setUser(null)
        }
      }
    } else if (!(process.env.NEXT_PUBLIC_MOCK_MODE === 'true') && tryRestoreMockSession()) {
      // successfully restored from mock session fallback
    } else if (process.env.NEXT_PUBLIC_MOCK_MODE === 'true') {
      // Seed a mock user to bypass login in legacy mock mode
      setUser({ id: 1, username: 'mock_user', role: 'seller' })
    }
    setLoading(false)
  }

  const login = async (credentials) => {
    if (useMockAuth) {
      const mockUser = authenticateMockUser(credentials.username || credentials.email, credentials.password)
      setMockSession(mockUser.email)
      setUser(mapMockUserToAuthUser(mockUser))
      router.push('/')
      return
    }

    try {
      const { access_token } = await authAPI.login(credentials)
      localStorage.setItem('token', access_token)
      const userData = await authAPI.getCurrentUser()
      setUser(userData)
    } catch (error) {
      // Fallback to mock authentication if backend is unavailable
      const mockUser = authenticateMockUser(credentials.username || credentials.email, credentials.password)
      setMockSession(mockUser.email)
      setUser(mapMockUserToAuthUser(mockUser))
    }

    router.push('/')
  }

  const logout = () => {
    if (useMockAuth) {
      clearMockSession()
    }
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

