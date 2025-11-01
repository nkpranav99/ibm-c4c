'use client'

import React, { useEffect, useState } from 'react'
import { aiDemoAPI } from '../lib/api'

export default function DemoModal({ open, onClose }) {
  const [loading, setLoading] = useState(false)
  const [info, setInfo] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError(null)
    aiDemoAPI.getDemoInfo()
      .then(setInfo)
      .catch((e) => setError(e?.message || 'Failed to load demo info'))
      .finally(() => setLoading(false))
  }, [open])

  if (!open) return null

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      // no toast infra; show quick inline effect by alert
      alert('Copied to clipboard!')
    } catch (e) {
      console.error('Copy failed', e)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Demo Mode</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="p-4 space-y-4">
          {loading && <p>Loading demo details…</p>}
          {error && <p className="text-red-600 text-sm">{error}</p>}

          {info && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-xs text-gray-500">Orchestrate</p>
                  <p className={`font-semibold ${info.orchestrate_enabled ? 'text-green-700' : 'text-gray-700'}`}>
                    {info.orchestrate_enabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded">
                  <p className="text-xs text-gray-500">watsonx.ai</p>
                  <p className={`font-semibold ${info.watsonx_enabled ? 'text-green-700' : 'text-gray-700'}`}>
                    {info.watsonx_enabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Try these sample prompts</h4>
                <div className="flex flex-wrap gap-2">
                  {(info.sample_prompts || []).map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleCopy(p)}
                      className="text-sm px-3 py-2 rounded border border-primary-200 bg-primary-50 text-primary-700 hover:bg-primary-100"
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">Click a prompt to copy, then paste into the chat.</p>
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t flex justify-end">
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  )
}



