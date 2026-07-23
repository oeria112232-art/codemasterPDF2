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
  Loader2, Shield, Plus, Minus, Download, Globe, XCircle, Key
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
      <p className="text-xs font-bold text-slate-400 tracking-wider mt-1">{label}</p>
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label }: { active: boolean; onClick: () => void; icon: any; label: string }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
      <Icon className="w-4 h-4" />
      <span>{label}</span>
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
  const [userPage, setUserPage] = useState(0);
  const USERS_PER_PAGE = 50;

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

  const pagedUsers = useMemo(() => {
    const start = userPage * USERS_PER_PAGE;
    return filtered.slice(start, start + USERS_PER_PAGE);
  }, [filtered, userPage]);

  const totalPages = Math.ceil(filtered.length / USERS_PER_PAGE);

  const toggleSort = (k: string) => { if (sortKey === k) setSortAsc(!sortAsc); else { setSortKey(k); setSortAsc(false); } };
  const SortIcon = ({ k }: { k: string }) => sortKey === k ? (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : null;

  const adjustCredits = async (uid: string, delta: number) => {
    const amt = creditAdj[uid] || 1;
    const current = credits[uid] || 0;
    const newVal = Math.max(0, current + delta * amt);
    try {
      await set(ref(database, `users/${uid}/credits`), newVal);
      setCredits(prev => ({ ...prev, [uid]: newVal }));
      showToast(`تم ${delta > 0 ? 'إضافة' : 'خصم'} الكريديت`, 'success');
    } catch { showToast('فشل العملية', 'error'); }
  };

  const handleSaveSetting = async (key: string) => {
    setSavingKey(key);
    try { await updateSetting(key, settingsEdit[key]); showToast('تم الحفظ', 'success'); } catch { showToast('فشل الحفظ', 'error'); }
    setSavingKey(null);
  };

  const addSetting = async () => {
    if (!newSettingKey.trim()) return;
    try { await updateSetting(newSettingKey.trim(), newSettingVal); setNewSettingKey(''); setNewSettingVal(''); showToast('تمت الإضافة', 'success'); } catch { showToast('فشل الإضافة', 'error'); }
  };

  const deleteSetting = async (key: string) => {
    try { await remove(ref(database, `app_settings/${key}`)); setSettingsEdit(prev => { const n = { ...prev }; delete n[key]; return n; }); showToast('تم الحذف', 'success'); } catch { showToast('فشل الحذف', 'error'); }
  };

  const exportUsers = () => {
    const data = users.map(u => ({ ...u, credits: credits[u.uid] || 0 }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `users-${Date.now()}.json`; a.click();
  };

  const fmt = (d: string) => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return d; } };

  const envAdminEmails = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map((e: string) => e.trim()).filter(Boolean);
  const dbAdmins = users.filter(u => u.is_admin);

  if (loading) return (
    <div dir="rtl" className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#020617]">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <p className="text-sm font-bold text-slate-400">جاري تحميل البيانات...</p>
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview' as const, icon: BarChart3, label: 'نظرة عامة' },
    { id: 'users' as const, icon: Users, label: 'المستخدمين' },
    { id: 'tools' as const, icon: Zap, label: 'الأدوات' },
    { id: 'credits' as const, icon: CreditCard, label: 'الكريديت' },
    { id: 'security' as const, icon: Shield, label: 'الأمان' },
    { id: 'settings' as const, icon: Settings, label: 'الإعدادات' },
  ];

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 dark:bg-[#020617] py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 text-red-600 font-bold text-xs tracking-widest mb-3">
              <ShieldAlert className="w-3.5 h-3.5" /> لوحة التحكم
            </div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">مركز التحكم</h1>
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
              <StatCard icon={Users} label="إجمالي المستخدمين" value={stats.total} color="bg-indigo-500/10 text-indigo-600" />
              <StatCard icon={CreditCard} label="إجمالي الكريديت" value={stats.totalCreds.toLocaleString()} color="bg-amber-500/10 text-amber-600" />
              <StatCard icon={Zap} label="إجمالي الاستخدامات" value={stats.totalUses} color="bg-emerald-500/10 text-emerald-600" />
              <StatCard icon={Activity} label="إجمالي تسجيلات الدخول" value={stats.totalLogins} color="bg-blue-500/10 text-blue-600" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={Clock} label="نشط اليوم" value={stats.todayN} color="bg-cyan-500/10 text-cyan-600" />
              <StatCard icon={Clock} label="نشط هذا الأسبوع" value={stats.weekN} color="bg-violet-500/10 text-violet-600" />
              <StatCard icon={ShieldAlert} label="مستخدمين إداريين" value={stats.admins} color="bg-rose-500/10 text-rose-600" />
              <StatCard icon={Key} label="مفعّل المصادقة الثنائية" value={stats.tfa} color="bg-teal-500/10 text-teal-600" />
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-400 tracking-wider mb-4">أكثر الأدوات استخداماً</h3>
              {stats.sortedTools.length === 0 && <p className="text-slate-500 text-sm">لا توجد بيانات استخدام بعد.</p>}
              {stats.sortedTools.slice(0, 10).map(t => {
                const max = stats.sortedTools[0]?.count || 1;
                return (
                  <div key={t.id} className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 w-32 truncate text-right">{t.tool?.name || t.id}</span>
                    <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-500 transition-all" style={{ width: `${(t.count / max) * 100}%` }} />
                    </div>
                    <span className="text-xs font-bold text-slate-500 w-10 text-left">{t.count}</span>
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
                <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input dir="ltr" value={search} onChange={e => { setSearch(e.target.value); setUserPage(0); }} placeholder="بحث بالاسم أو المعرّف..." className="w-full pr-9 pl-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-left" />
              </div>
              <button onClick={exportUsers} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-600 hover:text-indigo-600 transition-all">
                <Download className="w-4 h-4" /> تصدير
              </button>
            </div>
            <p className="text-xs text-slate-400">{filtered.length} مستخدم {totalPages > 1 && `(صفحة ${userPage + 1} / ${totalPages})`}</p>
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800">
                      {[['full_name', 'الاسم'], ['uid', 'المعرّف'], ['credits', 'الكريديت'], ['subscription_tier', 'الاشتراك'], ['login_count', 'الدخول'], ['last_login', 'آخر دخول'], ['created_at', 'تاريخ الإنشاء']].map(([k, l]) => (
                        <th key={k} onClick={() => toggleSort(k)} className="px-4 py-3 text-right text-xs font-bold text-slate-400 tracking-wider cursor-pointer hover:text-indigo-600 transition-colors whitespace-nowrap">
                          <span className="flex items-center gap-1 justify-end">{l} <SortIcon k={k} /></span>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 tracking-wider">ادمن</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 tracking-wider">2FA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedUsers.map(u => (
                      <>
                        <tr key={u.uid} onClick={() => setExpanded(expanded === u.uid ? null : u.uid)} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors">
                          <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{u.full_name || '—'}</td>
                          <td className="px-4 py-3 text-slate-500 font-mono text-xs" dir="ltr">{u.uid.slice(0, 12)}...</td>
                          <td className="px-4 py-3">
                            <button onClick={e => { e.stopPropagation(); setShowCreds(p => ({ ...p, [u.uid]: !p[u.uid] })); }} className="flex items-center gap-1 text-sm font-bold text-amber-600">
                              {showCreds[u.uid] ? (credits[u.uid] || 0).toLocaleString() : '***'} <EyeOff className="w-3 h-3" />
                            </button>
                          </td>
                          <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-bold ${u.subscription_tier === 'pro' ? 'bg-indigo-500/10 text-indigo-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{u.subscription_tier === 'pro' ? 'محترف' : 'مجاني'}</span></td>
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
                                <div><span className="text-xs text-slate-400 block">المعرّف الكامل</span><span className="text-xs font-mono text-slate-600 dark:text-slate-300 break-all" dir="ltr">{u.uid}</span></div>
                                <div><span className="text-xs text-slate-400 block">الهاتف</span><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{u.phone || '—'}</span></div>
                                <div><span className="text-xs text-slate-400 block">اللغة</span><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{u.language_pref === 'ar' ? 'العربية' : 'English'}</span></div>
                                <div><span className="text-xs text-slate-400 block">الإشعارات</span><span className="text-sm font-medium text-slate-700 dark:text-slate-200">{u.notifications_enabled ? 'مفعّلة' : 'معطّلة'}</span></div>
                              </div>
                              {u.bio && <p className="text-sm text-slate-500 mb-4">{u.bio}</p>}
                              <div className="flex items-center gap-2">
                                <input type="number" min={0} value={creditAdj[u.uid] || 1} onChange={e => setCreditAdj(p => ({ ...p, [u.uid]: parseInt(e.target.value) || 1 }))} className="w-20 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm outline-none" />
                                <button onClick={() => adjustCredits(u.uid, 1)} className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all"><Plus className="w-4 h-4" /></button>
                                <button onClick={() => adjustCredits(u.uid, -1)} className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white transition-all"><Minus className="w-4 h-4" /></button>
                              </div>
                              {usage[u.uid] && (
                                <div className="mt-3">
                                  <span className="text-xs text-slate-400 block mb-2">استخدام الأدوات</span>
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
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-4">
                <button onClick={() => setUserPage(p => Math.max(0, p - 1))} disabled={userPage === 0} className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-bold disabled:opacity-30 transition-all">السابق</button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p = totalPages <= 7 ? i : Math.max(0, Math.min(userPage - 3, totalPages - 7)) + i;
                  return <button key={p} onClick={() => setUserPage(p)} className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${userPage === p ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-600'}`}>{p + 1}</button>;
                })}
                <button onClick={() => setUserPage(p => Math.min(totalPages - 1, p + 1))} disabled={userPage >= totalPages - 1} className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-bold disabled:opacity-30 transition-all">التالي</button>
              </div>
            )}
          </div>
        )}

        {tab === 'tools' && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white">جميع الأدوات ({TOOL_COSTS.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800">
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 tracking-wider">الأداة</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 tracking-wider">التكلفة</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 tracking-wider">الاستخدامات</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 tracking-wider">الرسوم</th>
                    <th className="px-4 py-3 text-right text-xs font-bold text-slate-400 tracking-wider">آخر استخدام</th>
                  </tr>
                </thead>
                <tbody>
                  {([...TOOL_COSTS].sort((a, b) => (stats.toolAgg[b.toolId] || 0) - (stats.toolAgg[a.toolId] || 0))).map(tc => {
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
                        <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600">{tc.credits} نقطة</span></td>
                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{count}</td>
                        <td className="px-4 py-3">
                          <div className="w-32 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(count / max) * 100}%` }} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">{lastUsed ? fmt(lastUsed) : 'لم يُستخدم'}</td>
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
              <StatCard icon={CreditCard} label="إجمالي الكريديت" value={stats.totalCreds.toLocaleString()} color="bg-amber-500/10 text-amber-600" />
              <StatCard icon={Users} label="متوسط كريديت/مستخدم" value={stats.total > 0 ? Math.round(stats.totalCreds / stats.total) : 0} color="bg-indigo-500/10 text-indigo-600" />
              <StatCard icon={AlertTriangle} label="بدون كريديت" value={users.filter(u => (credits[u.uid] || 0) === 0).length} color="bg-rose-500/10 text-rose-600" />
              <StatCard icon={Zap} label="أكثر من 1000" value={users.filter(u => (credits[u.uid] || 0) >= 1000).length} color="bg-emerald-500/10 text-emerald-600" />
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-400 tracking-wider mb-4">خطط الأسعار</h3>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {CREDIT_PLANS.map(p => (
                  <div key={p.id} className={`p-4 rounded-xl border ${p.badge ? 'border-indigo-500 bg-indigo-500/5' : 'border-slate-200 dark:border-slate-800'}`}>
                    {p.badge && <span className="text-xs font-bold text-indigo-600 bg-indigo-500/10 px-2 py-0.5 rounded-full">{p.badge === 'Popular' ? 'رائج' : p.badge === 'Best Value' ? 'أفضل قيمة' : p.badge}</span>}
                    <h4 className="font-black text-lg text-slate-900 dark:text-white mt-2">{p.name}</h4>
                    <p className="text-2xl font-black text-indigo-600">${p.price}</p>
                    <p className="text-xs text-slate-500">{p.credits.toLocaleString()} نقطة</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-400 tracking-wider mb-4">توزيع الكريديت</h3>
              {(() => {
                const ranges = [{ label: '0', min: 0, max: 0 }, { label: '1-50', min: 1, max: 50 }, { label: '51-100', min: 51, max: 100 }, { label: '101-500', min: 101, max: 500 }, { label: '501-1000', min: 501, max: 1000 }, { label: '1000+', min: 1001, max: Infinity }];
                const counts = ranges.map(r => users.filter(u => { const c = credits[u.uid] || 0; if (r.min === 0 && r.max === 0) return c === 0; return c >= r.min && c <= r.max; }).length);
                const maxCount = Math.max(...counts, 1);
                return (
                  <div className="space-y-3">
                    {ranges.map((r, i) => (
                      <div key={r.label} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-500 w-16 text-left">{r.label}</span>
                        <div className="flex-1 h-6 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
                          <div className="h-full rounded-lg bg-indigo-500 flex items-center pr-2 justify-end" style={{ width: `${(counts[i] / maxCount) * 100}%`, minWidth: counts[i] > 0 ? '2rem' : 0 }}>
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
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-400 tracking-wider mb-4"><Shield className="w-4 h-4" /> المصادقة</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-sm text-slate-600 dark:text-slate-300">Firebase Auth</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-sm text-slate-600 dark:text-slate-300">المصادقة الثنائية</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{stats.tfa} / {stats.total}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-sm text-slate-600 dark:text-slate-300">طريقة توثيق الادمن</span>
                    <span className="text-xs font-bold text-slate-500">{envAdminEmails.length > 0 ? 'متغير بيئي' : 'قاعدة بيانات'}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-slate-600 dark:text-slate-300">إجمالي تسجيلات الدخول</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{stats.totalLogins}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-400 tracking-wider mb-4"><Server className="w-4 h-4" /> معلومات النظام</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-sm text-slate-600 dark:text-slate-300">الخادم</span>
                    <span className="text-xs font-mono text-slate-500" dir="ltr">{window.location.hostname}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-sm text-slate-600 dark:text-slate-300">النظام</span>
                    <span className="text-xs font-mono text-slate-500" dir="ltr">{navigator.platform}</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-sm text-slate-600 dark:text-slate-300">البروتوكول</span>
                    <span className="text-xs font-mono text-slate-500" dir="ltr">{window.location.protocol}</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-slate-600 dark:text-slate-300">آخر فحص</span>
                    <span className="text-xs font-mono text-slate-500" dir="ltr">{new Date().toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-400 tracking-wider mb-4"><Lock className="w-4 h-4" /> وصول الادمن</h3>
                {envAdminEmails.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-slate-400 mb-2">ادمنز البيئة ({envAdminEmails.length})</p>
                    {envAdminEmails.map(e => <div key={e} className="text-xs font-mono text-slate-600 dark:text-slate-300 py-1" dir="ltr">{e}</div>)}
                  </div>
                )}
                {dbAdmins.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-2">ادمنز قاعدة البيانات ({dbAdmins.length})</p>
                    {dbAdmins.map(u => <div key={u.uid} className="text-xs font-medium text-slate-600 dark:text-slate-300 py-1">{u.full_name || u.uid.slice(0, 16)}</div>)}
                  </div>
                )}
                {envAdminEmails.length === 0 && dbAdmins.length === 0 && (
                  <p className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> لا يوجد حسابات ادمن</p>
                )}
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800">
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-400 tracking-wider mb-4"><Globe className="w-4 h-4" /> قائمة الفحص الأمني</h3>
                <div className="space-y-2">
                  {[
                    { label: 'تشفير HTTPS', ok: window.location.protocol === 'https:' },
                    { label: 'سياسة أمان المحتوى', ok: !!document.querySelector('meta[http-equiv="Content-Security-Policy"]') },
                    { label: 'مصادقة Firebase', ok: true },
                    { label: 'حماية صفحات الادمن', ok: true },
                    { label: 'تحديد المعدل (عميل)', ok: true },
                    { label: 'تنقية المدخلات', ok: true },
                    { label: 'منع هجمات XSS', ok: true },
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
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                <h3 className="font-bold text-slate-900 dark:text-white">إعدادات التطبيق</h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {Object.entries(settingsEdit).map(([key, val]) => (
                  <div key={key} className="px-6 py-3 flex items-center gap-4">
                    <span className="text-sm font-bold text-slate-500 w-32 shrink-0">{key}</span>
                    <input dir="ltr" value={val} onChange={e => setSettingsEdit(p => ({ ...p, [key]: e.target.value }))} className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-left" />
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
                <input dir="ltr" value={newSettingKey} onChange={e => setNewSettingKey(e.target.value)} placeholder="Key" className="w-32 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-left" />
                <input dir="ltr" value={newSettingVal} onChange={e => setNewSettingVal(e.target.value)} placeholder="Value" className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-left" />
                <button onClick={addSetting} className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white transition-all"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
