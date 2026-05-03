import { useState, useEffect } from 'react';
import { auth, signInWithGoogle, db, handleFirestoreError, OperationType } from './services/firebase';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, setDoc, doc, updateDoc } from 'firebase/firestore';
import { PlaidLink } from './components/PlaidLink';
import { TransactionList } from './components/TransactionList';
import { Dashboard } from './components/Dashboard';
import { PDFUpload } from './components/PDFUpload';
import { ReviewModal } from './components/ReviewModal';
import { AddTransactionModal } from './components/AddTransactionModal';
import { motion, AnimatePresence } from 'motion/react';
import { Wallet, LogOut, ChevronRight, PieChart as PieChartIcon, List as ListIcon, RefreshCw, FileUp, X, Check, Plus } from 'lucide-react';
import { ExtractedTransaction } from './services/geminiService';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions'>('dashboard');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [plaidStatus, setPlaidStatus] = useState<{ hasKeys: boolean, env: string }>({ hasKeys: true, env: 'sandbox' });
  const [pendingTransactions, setPendingTransactions] = useState<ExtractedTransaction[] | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setPlaidStatus({ hasKeys: data.hasPlaidKeys, env: data.plaidEnv }))
      .catch(() => setPlaidStatus({ hasKeys: false, env: 'unknown' }));
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const q = query(
        collection(db, 'transactions'),
        where('userId', '==', user.uid)
      );

      const unsub = onSnapshot(q, (snapshot) => {
        const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const sortedTxs = [...txs].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactions(sortedTxs);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'transactions');
      });

      return () => unsub();
    } else {
      setTransactions([]);
    }
  }, [user]);

  const handleLogin = async () => {
    try {
      const u = await signInWithGoogle();
      // Ensure user document exists
      await setDoc(doc(db, 'users', u.uid), {
        uid: u.uid,
        email: u.email,
        displayName: u.displayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => signOut(auth);

  const isStatementAutopay = (description: string) => {
    const keywords = ['AUTOPAY', 'THANK YOU', 'PAYMENT', 'ONLINE PMT', 'CREDIT CARD PMT'];
    return keywords.some(k => description.toUpperCase().includes(k));
  };

  const saveExtractedTransactions = async () => {
    if (!user || !pendingTransactions) return;

    try {
      const promises = pendingTransactions.map(tx => {
        const isTransfer = isStatementAutopay(tx.description);
        return addDoc(collection(db, 'transactions'), {
          name: tx.description,
          amount: tx.amount,
          category: isTransfer ? 'Transfer' : tx.category,
          date: tx.date,
          userId: user.uid,
          source: 'pdf-extraction',
          adjustedAmount: tx.amount,
          isAdjusted: false,
          createdAt: serverTimestamp(),
          status: 'pending'
        });
      });
      await Promise.all(promises);
      setPendingTransactions(null);
      setShowUploadModal(false);
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.WRITE, 'transactions');
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    const txDate = new Date(tx.date);
    const txMonth = txDate.toISOString().slice(0, 7);
    return txMonth === selectedMonth;
  });

  const months = Array.from(new Set(transactions.map(tx => {
    try {
      return new Date(tx.date).toISOString().slice(0, 7);
    } catch {
      return null;
    }
  }).filter(Boolean))).sort().reverse();

  // If selected month has no transactions and there ARE transactions, reset to most recent
  useEffect(() => {
    if (months.length > 0 && !months.includes(selectedMonth)) {
      setSelectedMonth(months[0] as string);
    }
  }, [months]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090909] flex items-center justify-center font-sans">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <RefreshCw className="w-8 h-8 text-emerald-500" />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#090909] flex flex-col items-center justify-center font-sans px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-[#111111] p-12 rounded-[2rem] shadow-2xl border border-white/5 text-center"
        >
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-emerald-500/20">
            <Wallet className="text-black w-8 h-8" />
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-white mb-4">PennyWise.ai</h1>
          <p className="text-slate-400 mb-12 text-sm leading-relaxed">
            Take control of your shared expenses. Connect your bank, let AI categorize, and adjust for your friends.
          </p>
          <button 
            onClick={handleLogin}
            className="w-full py-4 bg-white text-black rounded-xl font-medium hover:bg-slate-200 transition-colors flex items-center justify-center gap-3 shadow-lg shadow-white/5"
          >
            Get Started with Google
            <ChevronRight className="w-4 h-4" />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090909] text-slate-200 font-sans flex flex-col md:flex-row overflow-hidden">
      {/* Sidebar Navigation - Desktop */}
      <aside className="w-64 bg-[#111111] border-r border-white/5 flex flex-col p-6 hidden md:flex h-screen sticky top-0 shrink-0">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Wallet className="w-4 h-4 text-black" />
          </div>
          <span className="text-xl font-semibold tracking-tight text-white">PennyWise.ai</span>
        </div>
        
        <nav className="space-y-1">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${activeTab === 'dashboard' ? 'bg-white/5 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'dashboard' ? 'bg-emerald-500' : 'bg-transparent'}`}></div>
            Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('transactions')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${activeTab === 'transactions' ? 'bg-white/5 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${activeTab === 'transactions' ? 'bg-emerald-500' : 'bg-transparent'}`}></div>
            Transactions
          </button>
        </nav>

        <div className="mt-auto">
          <div className="flex items-center justify-between gap-3 pt-6 border-t border-white/5">
            <div className="flex items-center gap-3 min-w-0">
              <img src={user.photoURL || ''} alt="" className="w-8 h-8 rounded-full border border-white/10 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-white truncate">{user.displayName}</p>
                <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-white transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col h-screen overflow-y-auto w-full pb-20 md:pb-0">
        {/* Header */}
        <header className="h-16 md:h-20 border-b border-white/5 flex items-center justify-between px-4 md:px-8 bg-[#0C0C0C] sticky top-0 z-40">
          <div className="flex items-center gap-3 md:hidden">
            <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5 text-black" />
            </div>
            <span className="text-lg font-semibold tracking-tight text-white">PennyWise</span>
          </div>
          <div className="hidden md:block">
            <h1 className="text-2xl font-light text-white">
              {activeTab === 'dashboard' ? 'Overview' : 'Transactions'}
            </h1>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <select 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold text-[#8E9299] px-2 md:px-4 py-1.5 md:py-2 hover:text-white transition-all outline-none"
            >
              {months.map(m => (
                <option key={m} value={m as string} className="bg-[#111]">{m}</option>
              ))}
              {!months.includes(new Date().toISOString().slice(0, 7)) && (
                <option value={new Date().toISOString().slice(0, 7)} className="bg-[#111]">
                  Current
                </option>
              )}
            </select>
            <div className="hidden sm:flex items-center gap-2">
              <button 
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold text-emerald-500 hover:bg-emerald-500 hover:text-black transition-all uppercase tracking-widest"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Add Entry</span>
              </button>
              <button 
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 bg-white/5 border border-white/10 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold text-[#8E9299] hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest"
              >
                <FileUp className="w-3.5 h-3.5 text-emerald-500" />
                <span className="hidden lg:inline">Upload</span>
              </button>
            </div>
            <PlaidLink userId={user.uid} />
          </div>
        </header>

        {/* Mobile quick actions */}
        <div className="sm:hidden flex gap-2 p-4 pt-4 -mb-4">
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[10px] font-bold text-emerald-500 uppercase tracking-widest"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Entry
          </button>
          <button 
            onClick={() => setShowUploadModal(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] font-bold text-[#8E9299] uppercase tracking-widest"
          >
            <FileUp className="w-3.5 h-3.5 text-emerald-500" />
            Upload
          </button>
        </div>

        {/* Bottom Navigation - Mobile */}
        <nav className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#111111]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 flex items-center gap-1 z-50 shadow-2xl">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-white'}`}
          >
            <PieChartIcon className="w-4 h-4" />
            <span className={`text-[10px] font-bold uppercase tracking-widest ${activeTab === 'dashboard' ? 'inline' : 'hidden'}`}>Overview</span>
          </button>
          <button 
            onClick={() => setActiveTab('transactions')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all ${activeTab === 'transactions' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-white'}`}
          >
            <ListIcon className="w-4 h-4" />
            <span className={`text-[10px] font-bold uppercase tracking-widest ${activeTab === 'transactions' ? 'inline' : 'hidden'}`}>Ledger</span>
          </button>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button 
            onClick={handleLogout}
            className="p-2.5 text-slate-500 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </nav>

        {!plaidStatus.hasKeys && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-8 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-4 h-4 text-black" />
              </div>
              <p className="text-xs text-orange-200">
                <span className="font-bold text-orange-400 block mb-0.5 uppercase">
                  Plaid {plaidStatus.env} Mode: Keys Missing
                </span>
                Add PLAID_CLIENT_ID and PLAID_SECRET to Secrets to enable real account syncing.
              </p>
            </div>
            <a 
              href="https://dashboard.plaid.com/keys" 
              target="_blank" 
              rel="noreferrer"
              className="text-[10px] font-bold uppercase tracking-widest text-[#8E9299] hover:text-white transition-colors"
            >
              Get Keys
            </a>
          </motion.div>
        )}

        {plaidStatus.hasKeys && plaidStatus.env === 'production' && (
          <div className="mb-4" />
        )}

        {/* Content */}
        <div className="p-8 flex flex-col gap-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' ? (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Dashboard transactions={filteredTransactions} />
              </motion.div>
            ) : (
              <motion.div
                key="transactions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <TransactionList transactions={filteredTransactions} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setShowUploadModal(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-[#111111] border border-white/5 rounded-[2rem] p-10 shadow-2xl"
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-2xl font-semibold text-white mb-2">Upload Statement</h2>
                  <p className="text-sm text-[#8E9299]">Drop a PDF bank statement and Gemini will extract the transactions for you.</p>
                </div>
                <button onClick={() => setShowUploadModal(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-5 h-5 text-[#8E9299]" />
                </button>
              </div>

              <PDFUpload onTransactionsExtracted={(txs) => {
                setPendingTransactions(txs);
                setShowUploadModal(false);
              }} />
              
              <div className="mt-8 pt-8 border-t border-white/5">
                <div className="flex items-start gap-3 p-4 bg-emerald-500/5 rounded-xl">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-black" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white uppercase tracking-tighter mb-1">Direct Banking also available</p>
                    <p className="text-[10px] text-emerald-400/70 leading-relaxed">
                      You can also connect your bank directly via Plaid for automated real-time syncing.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {pendingTransactions && (
          <ReviewModal 
            transactions={pendingTransactions}
            onConfirm={saveExtractedTransactions}
            onCancel={() => setPendingTransactions(null)}
          />
        )}
        {showAddModal && (
          <AddTransactionModal onClose={() => setShowAddModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
