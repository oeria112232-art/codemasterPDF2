import { useState } from 'react';
import { ToolPage } from '../components/ToolPage';
import { ConvertEditor } from '../components/ConvertEditor';
import {
  FileImage, FileType, FileText, FileSpreadsheet,
  Image, Sparkles, Zap, ShieldCheck, Presentation, Globe
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';

export function ConvertPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const location = useLocation();
  const rawPath = location.pathname.substring(1);
  const path = rawPath.endsWith('/') ? rawPath.slice(0, -1) : rawPath;
  const [activeFiles, setActiveFiles] = useState<File[]>([]);
  const [urlMode, setUrlMode] = useState(false);

  const toolConfig: Record<string, any> = {
    'pdf-to-jpg': { icon: FileImage, translationKey: 'pdfToJpg', color: 'bg-amber-500' },
    'jpg-to-pdf': { icon: Image, translationKey: 'jpgToPdf', color: 'bg-rose-500' },
    'html-to-pdf': { icon: Globe, translationKey: 'htmlToPdf', color: 'bg-slate-700' },
    'pdf-to-word': { icon: FileText, translationKey: 'pdfToWord', color: 'bg-blue-600', experimental: true },
    'word-to-pdf': { icon: FileType, translationKey: 'wordToPdf', color: 'bg-indigo-600', experimental: true },
    'pdf-to-excel': { icon: FileSpreadsheet, translationKey: 'pdfToExcel', color: 'bg-emerald-600', experimental: true },
    'excel-to-pdf': { icon: FileSpreadsheet, translationKey: 'excelToPdf', color: 'bg-emerald-700', experimental: true },
    'pdf-to-powerpoint': { icon: Presentation, translationKey: 'pdfToPowerPoint', color: 'bg-orange-600', experimental: true },
    'powerpoint-to-pdf': { icon: Presentation, translationKey: 'powerPointToPdf', color: 'bg-orange-700', experimental: true },
  };

  const config = toolConfig[path] || toolConfig['pdf-to-jpg'];

  const handleProcess = async (files: File[]) => {
    // Beta block removed to enable tools
    if (['powerpoint-to-pdf'].includes(path)) {
      showToast(t('tools.convert.betaMessage'), 'info');
    }
    setActiveFiles(files);
  };

  // ConvertEditor open condition
  if (activeFiles.length > 0 || urlMode) {
    return <ConvertEditor
      files={activeFiles}
      toolType={path}
      onClose={() => { setActiveFiles([]); setUrlMode(false); }}
      defaultUrl={urlMode ? 'https://' : undefined}
    />;
  }

  // Custom Zone for HTML to PDF to replace File Uploader
  const htmlToPdfZone = path === 'html-to-pdf' ? (
    <div className="flex flex-col items-center justify-center p-12 min-h-[300px] text-center">
      <div className="max-w-md w-full">
        <button
          onClick={() => setUrlMode(true)}
          className="w-full group flex items-center justify-center gap-4 px-8 py-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-xl transition-all transform hover:-translate-y-1 active:scale-95 border-b-4 border-indigo-800"
        >
          <Globe className="w-6 h-6 shrink-0 text-indigo-200 group-hover:text-white transition-colors" />
          <div className="flex flex-col items-start text-left">
            <span className="text-[10px] uppercase font-black tracking-[3px] text-indigo-300 group-hover:text-indigo-100 transition-colors">START HERE</span>
            <span className="text-lg font-black tracking-tight">{t('tools.convert.enterUrl')}</span>
          </div>
        </button>

        <p className="mt-8 text-slate-400 font-bold text-xs uppercase tracking-widest leading-relaxed">
          Convert any webpage to high-quality PDF directly from your browser.
        </p>
      </div>
    </div>
  ) : null;

  return (
    <div className="bg-slate-50 dark:bg-[#020617] relative">
      <ToolPage
        key={path}
        icon={config.icon}
        title={t(`tools.${config.translationKey}.title`)}
        description={t(`tools.${config.translationKey}.description`)}
        color={config.color}
        onProcess={handleProcess}
        customZone={htmlToPdfZone}
      />

      {config.experimental && (
        <div className="max-w-5xl mx-auto px-6 pb-20 -mt-10 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <div className="bg-indigo-600/5 border border-indigo-500/20 rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center gap-10">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-600/20 shrink-0">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">{t('tools.convert.aiEngine')}</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                {t('tools.convert.aiEngineDesc')}
              </p>
            </div>
            <div className="flex gap-4 shrink-0">
              <Badge icon={Zap} label={t('tools.convert.ultraFast')} />
              <Badge icon={ShieldCheck} label={t('tools.convert.encrypted')} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Badge({ icon: Icon, label }: any) {
  return (
    <div className="px-4 py-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-2 shadow-sm">
      <Icon className="w-3.5 h-3.5 text-indigo-500" />
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
    </div>
  );
}
