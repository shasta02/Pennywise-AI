import React from 'react';
import { motion } from 'motion/react';
import { Check, X, AlertTriangle } from 'lucide-react';
import { ExtractedTransaction } from '../services/geminiService';

interface ReviewModalProps {
  transactions: ExtractedTransaction[];
  onConfirm: () => void;
  onCancel: () => void;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({ transactions, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onCancel}
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-2xl bg-[#111111] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
      >
        <div className="p-8 border-b border-white/5 flex items-center justify-between bg-[#111111]">
          <div>
            <h2 className="text-xl font-semibold text-white">Review Extracted Transactions</h2>
            <p className="text-sm text-[#8E9299]">Gemini found {transactions.length} transactions</p>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <X className="w-5 h-5 text-[#8E9299]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <div className="flex items-center gap-3 p-4 bg-orange-500/5 border border-orange-500/10 rounded-xl mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
            <p className="text-xs text-orange-200">
              Please double-check descriptions and amounts. AI extraction may occasionally miss nuances in complex layouts.
            </p>
          </div>

          <table className="w-full text-left">
            <thead className="text-[10px] uppercase tracking-widest text-[#8E9299] font-bold">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Description</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {transactions.map((tx, idx) => (
                <tr key={idx} className="text-sm">
                  <td className="px-4 py-3 text-[#8E9299] font-mono">{tx.date}</td>
                  <td className="px-4 py-3 text-white font-medium">{tx.description}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      tx.category === 'Transfer' 
                        ? 'bg-blue-500/10 text-blue-400' 
                        : 'bg-white/5 text-emerald-400'
                    }`}>
                      {tx.category}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right font-mono font-medium ${tx.amount < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {tx.amount < 0 ? '-' : '+'}${Math.abs(tx.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-8 border-t border-white/5 flex gap-4 bg-[#0C0C0C]">
          <button 
            onClick={onCancel}
            className="flex-1 py-3 border border-white/5 rounded-xl text-sm font-medium hover:bg-white/5 transition-colors text-[#8E9299]"
          >
            Discard
          </button>
          <button 
            onClick={onConfirm}
            className="flex-[2] py-3 bg-white text-black rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors"
          >
            <Check className="w-4 h-4" />
            Save all to Database
          </button>
        </div>
      </motion.div>
    </div>
  );
};
