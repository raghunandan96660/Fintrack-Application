import type {
  ChatConversation,
  SendMessageRequest,
  SendMessageResponse,
} from '../types/chat'

const CHATBOT_API = 'http://localhost:3001'

export const chatApi = {
  async sendMessage(messages: Array<{ role: string; content: string }>) {
    const accessToken = sessionStorage.getItem('fintrack-auth')
      ? JSON.parse(sessionStorage.getItem('fintrack-auth') || '{}').accessToken
      : null

    const response = await fetch(`${CHATBOT_API}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify({ messages }),
    })

    if (!response.ok) {
      throw new Error('Failed to send message')
    }

    return response.json()
  },

  async checkOllamaStatus() {
    try {
      const response = await fetch(`${CHATBOT_API}/api/ollama-status`)
      return response.ok
    } catch {
      return false
    }
  },
}

