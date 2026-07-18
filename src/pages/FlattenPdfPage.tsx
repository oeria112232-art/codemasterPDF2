import { useState } from 'react';
import { ToolPage } from '../components/ToolPage';
import { Layers, Loader2, CheckCircle, RotateCcw } from 'lucide-react';
import { saveAs } from 'file-saver';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';

let _pdfLib: typeof import('@cantoo/pdf-lib') | null = null;
async function loadPdfLib() {
  if (!_pdfLib) _pdfLib = await import('@cantoo/pdf-lib');
  return _pdfLib;
}

export function FlattenPdfPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ fieldCount: number } | null>(null);

  const handleFlatten = async (files: File[]) => {
    if (!files.length) return;
    setProcessing(true);
    setResult(null);
    try {
      const buf = await files[0].arrayBuffer();
      const { PDFDocument } = await loadPdfLib();
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true } as any);
      const form = doc.getForm();
      const fields = form.getFields();
      const fieldCount = fields.length;
      form.flatten();
      const bytes = await doc.save();
      saveAs(new Blob([bytes as any], { type: 'application/pdf' }), `flattened_${files[0].name}`);
      setResult({ fieldCount });
      showToast(t('flattenPdf.success'), 'success');
    } catch (err) {
      console.error(err);
      showToast(t('common.error'), 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (result) {
    return (
      <div className="bg-slate-50 dark:bg-[#020617] py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase">{t('flattenPdf.complete')}</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8">
            {result.fieldCount > 0
              ? t('flattenPdf.fieldsFlattened')
              : t('flattenPdf.noFieldsFound')}
          </p>
          <button onClick={() => setResult(null)}
            className="px-8 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 mx-auto">
            <RotateCcw className="w-4 h-4" /> {t('flattenPdf.processAnother')}
          </button>
        </div>
      </div>
    );
  }

  if (processing) {
    return (
      <div className="bg-slate-50 dark:bg-[#020617] py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="relative mb-8">
            <div className="w-24 h-24 border-8 border-rose-500/10 border-t-rose-500 rounded-full animate-spin mx-auto" />
            <Layers className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-rose-500" />
          </div>
          <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-widest">{t('flattenPdf.flattening')}</h3>
        </div>
      </div>
    );
  }

  return (
    <ToolPage icon={Layers} title={t('flattenPdf.title')} description={t('flattenPdf.description')} color="bg-rose-500" onProcess={handleFlatten} accept=".pdf" />
  );
}
