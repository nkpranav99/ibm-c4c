'use client'

import React, { useEffect, useState } from 'react'
import { machineryAPI } from '../../lib/api'
import Link from 'next/link'

export default function PackagesPage() {
  const [packages, setPackages] = useState([])
  const [shutdownCompanies, setShutdownCompanies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const packagesData = await machineryAPI.getPackages()
      setPackages(packagesData)
      
      const companiesData = await machineryAPI.getShutdownCompanies()
      setShutdownCompanies(companiesData)
    } catch (error) {
      console.error('Failed to load packages:', error)
    } finally {
      setLoading(false)
    }
  }

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'Very High':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading packages...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/listings" className="text-primary-600 hover:text-primary-700 mb-4 inline-flex items-center">
            ← Back to Listings
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">💼 Bundled Packages</h1>
          <p className="text-lg text-gray-600">Complete business setups with massive savings</p>
        </div>

        {/* Special Banner */}
        <div className="bg-gradient-to-r from-red-50 to-orange-50 border-l-4 border-red-600 rounded-lg p-6 mb-8">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <span className="text-4xl">⚡</span>
            </div>
            <div className="ml-4">
              <h3 className="text-xl font-bold text-gray-900 mb-2">🔥 Limited Time Liquidation Sales</h3>
              <p className="text-gray-700">
                These complete setups are from companies shutting down. Get ready-to-operate facilities at 15-25% discounts!
                Perfect for entrepreneurs looking to start or expand their business.
              </p>
            </div>
          </div>
        </div>

        {/* Packages Grid */}
        <div className="grid md:grid-cols-1 gap-8 mb-12">
          {packages.map((pkg) => (
            <div key={pkg.package_id} className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow overflow-hidden border-2 border-primary-200">
              {/* Package Header */}
              <div className="bg-gradient-to-r from-primary-600 to-purple-600 p-6 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-3xl">📦</span>
                      <h2 className="text-2xl font-bold">{pkg.package_name}</h2>
                      {pkg.urgent_sale_note && (
                        <span className="px-3 py-1 bg-red-500 rounded-full text-sm font-semibold animate-pulse">
                          🚨 URGENT
                        </span>
                      )}
                    </div>
                    <p className="text-primary-100 text-lg">{pkg.company}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-primary-200 mb-1">Original Price</p>
                    <p className="text-2xl font-bold line-through opacity-70">
                      ₹{(pkg.total_value_inr / 10000000).toFixed(2)}Cr
                    </p>
                  </div>
                </div>
              </div>

              {/* Package Details */}
              <div className="p-6">
                {/* Pricing Highlight */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Your Price (after discount)</p>
                      <p className="text-3xl font-bold text-green-600">
                        ₹{(pkg.discounted_price_inr / 10000000).toFixed(2)}Cr
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 mb-1">You Save</p>
                      <p className="text-2xl font-bold text-green-600">
                        ₹{(pkg.savings_inr / 100000).toFixed(1)}L
                      </p>
                      <p className="text-sm font-semibold text-green-700">
                        {pkg.savings_percentage}% OFF
                      </p>
                    </div>
                  </div>
                </div>

                {/* Included Machinery */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                    <span className="mr-2">🔧</span> Included Machinery
                  </h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    {pkg.included_machinery.map((machine, idx) => (
                      <div key={idx} className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <span className="text-2xl mr-3">⚙️</span>
                        <span className="text-sm text-gray-700">{machine}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Key Features */}
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="text-2xl mb-2">✅</div>
                    <p className="font-semibold text-gray-900">Ready to Operate</p>
                    <p className="text-sm text-gray-600">
                      Setup in {pkg.estimated_setup_time_days} days
                    </p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="text-2xl mb-2">🎓</div>
                    <p className="font-semibold text-gray-900">Training Included</p>
                    <p className="text-sm text-gray-600">
                      {pkg.training_period_days} days of training
                    </p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="text-2xl mb-2">🏭</div>
                    <p className="font-semibold text-gray-900">Target Industries</p>
                    <p className="text-sm text-gray-600">
                      {pkg.target_industries.join(', ')}
                    </p>
                  </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex gap-4">
                  <button className="btn-primary flex-1 text-center">
                    📧 Inquire Now
                  </button>
                  <button className="btn-secondary flex-1 text-center border-2 border-primary-600 text-primary-600">
                    📞 Request Callback
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Shutdown Companies Info */}
        {shutdownCompanies.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">🏢 Individual Machinery from Liquidating Companies</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {shutdownCompanies.map((company) => (
                <div key={company.company_id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{company.company_name}</h3>
                      <p className="text-sm text-gray-600">{company.location}</p>
                      <p className="text-sm text-gray-500">{company.company_type}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getUrgencyColor(company.urgency_level)}`}>
                      {company.urgency_level}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium w-32">Machinery:</span>
                      <span>{company.total_machinery_count} machines available</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium w-32">Value:</span>
                      <span className="font-semibold">₹{(company.estimated_total_value_inr / 10000000).toFixed(1)}Cr</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium w-32">Discount:</span>
                      <span className="text-green-600 font-semibold">{company.bulk_discount_percentage}% bulk discount</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="font-medium w-32">Deadline:</span>
                      <span>{company.liquidation_deadline}</span>
                    </div>
                  </div>

                  {company.shutdown_reason && (
                    <div className="mt-3 p-3 bg-gray-50 rounded border border-gray-200">
                      <p className="text-xs text-gray-600 mb-1">Reason:</p>
                      <p className="text-sm text-gray-700">{company.shutdown_reason}</p>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">Contact:</span> {company.contact_person} • {company.contact_phone}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Additional Info */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">💡 Why Choose Bundled Packages?</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-start">
              <span className="text-2xl mr-3">💰</span>
              <div>
                <p className="font-medium text-gray-900">Massive Savings</p>
                <p className="text-sm text-gray-600">Get 15-25% discounts on complete setups worth crores</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="text-2xl mr-3">⚡</span>
              <div>
                <p className="font-medium text-gray-900">Ready to Operate</p>
                <p className="text-sm text-gray-600">Start production in 20-45 days instead of months</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="text-2xl mr-3">🎓</span>
              <div>
                <p className="font-medium text-gray-900">Training Included</p>
                <p className="text-sm text-gray-600">Operators trained for 7-15 days at no extra cost</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="text-2xl mr-3">🔧</span>
              <div>
                <p className="font-medium text-gray-900">Complete Setup</p>
                <p className="text-sm text-gray-600">All machinery, auxiliaries, and support equipment included</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

