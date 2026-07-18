import { useState } from 'react';
import { ToolPage } from '../components/ToolPage';
import { Trash2, Loader2, CheckCircle, RotateCcw, X } from 'lucide-react';
import { saveAs } from 'file-saver';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';

let _pdfLib: typeof import('@cantoo/pdf-lib') | null = null;
async function loadPdfLib() {
  if (!_pdfLib) _pdfLib = await import('@cantoo/pdf-lib');
  return _pdfLib;
}

let _pdfjsLib: typeof import('pdfjs-dist') | null = null;
async function loadPdfjs() {
  if (!_pdfjsLib) {
    _pdfjsLib = await import('pdfjs-dist');
    _pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';
  }
  return _pdfjsLib;
}

export function DeletePagesPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState('');
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [numPages, setNumPages] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [done, setDone] = useState(false);

  const handleFile = async (files: File[]) => {
    if (!files.length) return;
    setLoading(true);
    setFileName(files[0].name);
    const buf = await files[0].arrayBuffer();
    setPdfBytes(buf);
    const pdfjsLib = await loadPdfjs();
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
    setNumPages(pdf.numPages);
    const thumbs: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const vp = page.getViewport({ scale: 0.3 });
      const canvas = document.createElement('canvas');
      canvas.width = vp.width;
      canvas.height = vp.height;
      const ctx = canvas.getContext('2d')!;
      await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
      thumbs.push(canvas.toDataURL());
    }
    setThumbnails(thumbs);
    setLoading(false);
  };

  const togglePage = (idx: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleDelete = async () => {
    if (!pdfBytes || selected.size === 0) return;
    if (selected.size === numPages) {
      showToast(t('deletePages.cannotDeleteAll', 'Cannot delete all pages'), 'error');
      return;
    }
    setLoading(true);
    try {
      const { PDFDocument } = await loadPdfLib();
      const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true } as any);
      const indices = Array.from(selected).sort((a, b) => b - a);
      for (const idx of indices) {
        doc.removePage(idx);
      }
      const bytes = await doc.save();
      saveAs(new Blob([bytes as any], { type: 'application/pdf' }), `modified_${fileName}`);
      setDone(true);
      showToast(t('editor.exportSuccess'), 'success');
    } catch (err) {
      console.error(err);
      showToast(t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="bg-slate-50 dark:bg-[#020617] py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase">{t('deletePages.complete', 'Complete')}</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8">{selected.size} {t('deletePages.pagesDeleted', 'pages deleted')}</p>
          <button onClick={() => { setSelected(new Set()); setThumbnails([]); setPdfBytes(null); setDone(false); setNumPages(0); setFileName(''); }}
            className="px-8 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 mx-auto">
            <RotateCcw className="w-4 h-4" /> {t('deletePages.processAnother', 'Process Another')}
          </button>
        </div>
      </div>
    );
  }

  if (thumbnails.length > 0) {
    return (
      <div className="bg-slate-50 dark:bg-[#020617] py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white mb-6 tracking-tighter text-center">{t('deletePages.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-center mb-8">{fileName} — {t('deletePages.selectPages', 'Click pages to delete')}</p>

          <div className="flex items-center justify-center gap-4 mb-6">
            <span className="text-xs font-bold text-slate-500">{selected.size} / {numPages} {t('deletePages.selected', 'selected')}</span>
            {selected.size > 0 && (
              <button onClick={() => setSelected(new Set())} className="text-xs font-bold text-rose-500 hover:text-rose-600">
                {t('deletePages.clearSelection', 'Clear selection')}
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-4 mb-8">
            {thumbnails.map((src, i) => (
              <div key={i} onClick={() => togglePage(i)}
                className={`relative cursor-pointer rounded-xl overflow-hidden shadow-sm transition-all ${
                  selected.has(i) ? 'border-4 border-rose-500 shadow-lg shadow-rose-200 ring-2 ring-rose-300' : 'border-2 border-transparent hover:border-slate-300'
                }`}>
                <img src={src} className="w-full h-auto" alt={`Page ${i + 1}`} />
                <div className="absolute bottom-1 right-1 bg-slate-900/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">{i + 1}</div>
                {selected.has(i) && (
                  <div className="absolute inset-0 bg-rose-500/30 flex items-center justify-center">
                    <div className="w-8 h-8 bg-rose-500 rounded-full flex items-center justify-center shadow-lg">
                      <Trash2 className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-center gap-4">
            <button onClick={() => { setSelected(new Set()); setThumbnails([]); setPdfBytes(null); setNumPages(0); setFileName(''); }}
              className="px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 transition-all flex items-center gap-2">
              <X className="w-4 h-4" /> {t('common.cancel', 'Cancel')}
            </button>
            <button onClick={handleDelete} disabled={selected.size === 0 || loading}
              className="px-8 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-200 flex items-center gap-2 disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {t('deletePages.deleteSelected', 'Delete Selected')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-slate-50 dark:bg-[#020617] py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <Loader2 className="w-12 h-12 text-rose-500 animate-spin mb-4 mx-auto" />
          <p className="text-sm text-slate-400 font-bold">{t('common.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  return (
    <ToolPage icon={Trash2} title={t('deletePages.title', 'Delete PDF Pages')} description={t('deletePages.description', 'Remove unwanted pages from your PDF document')} color="bg-rose-500" onProcess={handleFile} accept=".pdf" />
  );
}
