'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

import { machineryAPI } from '../../../lib/api'

const formatCurrency = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
  return `₹${Number(value).toLocaleString('en-IN')}`
}

const formatPercent = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null
  return `${Number(value).toFixed(1)}%`
}

const formatDate = (value) => {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

const InfoGrid = ({ items }) => {
  const visibleItems = items.filter((item) => item.value !== null && item.value !== undefined && item.value !== '')
  if (!visibleItems.length) return null

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {visibleItems.map(({ label, value }) => (
        <div key={label} className="flex flex-col gap-1 p-4 bg-gray-50 rounded-lg border border-gray-100 h-full">
          <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
          <p className="text-sm font-semibold text-gray-900">{value}</p>
        </div>
      ))}
    </div>
  )
}

const PillList = ({ title, items, tone = 'primary' }) => {
  if (!Array.isArray(items) || items.length === 0) return null

  const toneClasses =
    tone === 'success'
      ? 'bg-green-100 text-green-800 border-green-200'
      : tone === 'warning'
        ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
        : 'bg-primary-100 text-primary-800 border-primary-200'

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className={`px-3 py-1 text-xs font-medium rounded-full border ${toneClasses}`}>
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function MachineryDetailPage() {
  const params = useParams()
  const router = useRouter()
  const machineryId = decodeURIComponent(params?.id ?? '')

  const [machinery, setMachinery] = useState(null)
  const [packageInfo, setPackageInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!machineryId) return

    const loadMachinery = async () => {
      try {
        setLoading(true)
        setError(null)

        const data = await machineryAPI.getById(machineryId)
        setMachinery(data)

        try {
          const packages = await machineryAPI.getPackages()
          const match = packages.find((pkg) =>
            Array.isArray(pkg.included_machinery_ids) && pkg.included_machinery_ids.includes(data.id)
          )
          setPackageInfo(match || null)
        } catch (pkgError) {
          console.warn('Failed to load packages for machinery detail:', pkgError)
        }
      } catch (err) {
        console.error('Failed to load machinery details:', err)
        setError(err?.response?.data?.detail || 'Unable to load machinery details.')
      } finally {
        setLoading(false)
      }
    }

    loadMachinery()
  }, [machineryId])

  const discountLabel = useMemo(() => {
    if (!machinery) return null
    const discount = machinery.depreciation_percentage ?? machinery.package_discount ?? null
    const formatted = formatPercent(discount)
    if (formatted) return `${formatted} savings`
    if (machinery.negotiable) return 'Negotiable'
    return null
  }, [machinery])

  if (!machineryId) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-lg text-gray-700">Invalid machinery identifier.</p>
        <Link href="/listings?tab=machinery" className="btn-primary mt-6 inline-flex">
          Back to machinery listings
        </Link>
      </div>
    )
  }

  if (loading) {
    return <div className="py-16 text-center text-gray-600">Loading machinery details…</div>
  }

  if (error || !machinery) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-lg text-gray-700 mb-4">{error || 'Machinery not found.'}</p>
        <div className="flex justify-center gap-3">
          <Link href="/listings?tab=machinery" className="btn-primary">
            Back to machinery listings
          </Link>
          <button type="button" onClick={() => router.refresh()} className="btn-secondary">
            Try again
          </button>
        </div>
      </div>
    )
  }

  const price = machinery.price_inr ?? machinery.price ?? null
  const originalPrice = machinery.original_price_inr ?? machinery.original_price ?? null

  const primaryInfo = [
    { label: 'Machine Type', value: machinery.machine_type },
    { label: 'Category', value: machinery.category },
    { label: 'Brand', value: machinery.brand },
    { label: 'Model', value: machinery.model },
    { label: 'Year of Manufacture', value: machinery.year_of_manufacture },
    { label: 'Condition', value: machinery.condition },
    { label: 'Location', value: machinery.location },
    { label: 'Seller Company', value: machinery.seller_company },
    { label: 'Seller Type', value: machinery.seller_type },
    { label: 'Sale Type', value: machinery.sale_type },
    { label: 'Listing Status', value: machinery.status },
    { label: 'Date Posted', value: formatDate(machinery.date_posted) },
  ]

  const performanceInfo = [
    { label: 'Capacity', value: machinery.capacity || machinery.capacity_per_hour },
    { label: 'Operating Hours', value: machinery.operating_hours },
    { label: 'Power Rating', value: machinery.power_rating || machinery.power_rating_kw },
    { label: 'Energy Consumption', value: machinery.energy_consumption },
    { label: 'Maintenance Status', value: machinery.maintenance_status },
    { label: 'Last Service Date', value: formatDate(machinery.last_service_date) },
    { label: 'Automation Level', value: machinery.automation_level },
  ]

  const supportFlags = [
    { label: 'Warranty Available', value: machinery.warranty_available },
    { label: 'Installation Support', value: machinery.installation_support },
    { label: 'Training Included', value: machinery.training_included },
    { label: 'Documentation Available', value: machinery.documentation_available },
    { label: 'Site Visit Allowed', value: machinery.site_visit_allowed },
    { label: 'Machinery Removal Support', value: machinery.machinery_removal_support },
    { label: 'Negotiable Pricing', value: machinery.negotiable },
  ].filter((flag) => flag.value !== undefined)

  const tagItems = [
    machinery.condition && { label: machinery.condition, tone: 'condition' },
    machinery.seller_type && { label: machinery.seller_type, tone: 'seller' },
    machinery.sale_type && { label: machinery.sale_type === 'auction' ? 'Auction' : 'Fixed Price', tone: 'sale' },
    machinery.status && { label: machinery.status, tone: 'status' },
  ].filter(Boolean)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/listings?tab=machinery" className="text-sm text-primary-600 hover:text-primary-700 font-semibold">
          ← Back to machinery listings
        </Link>
        {machinery.views && (
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span>👁️ {machinery.views} views</span>
            {machinery.inquiries && <span>💬 {machinery.inquiries} inquiries</span>}
          </div>
        )}
      </div>

      <div className="card mb-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {tagItems.map((tag) => (
                <span
                  key={tag.label}
                  className="px-3 py-1 text-xs font-semibold rounded-full bg-primary-100 text-primary-700 border border-primary-200"
                >
                  {tag.label}
                </span>
              ))}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{machinery.title}</h1>
            <p className="text-sm text-gray-600">
              {machinery.machine_type || 'Industrial machinery'} • {machinery.category || 'General Equipment'}
            </p>
          </div>

          <div className="bg-primary-50 border border-primary-100 rounded-lg p-4 text-center min-w-[220px]">
            <p className="text-xs uppercase tracking-wide text-primary-700">Asking Price</p>
            <p className="text-2xl font-bold text-primary-700 mt-2">{formatCurrency(price)}</p>
            {originalPrice && (
              <p className="text-xs text-gray-500 mt-1">
                Original: <span className="line-through">{formatCurrency(originalPrice)}</span>
              </p>
            )}
            {discountLabel && <p className="text-xs text-green-600 font-semibold mt-2">{discountLabel}</p>}
          </div>
        </div>

        {packageInfo && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Part of bundled package</p>
                <p className="text-sm text-green-800 mt-1">
                  Included in the <span className="font-semibold">{packageInfo.package_name}</span> package with combined value benefits.
                </p>
                <p className="text-xs text-green-700 mt-2">
                  Bundle savings: {formatPercent(packageInfo.savings_percentage) || '—'} • Package value: {formatCurrency(packageInfo.total_package_value_inr)}
                </p>
              </div>
              <Link
                href="/packages"
                className="inline-flex items-center text-sm font-semibold text-green-700 hover:text-green-800"
              >
                View complete package →
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] items-start">
        <div className="space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Specifications</h2>
            <InfoGrid items={primaryInfo} />
          </div>

          <InfoGrid items={performanceInfo} />

          {Array.isArray(machinery.compatible_materials) && machinery.compatible_materials.length > 0 && (
            <PillList title="Compatible Materials" items={machinery.compatible_materials} />
          )}

          {Array.isArray(machinery.target_industries) && machinery.target_industries.length > 0 && (
            <PillList title="Target Industries" items={machinery.target_industries} tone="success" />
          )}

          {Array.isArray(machinery.end_use_applications) && machinery.end_use_applications.length > 0 && (
            <PillList title="End-use Applications" items={machinery.end_use_applications} tone="warning" />
          )}

          {Array.isArray(machinery.features) && machinery.features.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Highlighted Features</h3>
              <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
                {machinery.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>
          )}

          {Array.isArray(machinery.included_accessories) && machinery.included_accessories.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Included Accessories</h3>
              <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
                {machinery.included_accessories.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {machinery.reason_for_sale && (
            <div className="card bg-yellow-50 border border-yellow-200">
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">Reason for Sale</h3>
              <p className="text-sm text-yellow-800 leading-relaxed">{machinery.reason_for_sale}</p>
              {machinery.urgency_note && (
                <p className="mt-2 text-xs font-semibold text-red-600">{machinery.urgency_note}</p>
              )}
            </div>
          )}

          {supportFlags.length > 0 && (
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Support & Commercial Terms</h3>
              <div className="flex flex-wrap gap-2">
                {supportFlags.map(({ label, value }) => (
                  <span
                    key={label}
                    className={`px-3 py-1 text-xs font-medium rounded-full border ${
                      value ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200 line-through'
                    }`}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card">
            <div className="text-center mb-6">
              <span className="text-4xl font-bold text-primary-600">{formatCurrency(price)}</span>
              <p className="text-gray-600 text-sm mt-1">Ex-works price • Taxes extra</p>
              {originalPrice && (
                <p className="text-xs text-gray-500 mt-2">
                  Discount from original valuation: {formatPercent(machinery.depreciation_percentage)}
                </p>
              )}
            </div>

            <button
              type="button"
              className="btn-primary w-full"
              onClick={() => router.push('/contact?context=machinery')}
            >
              Contact seller
            </button>
            <button
              type="button"
              className="btn-secondary w-full mt-3"
              onClick={() => router.push(`/auctions/live?highlight=${encodeURIComponent(machinery.id)}`)}
            >
              View live auctions overview
            </button>

            {machinery.compatible_materials && machinery.compatible_materials.length > 0 && (
              <div className="mt-6 p-4 bg-primary-50 border border-primary-100 rounded-lg text-left">
                <p className="text-xs uppercase text-primary-700 font-semibold mb-2">Optimized for</p>
                <ul className="list-disc list-inside text-sm text-primary-800 space-y-1">
                  {machinery.compatible_materials.slice(0, 5).map((material) => (
                    <li key={material}>{material}</li>
                  ))}
                </ul>
              </div>
            )}

            {machinery.target_industries && machinery.target_industries.length > 0 && (
              <div className="mt-4 text-left">
                <p className="text-xs uppercase text-gray-500 font-semibold mb-2">Ideal for</p>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  {machinery.target_industries.map((industry) => (
                    <li key={industry}>{industry}</li>
                  ))}
                </ul>
              </div>
            )}

            {machinery.end_use_applications && machinery.end_use_applications.length > 0 && (
              <div className="mt-4 text-left">
                <p className="text-xs uppercase text-gray-500 font-semibold mb-2">Applications</p>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  {machinery.end_use_applications.map((app) => (
                    <li key={app}>{app}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {machinery.contact_person && (
            <div className="card bg-gray-50">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Seller Contact</h3>
              <p className="text-sm text-gray-700 font-medium">{machinery.contact_person}</p>
              {machinery.contact_phone && (
                <p className="text-sm text-gray-600 mt-1">Phone: {machinery.contact_phone}</p>
              )}
              {machinery.contact_email && (
                <p className="text-sm text-gray-600">Email: {machinery.contact_email}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}



