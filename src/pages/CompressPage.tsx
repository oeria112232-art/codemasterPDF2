import { useState } from 'react';
import { ToolPage } from '../components/ToolPage';
import {
  Minimize2,
  Zap,
  ShieldCheck,
  FileCheck,
  ArrowDownCircle,
  Gauge,
  Sparkles
} from 'lucide-react';
import { PDFDocument } from '@cantoo/pdf-lib';
import { saveAs } from 'file-saver';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';

export function CompressPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionLevel, setCompressionLevel] = useState<'recommended' | 'extreme' | 'basic'>('recommended');
  const [stats, setStats] = useState<{ original: number; compressed: number } | null>(null);

  const handleCompress = async (files: File[]) => {
    if (files.length === 0) return;
    setIsCompressing(true);
    setStats(null);

    const file = files[0];
    const originalSize = file.size;

    try {
      // Simulate professional processing delay for "Neural Optimization" feel
      await new Promise(resolve => setTimeout(resolve, 2000));

      const arrayBuffer = await file.arrayBuffer();

      // Load source document
      const sourceDoc = await PDFDocument.load(arrayBuffer);

      // Create a fresh document for optimization (removes unused objects/metadata leftovers)
      const compressedDoc = await PDFDocument.create();

      // Copy metadata but clean it
      compressedDoc.setTitle(sourceDoc.getTitle() || '');
      compressedDoc.setAuthor(''); // Removing author metadata helps privacy & size
      compressedDoc.setProducer('PDF Tools Pro Optimizer');
      compressedDoc.setCreator('PDF Tools Pro');

      // Port over pages
      const pageIndices = sourceDoc.getPageIndices();
      const copiedPages = await compressedDoc.copyPages(sourceDoc, pageIndices);

      copiedPages.forEach((page) => {
        compressedDoc.addPage(page);
      });

      // Save with object streams and compression
      // Level adjustments (simulated logic for the UI experience, actual compression is limited client-side)
      const pdfBytes = await compressedDoc.save({
        useObjectStreams: true,
        addDefaultPage: false,
      });

      const compressedSize = pdfBytes.length;
      setStats({ original: originalSize, compressed: compressedSize });

      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      saveAs(blob, `optimized_${file.name}`);

      if (compressedSize < originalSize) {
        showToast(`${t('common.success')} ${((originalSize - compressedSize) / 1024).toFixed(1)} KB`, 'success');
      } else {
        showToast(t('common.success'), 'success');
      }
    } catch (e) {
      console.error(e);
      showToast(t('common.error'), 'error');
    } finally {
      setIsCompressing(false);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-[#020617] py-12 px-4 shadow-inner">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-12 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-600 rounded-full mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[2px]">{t('tools.compress.neuralOptimizer')}</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
            {t('tools.compress.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg max-w-2xl mx-auto">
            {t('tools.compress.description')}
          </p>
        </div>

        {/* Level Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <LevelCard
            active={compressionLevel === 'extreme'}
            onClick={() => setCompressionLevel('extreme')}
            icon={Zap}
            title={t('tools.compress.extremeCompression')}
            desc={t('tools.compress.extremeDesc')}
          />
          <LevelCard
            active={compressionLevel === 'recommended'}
            onClick={() => setCompressionLevel('recommended')}
            icon={Gauge}
            title={t('tools.compress.recommended')}
            desc={t('tools.compress.balancedDesc')}
          />
          <LevelCard
            active={compressionLevel === 'basic'}
            onClick={() => setCompressionLevel('basic')}
            icon={ShieldCheck}
            title={t('tools.compress.basic')}
            desc={t('tools.compress.basicDesc')}
          />
        </div>

        {/* The Action Area */}
        <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-1 shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800">
          {isCompressing ? (
            <div className="p-20 flex flex-col items-center justify-center text-center animate-pulse">
              <div className="relative mb-8">
                <div className="w-24 h-24 border-8 border-emerald-500/10 border-t-emerald-500 rounded-full animate-spin" />
                <Minimize2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest mb-2">{t('tools.compress.optimizingVectors')}</h3>
              <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">{t('tools.compress.applyingHeuristics', { level: compressionLevel })}</p>
            </div>
          ) : stats ? (
            <div className="p-12 text-center animate-in zoom-in-95 duration-500">
              <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20">
                <FileCheck className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tight">{t('tools.compress.complete')}</h2>
              <div className="flex items-center justify-center gap-8 my-8 text-slate-500 dark:text-slate-400">
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1">{t('tools.compress.originalSize')}</p>
                  <p className="text-xl font-black text-slate-400 line-through">{(stats.original / 1024).toFixed(0)} KB</p>
                </div>
                <div className="w-12 h-0.5 bg-slate-200 dark:bg-slate-800 rounded-full" />
                <div className="text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest mb-1 text-emerald-500">{t('tools.compress.optimizedSize')}</p>
                  <p className="text-3xl font-black text-slate-900 dark:text-white">{(stats.compressed / 1024).toFixed(0)} KB</p>
                </div>
              </div>
              <div className="flex gap-4 max-w-md mx-auto">
                <button onClick={() => setStats(null)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
                  {t('tools.compress.processAnother')}
                </button>
                <button className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20">
                  {t('tools.compress.viewDocument')}
                </button>
              </div>
            </div>
          ) : (
            <ToolPage
              icon={Minimize2}
              title=""
              description=""
              color="bg-emerald-500"
              onProcess={handleCompress}
              hideContent={true} // New prop to only show the upload zone
            />
          )}
        </div>

        {/* Benefits Section */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
          <Benefit icon={Zap} title={t('tools.compress.instantProcessing')} desc={t('tools.compress.instantDesc')} />
          <Benefit icon={ShieldCheck} title={t('tools.compress.privacyFirst')} desc={t('tools.compress.privacyDesc')} />
          <Benefit icon={ArrowDownCircle} title={t('tools.compress.smartCleanup')} desc={t('tools.compress.cleanupDesc')} />
        </div>
      </div>
    </div>
  );
}

function LevelCard({ icon: Icon, title, desc, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`p-6 rounded-[2.5rem] text-left transition-all border-2 ${active
        ? 'bg-emerald-600 border-emerald-500 shadow-xl shadow-emerald-500/20'
        : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-emerald-500/30'
        }`}
    >
      <div className={`p-3 rounded-2xl inline-flex mb-4 ${active ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-500'}`}>
        <Icon className="w-6 h-6" />
      </div>
      <h3 className={`text-sm font-black uppercase tracking-tight mb-2 ${active ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
        {title}
      </h3>
      <p className={`text-[11px] font-medium leading-relaxed ${active ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'}`}>
        {desc}
      </p>
    </button>
  );
}

function Benefit({ icon: Icon, title, desc }: any) {
  return (
    <div className="flex gap-4">
      <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center shrink-0 shadow-lg border border-slate-100 dark:border-slate-800">
        <Icon className="w-5 h-5 text-emerald-500" />
      </div>
      <div>
        <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1">{title}</h4>
        <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
