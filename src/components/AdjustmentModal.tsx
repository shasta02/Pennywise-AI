import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Check, ArrowRight, UserPlus, Trash2, AlertCircle } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../services/firebase';
import { updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';

export function AdjustmentModal({ transaction, onClose }: { transaction: any, onClose: () => void }) {
  const [adjustedAmount, setAdjustedAmount] = useState(transaction.adjustedAmount.toString());
  const [category, setCategory] = useState(transaction.category);
  const [isSaving, setIsSaving] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'transactions', transaction.id), {
        adjustedAmount: parseFloat(adjustedAmount),
        category: category,
        isAdjusted: parseFloat(adjustedAmount) !== transaction.amount,
        updatedAt: serverTimestamp()
      });
      onClose();
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.UPDATE, `transactions/${transaction.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  const categories = [
    'Food & Drink', 'Transportation', 'Shopping', 'Entertainment', 
    'Utilities', 'Rent/Mortgage', 'Health/Fitness', 'Travel', 'Income', 'Transfer', 'Other'
  ];

  const handleDelete = async () => {
    setIsSaving(true);
    try {
      await deleteDoc(doc(db, 'transactions', transaction.id));
      onClose();
    } catch (err) {
      console.error(err);
      handleFirestoreError(err, OperationType.DELETE, `transactions/${transaction.id}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-[#111] rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden font-sans"
      >
        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/5">
          <div>
            <h2 className="text-lg font-medium text-white uppercase tracking-wider">Manual Adjustment</h2>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Modifying: {transaction.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-8 space-y-8">
          <div>
            <label className="block text-[11px] text-slate-500 uppercase tracking-widest font-bold mb-4">The Split Logic</label>
            <div className="flex items-center gap-6 bg-white/[0.02] p-6 rounded-2xl border border-white/5">
              <div className="flex-1">
                <span className="block text-[10px] text-slate-500 uppercase mb-1">Original</span>
                <span className="text-xl font-mono text-slate-400 tracking-tighter">${transaction.amount.toFixed(2)}</span>
              </div>
              <ArrowRight className="w-5 h-5 text-emerald-500/20" />
              <div className="flex-1">
                <span className="block text-[10px] text-emerald-500 uppercase mb-1 font-bold">Your Net</span>
                <div className="flex items-baseline">
                  <span className="text-emerald-400 text-2xl font-bold mr-1">$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    value={adjustedAmount}
                    onChange={(e) => setAdjustedAmount(e.target.value)}
                    className="w-full text-2xl font-mono font-bold bg-transparent border-none p-0 focus:ring-0 text-emerald-400 caret-white"
                    autoFocus
                  />
                </div>
              </div>
            </div>
            <p className="mt-4 text-[11px] text-slate-500 italic leading-relaxed">
              * Enter the amount you are actually responsible for after all Venmos, reimbursements, or splits.
            </p>
          </div>

          <div>
            <label className="block text-[11px] text-slate-500 uppercase tracking-widest font-bold mb-4">Category Assignment</label>
            <div className="grid grid-cols-2 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border transition-all ${category === cat ? 'bg-emerald-500 text-black border-emerald-500' : 'bg-transparent text-slate-400 border-white/10 hover:border-white/30'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {showConfirmDelete ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6"
            >
              <div className="flex items-center gap-3 mb-4 text-red-500">
                <AlertCircle className="w-5 h-5" />
                <p className="text-xs font-bold uppercase tracking-widest">Delete Transaction?</p>
              </div>
              <p className="text-[11px] text-slate-400 mb-6 font-medium">This action is permanent and cannot be undone.</p>
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setShowConfirmDelete(false)}
                  className="flex-1 py-3 bg-white/5 text-slate-400 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleDelete}
                  disabled={isSaving}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-400 transition-all font-bold"
                >
                  {isSaving ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="flex gap-4">
              <button 
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                disabled={isSaving}
                className="flex-1 py-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <button 
                type="submit"
                disabled={isSaving}
                className="flex-1 py-4 bg-emerald-500 text-black rounded-xl font-bold uppercase tracking-widest hover:bg-emerald-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                {isSaving ? 'Processing...' : 'Save Changes'}
                <Check className="w-4 h-4" />
              </button>
            </div>
          )}
        </form>
      </motion.div>
    </div>
  );
}
