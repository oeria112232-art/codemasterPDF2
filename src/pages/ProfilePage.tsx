/**
 * SUPABASE PRODUCTION SETUP (Run this in Supabase SQL Editor):
 * 
 * -- 1. Create profiles table
 * create table profiles (
 *   id uuid references auth.users on delete cascade primary key,
 *   full_name text,
 *   avatar_url text,
 *   stripe_customer_id text,
 *   subscription_tier text default 'free' check (subscription_tier in ('free', 'pro')),
 *   updated_at timestamp with time zone default timezone('utc'::text, now())
 * );
 * 
 * -- 2. Enable RLS
 * alter table profiles enable row level security;
 * 
 * -- 3. Create policies
 * create policy "Public profiles are viewable by everyone." on profiles for select using (true);
 * create policy "Users can insert their own profile." on profiles for insert with check (auth.uid() = id);
 * create policy "Users can update own profile." on profiles for update using (auth.uid() = id);
 * 
 * -- 4. Create storage bucket for avatars
 * insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
 * create policy "Avatar images are publicly accessible." on storage.objects for select using (bucket_id = 'avatars');
 * create policy "Anyone can upload an avatar." on storage.objects for insert with check (bucket_id = 'avatars');
 */

import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import {
    User, Mail, Calendar, ShieldCheck, Zap,
    Settings, LogOut, FileText, Cpu, Activity,
    Camera, Save, X, Loader2
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useState, useRef } from 'react';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';


export function ProfilePage() {
    const { user, profile, signOut, loading, updateProfile } = useAuth();
    const { t } = useTranslation();
    const { showToast } = useToast();

    const [isEditing, setIsEditing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [fullName, setFullName] = useState(profile?.full_name || '');

    const fileInputRef = useRef<HTMLInputElement>(null);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            </div>
        );
    }

    if (!user) return <Navigate to="/login" />;

    const handleUpdateProfile = async () => {
        try {
            await updateProfile({ full_name: fullName });
            setIsEditing(false);
            showToast(t('profile.updateSuccess'), 'success');
        } catch (err) {
            showToast(t('common.error'), 'error');
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            await updateProfile({ avatar_url: publicUrl });
            showToast(t('profile.updateSuccess'), 'success');
        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setIsUploading(false);
        }
    };



    const joinDate = new Date(user.created_at).toLocaleDateString();

    return (
        <div className="bg-[#f8fafc] dark:bg-[#020617] transition-colors duration-700 pt-32 pb-20">
            <div className="max-w-5xl mx-auto px-6">

                {/* Profile Header */}
                <div className="relative mb-8 p-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3rem] shadow-2xl overflow-hidden group">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] rounded-full -z-10" />

                    <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                        <div className="relative group/avatar">
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleAvatarUpload}
                            />
                            <div
                                className="w-32 h-32 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-indigo-600/30 overflow-hidden relative"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {isUploading ? (
                                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                                ) : profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-16 h-16 text-white" />
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                    <Camera className="w-8 h-8 text-white" />
                                </div>
                            </div>
                            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-emerald-500 border-4 border-white dark:border-slate-900 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <ShieldCheck className="w-5 h-5 text-white" />
                            </div>
                        </div>

                        <div className="flex-1 text-center md:text-left">
                            {isEditing ? (
                                <div className="flex flex-col gap-3">
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="bg-slate-50 dark:bg-slate-800 border-2 border-indigo-600/20 rounded-xl px-4 py-2 text-2xl font-black focus:outline-none focus:border-indigo-600 transition-all text-slate-900 dark:text-white"
                                    />
                                    <div className="flex gap-2 justify-center md:justify-start">
                                        <button onClick={handleUpdateProfile} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-500 transition-all">
                                            <Save className="w-3 h-3" /> {t('profile.saveChanges')}
                                        </button>
                                        <button onClick={() => { setIsEditing(false); setFullName(profile?.full_name || ''); }} className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-2 flex items-center gap-4 justify-center md:justify-start">
                                        {profile?.full_name || user.email?.split('@')[0]}
                                        <button onClick={() => setIsEditing(true)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all group/edit">
                                            <Settings className="w-4 h-4 text-slate-400 group-hover/edit:text-indigo-600" />
                                        </button>
                                    </h1>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
                                        {t('profile.verified')}
                                    </div>
                                </>
                            )}
                        </div>

                        <button onClick={signOut} className="flex items-center gap-3 px-8 py-4 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-2xl font-black transition-all group/logout">
                            <LogOut className="w-5 h-5 group-hover/logout:-translate-x-1 transition-transform" />
                            <span className="text-xs uppercase tracking-widest">{t('profile.logout')}</span>
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 mb-8">
                    <TabButton active={true} onClick={() => { }} label={t('profile.personalInfo')} icon={User} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-slate-900 dark:text-white">
                    <div className="lg:col-span-2 space-y-8">
                        <div className="p-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-xl">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="space-y-8">
                                    <InfoRow icon={Mail} label={t('profile.email')} value={user.email || ''} />
                                    <InfoRow icon={Calendar} label={t('profile.joined')} value={joinDate} />
                                    <InfoRow icon={Cpu} label={t('profile.accountStatus')} value={t('profile.verified')} success />
                                </div>
                                <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{t('profile.stats')}</p>
                                    <div className="space-y-6 text-slate-900 dark:text-white">
                                        <StatItem icon={FileText} label={t('profile.filesProcessed')} value="12" color="text-indigo-500" />
                                        <StatItem icon={Zap} label={t('profile.aiInteractions')} value="48" color="text-emerald-500" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="p-8 bg-slate-100 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-[2rem]">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{t('profile.stats')}</h4>
                            <div className="space-y-4">
                                <MiniStat icon={Activity} label="System Sync" value="Live" />
                                <MiniStat icon={Cpu} label="Node Latency" value="12ms" />
                            </div>
                        </div>


                    </div>
                </div>
            </div>
        </div>
    );
}

function TabButton({ active, onClick, label, icon: Icon }: any) {
    return (
        <button onClick={onClick} className={`flex items-center gap-3 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${active ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'}`}>
            <Icon className="w-4 h-4" />
            {label}
        </button>
    );
}

function InfoRow({ icon: Icon, label, value, success }: any) {
    return (
        <div className="flex items-start gap-4">
            <div className="shrink-0 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                <Icon className="w-4 h-4 text-slate-500" />
            </div>
            <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                <p className={`text-sm font-bold ${success ? 'text-emerald-500' : 'text-slate-700 dark:text-slate-200'}`}>{value}</p>
            </div>
        </div>
    );
}

function StatItem({ icon: Icon, label, value, color }: any) {
    return (
        <div className="flex items-center justify-between group">
            <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg bg-white dark:bg-slate-900 shadow-sm transition-transform ${color}`}><Icon className="w-4 h-4" /></div>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{label}</span>
            </div>
            <span className="text-lg font-black dark:text-white">{value}</span>
        </div>
    );
}

function MiniStat({ icon: Icon, label, value }: any) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Icon className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
            </div>
            <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">{value}</span>
        </div>
    );
}
