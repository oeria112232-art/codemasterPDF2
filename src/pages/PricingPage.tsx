import { useCredits } from '../contexts/CreditsContext';
import { CREDIT_PLANS, type CreditPlan } from '../lib/credits';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Check, Sparkles, Zap, Crown, Building2, Star } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const PLAN_ICONS = [Star, Zap, Sparkles, Crown, Building2];
const PLAN_COLORS = ['bg-slate-500', 'bg-blue-500', 'bg-indigo-600', 'bg-purple-600', 'bg-amber-500'];

export function PricingPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();
  const { credits, addCreditsToAccount } = useCredits();
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const handlePurchase = async (planId: string, creditAmount: number) => {
    if (!user) {
      showToast(t('pricing.errors.signInRequired'), 'error');
      return;
    }
    setPurchasing(planId);
    try {
      await addCreditsToAccount(creditAmount, t('pricing.success.purchased', { planId }));
      showToast(t('pricing.success.creditsAdded', { amount: creditAmount }), 'success');
    } catch {
      showToast(t('pricing.errors.purchaseFailed'), 'error');
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-[#020617] py-16 px-4 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-600 rounded-full mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[2px]">{t('pricing.badge')}</span>
          </div>
          <h1 className="text-4xl lg:text-6xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
            {t('pricing.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg max-w-2xl mx-auto">
            {t('pricing.subtitle')}
          </p>
          {user && (
            <div className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                {t('pricing.balance')} <span className="text-indigo-600">{credits} {t('pricing.credits')}</span>
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {CREDIT_PLANS.map((plan: CreditPlan, i: number) => {
            const Icon = PLAN_ICONS[i];
            const color = PLAN_COLORS[i];
            const isPopular = plan.badge;

            return (
              <div key={plan.id} className={`relative bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border-2 transition-all hover:scale-[1.02] ${
                isPopular ? 'border-indigo-500 shadow-2xl shadow-indigo-500/10' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
              }`}>
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full">
                    {plan.badge}
                  </div>
                )}
                <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center mb-6`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1">{plan.name}</h3>
                <p className="text-3xl font-black text-slate-900 dark:text-white mb-1">
                  {plan.price === 0 ? t('pricing.plans.free.price') : `$${plan.price}`}
                </p>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">
                  {plan.credits >= 999999 ? t('pricing.plans.free.creditDesc') : `${plan.credits.toLocaleString()} ${t('pricing.credits')}`}
                </p>

                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    {plan.credits >= 999999 ? t('pricing.plans.free.feature1') : `${plan.credits} ${t('pricing.credits')}`}
                  </li>
                  <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    {t('pricing.plans.free.feature2')}
                  </li>
                  {i >= 2 && (
                    <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      {t('pricing.plans.free.feature3')}
                    </li>
                  )}
                  {i >= 3 && (
                    <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                      {t('pricing.plans.free.feature4')}
                    </li>
                  )}
                </ul>

                <button
                  onClick={() => handlePurchase(plan.id, plan.credits)}
                  disabled={purchasing === plan.id || plan.price === 0}
                  className={`w-full py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                    isPopular
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                  } disabled:opacity-50`}
                >
                  {plan.price === 0 ? t('pricing.plans.currentPlan') : purchasing === plan.id ? t('pricing.plans.processing') : t('pricing.plans.buyNow')}
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">{t('pricing.howItWorks.title')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-black text-indigo-600">1</span>
              </div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white mb-2">{t('pricing.howItWorks.steps.buy.title')}</h4>
              <p className="text-xs text-slate-400">{t('pricing.howItWorks.steps.buy.desc')}</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-black text-indigo-600">2</span>
              </div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white mb-2">{t('pricing.howItWorks.steps.use.title')}</h4>
              <p className="text-xs text-slate-400">{t('pricing.howItWorks.steps.use.desc')}</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-xl font-black text-indigo-600">3</span>
              </div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white mb-2">{t('pricing.howItWorks.steps.pay.title')}</h4>
              <p className="text-xs text-slate-400">{t('pricing.howItWorks.steps.pay.desc')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
