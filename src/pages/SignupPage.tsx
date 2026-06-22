import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, User, Loader2, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../contexts/ToastContext';

export function SignupPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            showToast(t('auth.passwordMismatch'), 'error');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: name } },
            });
            if (error) throw error;
            showToast(t('auth.accountCreated'), 'success');
            navigate('/login');
        } catch (err: any) {
            console.error('Signup error:', err);
            let message = err.message || t('auth.error');
            if (message === 'Failed to fetch') {
                message = t('auth.networkError') || 'Unable to connect to server. Project might be paused.';
            }
            showToast(message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-grow flex items-center justify-center p-6 bg-slate-50 dark:bg-[#020617] relative min-h-screen overflow-y-auto overflow-x-hidden">
            {/* Background Decor */}
            <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full -z-10 animate-pulse" />
            <div className="fixed bottom-0 left-0 w-[500px] h-[500px] bg-sky-500/5 blur-[120px] rounded-full -z-10 animate-pulse delay-1000" />

            <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-700 my-10">

                {/* Left Side - Info */}
                <div className="hidden lg:flex flex-col justify-between p-16 bg-slate-900 border-r border-slate-800 relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 to-transparent pointer-events-none" />

                    <div className="relative">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[3px] mb-8">
                            <Sparkles className="w-3 h-3" /> {t('auth.onboarding')}
                        </div>
                        <h1 className="text-5xl font-black text-white leading-tight mb-6 tracking-tight">
                            {t('auth.joinElite')}
                        </h1>
                        <p className="text-slate-400 font-medium leading-relaxed max-w-sm">
                            {t('auth.signupDesc')}
                        </p>
                    </div>

                    <div className="relative">
                        <div className="flex items-center gap-4 p-6 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10">
                            <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-white font-black text-sm">{t('auth.securityTitle')}</p>
                                <p className="text-slate-500 text-xs font-bold">{t('auth.securityDesc')}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Side - Form */}
                <div className="p-8 lg:p-16 flex flex-col justify-center">
                    <div className="mb-10">
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">{t('auth.signupTitle')}</h2>
                        <p className="text-slate-500 dark:text-slate-400 font-medium font-medium">{t('auth.signupSubtitle')}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-4">
                            <div className="group">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1 group-focus-within:text-indigo-500 transition-colors">
                                    {t('auth.name')}
                                </label>
                                <div className="relative">
                                    <User className="absolute left-5 rtl:left-auto rtl:right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder={t('auth.name')}
                                        className="w-full pl-14 pr-6 rtl:pl-6 rtl:pr-14 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/30 focus:bg-white dark:focus:bg-slate-800 rounded-2xl outline-none transition-all font-medium text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="group">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1 group-focus-within:text-indigo-500 transition-colors">
                                    {t('auth.email')}
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-5 rtl:left-auto rtl:right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="name@example.com"
                                        className="w-full pl-14 pr-6 rtl:pl-6 rtl:pr-14 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/30 focus:bg-white dark:focus:bg-slate-800 rounded-2xl outline-none transition-all font-medium text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="group">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1 group-focus-within:text-indigo-500 transition-colors">
                                        {t('auth.password')}
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-5 rtl:left-auto rtl:right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                        <input
                                            type="password"
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full pl-14 pr-6 rtl:pl-6 rtl:pr-14 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/30 focus:bg-white dark:focus:bg-slate-800 rounded-2xl outline-none transition-all font-medium text-slate-900 dark:text-white text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="group">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1 group-focus-within:text-indigo-500 transition-colors">
                                        {t('auth.confirmPassword')}
                                    </label>
                                    <div className="relative">
                                        <Lock className="absolute left-5 rtl:left-auto rtl:right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                        <input
                                            type="password"
                                            required
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full pl-14 pr-6 rtl:pl-6 rtl:pr-14 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/30 focus:bg-white dark:focus:bg-slate-800 rounded-2xl outline-none transition-all font-medium text-slate-900 dark:text-white text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-4 py-5 px-8 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2.5rem] font-black text-sm uppercase tracking-[3px] shadow-2xl shadow-indigo-600/20 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                            {loading ? t('auth.processing') : t('auth.submitSignup')}
                        </button>
                    </form>

                    <div className="mt-8 text-center pt-8 border-t border-slate-100 dark:border-slate-800">
                        <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">
                            {t('auth.hasAccount')}{' '}
                            <Link to="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                                {t('auth.signIn')}
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
