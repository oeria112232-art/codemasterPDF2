import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PDFDocument, degrees, rgb, StandardFonts } from '@cantoo/pdf-lib';
import { saveAs } from 'file-saver';
import { LucideIcon, Settings2, Check } from 'lucide-react';
import { ToolPage } from '../components/ToolPage';
import { VisualEditor } from '../components/VisualEditor';
import { SignEditor } from '../components/SignEditor';
import { WatermarkEditor } from '../components/WatermarkEditor';
import { SplitEditor } from '../components/SplitEditor';
import { MergeEditor } from '../components/MergeEditor';
import { PageOrganizer } from '../components/PageOrganizer';
import { useToast } from '../contexts/ToastContext';

interface ToolConfig {
  icon: LucideIcon;
  translationKey: string;
  color: string;
  hasConfig?: boolean;
  configType?: 'password' | 'page-position';
}

export function createToolPage(config: ToolConfig, directHandler?: (files: File[], options?: any) => Promise<void>) {
  return function ToolPageWrapper() {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const [files, setFiles] = useState<File[]>([]);
    const [editingFile, setEditingFile] = useState<File | null>(null);
    const [organizingFile, setOrganizingFile] = useState<File | null>(null);
    const [configOpen, setConfigOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [pagePos, setPagePos] = useState<'bottom' | 'top'>('bottom');

    const interactiveTools = ['edit', 'crop', 'redact', 'sign', 'watermark', 'split'];

    const handleProcess = async (selectedFiles: File[]) => {
      setFiles(selectedFiles);
      if (selectedFiles.length === 0) return;

      const toolId = window.location.pathname.substring(1);

      if (interactiveTools.includes(toolId)) {
        setEditingFile(selectedFiles[0]);
        return;
      }

      if (toolId === 'organize' || toolId === 'rotate') {
        if (toolId === 'rotate' && directHandler) {
          await directHandler(selectedFiles);
          return;
        }
        setOrganizingFile(selectedFiles[0]);
        return;
      }

      if (toolId === 'merge') return;

      if (config.hasConfig) {
        setConfigOpen(true);
        return;
      }

      if (directHandler) {
        await directHandler(selectedFiles, { password, pagePos });
      }
    };

    const executeConfig = async () => {
      setConfigOpen(false);
      if (directHandler) await directHandler(files, { password, pagePos });
    };

    const toolId = window.location.pathname.substring(1);

    if (toolId === 'merge' && files.length > 0) return <MergeEditor files={files} onClose={() => setFiles([])} />;
    if (editingFile && toolId === 'sign') return <SignEditor file={editingFile} onClose={() => setEditingFile(null)} />;
    if (editingFile && toolId === 'watermark') return <WatermarkEditor file={editingFile} onClose={() => setEditingFile(null)} />;
    if (editingFile && toolId === 'split') return <SplitEditor file={editingFile} onClose={() => setEditingFile(null)} />;
    if (editingFile) return <VisualEditor file={editingFile} toolType={toolId} onClose={() => setEditingFile(null)} />;
    if (organizingFile) return <PageOrganizer file={organizingFile} toolType={toolId} onClose={() => setOrganizingFile(null)} />;

    return (
      <div className="bg-slate-50 dark:bg-[#020617] relative">
        <ToolPage
          icon={config.icon}
          title={t(`tools.${config.translationKey}.title`)}
          description={t(`tools.${config.translationKey}.description`)}
          color={config.color}
          onProcess={handleProcess}
        />

        {configOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl p-10 border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-500">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
                  <Settings2 className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{t('tools.config.title')}</h3>
              </div>

              <div className="space-y-6">
                {config.configType === 'password' && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('tools.config.passwordLabel')}</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                      placeholder={t('tools.config.passwordPlaceholder')}
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl outline-none transition-all font-medium text-slate-900 dark:text-white" />
                  </div>
                )}

                {config.configType === 'page-position' && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-1">{t('tools.config.placement')}</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button onClick={() => setPagePos('top')}
                        className={`py-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${pagePos === 'top' ? 'bg-indigo-600 border-indigo-400 text-white shadow-xl' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500 hover:bg-slate-100'}`}>
                        <div className="w-10 h-1 bg-current opacity-20 rounded-full mb-4" />
                        <span className="font-black text-[10px] uppercase tracking-widest">{t('tools.config.top')}</span>
                      </button>
                      <button onClick={() => setPagePos('bottom')}
                        className={`py-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${pagePos === 'bottom' ? 'bg-indigo-600 border-indigo-400 text-white shadow-xl' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500 hover:bg-slate-100'}`}>
                        <span className="font-black text-[10px] uppercase tracking-widest mt-4">{t('tools.config.bottom')}</span>
                        <div className="w-10 h-1 bg-current opacity-20 rounded-full" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-12 flex gap-4">
                <button onClick={() => setConfigOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all">{t('tools.config.cancel')}</button>
                <button onClick={executeConfig} className="flex-[2] py-4 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" /> {t('tools.config.finalize')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
}

// Tool handlers
export async function handleRotate(files: File[]) {
  const { showToast } = await import('../contexts/ToastContext').then(m => ({ showToast: (...a: any[]) => {} }));
  try {
    const pdfDoc = await PDFDocument.load(await files[0].arrayBuffer());
    pdfDoc.getPages().forEach(p => p.setRotation(degrees(p.getRotation().angle + 90)));
    saveAs(new Blob([await pdfDoc.save() as any]), `rotated_${files[0].name}`);
  } catch (err: any) {
    throw new Error('Failed to rotate PDF');
  }
}

export async function handleProtect(files: File[], options?: { password?: string }) {
  const pw = options?.password;
  if (!pw) throw new Error('Password required');
  if (pw.length < 4) throw new Error('Password must be at least 4 characters');
  const pdfDoc = await PDFDocument.load(await files[0].arrayBuffer());
  (pdfDoc as any).encrypt({ userPassword: pw, ownerPassword: pw });
  saveAs(new Blob([await pdfDoc.save() as any]), `protected_${files[0].name}`);
}

export async function handleUnlock(files: File[], options?: { password?: string }) {
  const pdfDoc = await PDFDocument.load(await files[0].arrayBuffer(), { password: options?.password || '' } as any);
  saveAs(new Blob([await pdfDoc.save() as any]), `unlocked_${files[0].name}`);
}

export async function handlePageNumbers(files: File[], options?: { pagePos?: string }) {
  const pdfDoc = await PDFDocument.load(await files[0].arrayBuffer());
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pos = options?.pagePos || 'bottom';
  pdfDoc.getPages().forEach((page, idx) => {
    const { width, height } = page.getSize();
    const yPos = pos === 'bottom' ? 25 : height - 25;
    page.drawText(`${idx + 1}`, { x: width / 2 - 10, y: yPos, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
  });
  saveAs(new Blob([await pdfDoc.save() as any]), `numbered_${files[0].name}`);
}

export async function handleRepair(files: File[]) {
  const pdfDoc = await PDFDocument.load(await files[0].arrayBuffer(), { ignoreEncryption: true } as any);
  const bytes = await pdfDoc.save({ useObjectStreams: true });
  saveAs(new Blob([bytes as any]), `repaired_${files[0].name}`);
}
