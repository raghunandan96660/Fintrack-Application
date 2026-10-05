import React, { useEffect, useRef, useState } from 'react'
import type { ChatConversation } from '../../types/chat'
import { ChatMessage } from './ChatMessage'
import { chatApi } from '../../services/chatApi'
import './ChatWindow.css'

interface ChatWindowProps {
  conversation: ChatConversation
  onClose: () => void
  onMessageSent: () => void
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversation,
  onClose,
  onMessageSent,
}) => {
  const [messages, setMessages] = useState(conversation.messages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim()) return

    const userInput = input
    setInput('')
    setLoading(true)

    try {
      const response = await chatApi.sendMessage(conversation.id, {
        content: userInput,
      })

      setMessages((prev) => [...prev, response.userMessage, response.assistantMessage])
      onMessageSent()
    } catch (error) {
      console.error('Failed to send message:', error)
      // Add error message to chat
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'Sorry, there was an error processing your message. Please try again.',
          createdAt: new Date().toISOString(),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <h3>{conversation.title}</h3>
        <button className="close-btn" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="empty-state">
            <p>Start a conversation with our financial assistant!</p>
            <p className="hint">Ask about your budget, spending, accounts, or any financial tips.</p>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="chat-input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything about your finances..."
          disabled={loading}
          className="chat-input"
        />
        <button type="submit" disabled={loading || !input.trim()} className="send-btn">
          {loading ? 'Sending...' : 'Send'}
        </button>
      </form>
    </div>
  )
}
