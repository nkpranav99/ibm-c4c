'use client'

import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { dashboardAPI } from '../../lib/api'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      loadDashboard()
    }
  }, [user, authLoading])

  const loadDashboard = async () => {
    try {
      let data
      if (user?.role === 'seller') {
        data = await dashboardAPI.getSeller()
      } else {
        data = await dashboardAPI.getBuyer()
      }
      setStats(data)
    } catch (error) {
      console.error('Failed to load dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) return <div className="text-center py-12">Loading...</div>
  if (!user) return null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

      {user.role === 'seller' ? (
        <div>
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="card bg-primary-50">
              <p className="text-sm text-gray-600 mb-1">Total Listings</p>
              <p className="text-3xl font-bold text-primary-600">{stats?.total_listings || 0}</p>
            </div>
            <div className="card bg-green-50">
              <p className="text-sm text-gray-600 mb-1">Active Listings</p>
              <p className="text-3xl font-bold text-green-600">{stats?.active_listings || 0}</p>
            </div>
            <div className="card bg-blue-50">
              <p className="text-sm text-gray-600 mb-1">Total Sales</p>
              <p className="text-3xl font-bold text-blue-600">${stats?.total_sales || 0}</p>
            </div>
            <div className="card bg-yellow-50">
              <p className="text-sm text-gray-600 mb-1">Pending Orders</p>
              <p className="text-3xl font-bold text-yellow-600">{stats?.pending_orders || 0}</p>
            </div>
          </div>

          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">Recent Listings</h2>
            <div className="space-y-3">
              {stats?.recent_listings?.map((listing) => (
                <Link key={listing.id} href={`/listing/${listing.id}`} className="block p-3 hover:bg-gray-50 rounded">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{listing.title}</span>
                    <span className={`px-2 py-1 text-xs rounded ${
                      listing.status === 'active' ? 'bg-primary-100 text-primary-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {listing.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Recent Orders</h2>
            <div className="space-y-3">
              {stats?.recent_orders?.map((order) => (
                <div key={order.id} className="p-3 border rounded">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Order #{order.id}</p>
                      <p className="text-sm text-gray-600">Quantity: {order.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary-600">${order.total_price}</p>
                      <p className="text-xs text-gray-500">{order.status}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div>
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="card bg-primary-50">
              <p className="text-sm text-gray-600 mb-1">Total Orders</p>
              <p className="text-3xl font-bold text-primary-600">{stats?.total_orders || 0}</p>
            </div>
            <div className="card bg-green-50">
              <p className="text-sm text-gray-600 mb-1">Completed</p>
              <p className="text-3xl font-bold text-green-600">{stats?.completed_orders || 0}</p>
            </div>
            <div className="card bg-blue-50">
              <p className="text-sm text-gray-600 mb-1">Total Spent</p>
              <p className="text-3xl font-bold text-blue-600">${stats?.total_spent || 0}</p>
            </div>
            <div className="card bg-yellow-50">
              <p className="text-sm text-gray-600 mb-1">Active Bids</p>
              <p className="text-3xl font-bold text-yellow-600">{stats?.active_bids || 0}</p>
            </div>
          </div>

          <div className="card mb-6">
            <h2 className="text-xl font-semibold mb-4">Recent Orders</h2>
            <div className="space-y-3">
              {stats?.recent_orders?.map((order) => (
                <div key={order.id} className="p-3 border rounded">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Order #{order.id}</p>
                      <p className="text-sm text-gray-600">Quantity: {order.quantity}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary-600">${order.total_price}</p>
                      <p className="text-xs text-gray-500">{order.status}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <h2 className="text-xl font-semibold mb-4">Recent Bids</h2>
            <div className="space-y-3">
              {stats?.recent_bids?.map((bid) => (
                <div key={bid.id} className="p-3 border rounded">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">Bid #{bid.id}</p>
                      <p className="text-sm text-gray-600">Amount: ${bid.amount}</p>
                    </div>
                    {bid.is_winning && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded">
                        Winning
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

