import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import plaid from 'plaid';
const { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } = plaid;

// Types for Plaid requests
type LinkTokenCreateRequest = any;
type ItemPublicTokenExchangeRequest = any;
type TransactionsGetRequest = any;

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(cors());

// Plaid Configuration
let client: any;
const plaidEnv = process.env.PLAID_ENV || 'sandbox';

try {
  const configuration = new Configuration({
    basePath: PlaidEnvironments[plaidEnv] || PlaidEnvironments.sandbox,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID || '',
        'PLAID-SECRET': process.env.PLAID_SECRET || '',
      },
    },
  });
  client = new PlaidApi(configuration);
  if (!process.env.PLAID_CLIENT_ID || process.env.PLAID_CLIENT_ID === 'YOUR_PLAID_CLIENT_ID') {
    console.warn('WARNING: PLAID_CLIENT_ID is missing or using placeholder value.');
  } else {
    console.log(`Plaid client initialized in ${plaidEnv} mode`);
  }
} catch (err) {
  console.error('Failed to initialize Plaid client:', err);
}

// API Routes
app.get('/api/health', (req, res) => {
  const hasValidKeys = !!(
    process.env.PLAID_CLIENT_ID && 
    process.env.PLAID_SECRET && 
    process.env.PLAID_CLIENT_ID !== 'YOUR_PLAID_CLIENT_ID'
  );
  
  res.json({ 
    status: 'ok', 
    env: process.env.NODE_ENV,
    plaidEnv: plaidEnv,
    hasPlaidKeys: hasValidKeys
  });
});
app.post('/api/plaid/create-link-token', async (req, res) => {
  if (!process.env.PLAID_CLIENT_ID || process.env.PLAID_CLIENT_ID === 'YOUR_PLAID_CLIENT_ID') {
    return res.status(401).json({ error: 'PLAID_CLIENT_ID not configured in Secrets.' });
  }
  try {
    const request: LinkTokenCreateRequest = {
      user: { client_user_id: req.body.userId || 'user-id' },
      client_name: 'PennyWise',
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: 'en',
    };
    const response = await client.linkTokenCreate(request);
    res.json(response.data);
  } catch (error: any) {
    console.error('Plaid Link Token Error:', error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/plaid/exchange-public-token', async (req, res) => {
  try {
    const request: ItemPublicTokenExchangeRequest = {
      public_token: req.body.public_token,
    };
    const response = await client.itemPublicTokenExchange(request);
    // In a real app, you'd store this access token securely (e.g. in Firestore associated with the user)
    // For this prototype, we'll send it back (NOT SECURE for production)
    res.json(response.data);
  } catch (error: any) {
    console.error('Plaid Exchange Error:', error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/plaid/transactions', async (req, res) => {
  const { accessToken, startDate, endDate } = req.body;
  try {
    const request: TransactionsGetRequest = {
      access_token: accessToken,
      start_date: startDate || '2024-01-01',
      end_date: endDate || new Date().toISOString().split('T')[0],
    };
    const response = await client.transactionsGet(request);
    res.json(response.data);
  } catch (error: any) {
    console.error('Plaid Transactions Error:', error.response?.data || error.message);
    res.status(500).json({ error: error.message });
  }
});

// Vite Middleware for Development
const isProd = process.env.NODE_ENV === 'production';
console.log('Starting server in', isProd ? 'production' : 'development', 'mode');

if (!isProd) {
  console.log('Initializing Vite middleware...');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  console.log('Serving static files from dist...');
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
