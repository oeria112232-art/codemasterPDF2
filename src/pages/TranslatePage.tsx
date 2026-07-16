import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Languages, Loader2, Download, FileText, AlertTriangle,
    Globe, Zap, ShieldCheck, Sparkles, ArrowRight
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function TranslatePage() {
    const { t } = useTranslation();
    const { showToast } = useToast();
    const { user, loading } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [file, setFile] = useState<File | null>(null);
    const [sourceLang, setSourceLang] = useState('en');
    const [targetLang, setTargetLang] = useState('ar');
    const [translating, setTranslating] = useState(false);
    const [progress, setProgress] = useState('');
    const [result, setResult] = useState<string | null>(null);
    const [apiKey, setApiKey] = useState('');
    const [engine, setEngine] = useState<'gemini' | 'openai'>('gemini');

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            </div>
        );
    }

    if (!user) return <Navigate to="/login" />;

    const handleTranslate = async () => {
        if (!file) {
            showToast(t('toolPage.selectFile'), 'error');
            return;
        }

        const key = apiKey || (engine === 'gemini'
            ? import.meta.env.VITE_GEMINI_API_KEY
            : import.meta.env.VITE_OPENAI_API_KEY);

        if (!key) {
            showToast(t('tools.translatePdf.apiKeyMissing'), 'error');
            return;
        }

        setTranslating(true);
        setProgress(t('tools.translatePdf.extractingText'));

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfjsLib = await import('pdfjs-dist');
            const pdfWorker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
            pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker.default;

            const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
            const pages: string[] = [];

            for (let i = 1; i <= pdf.numPages; i++) {
                setProgress(t('tools.translatePdf.renderingPage', { page: i }));
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item: any) => item.str).join(' ');
                pages.push(pageText);
            }

            const fullText = pages.join('\n\n---PAGE_BREAK---\n\n');

            if (!fullText.trim()) {
                showToast(t('aiChat.noText'), 'error');
                setTranslating(false);
                return;
            }

            setProgress(t('tools.translatePdf.translatingPage', { current: 1, total: 1 }));

            let translatedText = '';

            if (engine === 'gemini') {
                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{
                                parts: [{
                                    text: `Translate the following text from ${sourceLang === 'en' ? 'English' : 'Arabic'} to ${targetLang === 'ar' ? 'Arabic' : 'English'}. Preserve the formatting, line breaks, and structure. Keep technical terms accurate. Only return the translated text, nothing else.\n\nText:\n${fullText.slice(0, 30000)}`
                                }]
                            }]
                        })
                    }
                );

                if (!response.ok) throw new Error('Translation API error');
                const data = await response.json();
                translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            } else {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${key}`,
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [{
                            role: 'user',
                            content: `Translate the following text from ${sourceLang === 'en' ? 'English' : 'Arabic'} to ${targetLang === 'ar' ? 'Arabic' : 'English'}. Preserve formatting and structure. Only return the translated text.\n\n${fullText.slice(0, 30000)}`
                        }],
                        temperature: 0.3,
                    }),
                });

                if (!response.ok) throw new Error('Translation API error');
                const data = await response.json();
                translatedText = data.choices?.[0]?.message?.content || '';
            }

            if (!translatedText) {
                showToast(t('common.error'), 'error');
                setTranslating(false);
                return;
            }

            const blob = new Blob([translatedText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            setResult(url);
            setProgress(t('tools.translatePdf.translationSuccess'));
            showToast(t('tools.translatePdf.translationSuccess'), 'success');

        } catch (err: any) {
            console.error('Translation error:', err);
            showToast(err.message || t('common.error'), 'error');
        } finally {
            setTranslating(false);
        }
    };

    const handleDownload = () => {
        if (!result) return;
        const a = document.createElement('a');
        a.href = result;
        a.download = `translated_${file?.name || 'document'}.txt`;
        a.click();
    };

    return (
        <div className="bg-[#f8fafc] dark:bg-[#020617] transition-colors duration-700 pt-32 pb-20 min-h-screen">
            <div className="max-w-4xl mx-auto px-6">

                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-600 rounded-full mb-6">
                        <Languages className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-[2px]">{t('tools.translatePdf.title')}</span>
                    </div>
                    <h1 className="text-4xl lg:text-5xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
                        {t('tools.translatePdf.title')}
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-lg max-w-2xl mx-auto">
                        {t('tools.translatePdf.description')}
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-8">

                    {/* Engine Selection */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{t('tools.translatePdf.engineSelect')}</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setEngine('gemini')}
                                className={`p-4 rounded-xl border-2 transition-all text-left ${engine === 'gemini' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                            >
                                <p className="font-black text-sm">{t('tools.translatePdf.gemini')}</p>
                            </button>
                            <button
                                onClick={() => setEngine('openai')}
                                className={`p-4 rounded-xl border-2 transition-all text-left ${engine === 'openai' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-500/10' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                            >
                                <p className="font-black text-sm">{t('tools.translatePdf.openai')}</p>
                            </button>
                        </div>
                    </div>

                    {/* API Key */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            {engine === 'gemini' ? t('tools.translatePdf.geminiKeyLabel') : t('tools.translatePdf.openaiKeyLabel')}
                        </label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder={engine === 'gemini' ? t('tools.translatePdf.geminiKeyPlaceholder') : t('tools.translatePdf.openaiKeyPlaceholder')}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-600 transition-all text-slate-900 dark:text-white"
                        />
                    </div>

                    {/* Language Selection */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('tools.translatePdf.sourceLang')}</label>
                            <select
                                value={sourceLang}
                                onChange={(e) => {
                                    setSourceLang(e.target.value);
                                    setTargetLang(e.target.value === 'en' ? 'ar' : 'en');
                                }}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:border-indigo-600 transition-all text-slate-900 dark:text-white"
                            >
                                <option value="en">{t('tools.translatePdf.english')}</option>
                                <option value="ar">{t('tools.translatePdf.arabic')}</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('tools.translatePdf.targetLang')}</label>
                            <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white">
                                {targetLang === 'ar' ? t('tools.translatePdf.arabic') : t('tools.translatePdf.english')}
                            </div>
                        </div>
                    </div>

                    {/* File Upload */}
                    <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{t('upload.selectFiles')}</label>
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${file ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/5' : 'border-slate-200 dark:border-slate-700 hover:border-indigo-400'}`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf"
                                className="hidden"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                            />
                            {file ? (
                                <div className="flex items-center justify-center gap-3">
                                    <FileText className="w-8 h-8 text-emerald-500" />
                                    <div className="text-left">
                                        <p className="font-black text-sm text-slate-900 dark:text-white">{file.name}</p>
                                        <p className="text-[10px] text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <FileText className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                                    <p className="text-sm text-slate-500">{t('upload.dragDrop')}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Translate Button */}
                    <button
                        onClick={handleTranslate}
                        disabled={translating || !file}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/20"
                    >
                        {translating ? (
                            <><Loader2 className="w-5 h-5 animate-spin" /> {progress || t('tools.translatePdf.translating')}</>
                        ) : (
                            <><Languages className="w-5 h-5" /> {t('tools.translatePdf.translateButton')}</>
                        )}
                    </button>

                    {/* Progress */}
                    {translating && progress && (
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl border border-indigo-200 dark:border-indigo-800">
                            <div className="flex items-center gap-3">
                                <Loader2 className="w-4 h-4 text-indigo-600 animate-spin" />
                                <p className="text-sm text-indigo-600 font-medium">{progress}</p>
                            </div>
                        </div>
                    )}

                    {/* Result */}
                    {result && (
                        <div className="p-6 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                                        <Zap className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                        <p className="font-black text-sm text-emerald-700 dark:text-emerald-400">{t('tools.translatePdf.translationSuccess')}</p>
                                        <p className="text-[10px] text-emerald-600/60">{file?.name}</p>
                                    </div>
                                </div>
                                <button
                                    onClick={handleDownload}
                                    className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2"
                                >
                                    <Download className="w-4 h-4" /> {t('tools.translatePdf.downloadButton')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Features */}
                <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="flex gap-4">
                        <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center shrink-0 shadow-lg border border-slate-100 dark:border-slate-800">
                            <ShieldCheck className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div>
                            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1">{t('tools.compress.privacyFirst')}</h4>
                            <p className="text-[11px] text-slate-400 font-medium">{t('tools.compress.privacyDesc')}</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center shrink-0 shadow-lg border border-slate-100 dark:border-slate-800">
                            <Globe className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div>
                            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1">{t('tools.translatePdf.english')} ⇄ {t('tools.translatePdf.arabic')}</h4>
                            <p className="text-[11px] text-slate-400 font-medium">Bilingual translation support</p>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center shrink-0 shadow-lg border border-slate-100 dark:border-slate-800">
                            <Sparkles className="w-5 h-5 text-indigo-500" />
                        </div>
                        <div>
                            <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-1">{t('tools.convert.ultraFast')}</h4>
                            <p className="text-[11px] text-slate-400 font-medium">Powered by latest AI models</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
