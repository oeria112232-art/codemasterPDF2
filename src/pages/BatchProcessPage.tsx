import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';
import { useCredits } from '../contexts/CreditsContext';
import { useAuth } from '../contexts/AuthContext';
import { PDFDocument, StandardFonts, rgb } from '@cantoo/pdf-lib';
import { saveAs } from 'file-saver';
import {
  Layers, Loader2, CheckCircle2, XCircle, Download, Settings2, FileText
} from 'lucide-react';
import { ToolPage } from '../components/ToolPage';

type BatchAction = 'compress' | 'merge' | 'add-page-numbers' | 'rotate-cw' | 'rotate-ccw';

interface JobResult {
  name: string;
  status: 'success' | 'error';
  size?: number;
  error?: string;
  blob?: Blob;
}

export function BatchProcessPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { spendCredits } = useCredits();
  const [action, setAction] = useState<BatchAction>('compress');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<JobResult[]>([]);
  const [loadedFiles, setLoadedFiles] = useState<File[] | null>(null);

  const compressSingle = async (file: File): Promise<JobResult> => {
    try {
      const buf = await file.arrayBuffer();
      const src = await PDFDocument.load(buf, { ignoreEncryption: true } as any);
      const doc = await PDFDocument.create();
      doc.setTitle(src.getTitle() || '');
      doc.setAuthor('');
      doc.setProducer('CodeMaster Batch Compress');
      doc.setCreator('CodeMaster');
      const pages = await doc.copyPages(src, src.getPageIndices());
      pages.forEach(p => doc.addPage(p));
      const bytes = await doc.save({ useObjectStreams: true });
      const blob = new Blob([bytes as any], { type: 'application/pdf' });
      return { name: `compressed_${file.name}`, status: 'success', size: blob.size, blob };
    } catch (e: any) {
      return { name: file.name, status: 'error', error: e.message };
    }
  };

  const mergeAll = async (allFiles: File[]): Promise<JobResult> => {
    try {
      const merged = await PDFDocument.create();
      for (const file of allFiles) {
        const buf = await file.arrayBuffer();
        const src = await PDFDocument.load(buf, { ignoreEncryption: true } as any);
        const pages = await merged.copyPages(src, src.getPageIndices());
        pages.forEach(p => merged.addPage(p));
      }
      const bytes = await merged.save({ useObjectStreams: true });
      const blob = new Blob([bytes as any], { type: 'application/pdf' });
      return { name: 'merged_output.pdf', status: 'success', size: blob.size, blob };
    } catch (e: any) {
      return { name: 'merge', status: 'error', error: e.message };
    }
  };

  const addPageNumbersSingle = async (file: File): Promise<JobResult> => {
    try {
      const buf = await file.arrayBuffer();
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true } as any);
      const font = await doc.embedFont(StandardFonts.HelveticaBold);
      doc.getPages().forEach((page, idx) => {
        const { width, height } = page.getSize();
        page.drawText(`${idx + 1}`, { x: width / 2 - 5, y: 25, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
      });
      const bytes = await doc.save({ useObjectStreams: true });
      const blob = new Blob([bytes as any], { type: 'application/pdf' });
      return { name: `numbered_${file.name}`, status: 'success', size: blob.size, blob };
    } catch (e: any) {
      return { name: file.name, status: 'error', error: e.message };
    }
  };

  const rotateSingle = async (file: File, clockwise: boolean): Promise<JobResult> => {
    try {
      const buf = await file.arrayBuffer();
      const { degrees } = await import('@cantoo/pdf-lib');
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true } as any);
      doc.getPages().forEach(p => p.setRotation(degrees(p.getRotation().angle + (clockwise ? 90 : -90))));
      const bytes = await doc.save({ useObjectStreams: true });
      const blob = new Blob([bytes as any], { type: 'application/pdf' });
      return { name: `rotated_${file.name}`, status: 'success', size: blob.size, blob };
    } catch (e: any) {
      return { name: file.name, status: 'error', error: e.message };
    }
  };

  const processAll = async (files: File[]) => {
    if (files.length === 0) return;

    if (user) {
      const ok = await spendCredits('batch-process');
      if (!ok) return;
    }

    setProcessing(true);
    setResults([]);
    setProgress({ current: 0, total: files.length });

    try {
      if (action === 'merge') {
        setProgress({ current: 1, total: 1 });
        const result = await mergeAll(files);
        setResults([result]);
      } else {
        const batchResults: JobResult[] = [];
        for (let i = 0; i < files.length; i++) {
          setProgress({ current: i + 1, total: files.length });
          let result: JobResult;
          switch (action) {
            case 'compress': result = await compressSingle(files[i]); break;
            case 'add-page-numbers': result = await addPageNumbersSingle(files[i]); break;
            case 'rotate-cw': result = await rotateSingle(files[i], true); break;
            case 'rotate-ccw': result = await rotateSingle(files[i], false); break;
            default: result = { name: files[i].name, status: 'error', error: t('batchProcess.errors.unknownAction') };
          }
          batchResults.push(result);
          setResults([...batchResults]);
        }
      }
      showToast(t('batchProcess.success.complete'), 'success');
    } catch (err: any) {
      showToast(t('batchProcess.errors.failed'), 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleProcess = async (files: File[]) => {
    setLoadedFiles(files);
    await processAll(files);
  };

  const downloadResult = (result: JobResult) => {
    if (result.blob) saveAs(result.blob, result.name);
  };

  const downloadAll = () => {
    results.forEach(r => { if (r.blob) downloadResult(r); });
  };

  const ACTIONS: { id: BatchAction; label: string }[] = [
    { id: 'compress', label: t('batchProcess.actions.compress') },
    { id: 'merge', label: t('batchProcess.actions.merge') },
    { id: 'add-page-numbers', label: t('batchProcess.actions.pageNumbers') },
    { id: 'rotate-cw', label: t('batchProcess.actions.rotateCW') },
    { id: 'rotate-ccw', label: t('batchProcess.actions.rotateCCW') },
  ];

  if (results.length > 0 || processing) {
    return (
      <div className="bg-slate-50 dark:bg-[#020617] py-12 px-4 min-h-screen">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white mb-6 tracking-tighter text-center">{t('batchProcess.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-center mb-8">{loadedFiles?.length} {t('batchProcess.filesCount', { count: loadedFiles?.length || 0 })}</p>

          {processing && (
            <div className="bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{t('batchProcess.processing')}</span>
                <span className="text-xs font-black text-amber-500">{progress.current}/{progress.total}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }} />
              </div>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 p-6">
            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-xl ${
                  r.status === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/10' : 'bg-red-50 dark:bg-red-900/10'
                }`}>
                  {r.status === 'success'
                    ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    : <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate flex-1">{r.name}</span>
                  {r.size && <span className="text-[10px] text-slate-400">{(r.size / 1024).toFixed(0)} KB</span>}
                  {r.error && <span className="text-[10px] text-red-400 truncate max-w-[200px]">{r.error}</span>}
                  {r.blob && (
                    <button onClick={() => downloadResult(r)} className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 rounded-lg">
                      <Download className="w-3 h-3 text-emerald-500" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {!processing && results.length > 0 && (
              <div className="flex gap-4 mt-6">
                <button onClick={downloadAll}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                  <Download className="w-4 h-4" /> {t('batchProcess.downloadAll')}
                </button>
                <button onClick={() => { setResults([]); setLoadedFiles(null); }}
                  className="py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl font-black text-xs uppercase tracking-widest text-slate-500 transition-all px-6">
                  {t('batchProcess.processAnother', 'Process Another')}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-lg mx-auto mb-4 px-4">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">{t('batchProcess.action')}</label>
        <div className="flex gap-2 flex-wrap">
          {ACTIONS.map(a => (
            <button key={a.id} onClick={() => setAction(a.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${action === a.id
                ? 'bg-amber-500 text-white shadow-lg'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:border-amber-300'
              }`}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
      <ToolPage icon={Layers} title={t('batchProcess.title')} description={t('batchProcess.subtitle')} color="bg-amber-500" onProcess={handleProcess} accept=".pdf" multiple={true} />
    </div>
  );
}
