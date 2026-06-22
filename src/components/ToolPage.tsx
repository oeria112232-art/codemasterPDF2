import { ReactNode, useState } from 'react';
import { LucideIcon, Loader2, Sparkles, AlertCircle, ShieldCheck, Cpu, Zap } from 'lucide-react';
import { FileUploadZone } from './FileUploadZone';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from 'react-i18next';

interface ToolPageProps {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  children?: ReactNode;
  onProcess?: (files: File[]) => Promise<void>;
  hideContent?: boolean;
  customZone?: ReactNode;
}

export function ToolPage({ icon: Icon, title, description, color, onProcess, hideContent = false, customZone }: ToolPageProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);

  const handleProcess = async () => {
    if (!onProcess) {
      showToast(t('toolPage.comingSoon'), 'info');
      return;
    }

    if (files.length === 0) {
      showToast(t('toolPage.selectFile'), 'error');
      return;
    }

    try {
      setProcessing(true);
      await onProcess(files);
    } catch (error: any) {
      console.error(error);
      showToast(error.message || t('common.error'), 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className={hideContent ? "" : "py-24 px-6 sm:px-8 lg:px-12 animate-in fade-in duration-1000 relative"}>
      {/* Background Ambience */}
      {!hideContent && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none -z-10" />}

      <div className={hideContent ? "" : "max-w-6xl mx-auto"}>
        {!hideContent && (
          <div className="text-center mb-20 px-4">
            <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-[10px] font-black uppercase tracking-[4px] mb-8">
              <Cpu className="w-3.5 h-3.5" /> {t('toolPage.engine')}
            </div>
            <div className={`mx-auto w-24 h-24 rounded-[2.5rem] ${color} mb-8 shadow-2xl flex items-center justify-center rotate-3 hover:rotate-0 transition-transform duration-500`}>
              <Icon className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white mb-6 tracking-tighter">
              {title}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed italic text-lg px-4">
              {description}
            </p>
          </div>
        )}

        <div className={`relative group ${hideContent ? "" : "mb-16"}`}>
          {!hideContent && <div className="absolute -inset-1 bg-gradient-to-r from-indigo-600 to-sky-600 rounded-[4rem] blur opacity-10 group-hover:opacity-20 transition duration-1000" />}
          <div className={`relative bg-white dark:bg-slate-900/50 rounded-[3.5rem] ${hideContent ? "" : "shadow-2xl border border-slate-100 dark:border-slate-800 p-4"}`}>
            {customZone ? customZone : <FileUploadZone files={files} onFilesChange={setFiles} />}
          </div>
        </div>

        {!hideContent && !customZone && (
          <div className="text-center animate-in slide-in-from-bottom-8 duration-1000">
            <button
              onClick={handleProcess}
              disabled={files.length === 0 || processing}
              className={`
                  group px-16 py-8 rounded-[2.5rem] font-black text-xs uppercase tracking-[5px] transition-all flex items-center gap-4 mx-auto shadow-2xl
                  ${files.length > 0
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 scale-100 hover:scale-105 active:scale-95'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'}
              `}
            >
              {processing ? <Loader2 className="animate-spin h-5 w-5" /> : <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />}
              {processing ? t('toolPage.calculating') : t('toolPage.commit', { title })}
            </button>
          </div>
        )}

        {hideContent && files.length > 0 && !processing && (
          <div className="mt-8 text-center animate-in fade-in zoom-in duration-300">
            <button
              onClick={handleProcess}
              className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20 active:scale-95 flex items-center gap-3 mx-auto"
            >
              <Zap className="w-4 h-4" /> {t('toolPage.start')}
            </button>
          </div>
        )}

        {!hideContent && (
          <div className="mt-32 grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-xl overflow-hidden relative">
              <div className="absolute top-0 right-0 p-8 opacity-5">
                <AlertCircle className="w-40 h-40 text-slate-900" />
              </div>
              <div className="flex items-center gap-4 mb-8 text-indigo-600">
                <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <h3 className="font-black uppercase tracking-widest text-[10px]">{t('toolPage.protocol')}</h3>
              </div>
              <ul className="space-y-6">
                <ProcessStep n="01" label={t('toolPage.step1.label')} desc={t('toolPage.step1.desc')} />
                <ProcessStep n="02" label={t('toolPage.step2.label')} desc={t('toolPage.step2.desc')} />
                <ProcessStep n="03" label={t('toolPage.step3.label')} desc={t('toolPage.step3.desc')} />
              </ul>
            </div>

            <div className="flex flex-col gap-10">
              <div className="bg-indigo-600 p-10 rounded-[3rem] shadow-2xl shadow-indigo-600/20 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                <ShieldCheck className="absolute -bottom-8 -right-8 w-40 h-40 text-white/10 group-hover:rotate-12 transition-transform duration-700" />
                <h3 className="text-2xl font-black text-white mb-4 uppercase tracking-tight">{t('toolPage.shieldTitle')}</h3>
                <p className="text-indigo-100 font-medium leading-relaxed italic text-sm">
                  {t('toolPage.shieldDesc')}
                </p>
              </div>

              <div className="p-10 border-2 border-slate-100 dark:border-slate-800 rounded-[3rem] flex items-center gap-6">
                <div className="w-16 h-16 bg-slate-900 dark:bg-slate-800 rounded-3xl flex items-center justify-center text-white shrink-0">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-slate-900 dark:text-white font-black uppercase tracking-widest text-xs">{t('toolPage.fidelityTitle')}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] font-medium leading-relaxed">{t('toolPage.fidelityDesc')}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProcessStep({ n, label, desc }: any) {
  return (
    <li className="flex gap-5 group">
      <span className="text-3xl font-black text-slate-100 dark:text-slate-800 tracking-tighter group-hover:text-indigo-600 transition-colors">{n}</span>
      <div>
        <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{label}</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-none mt-1">{desc}</p>
      </div>
    </li>
  );
}
