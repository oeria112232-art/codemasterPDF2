import { useTranslation } from 'react-i18next';

export function PrivacyPage() {
  const { t } = useTranslation();
  return (
    <div className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-[#020617]">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-6xl font-black text-slate-900 dark:text-white mb-12 tracking-tighter">{t('privacy.title')}</h1>
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-12 shadow-2xl border border-slate-100 dark:border-slate-800 prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-400">
          <p className="mb-8 font-bold text-indigo-600 uppercase tracking-widest text-xs">{t('privacy.lastUpdated')}: {new Date().toLocaleDateString()}</p>

          <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-12 mb-6 tracking-tight">{t('privacy.collectTitle')}</h2>
          <p className="mb-6 leading-relaxed font-medium">
            {t('privacy.collectDesc')}
          </p>

          <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-12 mb-6 tracking-tight">{t('privacy.useTitle')}</h2>
          <p className="mb-6 leading-relaxed font-medium">
            {t('privacy.useDesc')}
          </p>

          <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-12 mb-6 tracking-tight">{t('privacy.securityTitle')}</h2>
          <p className="mb-6 leading-relaxed font-medium">
            {t('privacy.securityDesc')}
          </p>
        </div>
      </div>
    </div>
  );
}
