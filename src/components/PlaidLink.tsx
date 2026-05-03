import { useState, useCallback, useEffect } from 'react';
import { usePlaidLink, PlaidLinkOptions } from 'react-plaid-link';
import { Plus, RefreshCw } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';

export function PlaidLink({ userId }: { userId: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateToken = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/plaid/create-link-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await response.json();
      
      if (!response.ok || data.error) {
        alert(`Configuration Required: ${data.error || 'Please add your PLAID_CLIENT_ID and PLAID_SECRET to the Secrets panel in AI Studio.'}`);
        return;
      }

      setToken(data.link_token);
    } catch (err) {
      console.error(err);
      alert('Network error while connecting to Plaid. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const onSuccess = useCallback(async (public_token: string) => {
    try {
      // Exchange public token for access token
      const response = await fetch('/api/plaid/exchange-public-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ public_token }),
      });
      const data = await response.json();
      
      // Fetch initial transactions
      const txResponse = await fetch('/api/plaid/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: data.access_token }),
      });
      const txData = await txResponse.json();

      // Batch add transactions to Firestore
      for (const tx of txData.transactions || []) {
        await addDoc(collection(db, 'transactions'), {
          userId,
          amount: tx.amount,
          adjustedAmount: tx.amount,
          date: tx.date,
          name: tx.name,
          merchantName: tx.merchant_name || tx.name,
          category: tx.category ? tx.category[0] : 'Uncategorized',
          isAdjusted: false,
          pending: tx.pending,
          createdAt: serverTimestamp(),
          plaidTransactionId: tx.transaction_id
        }).catch(err => handleFirestoreError(err, OperationType.CREATE, 'transactions'));
      }

      alert('Successfully imported transactions!');
    } catch (err) {
      console.error(err);
    }
  }, [userId]);

  const config: PlaidLinkOptions = {
    token,
    onSuccess,
  };

  const { open, ready } = usePlaidLink(config);

  const isConfigured = token !== null || (ready && !loading);

  return (
    <div>
      {token ? (
        <button
          onClick={() => open()}
          disabled={!ready}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black text-[11px] font-bold uppercase tracking-widest rounded-lg shadow-lg hover:bg-slate-100 transition-all disabled:opacity-50"
        >
          <Plus className="w-3 h-3" />
          Link Account
        </button>
      ) : (
        <button
          onClick={generateToken}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold uppercase tracking-widest rounded-lg hover:bg-emerald-500/20 transition-all disabled:opacity-50"
        >
          {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          Import Statements
        </button>
      )}
    </div>
  );
}
