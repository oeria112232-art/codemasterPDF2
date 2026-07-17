import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';
import { useCredits } from '../contexts/CreditsContext';
import * as pdfjsLib from 'pdfjs-dist';
import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  Sparkles, FileText, Loader2, Copy, Download,
  List, AlignLeft, BookOpen, MessageSquare
} from 'lucide-react';
import { ToolPage } from '../components/ToolPage';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

type SummaryMode = 'brief' | 'detailed' | 'key-points' | 'executive';

const MODES: { id: SummaryMode; label: string; icon: any; desc: string; prompt: string }[] = [
  { id: 'brief', label: 'Brief Summary', icon: AlignLeft, desc: '2-3 sentence overview', prompt: 'Provide a brief 2-3 sentence summary of this document.' },
  { id: 'detailed', label: 'Detailed Summary', icon: BookOpen, desc: 'Full paragraph summary', prompt: 'Provide a detailed paragraph summary covering the main points of this document.' },
  { id: 'key-points', label: 'Key Points', icon: List, desc: 'Bullet point list', prompt: 'Extract the key points from this document as a bullet-point list. Be concise but thorough.' },
  { id: 'executive', label: 'Executive Summary', icon: MessageSquare, desc: 'Professional brief', prompt: 'Write a professional executive summary suitable for business stakeholders. Include context, findings, and recommendations if applicable.' },
];

export function AiSummarizePage() {
  useTranslation();
  const { showToast } = useToast();
  const { spendCredits } = useCredits();
  const [pdfText, setPdfText] = useState('');
  const [pdfName, setPdfName] = useState('');
  const [mode, setMode] = useState<SummaryMode>('brief');
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const extractText = async (file: File) => {
    setExtracting(true);
    try {
      const buf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      let text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((item: any) => item.str).join(' ') + '\n';
      }
      setPdfText(text);
      setPdfName(file.name);
      showToast('PDF text extracted', 'success');
    } catch {
      showToast('Failed to extract text', 'error');
    } finally {
      setExtracting(false);
    }
  };

  const handleSummarize = async (files: File[]) => {
    if (files.length > 0) await extractText(files[0]);
  };

  const runSummary = async () => {
    if (!pdfText || loading) return;

    const ok = await spendCredits('ai-summarize');
    if (!ok) return;

    setLoading(true);
    setSummary('');
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        showToast('AI not configured. Set VITE_GEMINI_API_KEY.', 'error');
        return;
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const contextText = pdfText.length > 40000 ? pdfText.substring(0, 40000) + '\n...(truncated)' : pdfText;
      const modeConfig = MODES.find(m => m.id === mode)!;

      const result = await model.generateContent(
        `${modeConfig.prompt}\n\nDocument content:\n\n${contextText}`
      );
      setSummary(result.response.text());
      showToast('Summary generated', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to generate summary', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copySummary = () => {
    navigator.clipboard.writeText(summary);
    showToast('Copied to clipboard', 'success');
  };

  const downloadSummary = () => {
    const blob = new Blob([summary], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `summary_${pdfName.replace('.pdf', '')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!pdfText) {
    return (
      <div className="bg-slate-50 dark:bg-[#020617] py-12 px-4 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 text-violet-600 rounded-full mb-6">
              <Sparkles className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-[2px]">AI-Powered • 50 Credits</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">AI Summarize</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg max-w-2xl mx-auto">
              Upload a PDF and get an instant AI-generated summary
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-1 shadow-2xl border border-slate-100 dark:border-slate-800">
            {extracting ? (
              <div className="p-20 flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-violet-500 animate-spin mb-4" />
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Extracting text...</p>
              </div>
            ) : (
              <ToolPage icon={Sparkles} title="" description="" color="bg-violet-500" onProcess={handleSummarize} hideContent={true} />
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 dark:bg-[#020617] py-12 px-4 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">AI Summarize</h1>
          <p className="text-sm text-slate-400 mt-2">
            <FileText className="w-4 h-4 inline mr-1" />{pdfName}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6">
              <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Summary Type</h3>
              <div className="space-y-2">
                {MODES.map(m => {
                  const Icon = m.icon;
                  return (
                    <button key={m.id} onClick={() => setMode(m.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl transition-all ${
                        mode === m.id
                          ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                      }`}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span className="text-sm font-bold">{m.label}</span>
                      </div>
                      <p className={`text-[10px] mt-1 ${mode === m.id ? 'text-violet-200' : 'text-slate-400'}`}>{m.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <button onClick={runSummary} disabled={loading}
              className="w-full py-4 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-violet-500/20 flex items-center justify-center gap-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4" /> Generate Summary</>}
            </button>

            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Cost</p>
              <p className="text-2xl font-black text-violet-600">50 <span className="text-sm text-slate-400">credits</span></p>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 min-h-[400px]">
              {summary ? (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Summary</h3>
                    <div className="flex gap-2">
                      <button onClick={copySummary} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        <Copy className="w-4 h-4 text-slate-400" />
                      </button>
                      <button onClick={downloadSummary} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                        <Download className="w-4 h-4 text-slate-400" />
                      </button>
                    </div>
                  </div>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{summary}</p>
                  </div>
                </div>
              ) : loading ? (
                <div className="p-12 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 border-4 border-violet-500/10 border-t-violet-500 rounded-full animate-spin mb-4" />
                  <p className="text-sm font-bold text-slate-400">AI is analyzing your document...</p>
                </div>
              ) : (
                <div className="p-12 flex flex-col items-center justify-center text-center">
                  <Sparkles className="w-12 h-12 text-slate-200 dark:text-slate-700 mb-4" />
                  <p className="text-sm font-bold text-slate-400">Select a summary type and click Generate</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
