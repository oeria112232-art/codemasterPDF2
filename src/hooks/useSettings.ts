import { useEffect, useState } from 'react';
import { ref, get, set } from 'firebase/database';
import { database } from '../lib/firebase';

export interface AppSetting {
    key: string;
    value: string;
    description: string;
}

export function useSettings() {
    const [settings, setSettings] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    const fetchSettings = async () => {
        try {
            const snapshot = await get(ref(database, 'app_settings'));
            if (snapshot.exists()) {
                const data = snapshot.val();
                const settingsMap: Record<string, string> = {};
                Object.keys(data).forEach((key) => {
                    settingsMap[key] = data[key].value || '';
                });
                setSettings(settingsMap);
            }
        } catch (err) {
            console.error('Error fetching settings:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const updateSetting = async (key: string, value: string) => {
        await set(ref(database, `app_settings/${key}`), { key, value });
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    return { settings, loading, updateSetting, refresh: fetchSettings };
}
