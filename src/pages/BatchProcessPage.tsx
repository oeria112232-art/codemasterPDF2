import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';
import { useCredits } from '../contexts/CreditsContext';
import { useAuth } from '../contexts/AuthContext';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, StandardFonts, rgb } from '@cantoo/pdf-lib';
import { saveAs } from 'file-saver';
import {
  Layers, Upload, X, FileText, Loader2, Sparkles,
  CheckCircle2, XCircle, Download, Trash2, Settings2
} from 'lucide-react';
import { ToolPage } from '../components/ToolPage';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

type BatchAction = 'compress' | 'merge' | 'add-page-numbers' | 'rotate-cw' | 'rotate-ccw' | 'convert-to-images';

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
  const [files, setFiles] = useState<File[]>([]);
  const [action, setAction] = useState<BatchAction>('compress');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<JobResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback((newFiles: File[]) => {
    const pdfs = newFiles.filter(f => f.type === 'application/pdf');
    if (pdfs.length !== newFiles.length) {
      showToast(t('batchProcess.errors.onlyPdf', { count: newFiles.length - pdfs.length }), 'error');
    }
    setFiles(prev => [...prev, ...pdfs]);
  }, [showToast, t]);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const clearFiles = () => setFiles([]);

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

  const processAll = async () => {
    if (files.length === 0) return;

    const costPerFile = 2;
    const totalCost = action === 'merge' ? costPerFile : costPerFile * files.length;
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

  const downloadResult = (result: JobResult) => {
    if (result.blob) saveAs(result.blob, result.name);
  };

  const downloadAll = () => {
    results.forEach(r => { if (r.blob) downloadResult(r); });
  };

  const ACTIONS: { id: BatchAction; label: string; perFile: boolean }[] = [
    { id: 'compress', label: t('batchProcess.actions.compress'), perFile: true },
    { id: 'merge', label: t('batchProcess.actions.merge'), perFile: false },
    { id: 'add-page-numbers', label: t('batchProcess.actions.pageNumbers'), perFile: true },
    { id: 'rotate-cw', label: t('batchProcess.actions.rotateCW'), perFile: true },
    { id: 'rotate-ccw', label: t('batchProcess.actions.rotateCCW'), perFile: true },
  ];

  return (
    <div className="bg-slate-50 dark:bg-[#020617] py-12 px-4 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-600 rounded-full mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[2px]">{t('batchProcess.badge')}</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
            {t('batchProcess.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg max-w-2xl mx-auto">
            {t('batchProcess.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">
                  {t('batchProcess.filesCount', { count: files.length })}
                </h3>
                {files.length > 0 && (
                  <button onClick={clearFiles} className="text-xs font-bold text-red-500 hover:text-red-600">{t('batchProcess.clearAll')}</button>
                )}
              </div>
              <div className="p-6">
                {files.length === 0 ? (
                  <label className="cursor-pointer block">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      multiple
                      className="hidden"
                      onChange={e => e.target.files && handleFiles(Array.from(e.target.files))}
                    />
                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-12 hover:border-amber-500/50 transition-colors text-center">
                      <Upload className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                      <p className="text-sm font-bold text-slate-400">{t('batchProcess.dropzone')}</p>
                      <p className="text-[10px] text-slate-300 mt-1">{t('batchProcess.multipleFiles')}</p>
                    </div>
                  </label>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    <label className="cursor-pointer block border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-3 hover:border-amber-500/50 transition-colors text-center mb-3">
                      <input type="file" accept=".pdf" multiple className="hidden"
                        onChange={e => e.target.files && handleFiles(Array.from(e.target.files))} />
                      <span className="text-xs font-bold text-slate-400">{t('batchProcess.addMore')}</span>
                    </label>
                    {files.map((file, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl group">
                        <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate flex-1">{file.name}</span>
                        <span className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(0)} KB</span>
                        <button onClick={() => removeFile(i)} className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                          <X className="w-3 h-3 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {(processing || results.length > 0) && (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6">
                {processing && (
                  <div className="mb-6">
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

                <div className="space-y-2 max-h-[300px] overflow-y-auto">
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

                {results.length > 0 && !processing && (
                  <button onClick={downloadAll}
                    className="mt-4 w-full py-3 bg-amber-500 hover:bg-amber-400 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" /> {t('batchProcess.downloadAll')}
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Settings2 className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">{t('batchProcess.action')}</h3>
              </div>
              <div className="space-y-2">
                {ACTIONS.map(a => (
                  <button key={a.id} onClick={() => setAction(a.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                      action === a.id
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                    }`}>
                    {a.label}
                    {a.perFile && files.length > 1 && (
                      <span className="text-[10px] opacity-70 ml-2">({t('batchProcess.costPerFile', { count: files.length })})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={processAll}
              disabled={files.length === 0 || processing}
              className="w-full py-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2">
              {processing
                ? <><Loader2 className="w-4 h-4 animate-spin" /> {t('batchProcess.processing')}</>
                : <><Layers className="w-4 h-4" /> {t('batchProcess.processCount', { count: files.length })}</>}
            </button>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">{t('batchProcess.cost')}</h4>
              <p className="text-2xl font-black text-slate-900 dark:text-white">
                {action === 'merge' ? '2' : files.length * 2} <span className="text-sm text-slate-400">{t('batchProcess.costUnit')}</span>
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                {action === 'merge' ? t('batchProcess.costMerge') : t('batchProcess.costPerFile')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
