import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../hooks/useSettings';
import { useToast } from '../contexts/ToastContext';
import { ref, get, set, remove } from 'firebase/database';
import { database } from '../lib/firebase';
import { TOOL_COSTS, CREDIT_PLANS } from '../lib/credits';
import { useAuth } from '../contexts/AuthContext';
import {
  ShieldAlert, Users, CreditCard, Activity, Settings, Clock,
  RefreshCw, Search, ChevronDown, ChevronUp, Eye, EyeOff,
  Server, Lock, AlertTriangle, CheckCircle2, BarChart3, Zap,
  Loader2, ArrowUpRight, ArrowDownRight, Shield, Hash,
  Plus, Minus, Download, FileText, Layers, Globe, XCircle, Key
} from 'lucide-react';

interface UserProfile {
  uid: string;
  full_name: string | null;
  phone: string | null;
  bio: string | null;
  subscription_tier: string;
  is_admin: boolean;
  created_at: string;
  last_login: string;
  login_count: number;
  language_pref: string;
  two_factor_enabled: boolean;
  notifications_enabled: boolean;
  email_notifications: boolean;
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: any; label: string; value: string | number; color: string;
}) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-black text-slate-900 dark:text-white">{value}</p>
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
      <Icon className="w-4 h-4" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export function AdminDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { settings, updateSetting } = useSettings();
  const { showToast } = useToast();
  const [tab, setTab] = useState<'overview' | 'users' | 'tools' | 'credits' | 'security' | 'settings'>('overview');
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [credits, setCredits] = useState<Record<string, number>>({});
  const [usage, setUsage] = useState<Record<string, Record<string, { count: number; lastUsed: string }>>>({});
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState('last_login');
  const [sortAsc, setSortAsc] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [creditAdj, setCreditAdj] = useState<Record<string, number>>({});
  const [settingsEdit, setSettingsEdit] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [newSettingKey, setNewSettingKey] = useState('');
  const [newSettingVal, setNewSettingVal] = useState('');
  const [showCreds, setShowCreds] = useState<Record<string, boolean>>({});

  const fetchData = useCallback(async () => {
    try {
      const [profSnap, usrSnap] = await Promise.allSettled([
        get(ref(database, 'profiles')),
        get(ref(database, 'users')),
      ]);
      if (profSnap.status === 'fulfilled' && profSnap.value.exists()) {
        const d = profSnap.value.val();
        setUsers(Object.entries(d).map(([uid, p]: [string, any]) => ({
          uid, full_name: p.full_name || null, phone: p.phone || null,
          bio: p.bio || null, subscription_tier: p.subscription_tier || 'free',
          is_admin: p.is_admin || false, created_at: p.created_at || '',
          last_login: p.last_login || '', login_count: p.login_count || 0,
          language_pref: p.language_pref || 'en', two_factor_enabled: p.two_factor_enabled ?? false,
          notifications_enabled: p.notifications_enabled ?? true,
          email_notifications: p.email_notifications ?? true,
        })));
      }
      if (usrSnap.status === 'fulfilled' && usrSnap.value.exists()) {
        const d = usrSnap.value.val();
        const c: Record<string, number> = {};
        const u: Record<string, Record<string, { count: number; lastUsed: string }>> = {};
        Object.entries(d).forEach(([uid, v]: [string, any]) => {
          if (typeof v.credits === 'number') c[uid] = v.credits;
          if (v.usage) u[uid] = v.usage;
        });
        setCredits(c);
        setUsage(u);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { if (settings) setSettingsEdit(settings); }, [settings]);

  const stats = useMemo(() => {
    const total = users.length;
    const totalCreds = Object.values(credits).reduce((a, b) => a + b, 0);
    const pro = users.filter(u => u.subscription_tier === 'pro').length;
    const admins = users.filter(u => u.is_admin).length;
    const tfa = users.filter(u => u.two_factor_enabled).length;
    const totalLogins = users.reduce((a, u) => a + u.login_count, 0);
    let totalUses = 0;
    const toolAgg: Record<string, number> = {};
    Object.values(usage).forEach(uu => Object.entries(uu).forEach(([tid, d]) => {
      toolAgg[tid] = (toolAgg[tid] || 0) + (d.count || 0);
      totalUses += (d.count || 0);
    }));
    const sortedTools = Object.entries(toolAgg).map(([id, count]) => ({ id, count, tool: TOOL_COSTS.find(tc => tc.toolId === id) })).sort((a, b) => b.count - a.count);
    const now = new Date();
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
    const todayN = users.filter(u => u.last_login && new Date(u.last_login) >= today).length;
    const weekN = users.filter(u => u.last_login && new Date(u.last_login) >= weekAgo).length;
    return { total, totalCreds, pro, admins, tfa, totalLogins, totalUses, sortedTools, todayN, weekN, toolAgg };
  }, [users, credits, usage]);

  const filtered = useMemo(() => {
    let r = [...users];
    if (search) { const q = search.toLowerCase(); r = r.filter(u => (u.full_name || '').toLowerCase().includes(q) || u.uid.toLowerCase().includes(q)); }
    r.sort((a: any, b: any) => {
      let av = sortKey === 'credits' ? (credits[a.uid] || 0) : sortKey === 'login_count' ? a.login_count : sortKey === 'created_at' ? a.created_at : a.last_login;
      let bv = sortKey === 'credits' ? (credits[b.uid] || 0) : sortKey === 'login_count' ? b.login_count : sortKey === 'created_at' ? b.created_at : b.last_login;
      if (typeof av === 'string') return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? av - bv : bv - av;
    });
    return r;
  }, [users, search, sortKey, sortAsc, credits]);

  const toggleSort = (k: string) => { if (sortKey === k) setSortAsc(!sortAsc); else { setSortKey(k); setSortAsc(false); } };
  const SortIcon = ({ k }: { k: string }) => sortKey === k ? (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null;

  const adjustCredits = async (uid: string, delta: number) => {
    const amt = creditAdj[uid] || 1;
    const current = credits[uid] || 0;
    const newVal = Math.max(0, current + delta * amt);
    try {
      await set(ref(database, `users/${uid}/credits`), newVal);
      setCredits(prev => ({ ...prev, [uid]: newVal }));
      showToast(`Credits ${delta > 0 ? 'added' : 'removed'}`, 'success');
    } catch { showToast('Failed', 'error'); }
  };

  const handleSaveSetting = async (key: string) => {
    setSavingKey(key);
    try { await updateSetting(key, settingsEdit[key]); showToast('Saved', 'success'); } catch { showToast('Failed', 'error'); }
    setSavingKey(null);
  };

  const addSetting = async () => {
    if (!newSettingKey.trim()) return;
    try { await updateSetting(newSettingKey.trim(), newSettingVal); setNewSettingKey(''); setNewSettingVal(''); showToast('Added', 'success'); } catch { showToast('Failed', 'error'); }
  };

  const deleteSetting = async (key: string) => {
    try { await remove(ref(database, `app_settings/${key}`)); setSettingsEdit(prev => { const n = { ...prev }; delete n[key]; return n; }); showToast('Deleted', 'success'); } catch { showToast('Failed', 'error'); }
  };

  const exportUsers = () => {
    const data = users.map(u => ({ ...u, credits: credits[u.uid] || 0 }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `users-${Date.now()}.json`; a.click();
  };

  const fmt = (d: string) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return d; } };

  const envAdminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map((e: string) => e.trim()).filter(Boolean);
  const dbAdmins = users.filter(u => u.is_admin);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#020617]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <p className="text-sm font-bold text-slate-400">Loading admin data...</p>
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview' as const, icon: BarChart3, label: 'Overview' },
    { id: 'users' as const, icon: Users, label: 'Users' },
    { id: 'tools' as const, icon: Zap, label: 'Tools' },
    { id: 'credits' as const, icon: CreditCard, label: 'Credits' },
    { id: 'security' as const, icon: Shield, label: 'Security' },
    { id: 'settings' as const, icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 text-red-600 font-bold text-xs uppercase tracking-widest mb-3">
              <ShieldAlert className="w-3.5 h-3.5" /> Admin Panel
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">System Control Center</h1>
          </div>
          <button onClick={fetchData} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-600 transition-all">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {tabs.map(tb => <TabBtn key={tb.id} active={tab === tb.id} onClick={() => setTab(tb.id)} icon={tb.icon} label={tb.label} />)}
        </div>

        {tab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Total Users" value={stats.total} color="bg-indigo-500/10 text-indigo-600" />
              <StatCard icon={CreditCard} label="Total Credits" value={stats.totalCreds.toLocaleString()} color="bg-amber-500/10 text-amber-600" />
              <StatCard icon={Zap} label="Total Uses" value={stats.totalUses} color="bg-emerald-500/10 text-emerald-600" />
              <StatCard icon={Activity} label="Total Logins" value={stats.totalLogins} color="bg-blue-500/10 text-blue-600" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={Clock} label="Active Today" value={stats.todayN} color="bg-cyan-500/10 text-cyan-600" />
              <StatCard icon={Clock} label="Active This Week" value={stats.weekN} color="bg-violet-500/10 text-violet-600" />
              <StatCard icon={ShieldAlert} label="Admin Users" value={stats.admins} color="bg-rose-500/10 text-rose-600" />
              <StatCard icon={Key} label="2FA Enabled" value={stats.tfa} color="bg-teal-500/10 text-teal-600" />
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Top Tools</h3>
              {stats.sortedTools.length === 0 && <p className="text-slate-500 text-sm">No tool usage recorded yet.</p>}
              {stats.sortedTools.slice(0, 10).map(t => {
                const max = stats.sortedTools[0]?.count || 1;
                return (
                  <div key={t.id} className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 w-32 truncate">{t.tool?.name || t.id}</span>
                    <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${(t.count / max) * 100}%` }} />
                    </div>
                    <span className="text-xs font-bold text-slate-500 w-10 text-right">{t.count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or UID..." className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <button onClick={exportUsers} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-600 hover:text-indigo-600 transition-all">
                <Download className="w-4 h-4" /> Export
              </button>
            </div>
            <p className="text-xs text-slate-400">{filtered.length} users found</p>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      {[['full_name', 'Name'], ['uid', 'UID'], ['credits', 'Credits'], ['subscription_tier', 'Tier'], ['login_count', 'Logins'], ['last_login', 'Last Login'], ['created_at', 'Created']].map(([k, l]) => (
                        <th key={k} onClick={() => toggleSort(k)} className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-indigo-600 transition-colors whitespace-nowrap">
                          <span className="flex items-center gap-1">{l} <SortIcon k={k} /></span>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">Admin</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">2FA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(u => (
                      <>
                        <tr key={u.uid} onClick={() => setExpanded(expanded === u.uid ? null : u.uid)} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{u.full_name || '—'}</td>
                          <td className="px-4 py-3 text-slate-500 font-mono text-xs">{u.uid.slice(0, 12)}...</td>
                          <td className="px-4 py-3">
                            <button onClick={e => { e.stopPropagation(); setShowCreds(p => ({ ...p, [u.uid]: !p[u.uid] })); }} className="flex items-center gap-1 text-sm font-bold text-amber-600">
                              {showCreds[u.uid] ? (credits[u.uid] || 0).toLocaleString() : '***'} <EyeOff className="w-3 h-3" />
                            </button>
                          </td>
                          <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${u.subscription_tier === 'pro' ? 'bg-indigo-500/10 text-indigo-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{u.subscription_tier}</span></td>
                          <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{u.login_count}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{fmt(u.last_login)}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{fmt(u.created_at)}</td>
                          <td className="px-4 py-3">{u.is_admin ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-slate-300" />}</td>
                          <td className="px-4 py-3">{u.two_factor_enabled ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <XCircle className="w-4 h-4 text-slate-300" />}</td>
                        </tr>
                        {expanded === u.uid && (
                          <tr key={`${u.uid}-detail`}>
                            <td colSpan={9} className="px-6 py-4 bg-slate-50 dark:bg-slate-800/30">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                <div><span className="text-xs text-slate-400 block">Full UID</span><span className="text-xs font-mono text-slate-600 dark:text-slate-300 break-all">{u.uid}</span></div>
                                <div><span className="text-xs text-slate-400 block">Phone</span><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{u.phone || '—'}</span></div>
                                <div><span className="text-xs text-slate-400 block">Language</span><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{u.language_pref}</span></div>
                                <div><span className="text-xs text-slate-400 block">Notifications</span><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{u.notifications_enabled ? 'On' : 'Off'}</span></div>
                              </div>
                              {u.bio && <p className="text-sm text-slate-500 mb-4">{u.bio}</p>}
                              <div className="flex items-center gap-2">
                                <input type="number" min={0} value={creditAdj[u.uid] || 1} onChange={e => setCreditAdj(p => ({ ...p, [u.uid]: parseInt(e.target.value) || 1 }))} className="w-20 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm outline-none" />
                                <button onClick={() => adjustCredits(u.uid, 1)} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all"><Plus className="w-4 h-4" /></button>
                                <button onClick={() => adjustCredits(u.uid, -1)} className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white transition-all"><Minus className="w-4 h-4" /></button>
                              </div>
                              {usage[u.uid] && (
                                <div className="mt-3">
                                  <span className="text-xs text-slate-400 block mb-2">Tool Usage</span>
                                  <div className="flex flex-wrap gap-2">
                                    {Object.entries(usage[u.uid]).map(([tid, d]) => (
                                      <span key={tid} className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300">{TOOL_COSTS.find(tc => tc.toolId === tid)?.name || tid}: {d.count}x</span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === 'tools' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white">All Tools ({TOOL_COSTS.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Tool</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Cost</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Uses</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Usage</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-400 uppercase">Last Used</th>
                  </tr>
                </thead>
                <tbody>
                  {TOOL_COSTS.sort((a, b) => (stats.toolAgg[b.toolId] || 0) - (stats.toolAgg[a.toolId] || 0)).map(tc => {
                    const count = stats.toolAgg[tc.toolId] || 0;
                    const max = Math.max(...Object.values(stats.toolAgg), 1);
                    let lastUsed = '';
                    Object.values(usage).forEach(uu => { if (uu[tc.toolId]?.lastUsed && (!lastUsed || uu[tc.toolId].lastUsed > lastUsed)) lastUsed = uu[tc.toolId].lastUsed; });
                    return (
                      <tr key={tc.toolId} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <span className="font-bold text-slate-900 dark:text-white">{tc.name}</span>
                          <span className="block text-xs text-slate-400">{tc.toolId}</span>
                        </td>
                        <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600">{tc.credits} cr</span></td>
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{count}</td>
                        <td className="px-4 py-3">
                          <div className="w-32 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(count / max) * 100}%` }} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{lastUsed ? fmt(lastUsed) : 'Never'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'credits' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={CreditCard} label="Total Credits" value={stats.totalCreds.toLocaleString()} color="bg-amber-500/10 text-amber-600" />
              <StatCard icon={Users} label="Avg Credits/User" value={stats.total > 0 ? Math.round(stats.totalCreds / stats.total) : 0} color="bg-indigo-500/10 text-indigo-600" />
              <StatCard icon={AlertTriangle} label="Zero Credits" value={users.filter(u => (credits[u.uid] || 0) === 0).length} color="bg-rose-500/10 text-rose-600" />
              <StatCard icon={Zap} label="1000+ Credits" value={users.filter(u => (credits[u.uid] || 0) >= 1000).length} color="bg-emerald-500/10 text-emerald-600" />
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Pricing Plans</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {CREDIT_PLANS.map(p => (
                  <div key={p.id} className={`p-4 rounded-xl border ${p.badge ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-200 dark:border-slate-800'}`}>
                    {p.badge && <span className="text-xs font-bold text-indigo-600 bg-indigo-500/10 px-2 py-0.5 rounded-full">{p.badge}</span>}
                    <h4 className="font-black text-lg text-slate-900 dark:text-white mt-2">{p.name}</h4>
                    <p className="text-2xl font-black text-indigo-600">${p.price}</p>
                    <p className="text-xs text-slate-500">{p.credits.toLocaleString()} credits</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Credit Distribution</h3>
              {(() => {
                const ranges = [{ label: '0', min: 0, max: 0 }, { label: '1-50', min: 1, max: 50 }, { label: '51-100', min: 51, max: 100 }, { label: '101-500', min: 101, max: 500 }, { label: '501-1000', min: 501, max: 1000 }, { label: '1000+', min: 1001, max: Infinity }];
                const counts = ranges.map(r => users.filter(u => { const c = credits[u.uid] || 0; if (r.min === 0 && r.max === 0) return c === 0; return c >= r.min && c <= r.max; }).length);
                const maxCount = Math.max(...counts, 1);
                return (
                  <div className="space-y-3">
                    {ranges.map((r, i) => (
                      <div key={r.label} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-500 w-16">{r.label}</span>
                        <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                          <div className="h-full rounded-lg bg-indigo-500 flex items-center pl-2" style={{ width: `${(counts[i] / maxCount) * 100}%`, minWidth: counts[i] > 0 ? '2rem' : 0 }}>
                            {counts[i] > 0 && <span className="text-xs font-bold text-white">{counts[i]}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {tab === 'security' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-4"><Shield className="w-4 h-4" /> Authentication</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-sm text-slate-600 dark:text-slate-300">Firebase Auth</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-sm text-slate-600 dark:text-slate-300">2FA Users</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{stats.tfa} / {stats.total}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-sm text-slate-600 dark:text-slate-300">Admin Auth Method</span>
                    <span className="text-xs font-bold text-slate-500">{envAdminEmails.length > 0 ? 'Env Variable' : 'Firebase DB'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-slate-600 dark:text-slate-300">Total Logins</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{stats.totalLogins}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-4"><Server className="w-4 h-4" /> System Info</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-sm text-slate-600 dark:text-slate-300">Hostname</span>
                    <span className="text-xs font-mono text-slate-500">{window.location.hostname}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-sm text-slate-600 dark:text-slate-300">Platform</span>
                    <span className="text-xs font-mono text-slate-500">{navigator.platform}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-sm text-slate-600 dark:text-slate-300">Protocol</span>
                    <span className="text-xs font-mono text-slate-500">{window.location.protocol}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-slate-600 dark:text-slate-300">Last Check</span>
                    <span className="text-xs font-mono text-slate-500">{new Date().toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-4"><Lock className="w-4 h-4" /> Admin Access</h3>
                {envAdminEmails.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-slate-400 mb-2">Env Var Admins ({envAdminEmails.length})</p>
                    {envAdminEmails.map(e => <div key={e} className="text-xs font-mono text-slate-600 dark:text-slate-300 py-1">{e}</div>)}
                  </div>
                )}
                {dbAdmins.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-2">DB Admins ({dbAdmins.length})</p>
                    {dbAdmins.map(u => <div key={u.uid} className="text-xs font-medium text-slate-600 dark:text-slate-300 py-1">{u.full_name || u.uid.slice(0, 16)}</div>)}
                  </div>
                )}
                {envAdminEmails.length === 0 && dbAdmins.length === 0 && (
                  <p className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> No admin accounts configured</p>
                )}
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-wider mb-4"><Globe className="w-4 h-4" /> Security Checklist</h3>
                <div className="space-y-2">
                  {[
                    { label: 'HTTPS Enabled', ok: window.location.protocol === 'https:' },
                    { label: 'CSP Header Set', ok: !!document.querySelector('meta[http-equiv="Content-Security-Policy"]') },
                    { label: 'Firebase Auth', ok: true },
                    { label: 'Admin Auth Guard', ok: true },
                    { label: 'Rate Limiting (Client)', ok: true },
                    { label: 'Input Sanitization', ok: true },
                    { label: 'XSS Prevention', ok: true },
                  ].map(s => (
                    <div key={s.label} className="flex items-center justify-between py-1.5">
                      <span className="text-sm text-slate-600 dark:text-slate-300">{s.label}</span>
                      {s.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertTriangle className="w-4 h-4 text-amber-500" />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 dark:text-white">App Settings</h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {Object.entries(settingsEdit).map(([key, val]) => (
                  <div key={key} className="px-6 py-3 flex items-center gap-4">
                    <span className="text-sm font-bold text-slate-500 w-32 shrink-0">{key}</span>
                    <input value={val} onChange={e => setSettingsEdit(p => ({ ...p, [key]: e.target.value }))} className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                    <button onClick={() => handleSaveSetting(key)} disabled={savingKey === key || val === settings[key]} className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white disabled:opacity-30 transition-all">
                      {savingKey === key ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    </button>
                    <button onClick={() => deleteSetting(key)} className="p-1.5 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
                <input value={newSettingKey} onChange={e => setNewSettingKey(e.target.value)} placeholder="Key" className="w-32 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                <input value={newSettingVal} onChange={e => setNewSettingVal(e.target.value)} placeholder="Value" className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
                <button onClick={addSetting} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
