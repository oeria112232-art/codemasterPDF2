import { useState } from 'react';
import { ToolPage } from '../components/ToolPage';
import { ScanText, Loader2, Copy, Download, RotateCcw } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';
import { saveAs } from 'file-saver';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

export function OcrPdfPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [ocrLang, setOcrLang] = useState('eng');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState<string | null>(null);

  const LANGUAGES = [
    { code: 'eng', name: t('ocrPdf.english', 'English') },
    { code: 'ara', name: t('ocrPdf.arabic', 'Arabic') },
    { code: 'fra', name: t('ocrPdf.french', 'French') },
    { code: 'spa', name: t('ocrPdf.spanish', 'Spanish') },
    { code: 'deu', name: t('ocrPdf.german', 'German') },
  ];

  const handleOcr = async (files: File[]) => {
    if (!files.length) return;
    setProcessing(true);
    try {
      const buf = await files[0].arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
      const totalPages = pdf.numPages;
      setProgress({ current: 0, total: totalPages });

      const worker = await createWorker(ocrLang);
      let fullText = '';

      for (let i = 1; i <= totalPages; i++) {
        setProgress({ current: i, total: totalPages });
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;

        const { data } = await worker.recognize(canvas);
        fullText += data.text + '\n\n';
      }

      await worker.terminate();
      setResult(fullText);
      showToast(t('ocrPdf.complete'), 'success');
    } catch (err) {
      console.error(err);
      showToast(t('common.error'), 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (processing) {
    return (
      <div className="bg-slate-50 py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="relative mb-8">
            <div className="w-24 h-24 border-8 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin mx-auto" />
            <ScanText className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-indigo-500" />
          </div>
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest mb-2">{t('ocrPdf.processing')}</h3>
          {progress.total > 0 && (
            <p className="text-sm text-slate-400 font-bold">{t('ocrPdf.processingPage', { current: progress.current, total: progress.total })}</p>
          )}
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="bg-slate-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-slate-900 mb-2">{t('ocrPdf.complete')}</h1>
            <p className="text-slate-500 text-sm">{result.length} {t('ocrPdf.charCount')}</p>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100 mb-8">
            <div className="max-h-[60vh] overflow-y-auto text-sm text-slate-600 whitespace-pre-wrap leading-relaxed font-mono">{result}</div>
          </div>
          <div className="flex gap-4 justify-center">
            <button onClick={() => navigator.clipboard.writeText(result)}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 transition-all flex items-center gap-2">
              <Copy className="w-4 h-4" /> {t('ocrPdf.copyText')}
            </button>
            <button onClick={() => saveAs(new Blob([result], { type: 'text/plain' }), 'ocr_text.txt')}
              className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2">
              <Download className="w-4 h-4" /> {t('ocrPdf.downloadText')}
            </button>
            <button onClick={() => setResult(null)}
              className="px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> {t('ocrPdf.processAnother')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-600 rounded-full mb-6">
            <ScanText className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[2px]">{t('ocrPdf.badge')}</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-slate-900 mb-4 tracking-tight">{t('ocrPdf.title')}</h1>
          <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto">{t('ocrPdf.description')}</p>
        </div>

        <div className="max-w-md mx-auto mb-8">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">{t('ocrPdf.selectLanguage')}</label>
          <div className="flex gap-2 flex-wrap">
            {LANGUAGES.map(l => (
              <button key={l.code} onClick={() => setOcrLang(l.code)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${ocrLang === l.code ? 'bg-indigo-500 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-500 hover:border-indigo-300'}`}>
                {l.name}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[3rem] p-1 shadow-2xl shadow-slate-200/50 border border-slate-100">
          <ToolPage icon={ScanText} title="" description="" color="bg-indigo-500" onProcess={handleOcr} hideContent={true} />
        </div>
      </div>
    </div>
  );
}
