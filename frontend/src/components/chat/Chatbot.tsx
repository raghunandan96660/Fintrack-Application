import React, { useState } from 'react'
import { chatApi } from '../../services/chatApi'
import './Chatbot.css'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export const Chatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init',
      role: 'assistant',
      content: 'Hi! I\'m your FinTrack financial advisor. Ask me anything about managing your finances, budgets, or accounts!',
      createdAt: new Date().toISOString(),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [ollamaReady, setOllamaReady] = useState(true)
  const [ollamaMessage, setOllamaMessage] = useState<string | null>(null)

  const openChat = async () => {
    const ready = await chatApi.checkOllamaStatus()
    setOllamaReady(ready)
    setOllamaMessage(
      ready
        ? null
        : 'Ollama is running but the Mistral model is missing. Start Ollama and run: docker exec fintrack-ollama ollama pull mistral',
    )
    setIsOpen(true)
  }

  const closeChat = () => {
    setIsOpen(false)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      createdAt: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await chatApi.sendMessage(
        messages.map((m) => ({ role: m.role, content: m.content })).concat([
          { role: 'user', content: input },
        ]),
      )

      const assistantMessage: Message = {
        id: Date.now().toString() + '-ai',
        role: 'assistant',
        content: response.content,
        createdAt: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, assistantMessage])
  } catch (error) {
    console.error('Failed to send message:', error)
    const errorMessage: Message = {
      id: Date.now().toString() + '-error',
      role: 'assistant',
      content:
        'Sorry, I encountered an error. Ollama is likely not ready or the Mistral model is missing. Run: docker exec fintrack-ollama ollama pull mistral',
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, errorMessage])
  } finally {
    setLoading(false)
  }
  }

  return (
    <>
      {!isOpen && (
        <button
          className="chatbot-button"
          onClick={openChat}
          disabled={loading}
          title="Open Financial Assistant"
        >
          <span className="chat-icon">💬</span>
          <span className="chat-label">Ask AI</span>
        </button>
      )}

      {isOpen && (
        <div className="chatbot-modal">
          <div className="chat-window">
            <div className="chat-header">
              <h3>Financial Assistant</h3>
              <button className="close-btn" onClick={closeChat}>
                ✕
              </button>
            </div>

            {!ollamaReady && (
              <div className="warning-banner">
                ⚠️ {ollamaMessage || 'Ollama service is not available. Please ensure it is running.'}
              </div>
            )}

            <div className="chat-messages">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`chat-message ${
                    message.role === 'user' ? 'user-message' : 'assistant-message'
                  }`}
                >
                  <div className="message-content">{message.content}</div>
                  <div className="message-timestamp">
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="chat-input-form">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything about your finances..."
                disabled={loading || !ollamaReady}
                className="chat-input"
              />
              <button
                type="submit"
                disabled={loading || !input.trim() || !ollamaReady}
                className="send-btn"
              >
                {loading ? 'Sending...' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

