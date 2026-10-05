import React from 'react'
import type { ChatMessage } from '../../types/chat'
import './ChatMessage.css'

interface ChatMessageProps {
  message: ChatMessage
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user'
  const timestamp = new Date(message.createdAt).toLocaleTimeString()

  return (
    <div className={`chat-message ${isUser ? 'user-message' : 'assistant-message'}`}>
      <div className="message-content">
        {message.content}
      </div>
      <div className="message-timestamp">{timestamp}</div>
    </div>
  )
}
