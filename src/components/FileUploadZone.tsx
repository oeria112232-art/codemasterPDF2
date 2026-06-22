import { Upload, X, FileText, Sparkles, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface FileUploadZoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
}

export function FileUploadZone({ files, onFilesChange, accept = ".pdf", multiple = true }: FileUploadZoneProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;

    const newFiles = Array.from(selectedFiles);
    if (!multiple) {
      onFilesChange(newFiles);
    } else {
      onFilesChange([...files, ...newFiles]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative group border-4 border-dashed rounded-[3rem] p-16 text-center transition-all duration-500 overflow-hidden ${isDragging
          ? 'border-indigo-500 bg-indigo-500/5 scale-[0.99] rotate-1'
          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:border-indigo-400/50'
          }`}
      >
        {/* Animated Background Gradients */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[80px] rounded-full -z-10 animate-pulse" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-rose-500/5 blur-[80px] rounded-full -z-10 animate-pulse delay-1000" />

        <div className="flex flex-col items-center relative z-10">
          <div className={`p-6 rounded-[2rem] mb-8 transition-all duration-500 ${isDragging ? 'bg-indigo-600 scale-110 rotate-12 shadow-2xl' : 'bg-slate-50 dark:bg-slate-800'}`}>
            <Upload className={`w-10 h-10 transition-colors ${isDragging ? 'text-white' : 'text-slate-400'}`} />
          </div>

          <div className="space-y-3 mb-10">
            <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">
              {isDragging ? t('upload.release') : t('upload.ready')}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">
              {t('upload.dragDrop')}
            </p>
          </div>

          <label className="cursor-pointer group/btn">
            <input
              type="file"
              multiple={multiple}
              accept={accept}
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />
            <span className="inline-flex items-center gap-3 px-10 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] font-black text-xs uppercase tracking-[4px] transition-all shadow-2xl shadow-indigo-600/20 active:scale-95">
              <Sparkles className="w-4 h-4" />
              {t('upload.selectFiles')}
            </span>
          </label>

          <div className="mt-8 flex items-center gap-6 opacity-40">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[9px] font-black uppercase tracking-widest">{t('upload.encrypted')}</span>
            </div>
            <div className="w-[1px] h-3 bg-slate-400" />
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="text-[9px] font-black uppercase tracking-widest">{t('upload.atomic')}</span>
            </div>
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="mt-12 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center justify-between px-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[4px]">
              {t('upload.activeQueue')} ({files.length})
            </h4>
            <button
              onClick={() => onFilesChange([])}
              className="text-[9px] font-black text-rose-500 uppercase tracking-widest hover:underline"
            >
              {t('upload.clearAll')}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-6 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none animate-in zoom-in-95"
              >
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center shrink-0">
                    <FileText className="w-6 h-6 text-indigo-500" />
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-black text-sm text-slate-900 dark:text-white truncate tracking-tight">{file.name}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                      {(file.size / 1024 / 1024).toFixed(2)} MB • {t('upload.dataBlock')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-3 hover:bg-rose-500/10 hover:text-rose-500 text-slate-400 rounded-xl transition-all active:scale-90"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
