'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { sellerAPI } from '@/lib/api'

const APPLICATION_STATUS_LABELS = {
  pending: 'Pending review',
  under_review: 'In review',
  approved: 'Approved',
  rejected: 'Rejected',
}

export default function SellOnMarketplaceSection({ user }) {
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [application, setApplication] = useState(null)
  const [formValues, setFormValues] = useState({
    marketplaceName: user?.company_name || '',
    contact: user?.email || '',
    company: user?.company_name || '',
    experience: 'beginner',
    materialFocus: '',
    listingTitle: '',
    listingDescription: '',
    listingMaterial: '',
    listingCategory: '',
    quantity: '',
    quantityUnit: 'tons',
    price: '',
    listingType: 'fixed_price',
    location: '',
    condition: 'new',
    listingCategoryType: 'raw_material',
  })

  const applicationDisabled = application && ['pending', 'under_review', 'approved'].includes((application.status || '').toLowerCase())
  const isFormDisabled = applicationDisabled || status === 'submitting' || status === 'loading' || status === 'read_only'

  useEffect(() => {
    const fetchApplication = async () => {
      try {
        const data = await sellerAPI.getMyApplication()
        setApplication(data)
        setStatus('read_only')
      } catch (err) {
        if (err?.response?.status === 404) {
          setStatus('ready')
          return
        }
        console.error('Failed to load seller application', err)
        setError('We could not load your previous application. You can still submit a new request.')
        setStatus('ready')
      }
    }

    fetchApplication()
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    const quantity = parseFloat(formValues.quantity)
    const price = parseFloat(formValues.price)

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setError('Please enter a valid quantity greater than zero.')
      return
    }

    if (!Number.isFinite(price) || price < 0) {
      setError('Please enter a valid price (use 0 for free listings).')
      return
    }

    setStatus('submitting')
    try {
      const payload = {
        marketplace_name: formValues.marketplaceName,
        contact_email: formValues.contact,
        company_name: formValues.company,
        experience_level: formValues.experience,
        material_focus: formValues.materialFocus,
        listing_title: formValues.listingTitle,
        listing_description: formValues.listingDescription,
        listing_material_name: formValues.listingMaterial,
        listing_category: formValues.listingCategory,
        listing_quantity: quantity,
        listing_quantity_unit: formValues.quantityUnit,
        listing_price: price,
        listing_sale_type: formValues.listingType,
        listing_location: formValues.location,
        listing_condition: formValues.condition,
        listing_category_type: formValues.listingCategoryType,
      }
      const response = await sellerAPI.applyToBecomeSeller(payload)
      setApplication(response)
      setStatus('submitted')
    } catch (err) {
      console.error('Failed to submit seller application', err)
      const message = err?.response?.data?.detail || 'Unable to submit application. Please try again later.'
      setError(message)
      setStatus('ready')
    }
  }

  return (
    <div className="space-y-6">
      {status === 'loading' && (
        <div className="text-sm text-gray-500">Loading your seller application…</div>
      )}
      <div className="card border border-primary-100 bg-primary-50">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-primary-800">Sell on Scraps2Stacks</h2>
            <p className="text-sm text-primary-700 mt-1">
              Launch your own marketplace booth in minutes. We will guide you through onboarding, catalog setup,
              and compliance to get you selling quickly.
            </p>
          </div>
          <div className="text-sm text-primary-800 bg-secondary-100 border border-secondary-200 rounded-lg px-4 py-3">
            <p className="font-semibold">Need help first?</p>
            <Link href="/dashboard/new-listing" className="text-primary-600 hover:text-primary-700 underline">
              Explore listing requirements
            </Link>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">1. Prepare</h3>
          <p className="text-sm text-gray-600 mt-2">Tell us about your company, materials, and volume expectations.</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">2. Onboard</h3>
          <p className="text-sm text-gray-600 mt-2">Our team will provision your seller workspace and train your staff.</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">3. Launch</h3>
          <p className="text-sm text-gray-600 mt-2">List your materials, run auctions, and manage orders in one dashboard.</p>
        </div>
      </div>

      <div className="card border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Apply to become a seller</h3>
        <p className="text-sm text-gray-600 mb-4">
          A seller enablement specialist will review your information and reach out within 1 business day with next steps.
        </p>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {application && (
          <div className="mb-4 rounded border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Current status: <strong>{APPLICATION_STATUS_LABELS[(application.status || '').toLowerCase()] || application.status}</strong>
            {application.status === 'approved' ? ' • You can now access seller tools from the dashboard.' : ''}
          </div>
        )}

        {status === 'submitted' ? (
          <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            Thank you! Your request has been logged. Watch your inbox for onboarding instructions.
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Marketplace name</label>
                <input
                  type="text"
                  required
                  className="input-field mt-1"
                  placeholder="e.g., EcoWaste Solutions"
                  value={formValues.marketplaceName}
                  onChange={(e) => setFormValues({ ...formValues, marketplaceName: e.target.value })}
                  disabled={isFormDisabled}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Primary contact email</label>
                <input
                  type="email"
                  required
                  className="input-field mt-1"
                  value={formValues.contact}
                  onChange={(e) => setFormValues({ ...formValues, contact: e.target.value })}
                  disabled={isFormDisabled}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Company name</label>
                <input
                  type="text"
                  className="input-field mt-1"
                  value={formValues.company}
                  onChange={(e) => setFormValues({ ...formValues, company: e.target.value })}
                  disabled={isFormDisabled}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Marketplace experience</label>
                <select
                  className="input-field mt-1"
                  value={formValues.experience}
                  onChange={(e) => setFormValues({ ...formValues, experience: e.target.value })}
                  disabled={isFormDisabled}
                >
                  <option value="beginner">New to selling online</option>
                  <option value="intermediate">Some experience</option>
                  <option value="advanced">Experienced marketplace seller</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Material focus & expected volume</label>
              <textarea
                rows={3}
                className="input-field mt-1"
                placeholder="Tell us what you plan to sell and approximate monthly tonnage"
                value={formValues.materialFocus}
                onChange={(e) => setFormValues({ ...formValues, materialFocus: e.target.value })}
                disabled={isFormDisabled}
              ></textarea>
            </div>

            <div className="border-t border-dashed pt-4 mt-4 space-y-4">
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Listing details</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Listing title</label>
                  <input
                    type="text"
                    required
                    className="input-field mt-1"
                    value={formValues.listingTitle}
                    onChange={(e) => setFormValues({ ...formValues, listingTitle: e.target.value })}
                    disabled={isFormDisabled}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Material name</label>
                  <input
                    type="text"
                    required
                    className="input-field mt-1"
                    value={formValues.listingMaterial}
                    onChange={(e) => setFormValues({ ...formValues, listingMaterial: e.target.value })}
                    disabled={isFormDisabled}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <input
                    type="text"
                    required
                    className="input-field mt-1"
                    value={formValues.listingCategory}
                    onChange={(e) => setFormValues({ ...formValues, listingCategory: e.target.value })}
                    disabled={isFormDisabled}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Location</label>
                  <input
                    type="text"
                    required
                    className="input-field mt-1"
                    value={formValues.location}
                    onChange={(e) => setFormValues({ ...formValues, location: e.target.value })}
                    disabled={isFormDisabled}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity</label>
                  <input
                    type="number"
                    required
                    className="input-field mt-1"
                    value={formValues.quantity}
                    onChange={(e) => setFormValues({ ...formValues, quantity: e.target.value })}
                    disabled={isFormDisabled}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity unit</label>
                  <input
                    type="text"
                    required
                    className="input-field mt-1"
                    value={formValues.quantityUnit}
                    onChange={(e) => setFormValues({ ...formValues, quantityUnit: e.target.value })}
                    disabled={isFormDisabled}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price (per unit)</label>
                  <input
                    type="number"
                    required
                    className="input-field mt-1"
                    value={formValues.price}
                    onChange={(e) => setFormValues({ ...formValues, price: e.target.value })}
                    disabled={isFormDisabled}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Listing type</label>
                  <select
                    className="input-field mt-1"
                    value={formValues.listingType}
                    onChange={(e) => setFormValues({ ...formValues, listingType: e.target.value })}
                    disabled={isFormDisabled}
                  >
                    <option value="fixed_price">Fixed price</option>
                    <option value="auction">Auction</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Item category</label>
                  <select
                    className="input-field mt-1"
                    value={formValues.listingCategoryType}
                    onChange={(e) => setFormValues({ ...formValues, listingCategoryType: e.target.value })}
                    disabled={isFormDisabled}
                  >
                    <option value="raw_material">Raw material</option>
                    <option value="machinery">Machinery</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Condition</label>
                  <select
                    className="input-field mt-1"
                    value={formValues.condition}
                    onChange={(e) => setFormValues({ ...formValues, condition: e.target.value })}
                    disabled={isFormDisabled}
                  >
                    <option value="new">New</option>
                    <option value="like_new">Like new</option>
                    <option value="refurbished">Refurbished</option>
                    <option value="used">Used</option>
                    <option value="needs_repair">Needs repair</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Listing description</label>
                <textarea
                  rows={3}
                  className="input-field mt-1"
                  value={formValues.listingDescription}
                  onChange={(e) => setFormValues({ ...formValues, listingDescription: e.target.value })}
                  disabled={isFormDisabled}
                ></textarea>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <button
                type="submit"
                className="btn-primary sm:w-auto w-full disabled:opacity-60"
                disabled={isFormDisabled}
              >
                {status === 'submitting' ? 'Submitting…' : 'Submit request'}
              </button>
              <p className="text-xs text-gray-500">
                Submitting does not instantly switch your role. Our team will verify business credentials first.
              </p>
            </div>
          </form>
        )}

        {application?.listing && (
          <div className="mt-6 rounded border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            <p className="font-semibold mb-2">Listing snapshot</p>
            <div className="grid md:grid-cols-2 gap-3 text-green-900">
              <div>
                <span className="font-semibold">Title:</span> {application.listing.title}
              </div>
              <div>
                <span className="font-semibold">Status:</span> {application.listing.status}
              </div>
              <div>
                <span className="font-semibold">Category:</span> {application.listing.listing_type}
              </div>
              <div>
                <span className="font-semibold">Quantity:</span> {Number(application.listing.quantity || 0).toLocaleString()} {application.listing.quantity_unit}
              </div>
              <div>
                <span className="font-semibold">Price:</span> ₹{Number(application.listing.price || 0).toLocaleString()}
              </div>
              <div>
                <span className="font-semibold">Condition:</span> {application.listing.condition || '—'}
              </div>
              {application.listing.location && (
                <div>
                  <span className="font-semibold">Location:</span> {application.listing.location}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


