'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { adminAPI } from '@/lib/api'
import { useRouter } from 'next/navigation'
import type { User, Listing } from '@/types'

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<User[]>([])
  const [listings, setListings] = useState<Listing[]>([])
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/')
      return
    }

    if (user?.role === 'admin') {
      loadData()
    }
  }, [user, authLoading, activeTab])

  const loadData = async () => {
    try {
      setLoading(true)
      const statsData = await adminAPI.getStats()
      setStats(statsData)

      if (activeTab === 'users') {
        const usersData = await adminAPI.getUsers()
        setUsers(usersData)
      } else if (activeTab === 'listings') {
        const listingsData = await adminAPI.getListings()
        setListings(listingsData)
      }
    } catch (error) {
      console.error('Failed to load admin data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleUser = async (userId: number) => {
    try {
      await adminAPI.toggleUserActive(userId)
      loadData()
    } catch (error) {
      console.error('Failed to toggle user:', error)
    }
  }

  const handleDeleteListing = async (listingId: number) => {
    if (!confirm('Are you sure you want to delete this listing?')) return
    
    try {
      await adminAPI.deleteListing(listingId)
      loadData()
    } catch (error) {
      console.error('Failed to delete listing:', error)
    }
  }

  if (authLoading || loading) return <div className="text-center py-12">Loading...</div>
  if (!user || user.role !== 'admin') return null

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Admin Panel</h1>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b">
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === 'overview' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-600'
          }`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === 'users' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-600'
          }`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button
          className={`py-2 px-4 font-medium ${
            activeTab === 'listings' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-600'
          }`}
          onClick={() => setActiveTab('listings')}
        >
          Listings
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && stats && (
        <div>
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="card bg-primary-50">
              <p className="text-sm text-gray-600 mb-1">Total Users</p>
              <p className="text-3xl font-bold text-primary-600">{stats.total_users || 0}</p>
            </div>
            <div className="card bg-blue-50">
              <p className="text-sm text-gray-600 mb-1">Total Listings</p>
              <p className="text-3xl font-bold text-blue-600">{stats.total_listings || 0}</p>
            </div>
            <div className="card bg-green-50">
              <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
              <p className="text-3xl font-bold text-green-600">${stats.total_revenue || 0}</p>
            </div>
            <div className="card bg-yellow-50">
              <p className="text-sm text-gray-600 mb-1">Active Auctions</p>
              <p className="text-3xl font-bold text-yellow-600">{stats.active_auctions || 0}</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Recent Users</h2>
              <div className="space-y-2">
                {stats.recent_users?.slice(0, 5).map((u: User) => (
                  <div key={u.id} className="p-2 border rounded">
                    <p className="font-medium">{u.email}</p>
                    <p className="text-sm text-gray-600">{u.role}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Recent Listings</h2>
              <div className="space-y-2">
                {stats.recent_listings?.slice(0, 5).map((l: Listing) => (
                  <div key={l.id} className="p-2 border rounded">
                    <p className="font-medium">{l.title}</p>
                    <p className="text-sm text-gray-600">${l.price} - {l.location}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">All Users</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">ID</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Email</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Role</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Status</th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-2">{u.id}</td>
                    <td className="px-4 py-2">{u.email}</td>
                    <td className="px-4 py-2">{u.role}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 text-xs rounded ${
                        u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => handleToggleUser(u.id)}
                        className="text-sm text-primary-600 hover:text-primary-700"
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Listings Tab */}
      {activeTab === 'listings' && (
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">All Listings</h2>
          <div className="space-y-3">
            {listings.map((listing) => (
              <div key={listing.id} className="p-4 border rounded flex justify-between items-center">
                <div>
                  <h3 className="font-medium">{listing.title}</h3>
                  <p className="text-sm text-gray-600">{listing.material_name} - ${listing.price}</p>
                </div>
                <button
                  onClick={() => handleDeleteListing(listing.id)}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

