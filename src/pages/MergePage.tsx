import { ToolPage } from '../components/ToolPage';
import {
  Combine, Lock, Unlock, RotateCw, FileSignature,
  FilePlus2, Divide, FileBadge,
  Edit3, Crop, LifeBuoy, ShieldAlert, Settings2, Scissors
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { PDFDocument, degrees, rgb, StandardFonts } from '@cantoo/pdf-lib';
import { saveAs } from 'file-saver';
import { useState } from 'react';
import { VisualEditor } from '../components/VisualEditor';
import { SignEditor } from '../components/SignEditor';
import { WatermarkEditor } from '../components/WatermarkEditor';
import { SplitEditor } from '../components/SplitEditor';
import { MergeEditor } from '../components/MergeEditor';
import { PageOrganizer } from '../components/PageOrganizer';
import { useToast } from '../contexts/ToastContext';
import { Check } from 'lucide-react';

export function MergePage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const location = useLocation();
  const path = location.pathname.substring(1);
  const [files, setFiles] = useState<File[]>([]);
  const [editingFile, setEditingFile] = useState<File | null>(null);
  const [organizingFile, setOrganizingFile] = useState<File | null>(null);
  const [configOpen, setConfigOpen] = useState(false);

  // Custom Config State
  const [password, setPassword] = useState('');
  const [pagePos, setPagePos] = useState<'bottom' | 'top'>('bottom');

  const interactiveTools = ['edit', 'crop', 'redact', 'sign', 'watermark', 'split'];

  const toolConfig: Record<string, any> = {
    'merge': { icon: Combine, translationKey: 'merge', color: 'bg-rose-500' },
    'protect': { icon: Lock, translationKey: 'protect', color: 'bg-indigo-600', hasConfig: true },
    'watermark': { icon: FileBadge, translationKey: 'watermark', color: 'bg-blue-600' },
    'unlock': { icon: Unlock, translationKey: 'unlock', color: 'bg-purple-500', hasConfig: true },
    'rotate': { icon: RotateCw, translationKey: 'rotate', color: 'bg-rose-400' },
    'sign': { icon: FileSignature, translationKey: 'sign', color: 'bg-cyan-600' },
    'page-numbers': { icon: FilePlus2, translationKey: 'pageNumbers', color: 'bg-lime-600', hasConfig: true },
    'organize': { icon: Divide, translationKey: 'organize', color: 'bg-teal-600' },
    'edit': { icon: Edit3, translationKey: 'edit', color: 'bg-orange-500' },
    'crop': { icon: Crop, translationKey: 'crop', color: 'bg-emerald-500' },
    'repair': { icon: LifeBuoy, translationKey: 'repair', color: 'bg-red-500' },
    'redact': { icon: ShieldAlert, translationKey: 'redact', color: 'bg-black' },
    'split': { icon: Scissors, translationKey: 'split', color: 'bg-sky-500' }
  };

  const config = toolConfig[path] || toolConfig['merge'];

  const handleProcess = async (selectedFiles: File[]) => {
    setFiles(selectedFiles);
    if (selectedFiles.length === 0) return;

    if (interactiveTools.includes(path)) {
      setEditingFile(selectedFiles[0]);
      return;
    }

    if (path === 'organize' || path === 'rotate') {
      setOrganizingFile(selectedFiles[0]);
      return;
    }

    // Merge tool handling
    if (path === 'merge') {
      // We just keep the files in state and the component below will render MergeEditor
      return;
    }

    if (config.hasConfig) {
      setConfigOpen(true);
      return;
    }

    const handler = getHandler();
    if (handler) {
      await handler(selectedFiles);
    }
  };

  const handleRotate = async (files: File[]) => {
    try {
      const pdfDoc = await PDFDocument.load(await files[0].arrayBuffer());
      pdfDoc.getPages().forEach(p => p.setRotation(degrees(p.getRotation().angle + 90)));
      saveAs(new Blob([await pdfDoc.save() as any]), `rotated_${files[0].name}`);
      showToast(t('common.success'), 'success');
    } catch { showToast(t('common.error'), 'error'); }
  };

  const executeConfiguredTool = async () => {
    setConfigOpen(false);
    const handler = getHandler();
    if (handler) await handler(files);
  };

  const handleProtect = async (files: File[]) => {
    if (!password) { showToast(t('tools.config.passwordPlaceholder'), 'error'); return; }
    try {
      const pdfDoc = await PDFDocument.load(await files[0].arrayBuffer());
      (pdfDoc as any).encrypt({ userPassword: password, ownerPassword: password });
      saveAs(new Blob([await pdfDoc.save() as any]), `protected_${files[0].name}`);
      showToast(t('common.success'), 'success');
    } catch { showToast(t('common.error'), 'error'); }
  };

  const handleUnlock = async (files: File[]) => {
    try {
      const pdfDoc = await PDFDocument.load(await files[0].arrayBuffer(), { password } as any);
      saveAs(new Blob([await pdfDoc.save() as any]), `unlocked_${files[0].name}`);
      showToast(t('common.success'), 'success');
    } catch { showToast(t('common.error'), 'error'); }
  };

  const handlePageNumbers = async (files: File[]) => {
    try {
      const pdfDoc = await PDFDocument.load(await files[0].arrayBuffer());
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      pdfDoc.getPages().forEach((page, idx) => {
        const { width, height } = page.getSize();
        const yPos = pagePos === 'bottom' ? 25 : height - 25;
        page.drawText(`${idx + 1}`, { x: width / 2 - 10, y: yPos, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
      });
      saveAs(new Blob([await pdfDoc.save() as any]), `numbered_${files[0].name}`);
      showToast(t('common.success'), 'success');
    } catch { showToast(t('common.error'), 'error'); }
  };

  const handleRepair = async (files: File[]) => {
    try {
      const pdfDoc = await PDFDocument.load(await files[0].arrayBuffer());
      saveAs(new Blob([await pdfDoc.save() as any]), `repaired_${files[0].name}`);
      showToast(t('common.success'), 'success');
    } catch { showToast(t('common.error'), 'error'); }
  };

  const getHandler = () => {
    if (path === 'rotate') return handleRotate;
    if (path === 'protect') return handleProtect;
    if (path === 'unlock') return handleUnlock;
    if (path === 'page-numbers') return handlePageNumbers;
    if (path === 'repair') return handleRepair;
    return undefined;
  };

  // Render Editors
  if (path === 'merge' && files.length > 0) return <MergeEditor files={files} onClose={() => setFiles([])} />;
  if (editingFile && path === 'sign') return <SignEditor file={editingFile} onClose={() => setEditingFile(null)} />;
  if (editingFile && path === 'watermark') return <WatermarkEditor file={editingFile} onClose={() => setEditingFile(null)} />;
  if (editingFile && path === 'split') return <SplitEditor file={editingFile} onClose={() => setEditingFile(null)} />;
  if (editingFile) return <VisualEditor file={editingFile} toolType={path} onClose={() => setEditingFile(null)} />;
  if (organizingFile) return <PageOrganizer file={organizingFile} toolType={path} onClose={() => setOrganizingFile(null)} />;

  return (
    <div className="bg-slate-50 dark:bg-[#020617] relative">
      <ToolPage
        icon={config.icon}
        title={t(`tools.${config.translationKey}.title`)}
        description={t(`tools.${config.translationKey}.description`)}
        color={config.color}
        onProcess={handleProcess}
      />

      {/* Configuration Modal */}
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
              {(path === 'protect' || path === 'unlock') && (
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('tools.config.passwordLabel')}</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('tools.config.passwordPlaceholder')}
                    className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl outline-none transition-all font-medium text-slate-900 dark:text-white"
                  />
                </div>
              )}

              {path === 'page-numbers' && (
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-1">{t('tools.config.placement')}</label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setPagePos('top')}
                      className={`py-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${pagePos === 'top' ? 'bg-indigo-600 border-indigo-400 text-white shadow-xl' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500 hover:bg-slate-100'}`}
                    >
                      <div className="w-10 h-1 bg-current opacity-20 rounded-full mb-4" />
                      <span className="font-black text-[10px] uppercase tracking-widest">{t('tools.config.top')}</span>
                    </button>
                    <button
                      onClick={() => setPagePos('bottom')}
                      className={`py-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${pagePos === 'bottom' ? 'bg-indigo-600 border-indigo-400 text-white shadow-xl' : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500 hover:bg-slate-100'}`}
                    >
                      <span className="font-black text-[10px] uppercase tracking-widest mt-4">{t('tools.config.bottom')}</span>
                      <div className="w-10 h-1 bg-current opacity-20 rounded-full" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-12 flex gap-4">
              <button onClick={() => setConfigOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all">{t('tools.config.cancel')}</button>
              <button onClick={executeConfiguredTool} className="flex-[2] py-4 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 transition-all flex items-center justify-center gap-2">
                <Check className="w-4 h-4" /> {t('tools.config.finalize')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
