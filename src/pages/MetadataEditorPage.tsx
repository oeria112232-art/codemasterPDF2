import { useState } from 'react';
import { ToolPage } from '../components/ToolPage';
import { FileSignature, Loader2, Save, RotateCcw } from 'lucide-react';
import { saveAs } from 'file-saver';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';

let _pdfLib: typeof import('@cantoo/pdf-lib') | null = null;
async function loadPdfLib() {
  if (!_pdfLib) _pdfLib = await import('@cantoo/pdf-lib');
  return _pdfLib;
}

export function MetadataEditorPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [metadata, setMetadata] = useState<{
    title: string; author: string; subject: string;
    keywords: string; creator: string; producer: string;
  } | null>(null);
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState('');

  const handleFile = async (files: File[]) => {
    if (!files.length) return;
    setLoading(true);
    setFileName(files[0].name);
    const buf = await files[0].arrayBuffer();
    setPdfBytes(buf);
    const { PDFDocument } = await loadPdfLib();
    const doc = await PDFDocument.load(buf, { ignoreEncryption: true } as any);
    setMetadata({
      title: doc.getTitle() || '',
      author: doc.getAuthor() || '',
      subject: doc.getSubject() || '',
      keywords: (doc.getKeywords() || []).join(', '),
      creator: doc.getCreator() || '',
      producer: doc.getProducer() || '',
    });
    setLoading(false);
  };

  const handleSave = async () => {
    if (!pdfBytes || !metadata) return;
    try {
      setLoading(true);
      const { PDFDocument } = await loadPdfLib();
      const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true } as any);
      doc.setTitle(metadata.title);
      doc.setAuthor(metadata.author);
      doc.setSubject(metadata.subject);
      doc.setKeywords(metadata.keywords.split(',').map(k => k.trim()).filter(Boolean));
      doc.setCreator(metadata.creator);
      doc.setProducer(metadata.producer);
      const bytes = await doc.save();
      saveAs(new Blob([bytes as any], { type: 'application/pdf' }), `metadata_${fileName}`);
      showToast(t('editor.exportSuccess'), 'success');
    } catch {
      showToast(t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  if (metadata) {
    return (
      <div className="bg-slate-50 dark:bg-[#020617] py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 dark:text-white mb-6 tracking-tighter text-center">{t('metadataEditor.title')}</h1>
          <p className="text-slate-500 dark:text-slate-400 text-center mb-8">{fileName}</p>
          <div className="bg-white dark:bg-slate-900/50 rounded-[3.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 p-8 space-y-5">
            {([
              ['title', t('metadataEditor.titleLabel')],
              ['author', t('metadataEditor.authorLabel')],
              ['subject', t('metadataEditor.subjectLabel')],
              ['keywords', t('metadataEditor.keywordsLabel')],
              ['creator', t('metadataEditor.creatorLabel')],
              ['producer', t('metadataEditor.producerLabel')],
            ] as const).map(([key, label]) => (
              <div key={key}>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">{label}</label>
                <input
                  type="text"
                  value={(metadata as any)[key]}
                  onChange={(e) => setMetadata(prev => prev ? { ...prev, [key]: e.target.value } : null)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                />
              </div>
            ))}
            <div className="flex gap-4 pt-4">
              <button onClick={() => { setMetadata(null); setPdfBytes(null); setFileName(''); }}
                className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 transition-all flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" /> {t('common.cancel', 'Back')}
              </button>
              <button onClick={handleSave} disabled={loading}
                className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-200 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {t('common.save', 'Save Changes')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-slate-50 dark:bg-[#020617] py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <Loader2 className="w-12 h-12 text-rose-500 animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-400 font-bold">{t('common.loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  return (
    <ToolPage icon={FileSignature} title={t('metadataEditor.title')} description={t('metadataEditor.description')} color="bg-rose-500" onProcess={handleFile} accept=".pdf" />
  );
}
