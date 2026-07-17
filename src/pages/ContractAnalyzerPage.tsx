import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';
import { useCredits } from '../contexts/CreditsContext';
import * as pdfjsLib from 'pdfjs-dist';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { groqChat } from '../lib/external-apis';
import {
  ShieldAlert, FileText, Loader2, Copy, Download,
  AlertTriangle, CheckCircle, Clock, Scale, Users, DollarSign
} from 'lucide-react';
import { ToolPage } from '../components/ToolPage';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

interface AnalysisSection {
  title: string;
  icon: any;
  content: string;
  color: string;
}

export function ContractAnalyzerPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { spendCredits } = useCredits();
  const [pdfText, setPdfText] = useState('');
  const [pdfName, setPdfName] = useState('');
  const [sections, setSections] = useState<AnalysisSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('overview');

  const ANALYSIS_SECTIONS: { id: string; title: string; icon: any; prompt: string; color: string }[] = [
    { id: 'overview', title: t('contractAnalyzer.sections.overview'), icon: FileText, prompt: 'Provide a brief overview of what this contract is about, who the parties are, and the main purpose.', color: 'text-blue-500' },
    { id: 'obligations', title: t('contractAnalyzer.sections.obligations'), icon: Scale, prompt: 'List the key obligations and responsibilities of each party in this contract.', color: 'text-indigo-500' },
    { id: 'financial', title: t('contractAnalyzer.sections.financial'), icon: DollarSign, prompt: 'Extract all financial terms: payments, penalties, fees, deadlines, amounts.', color: 'text-emerald-500' },
    { id: 'risks', title: t('contractAnalyzer.sections.risks'), icon: AlertTriangle, prompt: 'Identify potential risks, unfavorable clauses, or areas of concern in this contract.', color: 'text-red-500' },
    { id: 'deadlines', title: t('contractAnalyzer.sections.deadlines'), icon: Clock, prompt: 'Extract all dates, deadlines, durations, renewal terms, and time-sensitive information.', color: 'text-amber-500' },
    { id: 'termination', title: t('contractAnalyzer.sections.termination'), icon: Users, prompt: 'Extract all termination conditions, notice periods, and exit clauses.', color: 'text-purple-500' },
  ];

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
      showToast(t('contractAnalyzer.success.loaded'), 'success');
    } catch {
      showToast(t('contractAnalyzer.errors.failedExtract'), 'error');
    } finally {
      setExtracting(false);
    }
  };

  const handleUpload = async (files: File[]) => {
    if (files.length > 0) await extractText(files[0]);
  };

  const runFullAnalysis = async () => {
    if (!pdfText || loading) return;

    const ok = await spendCredits('contract-analyzer');
    if (!ok) return;

    setLoading(true);
    setSections([]);
    try {
      const contextText = pdfText.length > 40000 ? pdfText.substring(0, 40000) + '\n...(truncated)' : pdfText;

      // Try Groq first — single structured call instead of 6 sequential ones
      if (import.meta.env.VITE_GROQ_API_KEY) {
        try {
          const analysisPrompt = `Analyze this contract and provide a structured analysis in EXACTLY these 6 sections, separated by "## SECTION:" markers:

## SECTION: Contract Overview
## SECTION: Key Obligations
## SECTION: Financial Terms
## SECTION: Risk Assessment
## SECTION: Deadlines & Duration
## SECTION: Termination Clauses

For each section, provide detailed analysis. Be thorough and specific.

Document:
${contextText}`;

          const result = await groqChat(
            [{ role: 'user', content: analysisPrompt }],
            { maxTokens: 8192, temperature: 0.2 }
          );

          // Parse the structured response
          const sectionParts = result.split(/## SECTION:\s*/);
          const parsedSections: AnalysisSection[] = [];
          const colors = ['blue', 'amber', 'emerald', 'red', 'purple', 'slate'];

          for (let i = 1; i < sectionParts.length && i <= 6; i++) {
            const title = ANALYSIS_SECTIONS[i - 1].title;
            parsedSections.push({
              title,
              icon: ANALYSIS_SECTIONS[i - 1].icon,
              content: sectionParts[i].trim(),
              color: colors[i - 1] as any,
            });
          }

          // If we got fewer than 6 sections, fill the rest from sequential calls
          if (parsedSections.length < 6) {
            const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            for (let i = parsedSections.length; i < 6; i++) {
              try {
                const sec = ANALYSIS_SECTIONS[i];
                const r = await model.generateContent(`${sec.prompt}\n\nDocument:\n\n${contextText}`);
                parsedSections.push({
                  title: sec.title, icon: sec.icon, content: r.response.text(), color: colors[i] as any,
                });
              } catch {
                parsedSections.push({
                  title: ANALYSIS_SECTIONS[i].title, icon: ANALYSIS_SECTIONS[i].icon,
                  content: t('contractAnalyzer.errors.failedSection'), color: colors[i] as any,
                });
              }
            }
          }

          setSections(parsedSections);
          showToast(t('contractAnalyzer.success.complete'), 'success');
          return;
        } catch (groqErr) {
          console.warn('Groq failed, falling back to Gemini:', groqErr);
        }
      }

      // Fallback: Gemini with 6 sequential calls
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        showToast(t('contractAnalyzer.errors.aiNotConfigured'), 'error');
        return;
      }

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const results: AnalysisSection[] = [];
      for (const sec of ANALYSIS_SECTIONS) {
        try {
          const result = await model.generateContent(
            `${sec.prompt}\n\nDocument:\n\n${contextText}`
          );
          results.push({ title: sec.title, icon: sec.icon, content: result.response.text(), color: sec.color });
          setSections([...results]);
        } catch {
          results.push({
            title: sec.title, icon: sec.icon,
            content: t('contractAnalyzer.errors.failedSection'), color: sec.color,
          });
        }
      }

      showToast(t('contractAnalyzer.success.complete'), 'success');
    } catch {
      showToast(t('contractAnalyzer.errors.failed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const copySection = (content: string) => {
    navigator.clipboard.writeText(content);
    showToast(t('contractAnalyzer.success.copied'), 'success');
  };

  const downloadReport = () => {
    const report = sections.map(s => `# ${s.title}\n\n${s.content}`).join('\n\n---\n\n');
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contract_analysis_${pdfName.replace('.pdf', '')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!pdfText) {
    return (
      <div className="bg-slate-50 dark:bg-[#020617] py-12 px-4 min-h-screen">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-600 rounded-full mb-6">
              <ShieldAlert className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-[2px]">{t('contractAnalyzer.badge')}</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">{t('contractAnalyzer.title')}</h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium text-lg max-w-2xl mx-auto">
              {t('contractAnalyzer.subtitle')}
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-1 shadow-2xl border border-slate-100 dark:border-slate-800">
            {extracting ? (
              <div className="p-20 flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-red-500 animate-spin mb-4" />
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{t('contractAnalyzer.extracting')}</p>
              </div>
            ) : (
              <ToolPage icon={ShieldAlert} title="" description="" color="bg-red-500" onProcess={handleUpload} hideContent={true} />
            )}
          </div>
        </div>
      </div>
    );
  }

  const activeSection = sections.find(s => s.title.toLowerCase().includes(activeTab)) || sections[0];

  return (
    <div className="bg-slate-50 dark:bg-[#020617] py-12 px-4 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t('contractAnalyzer.analysisTitle')}</h1>
          <p className="text-sm text-slate-400 mt-2">
            <FileText className="w-4 h-4 inline mr-1" />{pdfName}
          </p>
        </div>

        {sections.length === 0 && !loading ? (
          <div className="text-center">
            <button onClick={runFullAnalysis}
              className="px-10 py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-red-500/20 inline-flex items-center gap-3">
              <ShieldAlert className="w-4 h-4" /> {t('contractAnalyzer.runAnalysis')}
            </button>
            <p className="text-[10px] text-slate-400 mt-3">{t('contractAnalyzer.analysisInfo')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              {ANALYSIS_SECTIONS.map(sec => {
                const Icon = sec.icon;
                const sectionResult = sections.find(s => s.title === sec.title);
                return (
                  <button key={sec.id} onClick={() => setActiveTab(sec.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center gap-3 ${
                      activeTab === sec.id
                        ? 'bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-700'
                        : 'hover:bg-white/50 dark:hover:bg-slate-900/50'
                    }`}>
                    <Icon className={`w-4 h-4 ${sec.color} shrink-0`} />
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate">{sec.title}</span>
                    {sectionResult && <CheckCircle className="w-3 h-3 text-emerald-500 ml-auto shrink-0" />}
                  </button>
                );
              })}

              {sections.length > 0 && (
                <button onClick={downloadReport}
                  className="w-full mt-4 px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 flex items-center justify-center gap-2 transition-all">
                  <Download className="w-4 h-4" /> {t('contractAnalyzer.exportReport')}
                </button>
              )}
            </div>

            <div className="lg:col-span-3">
              {loading && sections.length < ANALYSIS_SECTIONS.length && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-8 mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
                    <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                      {t('contractAnalyzer.analyzing', { current: sections.length, total: ANALYSIS_SECTIONS.length })}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full transition-all duration-500"
                      style={{ width: `${(sections.length / ANALYSIS_SECTIONS.length) * 100}%` }} />
                  </div>
                </div>
              )}

              {activeSection ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">{activeSection.title}</h3>
                    <button onClick={() => copySection(activeSection.content)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                      <Copy className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                  <div className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {activeSection.content}
                  </div>
                </div>
              ) : !loading ? (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-12 text-center">
                  <ShieldAlert className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                  <p className="text-sm font-bold text-slate-400">{t('contractAnalyzer.emptyState')}</p>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
