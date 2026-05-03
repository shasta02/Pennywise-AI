import React, { useState } from 'react';
import { format } from 'date-fns';
import { Edit2, Brain, Check, ChevronDown, Filter, Trash2, Square, CheckSquare } from 'lucide-react';
import { AdjustmentModal } from './AdjustmentModal';
import { categorizeTransactions } from '../services/geminiService';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { updateDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

export function TransactionList({ transactions }: { transactions: any[] }) {
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [isAutoCategorizing, setIsAutoCategorizing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);

  const handleAutoCategorize = async () => {
    setIsAutoCategorizing(true);
    const names = transactions.filter(t => t.category === 'Uncategorized').map(t => t.name);
    if (names.length === 0) {
      setIsAutoCategorizing(false);
      return;
    }

    const categories = await categorizeTransactions(names);
    
    for (const tx of transactions) {
      if (categories[tx.name]) {
        try {
          await updateDoc(doc(db, 'transactions', tx.id), {
            category: categories[tx.name],
            aiCategory: categories[tx.name],
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          console.error(err);
        }
      }
    }
    setIsAutoCategorizing(false);
  };

  const toggleSelect = (id: string, e?: React.MouseEvent | React.TouchEvent) => {
    if (e && 'stopPropagation' in e) e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === transactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(transactions.map(t => t.id));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    
    setIsDeleting(true);
    try {
      const batch = writeBatch(db);
      selectedIds.forEach(id => {
        batch.delete(doc(db, 'transactions', id));
      });
      await batch.commit();
      setSelectedIds([]);
      setShowBulkConfirm(false);
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.DELETE, 'transactions (batch)');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-medium text-white uppercase tracking-wider">Recent Activity</h2>
        <div className="flex items-center gap-4">
          <AnimatePresence mode="wait">
            {showBulkConfirm ? (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-1 pr-3"
              >
                <button 
                  onClick={() => setShowBulkConfirm(false)}
                  className="px-3 py-1.5 text-[10px] font-bold text-slate-400 hover:text-white uppercase transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="px-3 py-1.5 bg-red-500 text-white rounded-md text-[10px] font-bold uppercase hover:bg-red-400 transition-colors flex items-center gap-1 shadow-lg shadow-red-500/20"
                >
                  {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
              </motion.div>
            ) : selectedIds.length > 0 ? (
              <motion.button 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                onClick={() => setShowBulkConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-[11px] font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-sm"
              >
                <Trash2 className="w-3 h-3" />
                Delete ({selectedIds.length})
              </motion.button>
            ) : null}
          </AnimatePresence>
          <button 
            onClick={handleAutoCategorize}
            disabled={isAutoCategorizing}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-black rounded-lg text-[11px] font-bold uppercase tracking-widest hover:bg-emerald-400 transition-all disabled:opacity-50 shadow-lg shadow-emerald-500/20"
          >
            {isAutoCategorizing ? <Brain className="w-3 h-3 animate-pulse" /> : <Brain className="w-3 h-3" />}
            AI Categorize
          </button>
        </div>
      </div>

      <div className="bg-[#111] rounded-2xl border border-white/5 overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/5">
          <div className="text-[11px] text-slate-500 uppercase font-semibold flex items-center gap-3">
            <button 
              onClick={handleSelectAll}
              className="hover:text-white transition-colors"
            >
              {selectedIds.length === transactions.length && transactions.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-emerald-500" />
              ) : (
                <Square className="w-4 h-4" />
              )}
            </button>
            Ledger View
          </div>
          <div className="text-[11px] text-slate-400 italic">Click row to adjust net amounts</div>
        </div>
        
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-[11px] text-slate-500 uppercase font-semibold border-b border-white/5">
                <th className="px-6 py-4 w-10"></th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Merchant</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-right">Charged</th>
                <th className="px-6 py-4 text-right text-emerald-400">Net Adjust</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, idx) => (
                <motion.tr 
                  key={tx.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`group border-b border-white/5 hover:bg-white/[0.03] transition-colors cursor-pointer ${tx.isAdjusted ? 'bg-white/[0.01]' : ''} ${selectedIds.includes(tx.id) ? 'bg-emerald-500/5' : ''}`}
                  onClick={() => setSelectedTx(tx)}
                >
                  <td className="px-6 py-4">
                    <button 
                      onClick={(e) => toggleSelect(tx.id, e)}
                      className="text-slate-600 hover:text-emerald-500 transition-colors"
                    >
                      {selectedIds.includes(tx.id) ? (
                        <CheckSquare className="w-4 h-4 text-emerald-500" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-500">
                    {format(new Date(tx.date), 'MMM dd')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-white">{tx.name}</div>
                    {tx.isAdjusted && (
                      <div className="flex items-center gap-1 mt-1">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-[10px] text-emerald-400/70 uppercase font-bold tracking-tighter">Split Applied</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                      tx.category === 'Transfer' ? 'bg-blue-500/10 text-blue-400' :
                      tx.aiCategory ? 'bg-emerald-500/10 text-emerald-400' : 
                      'bg-slate-500/10 text-slate-400'
                    }`}>
                      {tx.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-right text-slate-500">
                    ${Number(tx.amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex flex-col items-end">
                      <span className={`text-sm font-bold ${tx.isAdjusted ? 'text-emerald-400' : 'text-white'}`}>
                        ${Number(tx.adjustedAmount).toFixed(2)}
                      </span>
                      {tx.isAdjusted && (
                        <span className="text-[9px] text-slate-500 font-mono">
                          Saved ${(tx.amount - tx.adjustedAmount).toFixed(2)}
                        </span>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-24 text-center">
                    <div className="text-slate-500 text-sm">No transactions detected. Connect an account to see your ledger.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile List View */}
        <div className="md:hidden divide-y divide-white/5">
          {transactions.map((tx) => (
            <div 
              key={tx.id} 
              className={`p-4 flex items-center gap-4 active:bg-white/5 transition-colors ${selectedIds.includes(tx.id) ? 'bg-emerald-500/5' : ''}`}
              onClick={() => setSelectedTx(tx)}
            >
              <button 
                onClick={(e) => toggleSelect(tx.id, e)}
                className="text-slate-600 shrink-0"
              >
                {selectedIds.includes(tx.id) ? (
                  <CheckSquare className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Square className="w-5 h-5" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] font-mono text-slate-500">{format(new Date(tx.date), 'MMM dd')}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{tx.category}</span>
                </div>
                <div className="text-sm font-medium text-white truncate">{tx.name}</div>
                {tx.isAdjusted && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <Check className="w-2.5 h-2.5 text-emerald-400" />
                    <span className="text-[9px] text-emerald-400/70 font-bold uppercase">Split Applied</span>
                  </div>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className={`text-sm font-bold ${tx.isAdjusted ? 'text-emerald-400' : 'text-white'}`}>
                  ${Number(tx.adjustedAmount).toFixed(2)}
                </div>
                <div className="text-[10px] font-mono text-slate-500">
                  ${Number(tx.amount).toFixed(2)}
                </div>
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="p-12 text-center text-slate-500 text-sm italic">
              No transactions detected.
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedTx && (
          <AdjustmentModal 
            transaction={selectedTx} 
            onClose={() => setSelectedTx(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
