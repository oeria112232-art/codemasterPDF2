import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';
import * as pdfjsLib from 'pdfjs-dist';
import {
  GitCompareArrows, Upload, FileText,
  Loader2, Sparkles, Check
} from 'lucide-react';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

interface DiffItem {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
  pageNum: number;
}

interface CompareResult {
  file1Name: string;
  file2Name: string;
  file1Pages: number;
  file2Pages: number;
  file1Length: number;
  file2Length: number;
  diffs: DiffItem[];
  addedCount: number;
  removedCount: number;
  unchangedCount: number;
  similarity: number;
}

export function PdfComparePage() {
  useTranslation();
  const { showToast } = useToast();
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [comparing, setComparing] = useState(false);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [showFilter, setShowFilter] = useState<'all' | 'added' | 'removed'>('all');

  const extractText = async (file: File): Promise<{ text: string; pageTexts: string[]; pages: number }> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    const pageTexts: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item: any) => item.str).join(' ');
      pageTexts.push(pageText);
      fullText += pageText + '\n';
    }

    return { text: fullText.trim(), pageTexts, pages: pdf.numPages };
  };

  const simpleDiff = (oldText: string, newText: string, pageNum: number): DiffItem[] => {
    const oldLines = oldText.split('\n').filter(l => l.trim());
    const newLines = newText.split('\n').filter(l => l.trim());
    const diffs: DiffItem[] = [];

    const maxLen = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < maxLen; i++) {
      if (i >= oldLines.length) {
        diffs.push({ type: 'added', text: newLines[i], pageNum });
      } else if (i >= newLines.length) {
        diffs.push({ type: 'removed', text: oldLines[i], pageNum });
      } else if (oldLines[i] === newLines[i]) {
        diffs.push({ type: 'unchanged', text: oldLines[i], pageNum });
      } else {
        diffs.push({ type: 'removed', text: oldLines[i], pageNum });
        diffs.push({ type: 'added', text: newLines[i], pageNum });
      }
    }
    return diffs;
  };

  const handleCompare = async () => {
    if (!file1 || !file2) return;
    setComparing(true);

    try {
      const [data1, data2] = await Promise.all([extractText(file1), extractText(file2)]);
      const diffs = simpleDiff(data1.text, data2.text, 1);

      const addedCount = diffs.filter(d => d.type === 'added').length;
      const removedCount = diffs.filter(d => d.type === 'removed').length;
      const unchangedCount = diffs.filter(d => d.type === 'unchanged').length;
      const total = addedCount + removedCount + unchangedCount;
      const similarity = total > 0 ? Math.round((unchangedCount / total) * 100) : 100;

      setResult({
        file1Name: file1.name,
        file2Name: file2.name,
        file1Pages: data1.pages,
        file2Pages: data2.pages,
        file1Length: data1.text.length,
        file2Length: data2.text.length,
        diffs,
        addedCount,
        removedCount,
        unchangedCount,
        similarity,
      });
      showToast('Comparison complete', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to compare PDFs', 'error');
    } finally {
      setComparing(false);
    }
  };

  const reset = () => {
    setFile1(null);
    setFile2(null);
    setResult(null);
  };

  const filteredDiffs = result?.diffs.filter(d => {
    if (showFilter === 'all') return true;
    return d.type === showFilter;
  }) || [];

  if (result) {
    return (
      <div className="bg-slate-50 dark:bg-[#020617] py-12 px-4 min-h-screen">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Comparison Results</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Similarity</p>
              <p className={`text-3xl font-black ${result.similarity > 80 ? 'text-emerald-500' : result.similarity > 50 ? 'text-amber-500' : 'text-red-500'}`}>
                {result.similarity}%
              </p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Added</p>
              <p className="text-3xl font-black text-emerald-500">+{result.addedCount}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Removed</p>
              <p className="text-3xl font-black text-red-500">-{result.removedCount}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Unchanged</p>
              <p className="text-3xl font-black text-slate-400">{result.unchangedCount}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-100 dark:border-slate-800">
              {(['all', 'added', 'removed'] as const).map(f => (
                <button key={f} onClick={() => setShowFilter(f)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                    showFilter === f ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600'
                  }`}>
                  {f === 'all' ? 'All' : f === 'added' ? `+ Added (${result.addedCount})` : `- Removed (${result.removedCount})`}
                </button>
              ))}
              <div className="flex-1" />
              <button onClick={reset} className="px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-200 transition-all">
                Compare Again
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {filteredDiffs.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <Check className="w-12 h-12 mx-auto mb-4 text-emerald-500" />
                  <p className="font-bold">No differences in this filter</p>
                </div>
              ) : (
                filteredDiffs.map((diff, i) => (
                  <div key={i} className={`px-6 py-2 border-l-4 font-mono text-sm ${
                    diff.type === 'added' ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-500 text-emerald-700 dark:text-emerald-400' :
                    diff.type === 'removed' ? 'bg-red-50 dark:bg-red-900/10 border-red-500 text-red-700 dark:text-red-400 line-through' :
                    'border-transparent text-slate-600 dark:text-slate-400'
                  }`}>
                    <span className="inline-block w-6 text-slate-400 select-none">
                      {diff.type === 'added' ? '+' : diff.type === 'removed' ? '-' : ' '}
                    </span>
                    {diff.text}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-[#020617] py-12 px-4 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 text-purple-600 rounded-full mb-6">
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[2px]">Free Tool</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
            PDF Compare
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-lg max-w-2xl mx-auto">
            Compare two PDF files and see all differences highlighted
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {[
            { file: file1, setFile: setFile1, label: 'Document A' },
            { file: file2, setFile: setFile2, label: 'Document B' },
          ].map(({ file, setFile, label }) => (
            <div key={label} className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-100 dark:border-slate-800 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">{label}</p>
              {file ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center">
                    <FileText className="w-8 h-8 text-indigo-500" />
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{file.name}</p>
                  <p className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(0)} KB</p>
                  <button onClick={() => setFile(null)} className="text-xs text-red-500 hover:text-red-600 font-bold">
                    Remove
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <input type="file" accept=".pdf" className="hidden" onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) setFile(f);
                  }} />
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-10 hover:border-indigo-500/50 transition-colors">
                    <Upload className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-400">Click to upload PDF</p>
                  </div>
                </label>
              )}
            </div>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={handleCompare}
            disabled={!file1 || !file2 || comparing}
            className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 inline-flex items-center gap-3"
          >
            {comparing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Comparing...</>
            ) : (
              <><GitCompareArrows className="w-4 h-4" /> Compare Documents</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
