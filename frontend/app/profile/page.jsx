'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { dashboardAPI, sellerAPI } from '@/lib/api'
import OrderHistorySection from '@/components/profile/OrderHistorySection'
import ProfileSidebar from '@/components/profile/ProfileSidebar'
import ProfileCard from '@/components/profile/ProfileCard'
import SellOnMarketplaceSection from '@/components/profile/SellOnMarketplaceSection'

const buyerTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'orders', label: 'Order History' },
  { id: 'sell', label: 'Sell Items' },
  { id: 'account', label: 'Account Settings' },
]

const sellerTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'listings', label: 'My Listings' },
  { id: 'account', label: 'Account Settings' },
]

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [stats, setStats] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [sellerInsights, setSellerInsights] = useState(null)

  useEffect(() => {
    const urlTab = searchParams?.get('tab') || 'overview'
    setActiveTab(urlTab)
  }, [searchParams])

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.push('/login')
      return
    }

    loadProfile()
  }, [authLoading, user])

  const loadProfile = async () => {
    if (!user) return
    setLoadingStats(true)
    setError('')

    try {
      const data = user.role === 'seller'
        ? await dashboardAPI.getSeller()
        : await dashboardAPI.getBuyer()
      setStats(data)
      setAnalytics(data?.analytics || null)

      if (user.role === 'seller') {
        try {
          const insightsData = data?.insights || (await sellerAPI.getInsights())
          setSellerInsights(insightsData)
        } catch (insightsError) {
          console.error('Failed to load seller insights', insightsError)
        }
      } else {
        setSellerInsights(null)
      }
    } catch (err) {
      console.error('Failed to load profile data:', err)
      setError('We could not refresh your profile insights right now. Some metrics may be unavailable.')
    } finally {
      setLoadingStats(false)
    }
  }

  const tabs = useMemo(() => (user?.role === 'seller' ? sellerTabs : buyerTabs), [user?.role])

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(tabs[0]?.id || 'overview')
    }
  }, [tabs, activeTab])

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    router.replace(`/profile?tab=${tabId}`, { scroll: false })
  }

  if (authLoading) {
    return <div className="text-center py-16">Loading profile...</div>
  }

  if (!user) {
    return null
  }

  const roleLabel = user.role === 'buyer' ? 'Buyer' : user.role === 'seller' ? 'Seller' : 'Member'
  const summaryMetrics = analytics?.summary_metrics || {}

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        <ProfileSidebar
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          roleLabel={roleLabel}
          user={user}
        />

        <div className="space-y-8">
          <div className="card bg-gradient-to-r from-primary-50 to-white border border-primary-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-wide text-primary-600 font-semibold">Profile</p>
                <h1 className="text-3xl font-bold text-gray-900 mt-1">{user.username || user.email}</h1>
                <p className="text-sm text-gray-600 mt-2">
                  {roleLabel} account • {user.email}
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={loadProfile} className="btn-secondary text-sm">Refresh Insights</button>
                <Link href="/dashboard" className="btn-primary text-sm">Go to Dashboard</Link>
              </div>
            </div>
            {error && (
              <div className="mt-4 p-3 rounded border border-amber-200 bg-amber-50 text-amber-800 text-sm">
                {error}
              </div>
            )}
          </div>

          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="grid md:grid-cols-3 gap-4">
                {user.role === 'buyer' ? (
                  <>
                    <ProfileCard
                      title="Total Orders"
                      value={stats?.total_orders ?? 0}
                      description="Cumulative purchases you've placed"
                      icon="🧾"
                      accent="primary"
                    />
                    <ProfileCard
                      title="Completed"
                      value={stats?.completed_orders ?? 0}
                      description="Orders delivered or fulfilled"
                      icon="✅"
                      accent="green"
                    />
                    <ProfileCard
                      title="Total Spent"
                      value={`₹${(stats?.total_spent ?? 0).toLocaleString()}`}
                      description="Includes demo orders logged during walkthroughs"
                      icon="💳"
                      accent="blue"
                    />
                  </>
                ) : (
                  <>
                    <ProfileCard
                      title="Total Items Sold"
                      value={(sellerInsights?.total_items_sold ?? 0).toLocaleString()}
                      description="Quantity fulfilled across all listings"
                      icon="📦"
                      accent="primary"
                    />
                    <ProfileCard
                      title="Total Revenue"
                      value={`₹${(sellerInsights?.total_revenue ?? 0).toLocaleString()}`}
                      description="Sum of completed and confirmed orders"
                      icon="💰"
                      accent="green"
                    />
                    <ProfileCard
                      title="Active Listings"
                      value={stats?.active_listings ?? summaryMetrics.active_waste_listings ?? 0}
                      description="Live materials visible to buyers"
                      icon="📊"
                      accent="blue"
                    />
                  </>
                )}
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                {loadingStats ? (
                  <p className="text-sm text-gray-500">Fetching your latest activity...</p>
                ) : user.role === 'buyer' ? (
                  <ul className="space-y-3 text-sm text-gray-700">
                    <li>• Keep an eye on active orders in your dashboard to receive seller updates.</li>
                    <li>• Use the order history tab to revisit invoices and delivery notes.</li>
                    <li>• Visit listings to discover newly added materials that match your interests.</li>
                  </ul>
                ) : (
                  <ul className="space-y-3 text-sm text-gray-700">
                    <li>• Review recent listings performance and convert pending orders faster.</li>
                    <li>• Consider bundling related materials to increase buyer traction.</li>
                    <li>• Engage repeat buyers highlighted on the dashboard for loyalty incentives.</li>
                  </ul>
                )}
              </div>

              {user.role === 'buyer' && (
                <div className="card border border-primary-100 bg-primary-50">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-primary-900">Ready to open your marketplace?</h3>
                      <p className="text-sm text-primary-800 mt-1">
                        Activate our seller tools to list materials, manage orders, and run auctions just like our top vendors.
                      </p>
                    </div>
                    <button
                      onClick={() => handleTabChange('sell')}
                      className="btn-primary text-sm"
                    >
                      Go to Sell Items
                    </button>
                  </div>
                </div>
              )}

              {user.role === 'seller' && sellerInsights && (
                <div className="space-y-6">
                  <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Buyer summary</h3>
                    {sellerInsights.buyer_breakdown && sellerInsights.buyer_breakdown.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-2 text-left font-medium text-gray-600">Buyer</th>
                              <th className="px-4 py-2 text-left font-medium text-gray-600">Orders</th>
                              <th className="px-4 py-2 text-left font-medium text-gray-600">Quantity</th>
                              <th className="px-4 py-2 text-left font-medium text-gray-600">Revenue</th>
                              <th className="px-4 py-2 text-left font-medium text-gray-600">Listings</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {sellerInsights.buyer_breakdown.map((buyer) => (
                              <tr key={buyer.buyer_id}>
                                <td className="px-4 py-3">
                                  <div className="font-medium text-gray-900">{buyer.buyer_name || 'Unknown buyer'}</div>
                                  {buyer.buyer_company && (
                                    <div className="text-xs text-gray-500">{buyer.buyer_company}</div>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-gray-700">{buyer.orders}</td>
                                <td className="px-4 py-3 text-gray-700">{buyer.total_quantity.toLocaleString()}</td>
                                <td className="px-4 py-3 text-gray-700">₹{buyer.total_spent.toLocaleString()}</td>
                                <td className="px-4 py-3 text-gray-700">{buyer.distinct_listings}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">No buyer activity recorded yet.</p>
                    )}
                  </div>

                  <div className="card">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Listing performance</h3>
                    {sellerInsights.listing_breakdown && sellerInsights.listing_breakdown.length > 0 ? (
                      <div className="grid md:grid-cols-2 gap-4">
                        {sellerInsights.listing_breakdown.map((listing) => (
                          <div key={listing.listing_id} className="border border-gray-100 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-gray-900">{listing.title}</h4>
                              <span className="text-xs uppercase text-gray-500">{listing.status}</span>
                            </div>
                            <div className="mt-3 text-sm text-gray-600">
                        <p>Category: {listing.category_type || listing.listing_type || '—'}</p>
                        <p>Orders: {listing.total_orders}</p>
                        <p>
                          Quantity sold: {Number(listing.quantity_sold || 0).toLocaleString()}
                          {listing.quantity_unit ? ` ${listing.quantity_unit}` : ''}
                        </p>
                        <p>Revenue: ₹{Number(listing.revenue || 0).toLocaleString()}</p>
                        <p>Condition: {listing.condition || '—'}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">No listing sales recorded yet.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <OrderHistorySection variant="profile" disableRedirect />
          )}

          {activeTab === 'listings' && user.role === 'seller' && (
            <div className="space-y-6">
              <div className="card bg-white border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Your Listings</h3>
                <p className="text-sm text-gray-600">
                  View and update your active materials from the dashboard or create a new listing to reach more buyers.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href="/dashboard" className="btn-secondary text-sm">Open Dashboard</Link>
                  <Link href="/dashboard/new-listing" className="btn-primary text-sm">Create Listing</Link>
                </div>
              </div>
              <div className="card bg-primary-50 border border-primary-100">
                <h4 className="text-md font-semibold text-primary-900 mb-2">Tip</h4>
                <p className="text-sm text-primary-800">
                  Update listing media and pricing regularly to keep your catalogue competitive and visible to high-intent buyers.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Account Settings</h3>
              <p className="text-sm text-gray-600">
                Profile preferences, password management, and notification controls will appear here. Reach out to support if you need immediate assistance updating your account details.
              </p>
            </div>
          )}

          {activeTab === 'sell' && user.role === 'buyer' && (
            <SellOnMarketplaceSection user={user} />
          )}
        </div>
      </div>
    </div>
  )
}


