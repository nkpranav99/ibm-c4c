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
  { id: 'insights', label: 'Insights' },
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
  const [listingStatusOverrides, setListingStatusOverrides] = useState({})

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

  useEffect(() => {
    if (user?.role === 'seller' && Array.isArray(sellerInsights?.listing_breakdown)) {
      const initialStatuses = {}
      sellerInsights.listing_breakdown.forEach((listing) => {
        const key = listing.listing_id || listing.id
        if (key !== undefined && key !== null) {
          initialStatuses[key] = listing.status || ''
        }
      })
      setListingStatusOverrides(initialStatuses)
    } else {
      setListingStatusOverrides({})
    }
  }, [sellerInsights?.listing_breakdown, user?.role])

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
  const analyticsOrders = analytics?.orders || []
  const analyticsListings = analytics?.listings || []
  const sellerActiveOrders = analyticsOrders.length > 0
    ? analyticsOrders.filter((order) => ['pending', 'in_transit', 'confirmed', 'processing'].includes((order.status || '').toLowerCase())).length
    : stats?.pending_orders ?? stats?.active_orders ?? 0
  const sellerActiveBids = summaryMetrics.active_auctions ?? stats?.active_auctions ?? 0
  const avgListingValue = summaryMetrics.avg_listing_value_inr ?? 0
  const conversionRate = summaryMetrics.conversion_rate_percentage ?? null
  const avgDaysToSell = summaryMetrics.avg_days_to_sell ?? null
  const repeatBuyerRate = summaryMetrics.repeat_buyer_rate_percentage ?? null
  const sellerTotalItemsSold = sellerInsights?.total_items_sold ?? summaryMetrics.total_items_sold ?? stats?.total_items_sold ?? 0
  const sellerTotalRevenue = sellerInsights?.total_revenue ?? summaryMetrics.total_revenue_inr ?? stats?.total_sales ?? 0
  const sellerActiveListings = sellerInsights?.total_listings ?? summaryMetrics.active_listings ?? stats?.active_listings ?? 0
  const recentSellerListings = analyticsListings.length > 0 ? analyticsListings.slice(0, 5) : stats?.recent_listings || []
  const recentSellerOrders = analyticsOrders.length > 0 ? analyticsOrders.slice(0, 5) : stats?.recent_orders || []
  const sellerBuyerBreakdown = Array.isArray(sellerInsights?.buyer_breakdown) ? sellerInsights.buyer_breakdown : []
  const sellerListingBreakdown = Array.isArray(sellerInsights?.listing_breakdown) ? sellerInsights.listing_breakdown : []
  const sellerOrdersLink = '/listings?focus=orders'
  const sellerBidsLink = '/listings?focus=bids'

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
                {user.role === 'seller' && activeTab === 'listings' ? (
                  <Link href="/dashboard/new-listing" className="btn-primary text-sm">Create Listing</Link>
                ) : (
                  <button onClick={loadProfile} className="btn-secondary text-sm">Refresh Insights</button>
                )}
                {user.role !== 'seller' && (
                  <Link href="/dashboard" className="btn-primary text-sm">Go to Dashboard</Link>
                )}
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

              {user.role === 'seller' && (
                <div className="card bg-primary-50 border border-primary-100">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-primary-900">Deeper analytics available</h3>
                      <p className="text-sm text-primary-800 mt-1">
                        Track buyer trends, listing performance, and revenue insights directly from the new Insights tab.
                      </p>
                    </div>
                    <button
                      onClick={() => handleTabChange('insights')}
                      className="btn-primary text-sm"
                    >
                      Open Insights
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        {activeTab === 'insights' && user.role === 'seller' && (
          <div className="space-y-8">
            <div className="grid md:grid-cols-4 gap-6">
              <div className="card bg-primary-50">
                <p className="text-sm text-gray-600 mb-1">Items Sold</p>
                <p className="text-3xl font-bold text-primary-600">{Number(sellerTotalItemsSold || 0).toLocaleString()}</p>
              </div>
              <div className="card bg-green-50">
                <p className="text-sm text-gray-600 mb-1">Active Listings</p>
                <p className="text-3xl font-bold text-green-600">{Number(sellerActiveListings || 0).toLocaleString()}</p>
              </div>
              <div className="card bg-blue-50">
                <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                <p className="text-3xl font-bold text-blue-600">₹{Number(sellerTotalRevenue || 0).toLocaleString()}</p>
              </div>
              <Link href={sellerOrdersLink} className="card bg-yellow-50 hover:shadow-lg transition-shadow">
                <p className="text-sm text-gray-600 mb-1 flex items-center justify-between">
                  <span>Active Orders</span>
                  <span className="text-xs text-yellow-700">View listings →</span>
                </p>
                <p className="text-3xl font-bold text-yellow-600">{Number(sellerActiveOrders || 0).toLocaleString()}</p>
              </Link>
            </div>

            <div className="grid md:grid-cols-4 gap-6">
              <Link href={sellerBidsLink} className="card bg-purple-50 hover:shadow-lg transition-shadow">
                <p className="text-sm text-gray-600 mb-1 flex items-center justify-between">
                  <span>Active Bids</span>
                  <span className="text-xs text-purple-700">Track auctions →</span>
                </p>
                <p className="text-3xl font-bold text-purple-600">{Number(sellerActiveBids || 0).toLocaleString()}</p>
              </Link>
              <div className="card bg-indigo-50">
                <p className="text-sm text-gray-600 mb-1">Avg Listing Value</p>
                <p className="text-3xl font-bold text-indigo-600">₹{Number(avgListingValue || 0).toLocaleString()}</p>
              </div>
              <div className="card bg-teal-50">
                <p className="text-sm text-gray-600 mb-1">Conversion Rate</p>
                <p className="text-3xl font-bold text-teal-600">{conversionRate !== null ? `${conversionRate.toFixed(1)}%` : '—'}</p>
              </div>
              <div className="card bg-rose-50">
                <p className="text-sm text-gray-600 mb-1">Avg Days to Sell</p>
                <p className="text-3xl font-bold text-rose-600">{avgDaysToSell !== null ? Number(avgDaysToSell).toLocaleString() : '—'}</p>
              </div>
            </div>

            {repeatBuyerRate !== null && (
              <div className="card bg-sky-50 border border-sky-100">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold text-sky-900">Customer Loyalty Snapshot</h2>
                    <p className="text-sm text-sky-700">Monitor how repeat buyers respond to your marketplace presence.</p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-sm text-sky-600">Repeat Buyer Rate</p>
                      <p className="text-3xl font-bold text-sky-900">{repeatBuyerRate.toFixed(1)}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-sky-600">Active Listings</p>
                      <p className="text-3xl font-bold text-sky-900">{Number(sellerActiveListings || 0).toLocaleString()}</p>
                    </div>
                    <Link
                      href="/listings"
                      className="inline-flex items-center px-4 py-2 text-sm font-semibold text-sky-800 bg-white border border-sky-200 rounded-lg hover:bg-sky-100 transition"
                    >
                      Refresh Listings →
                    </Link>
                  </div>
                </div>
              </div>
            )}

            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Top Buyers</h3>
              {sellerBuyerBreakdown.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Buyer</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Orders</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Quantity</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sellerBuyerBreakdown.slice(0, 5).map((buyer) => (
                        <tr key={buyer.buyer_id}>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900">{buyer.buyer_name || 'Unknown buyer'}</div>
                            {buyer.buyer_company && (
                              <div className="text-xs text-gray-500">{buyer.buyer_company}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-700">{Number(buyer.orders || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-gray-700">{Number(buyer.total_quantity || 0).toLocaleString()}</td>
                          <td className="px-4 py-3 text-gray-700">₹{Number(buyer.total_spent || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-gray-600">No buyer activity recorded yet.</p>
              )}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Listings</h3>
                {recentSellerListings.length > 0 ? (
                  <div className="space-y-3">
                    {recentSellerListings.map((listing) => (
                      <Link
                        key={listing.id || listing.listing_id}
                        href={`/listing/${listing.id || listing.listing_id}`}
                        className="block p-3 border border-gray-100 rounded hover:bg-gray-50 transition"
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="font-medium">{listing.title || listing.material_name}</span>
                            {listing.category && <span className="text-xs text-gray-500 ml-2">({listing.category})</span>}
                            <p className="text-sm text-gray-600">
                              {(listing.location || listing.city || listing.region || '—')}
                              {listing.total_value || listing.price ? ` • ₹${Number(listing.total_value || listing.price || 0).toLocaleString()}` : ''}
                            </p>
                          </div>
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              listing.status === 'active'
                                ? 'bg-primary-100 text-primary-800'
                                : listing.status === 'sold'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {listing.status || '—'}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">No listings available yet.</p>
                )}
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Orders</h3>
                {recentSellerOrders.length > 0 ? (
                  <div className="space-y-3">
                    {recentSellerOrders.map((order) => (
                      <div key={order.id || order.order_id} className="p-3 border border-gray-100 rounded">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">Order #{order.id || order.order_id}</p>
                            <p className="text-sm text-gray-600">
                              {(order.material_name || order.material || '—')} • Quantity: {Number(order.quantity || 0).toLocaleString()}
                              {order.unit ? ` ${order.unit}` : ''}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-primary-600">₹{Number(order.total_price || order.total_amount || 0).toLocaleString()}</p>
                            <p
                              className={`text-xs px-2 py-1 rounded inline-block ${
                                order.status === 'completed' || order.status === 'delivered'
                                  ? 'bg-green-100 text-green-800'
                                  : order.status === 'pending' || order.status === 'in_transit'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {order.status || '—'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">No orders recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

          {activeTab === 'orders' && (
            <OrderHistorySection variant="profile" disableRedirect />
          )}

          {activeTab === 'listings' && user.role === 'seller' && (
            <div className="space-y-6">
              <div className="card bg-primary-50 border border-primary-100">
                <h4 className="text-md font-semibold text-primary-900 mb-2">Tip</h4>
                <p className="text-sm text-primary-800">
                  Update listing media and pricing regularly to keep your catalogue competitive and visible to high-intent buyers.
                </p>
              </div>
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Listing History</h3>
              {sellerListingBreakdown.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-4">
                  {sellerListingBreakdown.map((listing) => {
                    const listingKey = listing.listing_id || listing.id
                    const resolvedStatus = listingKey !== undefined && listingKey !== null
                      ? listingStatusOverrides[listingKey] ?? listing.status ?? ''
                      : listing.status ?? ''
                    const status = (resolvedStatus || '').toLowerCase()
                    const statusClass = status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : status === 'sold'
                          ? 'bg-red-100 text-red-800'
                          : status === 'expired'
                            ? 'bg-gray-900 text-white'
                            : 'bg-gray-100 text-gray-800'
                    return (
                      <div
                        key={listing.listing_id || listing.id}
                        className="border border-gray-100 rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-gray-900">{listing.title}</h4>
                          <span className={`text-xs uppercase px-3 py-1 rounded-full font-semibold ${statusClass}`}>{resolvedStatus || '—'}</span>
                        </div>
                        <div className="mt-3 text-sm text-gray-600 space-y-1">
                          <p>Category: {listing.category_type || listing.listing_type || '—'}</p>
                          <p>Orders: {Number(listing.total_orders || 0).toLocaleString()}</p>
                          <p>
                            Quantity sold: {Number(listing.quantity_sold || 0).toLocaleString()}
                            {listing.quantity_unit ? ` ${listing.quantity_unit}` : ''}
                          </p>
                          <p>Revenue: ₹{Number(listing.revenue || 0).toLocaleString()}</p>
                          <p>Condition: {listing.condition || '—'}</p>
                        </div>
                        {status === 'pending' && listingKey !== undefined && listingKey !== null && (
                          <div className="mt-4 flex gap-2">
                            <button
                              className="btn-primary text-xs px-3 py-1"
                              onClick={() => setListingStatusOverrides((prev) => ({ ...prev, [listingKey]: 'Active' }))}
                            >
                              Approve
                            </button>
                            <button
                              className="btn-secondary text-xs px-3 py-1"
                              onClick={() => setListingStatusOverrides((prev) => ({ ...prev, [listingKey]: 'Expired' }))}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-600">No listing sales recorded yet.</p>
              )}
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


