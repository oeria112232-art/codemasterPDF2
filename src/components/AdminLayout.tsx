import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, database } from '../lib/firebase';
import { Loader2, ShieldAlert } from 'lucide-react';

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || '').split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);

export function AdminLayout() {
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                setLoading(false);
                return;
            }

            if (ADMIN_EMAILS.length > 0) {
                setAuthorized(ADMIN_EMAILS.includes((user.email || '').toLowerCase()));
            } else {
                try {
                    const snapshot = await get(ref(database, `profiles/${user.uid}/is_admin`));
                    setAuthorized(snapshot.val() === true);
                } catch {
                    setAuthorized(false);
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-[#020617]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Verifying Access...</p>
                </div>
            </div>
        );
    }

    if (!authorized) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#020617]">
                <div className="text-center max-w-md mx-auto p-12">
                    <div className="w-20 h-20 bg-rose-500/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
                        <ShieldAlert className="w-10 h-10 text-rose-500" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Access Denied</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">
                        You don't have permission to access this area. Admin access only.
                    </p>
                    <a
                        href="/"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/20"
                    >
                        Return Home
                    </a>
                </div>
            </div>
        );
    }

    return <Outlet />;
}
