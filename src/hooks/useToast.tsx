import { useState, useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

export function useToast() {
    const [toasts, setToasts] = useState<Toast[]>([]);

    useEffect(() => {
        if (toasts.length === 0) return;
        const timer = setTimeout(() => {
            setToasts(prev => prev.slice(1));
        }, 4000);
        return () => clearTimeout(timer);
    }, [toasts]);

    const showToast = (message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);
    };

    return { toasts, showToast };
}

export function ToastContainer({ toasts }: { toasts: Toast[] }) {
    return (
        <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
            {toasts.map((t) => (
                <div
                    key={t.id}
                    className={`px-6 py-3 rounded-xl shadow-2xl text-white font-bold animate-in slide-in-from-right-full duration-300 pointer-events-auto flex items-center gap-3 ${
                        t.type === 'success' ? 'bg-emerald-600' :
                        t.type === 'error' ? 'bg-rose-600' :
                        t.type === 'warning' ? 'bg-amber-600' :
                        'bg-indigo-600'
                    }`}
                >
                    {t.message}
                </div>
            ))}
        </div>
    );
}
