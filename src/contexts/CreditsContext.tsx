import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getCredits, useCredits as deductCredits, addCredits, trackToolUsage, getToolCost, canAfford as checkCanAfford } from '../lib/credits';
import { useToast } from './ToastContext';
import { useTranslation } from 'react-i18next';

interface CreditsContextType {
  credits: number;
  loading: boolean;
  refreshCredits: () => Promise<void>;
  spendCredits: (toolId: string) => Promise<boolean>;
  addCreditsToAccount: (amount: number, reason?: string) => Promise<void>;
  canAffordTool: (toolId: string) => boolean;
  getToolPrice: (toolId: string) => number | null;
}

const CreditsContext = createContext<CreditsContextType | null>(null);

export function CreditsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);

  const refreshCredits = useCallback(async () => {
    if (!user) { setCredits(0); setLoading(false); return; }
    try {
      const c = await getCredits(user.uid);
      setCredits(c);
    } catch {
      console.error('Failed to fetch credits');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refreshCredits(); }, [refreshCredits]);

  const spendCredits = useCallback(async (toolId: string): Promise<boolean> => {
    if (!user) { showToast(t('credits.signInRequired', 'Please sign in to use tools'), 'error'); return false; }
    const cost = getToolCost(toolId);
    if (!cost) { return true; }
    if (cost.isFree) return true;

    try {
      const result = await deductCredits(user.uid, toolId);
      if (result.success) {
        setCredits(result.remaining);
        try { await trackToolUsage(user.uid, toolId, true); } catch {}
        return true;
      } else {
        showToast(result.error || t('credits.insufficient', 'Insufficient credits'), 'error');
        return false;
      }
    } catch (err: any) {
      if (err?.message?.includes('permission_denied') || err?.code === 'PERMISSION_DENIED') {
        console.warn('Credits permission denied — allowing tool usage');
        return true;
      }
      console.error('Credits error:', err);
      return true;
    }
  }, [user, showToast, t]);

  const addCreditsToAccount = useCallback(async (amount: number, reason?: string) => {
    if (!user) return;
    const newTotal = await addCredits(user.uid, amount, reason);
    setCredits(newTotal);
  }, [user]);

  const canAffordTool = useCallback((toolId: string) => checkCanAfford(credits, toolId), [credits]);
  const getToolPrice = useCallback((toolId: string) => {
    const cost = getToolCost(toolId);
    return cost?.isFree ? null : (cost?.credits ?? null);
  }, []);

  return (
    <CreditsContext.Provider value={{ credits, loading, refreshCredits, spendCredits, addCreditsToAccount, canAffordTool, getToolPrice }}>
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  const ctx = useContext(CreditsContext);
  if (!ctx) throw new Error('useCredits must be used within CreditsProvider');
  return ctx;
}
