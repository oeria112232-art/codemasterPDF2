import { ShieldCheck, Zap, Globe, Cpu, Sparkles, Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function AboutPage() {
  const { t } = useTranslation();

  return (
    <div className="bg-slate-50 dark:bg-[#020617] py-24 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-500/5 blur-[150px] rounded-full -z-10" />
      <div className="absolute bottom-0 left-0 w-[800px] h-[800px] bg-rose-500/5 blur-[150px] rounded-full -z-10" />

      <div className="max-w-7xl mx-auto px-8">
        <div className="text-center mb-24">
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-[10px] font-black uppercase tracking-[4px] mb-8 animate-in fade-in slide-in-from-bottom-2">
            <Sparkles className="w-3.5 h-3.5" /> {t('about.mission')}
          </div>
          <h1 className="text-6xl md:text-7xl font-black text-slate-900 dark:text-white mb-8 tracking-tighter leading-none animate-in fade-in slide-in-from-bottom-4 duration-700">
            {t('about.pioneering')}
          </h1>
          <p className="max-w-2xl mx-auto text-slate-500 dark:text-slate-400 text-lg font-medium leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-1000">
            {t('about.missionDesc')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-32">
          <FeatureBox
            icon={Cpu}
            title={t('about.neuralCore')}
            desc={t('about.neuralDesc')}
            delay="delay-0"
          />
          <FeatureBox
            icon={ShieldCheck}
            title={t('about.quantumSecurity')}
            desc={t('about.quantumDesc')}
            delay="delay-100"
          />
          <FeatureBox
            icon={Globe}
            title={t('about.globalPresence')}
            desc={t('about.globalDesc')}
            delay="delay-200"
          />
        </div>

        <div className="bg-slate-900 rounded-[4rem] p-12 md:p-20 relative overflow-hidden border border-slate-800 shadow-2xl">
          <div className="absolute top-0 right-0 p-10 opacity-10">
            <Award className="w-64 h-64 text-white" />
          </div>
          <div className="relative z-10 max-w-3xl">
            <h2 className="text-4xl font-black text-white mb-6 uppercase tracking-tight italic">{t('about.engineeredFor')}</h2>
            <p className="text-slate-400 text-lg font-medium leading-relaxed mb-10">
              {t('about.engineeredDesc')}
            </p>
            <div className="flex gap-6">
              <div className="flex flex-col">
                <span className="text-4xl font-black text-white">99.9%</span>
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">{t('about.uptime')}</span>
              </div>
              <div className="w-[1px] h-12 bg-slate-800" />
              <div className="flex flex-col">
                <span className="text-4xl font-black text-white">100M+</span>
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mt-1">{t('about.processed')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureBox({ icon: Icon, title, desc, delay }: any) {
  return (
    <div className={`p-10 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-2 group animate-in fade-in slide-in-from-bottom-8 duration-700 ${delay}`}>
      <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner mb-8">
        <Icon className="w-8 h-8" />
      </div>
      <h3 className="text-xl font-black text-slate-900 dark:text-white mb-4 uppercase tracking-tighter">{title}</h3>
      <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed text-sm">
        {desc}
      </p>
    </div>
  );
}
