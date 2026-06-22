import { createContext, useContext, useState, ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = (message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="fixed bottom-6 right-6 z-[999] flex flex-col gap-3 pointer-events-none">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`
              min-w-[320px] max-w-md pointer-events-auto flex items-center gap-4 p-4 rounded-2xl shadow-2xl border backdrop-blur-xl 
              animate-in slide-in-from-right-full fade-in duration-500
              ${t.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' :
                                t.type === 'error' ? 'bg-rose-500/90 border-rose-400 text-white' :
                                    'bg-slate-900/90 border-slate-700 text-white'}
            `}
                    >
                        <div className="shrink-0">
                            {t.type === 'success' && <CheckCircle2 className="w-6 h-6" />}
                            {t.type === 'error' && <AlertCircle className="w-6 h-6" />}
                            {t.type === 'info' && <Info className="w-6 h-6 text-indigo-400" />}
                        </div>
                        <p className="flex-1 font-bold text-sm leading-tight">{t.message}</p>
                        <button onClick={() => removeToast(t.id)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
                            <X className="w-4 h-4 opacity-50" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
}
