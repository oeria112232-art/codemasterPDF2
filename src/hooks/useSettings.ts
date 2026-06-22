import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

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
            const { data, error } = await supabase
                .from('app_settings')
                .select('*');

            if (error) {
                console.error('Error fetching settings:', error);
                return;
            }

            if (data) {
                const settingsMap: Record<string, string> = {};
                data.forEach((item: AppSetting) => {
                    settingsMap[item.key] = item.value;
                });
                setSettings(settingsMap);
            }
        } catch (err) {
            console.error('Unexpected error fetching settings:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSettings();
    }, []);

    const updateSetting = async (key: string, value: string) => {
        const { error } = await supabase
            .from('app_settings')
            .update({ value })
            .eq('key', key);

        if (error) throw error;

        // Update local state immediately
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    return { settings, loading, updateSetting, refresh: fetchSettings };
}
