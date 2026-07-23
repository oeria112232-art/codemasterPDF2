import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import {
    User, Mail, Calendar, ShieldCheck, Zap,
    Settings, LogOut, Camera, Loader2, Phone,
    FileText, Clock, Globe, Bell, BellOff,
    Trash2, Key, Eye, EyeOff, AlertTriangle,
    CheckCircle2, Info, ChevronRight, Lock,
    Smartphone, Activity, Shield, UserX, ShieldAlert
} from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import { validatePasswordStrength, sanitizeDisplayName, formatDate, getAccountAge, checkRateLimit } from '../lib/security';

type TabId = 'profile' | 'security' | 'settings';

export function ProfilePage() {
    const { user, profile, signOut, loading, updateProfile, uploadAvatar, removeAvatar, changePassword, deleteAccount } = useAuth();
    const { t } = useTranslation();
    const { showToast } = useToast();
    const navigate = useNavigate();
    const isAdminEmail = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map((e: string) => e.trim().toLowerCase()).includes((user?.email || '').toLowerCase());

    const [activeTab, setActiveTab] = useState<TabId>('profile');
    const [isEditing, setIsEditing] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [phone, setPhone] = useState(profile?.phone || '');
    const [bio, setBio] = useState(profile?.bio || '');

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || '');
            setPhone(profile.phone || '');
            setBio(profile.bio || '');
        }
    }, [profile]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            </div>
        );
    }

    if (!user) return <Navigate to="/login" />;

    const handleSaveProfile = async () => {
        if (!checkRateLimit('profile_update', 10, 60000)) {
            showToast(t('profile.rateLimit'), 'error');
            return;
        }

        const sanitizedName = sanitizeDisplayName(fullName);
        if (!sanitizedName || sanitizedName.length < 2) {
            showToast(t('profile.nameRequired'), 'error');
            return;
        }

        try {
            await updateProfile({
                full_name: sanitizedName,
                phone: phone.trim() || null,
                bio: bio.trim().substring(0, 200) || null,
            });
            setIsEditing(false);
            showToast(t('profile.updateSuccess'), 'success');
        } catch (err) {
            showToast(t('common.error'), 'error');
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            showToast(t('profile.avatarTooLarge'), 'error');
            return;
        }

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            showToast(t('profile.avatarInvalidType'), 'error');
            return;
        }

        try {
            setIsUploading(true);
            await uploadAvatar(file);
            showToast(t('profile.avatarUpdated'), 'success');
        } catch (error: any) {
            showToast(error.message || t('common.error'), 'error');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleRemoveAvatar = async () => {
        try {
            await removeAvatar();
            showToast(t('profile.avatarRemoved'), 'success');
        } catch {
            showToast(t('common.error'), 'error');
        }
    };

    const tabs: { id: TabId; label: string; icon: typeof User }[] = [
        { id: 'profile', label: t('profile.personalInfo'), icon: User },
        { id: 'security', label: t('profile.securityTab'), icon: Shield },
        { id: 'settings', label: t('profile.settingsTab'), icon: Settings },
    ];

    return (
        <div className="bg-[#f8fafc] dark:bg-[#020617] transition-colors duration-700 pt-32 pb-20 min-h-screen">
            <div className="max-w-5xl mx-auto px-6">

                {/* Profile Header */}
                <div className="relative mb-8 p-8 md:p-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-2xl overflow-hidden group">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/5 blur-[120px] rounded-full -z-10" />

                    <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
                        <div className="relative group/avatar shrink-0">
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                onChange={handleAvatarUpload}
                            />
                            <div
                                className="w-28 h-28 bg-indigo-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-indigo-600/30 overflow-hidden relative cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {isUploading ? (
                                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                                ) : profile?.avatar_url ? (
                                    <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-14 h-14 text-white" />
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
                                    <Camera className="w-7 h-7 text-white" />
                                </div>
                            </div>
                            {profile?.avatar_url && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleRemoveAvatar(); }}
                                    className="absolute -top-1 -right-1 w-7 h-7 bg-rose-500 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity shadow-lg"
                                >
                                    <Trash2 className="w-3.5 h-3.5 text-white" />
                                </button>
                            )}
                            <div className="absolute -bottom-2 -right-2 w-9 h-9 bg-emerald-500 border-3 border-white dark:border-slate-900 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                <ShieldCheck className="w-4.5 h-4.5 text-white" />
                            </div>
                        </div>

                        <div className="flex-1 text-center md:text-left min-w-0">
                            <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2 truncate">
                                {profile?.full_name || user.displayName || user.email?.split('@')[0]}
                            </h1>
                            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
                                    <CheckCircle2 className="w-3 h-3" /> {t('profile.verified')}
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                                    <Mail className="w-3 h-3" /> {user.email}
                                </span>
                                {profile?.phone && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 text-[10px] font-black uppercase tracking-widest">
                                        <Phone className="w-3 h-3" /> {profile.phone}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                        {isAdminEmail && (
                            <button
                                onClick={() => navigate('/admin')}
                                className="flex items-center gap-2 px-4 py-3 bg-amber-500/10 hover:bg-amber-500 text-amber-600 hover:text-white rounded-2xl font-black transition-all group/admin"
                            >
                                <ShieldAlert className="w-5 h-5 group-hover/admin:scale-110 transition-transform" />
                                <span className="text-xs uppercase tracking-widest hidden sm:inline">Admin</span>
                            </button>
                        )}
                        <button
                            onClick={signOut}
                            className="flex items-center gap-3 px-6 py-3 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-2xl font-black transition-all group/logout"
                        >
                            <LogOut className="w-5 h-5 group-hover/logout:-translate-x-1 transition-transform" />
                            <span className="text-xs uppercase tracking-widest hidden sm:inline">{t('profile.logout')}</span>
                        </button>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${
                                activeTab === tab.id
                                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20'
                                    : 'bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'profile' && (
                    <ProfileTab
                        profile={profile}
                        user={user}
                        isEditing={isEditing}
                        setIsEditing={setIsEditing}
                        fullName={fullName}
                        setFullName={setFullName}
                        phone={phone}
                        setPhone={setPhone}
                        bio={bio}
                        setBio={setBio}
                        handleSaveProfile={handleSaveProfile}
                        handleAvatarUpload={handleAvatarUpload}
                        isUploading={isUploading}
                        fileInputRef={fileInputRef}
                        t={t}
                    />
                )}

                {activeTab === 'security' && (
                    <SecurityTab
                        user={user}
                        profile={profile}
                        changePassword={changePassword}
                        deleteAccount={deleteAccount}
                        signOut={signOut}
                        t={t}
                        showToast={showToast}
                    />
                )}

                {activeTab === 'settings' && (
                    <SettingsTab
                        profile={profile}
                        updateProfile={updateProfile}
                        t={t}
                        showToast={showToast}
                    />
                )}
            </div>
        </div>
    );
}

/* ============================================================
   PROFILE TAB
   ============================================================ */
function ProfileTab({ profile, user, isEditing, setIsEditing, fullName, setFullName, phone, setPhone, bio, setBio, handleSaveProfile, handleAvatarUpload, isUploading, fileInputRef, t }: any) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-slate-900 dark:text-white">
            <div className="lg:col-span-2 space-y-6">
                {/* Personal Info Card */}
                <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-xl">
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">{t('profile.personalInfo')}</h3>
                        {!isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all"
                            >
                                <Settings className="w-3 h-3" /> {t('profile.editProfile')}
                            </button>
                        )}
                    </div>

                    {isEditing ? (
                        <div className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('profile.fullName')}</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    maxLength={100}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-indigo-600/20 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-600 transition-all text-slate-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('profile.phoneLabel')}</label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    placeholder={t('profile.phonePlaceholder')}
                                    maxLength={20}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-indigo-600/20 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-600 transition-all text-slate-900 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('profile.bioLabel')}</label>
                                <textarea
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    placeholder={t('profile.bioPlaceholder')}
                                    maxLength={200}
                                    rows={3}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-indigo-600/20 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-600 transition-all text-slate-900 dark:text-white resize-none"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">{bio.length}/200</p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={handleSaveProfile}
                                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-500 transition-all"
                                >
                                    {t('profile.saveChanges')}
                                </button>
                                <button
                                    onClick={() => {
                                        setIsEditing(false);
                                        setFullName(profile?.full_name || '');
                                        setPhone(profile?.phone || '');
                                        setBio(profile?.bio || '');
                                    }}
                                    className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                                >
                                    {t('profile.cancel')}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <InfoRow icon={Mail} label={t('profile.email')} value={user.email || '—'} />
                            <InfoRow icon={Phone} label={t('profile.phoneLabel')} value={profile?.phone || t('profile.notSet')} />
                            <InfoRow icon={Calendar} label={t('profile.joined')} value={formatDate(profile?.created_at || user.metadata.creationTime)} />
                            <InfoRow icon={Activity} label={t('profile.accountAge')} value={getAccountAge(profile?.created_at || user.metadata.creationTime)} />
                            {profile?.bio && (
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('profile.bioLabel')}</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-300">{profile.bio}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Sidebar Stats */}
            <div className="space-y-6">
                <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-xl">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5">{t('profile.quickStats')}</h4>
                    <div className="space-y-4">
                        <QuickStat icon={Clock} label={t('profile.lastLogin')} value={formatDate(profile?.last_login)} />
                        <QuickStat icon={Activity} label={t('profile.totalLogins')} value={String(profile?.login_count || 0)} />
                    </div>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-[2rem]">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{t('profile.accountStatus')}</h4>
                    <div className="space-y-3">
                        <StatusBadge icon={ShieldCheck} label={t('profile.verified')} color="emerald" />
                        <StatusBadge icon={Lock} label={t('profile.encrypted')} color="indigo" />
                        <StatusBadge icon={CheckCircle2} label={t('profile.active')} color="emerald" />
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ============================================================
   SECURITY TAB
   ============================================================ */
function SecurityTab({ user, profile, changePassword, deleteAccount, signOut, t, showToast }: any) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [deletePassword, setDeletePassword] = useState('');
    const [showDeletePassword, setShowDeletePassword] = useState(false);

    const passwordStrength = validatePasswordStrength(newPassword);

    const handleChangePassword = async () => {
        if (!checkRateLimit('password_change', 3, 300000)) {
            showToast(t('profile.passwordRateLimit'), 'error');
            return;
        }

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            showToast(t('profile.fillAllFields'), 'error');
            return;
        }

        if (newPassword !== confirmNewPassword) {
            showToast(t('profile.passwordMismatch'), 'error');
            return;
        }

        if (!passwordStrength.isValid) {
            showToast(t('profile.weakPassword'), 'error');
            return;
        }

        if (currentPassword === newPassword) {
            showToast(t('profile.samePassword'), 'error');
            return;
        }

        try {
            setIsChangingPassword(true);
            await changePassword(currentPassword, newPassword);
            showToast(t('profile.passwordChanged'), 'success');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
        } catch (err: any) {
            if (err.code === 'auth/wrong-password' || err.message?.includes('wrong-password') || err.message?.includes('invalid-credential')) {
                showToast(t('profile.wrongCurrentPassword'), 'error');
            } else if (err.code === 'auth/weak-password') {
                showToast(t('profile.weakPassword'), 'error');
            } else {
                showToast(t('common.error'), 'error');
            }
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'DELETE') {
            showToast(t('profile.typeDelete'), 'error');
            return;
        }

        if (!deletePassword) {
            showToast(t('profile.enterPasswordToDelete'), 'error');
            return;
        }

        if (!checkRateLimit('account_delete', 2, 600000)) {
            showToast(t('profile.deleteRateLimit'), 'error');
            return;
        }

        try {
            setIsDeletingAccount(true);
            await deleteAccount(deletePassword);
            showToast(t('profile.accountDeleted'), 'success');
        } catch (err: any) {
            if (err.code === 'auth/wrong-password' || err.message?.includes('wrong-password') || err.message?.includes('invalid-credential')) {
                showToast(t('profile.wrongPassword'), 'error');
            } else {
                showToast(t('common.error'), 'error');
            }
        } finally {
            setIsDeletingAccount(false);
        }
    };

    return (
        <div className="space-y-8 text-slate-900 dark:text-white max-w-3xl">
            {/* Change Password */}
            <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
                        <Key className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="font-black text-sm">{t('profile.changePassword')}</h3>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">{t('profile.changePasswordDesc')}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('profile.currentPassword')}</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type={showCurrentPassword ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                className="w-full pl-11 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-600 transition-all text-slate-900 dark:text-white"
                            />
                            <button
                                type="button"
                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('profile.newPassword')}</label>
                        <div className="relative">
                            <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type={showNewPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full pl-11 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-600 transition-all text-slate-900 dark:text-white"
                            />
                            <button
                                type="button"
                                onClick={() => setShowNewPassword(!showNewPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>

                        {newPassword && (
                            <div className="mt-3">
                                <div className="flex gap-1 mb-1.5">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div
                                            key={i}
                                            className={`h-1.5 flex-1 rounded-full transition-colors ${
                                                i <= passwordStrength.score
                                                    ? passwordStrength.score >= 4
                                                        ? 'bg-emerald-500'
                                                        : passwordStrength.score >= 3
                                                        ? 'bg-amber-500'
                                                        : 'bg-rose-500'
                                                    : 'bg-slate-200 dark:bg-slate-700'
                                            }`}
                                        />
                                    ))}
                                </div>
                                {passwordStrength.feedback.length > 0 && (
                                    <div className="space-y-1">
                                        {passwordStrength.feedback.map((f: string, idx: number) => (
                                            <p key={idx} className="text-[10px] text-slate-400 flex items-center gap-1.5">
                                                <Info className="w-3 h-3" /> {f}
                                            </p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('profile.confirmNewPassword')}</label>
                        <div className="relative">
                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="password"
                                value={confirmNewPassword}
                                onChange={(e) => setConfirmNewPassword(e.target.value)}
                                className="w-full pl-11 pr-6 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-600 transition-all text-slate-900 dark:text-white"
                            />
                        </div>
                        {confirmNewPassword && newPassword !== confirmNewPassword && (
                            <p className="text-[10px] text-rose-500 mt-1.5 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> {t('profile.passwordMismatch')}
                            </p>
                        )}
                        {confirmNewPassword && newPassword === confirmNewPassword && confirmNewPassword.length > 0 && (
                            <p className="text-[10px] text-emerald-500 mt-1.5 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> {t('profile.passwordsMatch')}
                            </p>
                        )}
                    </div>

                    <button
                        onClick={handleChangePassword}
                        disabled={isChangingPassword || !currentPassword || !newPassword || !confirmNewPassword || newPassword !== confirmNewPassword || !passwordStrength.isValid}
                        className="w-full py-3 px-6 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isChangingPassword ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> {t('profile.updating')}</>
                        ) : (
                            <><Key className="w-4 h-4" /> {t('profile.changePassword')}</>
                        )}
                    </button>
                </div>
            </div>

            {/* Security Info */}
            <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                        <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                        <h3 className="font-black text-sm">{t('profile.securityOverview')}</h3>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">{t('profile.securityOverviewDesc')}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SecurityInfoCard
                        icon={Lock}
                        title={t('profile.encryption')}
                        desc={t('profile.encryptionDesc')}
                        color="indigo"
                    />
                    <SecurityInfoCard
                        icon={Shield}
                        title={t('profile.authProtection')}
                        desc={t('profile.authProtectionDesc')}
                        color="emerald"
                    />
                    <SecurityInfoCard
                        icon={Globe}
                        title={t('profile.onDeviceProcessing')}
                        desc={t('profile.onDeviceProcessingDesc')}
                        color="sky"
                    />
                    <SecurityInfoCard
                        icon={Smartphone}
                        title={t('profile.secureSessions')}
                        desc={t('profile.secureSessionsDesc')}
                        color="amber"
                    />
                </div>
            </div>

            {/* Delete Account */}
            <div className="p-8 bg-white dark:bg-slate-900 border-2 border-rose-200 dark:border-rose-900/30 rounded-[2rem] shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-rose-50 dark:bg-rose-500/10 rounded-xl">
                        <UserX className="w-5 h-5 text-rose-600" />
                    </div>
                    <div>
                        <h3 className="font-black text-sm text-rose-600">{t('profile.deleteAccount')}</h3>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">{t('profile.deleteAccountDesc')}</p>
                    </div>
                </div>

                <div className="p-4 bg-rose-50 dark:bg-rose-500/5 rounded-xl mb-6 border border-rose-200 dark:border-rose-900/20">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                        <p className="text-xs text-rose-600 dark:text-rose-400">{t('profile.deleteAccountWarning')}</p>
                    </div>
                </div>

                {!isDeletingAccount ? (
                    <button
                        onClick={() => setIsDeletingAccount(true)}
                        className="px-6 py-3 bg-rose-500/10 text-rose-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
                    >
                        {t('profile.deleteAccount')}
                    </button>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('profile.typeDeleteConfirm')}</label>
                            <input
                                type="text"
                                value={deleteConfirmText}
                                onChange={(e) => setDeleteConfirmText(e.target.value)}
                                placeholder='Type "DELETE"'
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-rose-300 dark:border-rose-800 rounded-xl text-sm font-medium focus:outline-none focus:border-rose-500 transition-all text-slate-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('profile.enterPassword')}</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type={showDeletePassword ? 'text' : 'password'}
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                    className="w-full pl-11 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-rose-300 dark:border-rose-800 rounded-xl text-sm font-medium focus:outline-none focus:border-rose-500 transition-all text-slate-900 dark:text-white"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowDeletePassword(!showDeletePassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleDeleteAccount}
                                disabled={deleteConfirmText !== 'DELETE' || !deletePassword}
                                className="px-6 py-3 bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" /> {t('profile.confirmDelete')}
                            </button>
                            <button
                                onClick={() => {
                                    setIsDeletingAccount(false);
                                    setDeleteConfirmText('');
                                    setDeletePassword('');
                                }}
                                className="px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                            >
                                {t('profile.cancel')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

/* ============================================================
   SETTINGS TAB
   ============================================================ */
function SettingsTab({ profile, updateProfile, t, showToast }: any) {
    const [notifications, setNotifications] = useState(profile?.notifications_enabled ?? true);
    const [emailNotifications, setEmailNotifications] = useState(profile?.email_notifications ?? true);

    const handleSave = async () => {
        try {
            await updateProfile({
                notifications_enabled: notifications,
                email_notifications: emailNotifications,
            });
            showToast(t('profile.settingsSaved'), 'success');
        } catch {
            showToast(t('common.error'), 'error');
        }
    };

    return (
        <div className="space-y-8 text-slate-900 dark:text-white max-w-3xl">
            {/* Notification Preferences */}
            <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-amber-50 dark:bg-amber-500/10 rounded-xl">
                        <Bell className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                        <h3 className="font-black text-sm">{t('profile.notifications')}</h3>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">{t('profile.notificationsDesc')}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <ToggleSetting
                        icon={Bell}
                        label={t('profile.pushNotifications')}
                        desc={t('profile.pushNotificationsDesc')}
                        checked={notifications}
                        onChange={setNotifications}
                    />
                    <ToggleSetting
                        icon={Mail}
                        label={t('profile.emailNotifications')}
                        desc={t('profile.emailNotificationsDesc')}
                        checked={emailNotifications}
                        onChange={setEmailNotifications}
                    />
                </div>
            </div>

            {/* App Info */}
            <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] shadow-xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
                        <Info className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                        <h3 className="font-black text-sm">{t('profile.appInfo')}</h3>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">{t('profile.appInfoDesc')}</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <InfoRow icon={Shield} label={t('profile.version')} value="2.0.0" />
                    <InfoRow icon={Lock} label={t('profile.securityProtocol')} value="AES-256 / Firebase Auth" />
                    <InfoRow icon={Globe} label={t('profile.dataProcessing')} value={t('profile.onDevice')} />
                </div>
            </div>

            {/* Save Button */}
            <button
                onClick={handleSave}
                className="w-full py-3 px-6 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-500 transition-all flex items-center justify-center gap-2"
            >
                <CheckCircle2 className="w-4 h-4" /> {t('profile.saveSettings')}
            </button>
        </div>
    );
}

/* ============================================================
   SHARED COMPONENTS
   ============================================================ */
function InfoRow({ icon: Icon, label, value, success }: any) {
    return (
        <div className="flex items-start gap-4">
            <div className="shrink-0 p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                <Icon className="w-4 h-4 text-slate-500" />
            </div>
            <div className="min-w-0">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                <p className={`text-sm font-bold truncate ${success ? 'text-emerald-500' : 'text-slate-700 dark:text-slate-200'}`}>{value}</p>
            </div>
        </div>
    );
}

function QuickStat({ icon: Icon, label, value }: any) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Icon className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</span>
            </div>
            <span className="text-[10px] font-black text-slate-900 dark:text-white">{value}</span>
        </div>
    );
}

function StatusBadge({ icon: Icon, label, color }: { icon: any; label: string; color: string }) {
    const colors: Record<string, string> = {
        emerald: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
        indigo: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
        amber: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    };
    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${colors[color] || colors.emerald}`}>
            <Icon className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
        </div>
    );
}

function SecurityInfoCard({ icon: Icon, title, desc, color }: { icon: any; title: string; desc: string; color: string }) {
    const colors: Record<string, string> = {
        indigo: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600',
        emerald: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600',
        sky: 'bg-sky-50 dark:bg-sky-500/10 text-sky-600',
        amber: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600',
    };
    return (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className={`w-8 h-8 ${colors[color]} rounded-lg flex items-center justify-center mb-3`}>
                <Icon className="w-4 h-4" />
            </div>
            <p className="font-black text-xs mb-1">{title}</p>
            <p className="text-[10px] text-slate-400">{desc}</p>
        </div>
    );
}

function ToggleSetting({ icon: Icon, label, desc, checked, onChange }: { icon: any; label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 text-slate-400" />
                <div>
                    <p className="text-xs font-black">{label}</p>
                    <p className="text-[10px] text-slate-400">{desc}</p>
                </div>
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-600'}`}
            >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'left-6' : 'left-1'}`} />
            </button>
        </div>
    );
}
