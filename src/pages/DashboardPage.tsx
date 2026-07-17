import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useCredits } from '../contexts/CreditsContext';
import { TOOL_COSTS, type ToolCost } from '../lib/credits';
import { useNavigate } from 'react-router-dom';
import {
  Coins,
  MessageSquare, GitCompareArrows, Sparkles, FileText,
  TrendingUp, Zap, Lock, Unlock, Scissors,
  Combine, Minimize2, Edit3, RotateCw, FileSignature,
  ShieldAlert, Crop, LifeBuoy, FileBadge, FilePlus2, Divide, Layers
} from 'lucide-react';

const TOOL_ICONS: Record<string, any> = {
  'merge': Combine, 'split': Scissors, 'compress': Minimize2,
  'rotate': RotateCw, 'protect': Lock, 'unlock': Unlock,
  'watermark': FileBadge, 'sign': FileSignature, 'page-numbers': FilePlus2,
  'organize': Divide, 'edit': Edit3, 'crop': Crop,
  'repair': LifeBuoy, 'redact': ShieldAlert, 'pdf-to-word': FileText,
  'pdf-to-compare': GitCompareArrows, 'pdf-to-chat': MessageSquare,
  'ai-summarize': Sparkles, 'batch-process': Layers,
  'contract-analyzer': ShieldAlert,
};

export function DashboardPage() {
  useTranslation();
  const { user } = useAuth();
  const { credits } = useCredits();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'tools' | 'credits'>('overview');

  const freeTools = TOOL_COSTS.filter((tc: ToolCost) => tc.isFree);
  const paidTools = TOOL_COSTS.filter((tc: ToolCost) => !tc.isFree);
  const topPaidTools = paidTools.slice(0, 8);

  return (
    <div className="bg-slate-50 dark:bg-[#020617] py-12 px-4 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
            Welcome back, {user?.displayName || user?.email?.split('@')[0] || 'User'}
          </h1>
          <p className="text-slate-400 font-medium">Manage your account and tools</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                <Coins className="w-5 h-5 text-indigo-500" />
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Credits</p>
            </div>
            <p className="text-3xl font-black text-slate-900 dark:text-white">{credits.toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                <Zap className="w-5 h-5 text-emerald-500" />
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Free Tools</p>
            </div>
            <p className="text-3xl font-black text-slate-900 dark:text-white">{freeTools.length}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Total Tools</p>
            </div>
            <p className="text-3xl font-black text-slate-900 dark:text-white">{TOOL_COSTS.length}</p>
          </div>
        </div>

        <div className="flex gap-2 mb-8">
          {([
            { id: 'overview', label: 'Overview' },
            { id: 'tools', label: 'All Tools' },
            { id: 'credits', label: 'Buy Credits' },
          ] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-slate-900 text-slate-400 hover:text-slate-600 border border-slate-200 dark:border-slate-800'
              }`}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white mb-4">Free Tools</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
              {freeTools.map((tc: ToolCost) => {
                const Icon = TOOL_ICONS[tc.toolId] || FileText;
                return (
                  <button key={tc.toolId} onClick={() => navigate(`/${tc.toolId}`)}
                    className="flex items-center gap-4 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-emerald-500/30 hover:shadow-lg transition-all text-left group">
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-all">
                      <Icon className="w-5 h-5 text-emerald-500 group-hover:text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{tc.name}</p>
                      <p className="text-[10px] text-slate-400">{tc.description}</p>
                    </div>
                    <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 text-[10px] font-black uppercase rounded-full">Free</span>
                  </button>
                );
              })}
            </div>

            <h2 className="text-lg font-black text-slate-900 dark:text-white mb-4">Popular Paid Tools</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topPaidTools.map((tc: ToolCost) => {
                const Icon = TOOL_ICONS[tc.toolId] || FileText;
                return (
                  <button key={tc.toolId} onClick={() => navigate(`/${tc.toolId}`)}
                    className="flex items-center gap-4 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 hover:shadow-lg transition-all text-left group">
                    <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all">
                      <Icon className="w-5 h-5 text-indigo-500 group-hover:text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{tc.name}</p>
                      <p className="text-[10px] text-slate-400">{tc.description}</p>
                    </div>
                    <span className="px-3 py-1 bg-indigo-500/10 text-indigo-600 text-[10px] font-black rounded-full">{tc.credits} credits</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'tools' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TOOL_COSTS.map((tc: ToolCost) => {
              const Icon = TOOL_ICONS[tc.toolId] || FileText;
              return (
                <button key={tc.toolId} onClick={() => navigate(`/${tc.toolId}`)}
                  className="flex items-center gap-4 p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500/30 hover:shadow-lg transition-all text-left group">
                  <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center group-hover:bg-indigo-500 group-hover:text-white transition-all">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{tc.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{tc.description}</p>
                  </div>
                  <span className={`px-3 py-1 text-[10px] font-black rounded-full ${
                    tc.isFree ? 'bg-emerald-500/10 text-emerald-600' : 'bg-indigo-500/10 text-indigo-600'
                  }`}>
                    {tc.isFree ? 'Free' : `${tc.credits}c`}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {activeTab === 'credits' && (
          <div className="text-center py-12">
            <p className="text-slate-400 mb-6">You have <span className="text-indigo-600 font-black">{credits.toLocaleString()}</span> credits</p>
            <button onClick={() => navigate('/pricing')}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20">
              Buy More Credits
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
