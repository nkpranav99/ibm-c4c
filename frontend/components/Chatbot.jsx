'use client'

import React, { useState, useEffect, useRef } from 'react'
import { chatbotAPI } from '../lib/api'

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! 👋 I'm your waste material marketplace assistant. How can I help you today?",
      timestamp: new Date().toISOString()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage = inputMessage.trim()
    setInputMessage('')
    
    // Add user message
    const newUserMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    }
    setMessages(prev => [...prev, newUserMessage])
    setIsLoading(true)

    try {
      // Send to chatbot API
      const response = await chatbotAPI.chat({
        message: userMessage,
        conversation_history: messages.map(m => ({
          role: m.role,
          content: m.content
        }))
      })

      // Add assistant response
      const assistantMessage = {
        role: 'assistant',
        content: response.message,
        suggestions: response.suggestions || [],
        listings: response.listings || [],
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chatbot error:', error)
      const errorMessage = {
        role: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again or refresh the page.",
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion) => {
    setInputMessage(suggestion)
    inputRef.current?.focus()
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatMessage = (content) => {
    // Format markdown-like formatting
    return content
      .split('\n')
      .map((line, index) => {
        // Bold text
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Numbered lists
        line = line.replace(/^\d+️⃣\s+/g, '<span class="text-primary-600 font-semibold">$&</span>')
        return React.createElement('p', { key: index, dangerouslySetInnerHTML: { __html: line } })
      })
  }

  return (
    <>
      {/* Chatbot Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 bg-primary-600 text-white rounded-full p-4 shadow-2xl hover:bg-primary-700 transition-all duration-300 transform hover:scale-110 ${
          isOpen ? 'rotate-90' : ''
        }`}
        aria-label="Toggle chatbot"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Chatbot Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[600px] bg-white rounded-lg shadow-2xl flex flex-col border border-secondary-200 animate-slide-up">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-4 rounded-t-lg flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-secondary-200 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold">Scraps2Stacks Assistant</h3>
                <p className="text-xs text-primary-100">Online • Ready to help</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-primary-100 transition-colors"
              aria-label="Close chatbot"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-secondary-200 text-gray-800 shadow-sm border border-secondary-300'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="text-sm whitespace-pre-wrap">
                      {formatMessage(message.content)}
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                  
                  {/* Listings Display */}
                  {message.listings && message.listings.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {message.listings.map((listing, listIndex) => (
                        <a
                          key={listIndex}
                          href={`/listing/${listing.id}`}
                          className="block bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-lg p-3 text-left transition-colors"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-sm text-primary-900">{listing.title}</h4>
                            <span className="text-xs bg-primary-600 text-white px-2 py-1 rounded">{listing.listing_type?.replace('_', ' ')}</span>
                          </div>
                          <div className="text-xs text-gray-700 space-y-1">
                            <p><strong>Material:</strong> {listing.material_name} • {listing.category}</p>
                            <p><strong>Quantity:</strong> {listing.quantity} {listing.quantity_unit}</p>
                            <p><strong>Price:</strong> ₹{listing.price?.toLocaleString('en-IN') || '0'} / {listing.quantity_unit}</p>
                            {listing.total_value && (
                              <p><strong>Total Value:</strong> ₹{listing.total_value.toLocaleString('en-IN')}</p>
                            )}
                            <p><strong>Location:</strong> {listing.location}</p>
                            {listing.seller_company && (
                              <p><strong>Seller:</strong> {listing.seller_company}</p>
                            )}
                          </div>
                          <div className="mt-2 text-xs text-primary-700 font-medium">
                            View Details →
                          </div>
                        </a>
                      ))}
                    </div>
                  )}
                  
                  {/* Suggestions */}
                  {message.suggestions && message.suggestions.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {message.suggestions.map((suggestion, sugIndex) => (
                        <button
                          key={sugIndex}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="block w-full text-left text-xs bg-primary-50 hover:bg-primary-100 text-primary-700 px-3 py-2 rounded border border-primary-200 transition-colors"
                        >
                          💡 {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-secondary-200 text-gray-800 rounded-lg p-3 shadow-sm border border-secondary-300">
                  <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-primary-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-secondary-200 p-4 bg-secondary-100 rounded-b-lg">
            <div className="flex space-x-2">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm break-words"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2 text-center">
              Press Enter to send • Shift+Enter for new line
            </p>
          </div>
        </div>
      )}

      {/* Add custom animation */}
      <style jsx>{`
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </>
  )
}

