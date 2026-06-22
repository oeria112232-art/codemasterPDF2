import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

export function AdminLayout() {
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            // Simple authorization check - in production, use Row Level Security or a proper Role table
            // For this specific user request, we check if the user is logged in.
            // The Real Database Protection comes from the RLS policies we set up in SQL.
            // This UI check is just to prevent casual access.

            if (user) {
                setAuthorized(true);
            }

            setLoading(false);
        };

        checkAuth();
    }, []);

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!authorized) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
