import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = 3001;

// Ollama configuration
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://localhost:11434';
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:8080';
const MODEL = 'mistral';

app.use(cors());
app.use(express.json());

// System prompt for the financial advisor
const SYSTEM_PROMPT = `You are a helpful financial advisor assistant for FinTrack, a personal finance management application.
Help users manage their finances, answer questions about their accounts, budgets, and transactions.
Provide practical financial advice and help them navigate the application features.
Be friendly and conversational. Keep responses concise but informative.
If you don't know something about the user's account, suggest they check the dashboard.`;

async function getUserFinancialContext(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring('Bearer '.length).trim();

  if (!token) {
    return null;
  }

  try {
    const [accountsResponse, transactionsResponse] = await Promise.all([
      axios.get(`${API_BASE_URL}/api/v1/accounts?page=0&size=20`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      }),
      axios.get(`${API_BASE_URL}/api/v1/transactions?page=0&size=5`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      }),
    ]);

    const accounts = accountsResponse.data?.content || [];
    const transactions = transactionsResponse.data?.content || [];

    const activeAccounts = accounts.filter((account) => account.status === 'ACTIVE');

    if (activeAccounts.length === 0 && transactions.length === 0) {
      return 'The user currently has no active accounts or recent transactions in FinTrack.';
    }

    const accountSummary = activeAccounts.length
      ? activeAccounts
          .map((account) => `${account.name} (${account.accountType}, ${account.currency}): ${account.currentBalance}`)
          .join('\n')
      : 'No active accounts found.';

    const recentTransactions = transactions.length
      ? transactions
          .slice(0, 5)
          .map((transaction) => `${transaction.transactionDate} ${transaction.transactionType} ${transaction.amount} ${transaction.merchant || transaction.description || 'transaction'}`)
          .join('\n')
      : 'No recent transactions found.';

    return `The user's real FinTrack data is:\nAccounts:\n${accountSummary}\n\nRecent transactions:\n${recentTransactions}`;
  } catch (error) {
    console.warn('Unable to fetch user financial context:', error.message);
    return null;
  }
}

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const userContext = await getUserFinancialContext(authHeader);
    const contextPrompt = userContext
      ? `Use the following real FinTrack data to answer questions accurately.\n\n${userContext}`
      : 'The user is not authenticated, so no real FinTrack data is available yet.';

    const fullMessages = [
      { role: 'system', content: `${SYSTEM_PROMPT}\n\n${contextPrompt}` },
      ...messages
    ];

    const response = await axios.post(`${OLLAMA_API_URL}/api/chat`, {
      model: MODEL,
      messages: fullMessages,
      stream: false,
    }, {
      timeout: 120000,
    });

    if (response.data && response.data.message) {
      return res.json({
        role: response.data.message.role,
        content: response.data.message.content,
      });
    }

    res.status(500).json({ error: 'Invalid response from Ollama' });
  } catch (error) {
    console.error('Chat error:', error.message);
    res.status(500).json({
      error: 'Failed to process chat request',
      message: error.message,
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Ollama status check
app.get('/api/ollama-status', async (req, res) => {
  try {
    const response = await axios.get(`${OLLAMA_API_URL}/api/tags`, {
      timeout: 5000,
    });

    const models = response.data?.models || [];
    const hasModel = models.some((model) => model.name && model.name.startsWith(`${MODEL}:`));

    if (!hasModel) {
      return res.status(503).json({
        status: 'error',
        available: false,
        message: `Ollama is running but model '${MODEL}' is not installed. Pull it with: docker exec fintrack-ollama ollama pull ${MODEL}`,
        model: MODEL,
        models,
      });
    }

    return res.json({
      status: 'ok',
      available: true,
      model: MODEL,
      models,
    });
  } catch (error) {
    return res.status(503).json({
      status: 'error',
      available: false,
      message: 'Ollama service is not available. Start Ollama and make sure the local LLM is running.',
    });
  }
});

app.listen(PORT, () => {
  console.log(`FinTrack Chatbot Service running on port ${PORT}`);
  console.log(`Ollama API: ${OLLAMA_API_URL}`);
  console.log(`Model: ${MODEL}`);
});
