import { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { Save, Loader2, ShieldAlert, CheckCircle } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export function AdminDashboard() {
    const { settings, loading, updateSetting } = useSettings();
    const { showToast } = useToast();
    const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
    const [savingKeys, setSavingKeys] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (settings) {
            setLocalSettings(settings);
        }
    }, [settings]);

    const handleSave = async (key: string) => {
        setSavingKeys(prev => ({ ...prev, [key]: true }));
        try {
            await updateSetting(key, localSettings[key]);
            showToast('Setting updated successfully', 'success');
        } catch (error) {
            console.error(error);
            showToast('Failed to update setting', 'error');
        } finally {
            setSavingKeys(prev => ({ ...prev, [key]: false }));
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#020617]">
                <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
            </div>
        );
    }

    const fields = [
        { key: 'phone', label: 'Phone Number', icon: '📞' },
        { key: 'whatsapp', label: 'WhatsApp Number', icon: '💬' },
        { key: 'email', label: 'Email Address', icon: '✉️' },
        { key: 'location', label: 'Location', icon: '📍' },
        { key: 'telegram', label: 'Telegram Username', icon: '✈️' },
        { key: 'tiktok', label: 'TikTok Username', icon: '🎵' },
        { key: 'instagram', label: 'Instagram Username', icon: '📸' },
    ];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#020617] py-24 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="mb-12 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 text-red-600 font-bold uppercase text-xs tracking-widest mb-4">
                        <ShieldAlert className="w-4 h-4" /> Admin Area
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4">
                        System Control Panel
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">
                        Manage your global application settings from one secured location.
                    </p>
                </div>

                <div className="grid gap-6">
                    {fields.map((field) => (
                        <div key={field.key} className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex items-center gap-6">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-2xl">
                                {field.icon}
                            </div>
                            <div className="flex-1">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    {field.label}
                                </label>
                                <input
                                    type="text"
                                    value={localSettings[field.key] || ''}
                                    onChange={(e) => setLocalSettings(prev => ({ ...prev, [field.key]: e.target.value }))}
                                    className="w-full bg-transparent text-lg font-medium text-slate-900 dark:text-white outline-none border-b border-transparent focus:border-indigo-500 transition-colors pb-1"
                                    placeholder={`Enter ${field.label}...`}
                                />
                            </div>
                            <button
                                onClick={() => handleSave(field.key)}
                                disabled={savingKeys[field.key] || localSettings[field.key] === settings[field.key]}
                                className="p-3 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white disabled:opacity-50 disabled:hover:bg-indigo-50 disabled:hover:text-indigo-600 transition-all"
                            >
                                {savingKeys[field.key] ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : localSettings[field.key] === settings[field.key] ? (
                                    <CheckCircle className="w-5 h-5 opacity-50" />
                                ) : (
                                    <Save className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
