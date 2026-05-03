import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { TrendingUp, ArrowDown, ArrowUp, DollarSign } from 'lucide-react';
import { motion } from 'motion/react';

export function Dashboard({ transactions }: { transactions: any[] }) {
  const stats = useMemo(() => {
    const expenses = transactions.filter(t => t.category !== 'Transfer' && t.category !== 'Income' && t.category);
    
    // We calculate total spending before and after adjustments
    const totalOriginal = expenses.reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);
    const totalAdjusted = expenses.reduce((acc, t) => acc + Math.abs(Number(t.adjustedAmount ?? t.amount)), 0);
    const savedAmount = totalOriginal - totalAdjusted;

    const categoryDataMap: Record<string, number> = {};
    expenses.forEach(t => {
      const categoryName = t.category || 'Uncategorized';
      const val = Math.abs(Number(t.adjustedAmount ?? t.amount));
      categoryDataMap[categoryName] = (categoryDataMap[categoryName] || 0) + val;
    });

    const categoryData = Object.entries(categoryDataMap)
      .filter(([name]) => name && name !== 'undefined' && name !== 'null')
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    return { totalOriginal, totalAdjusted, savedAmount, categoryData };
  }, [transactions]);

  const COLORS = ['#5A5A40', '#141414', '#8E9299', '#E4E3E0', '#D1D1C1', '#2A2A2A', '#A0A080', '#404040'];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Summary Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <div className="p-6 rounded-2xl bg-[#111] border border-white/5 shadow-sm relative overflow-hidden">
          <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold italic">Account Spend</span>
          <p className="text-3xl font-medium mt-1 text-white">${stats.totalOriginal.toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-2">Gross amount from statements</p>
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/5 rounded-full blur-2xl"></div>
        </div>

        <div className="p-6 rounded-2xl bg-[#111] border border-white/5 shadow-sm relative overflow-hidden">
          <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold italic">Net Adjustments</span>
          <p className="text-3xl font-medium mt-1 text-emerald-400">-${stats.savedAmount.toFixed(2)}</p>
          <p className="text-xs text-emerald-500 mt-2">Shared costs & splits deducted</p>
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-500/5 rounded-full blur-2xl"></div>
        </div>

        <div className="p-6 rounded-2xl bg-[#111] border border-white/5 shadow-sm relative overflow-hidden text-white">
          <div className="absolute inset-0 bg-emerald-500/[0.02]" />
          <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold italic">True Payload</span>
          <p className="text-3xl font-medium mt-1">${stats.totalAdjusted.toFixed(2)}</p>
          <p className="text-xs text-slate-500 mt-2">Your effective monthly burn</p>
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-emerald-500/10 rounded-full blur-2xl"></div>
        </div>
      </motion.div>

      {/* Charts */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="lg:col-span-3 bg-[#111] p-8 rounded-2xl shadow-sm border border-white/5 min-h-[400px]"
      >
        <h3 className="text-[11px] font-mono uppercase tracking-widest text-slate-500 mb-8 italic">Spending by Category</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stats.categoryData}>
            <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#475569'}} />
            <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{fill: '#475569'}} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1a1a1a', borderRadius: '0.75rem', border: '1px solid rgba(255,255,255,0.1)', color: '#f8fafc' }} 
              itemStyle={{ color: '#f8fafc' }}
              cursor={{ fill: 'rgba(255,255,255,0.02)' }}
            />
            <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>
    </div>
  );
}
