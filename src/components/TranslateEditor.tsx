import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
    X, Loader2, Languages, Download, Key, Sparkles, CheckCircle2, AlertCircle, Layout, ArrowRightLeft, Cpu
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from 'react-i18next';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface TranslateEditorProps {
    file: File;
    onClose: () => void;
}

export function TranslateEditor({ file, onClose }: TranslateEditorProps) {
    const { t } = useTranslation();
    const { showToast } = useToast();

    // AI Engine selection
    const [engine, setEngine] = useState<'gemini' | 'openai'>('gemini');

    // Configuration states
    const [sourceLang, setSourceLang] = useState<'auto' | 'en' | 'ar'>('auto');
    const [targetLang, setTargetLang] = useState<'en' | 'ar'>('ar');
    const [fontSize, setFontSize] = useState<number>(15);
    const [lineHeight, setLineHeight] = useState<number>(1.6);
    
    // Proxy configuration
    const [useProxy, setUseProxy] = useState<boolean>(() => {
        return localStorage.getItem('user_gemini_use_proxy') === 'true';
    });

    const handleProxyToggle = (val: boolean) => {
        setUseProxy(val);
        localStorage.setItem('user_gemini_use_proxy', String(val));
    };

    // Custom API Keys
    const [customGeminiKey, setCustomGeminiKey] = useState<string>(() => {
        return localStorage.getItem('user_gemini_api_key') || '';
    });
    const [customOpenAiKey, setCustomOpenAiKey] = useState<string>(() => {
        return localStorage.getItem('user_openai_api_key') || '';
    });

    // Processing states
    const [loading, setLoading] = useState(true);
    const [totalPages, setTotalPages] = useState<number>(0);
    const [processing, setProcessing] = useState(false);
    const [currentStep, setCurrentStep] = useState<string>('');
    const [progress, setProgress] = useState<number>(0);
    const [translatedHtml, setTranslatedHtml] = useState<string>('');
    const [pdfProxy, setPdfProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);

    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Get active API key based on engine selection
    const getActiveKey = () => {
        if (engine === 'gemini') {
            return customGeminiKey || import.meta.env.VITE_GEMINI_API_KEY || '';
        } else {
            return customOpenAiKey || import.meta.env.VITE_OPENAI_API_KEY || '';
        }
    };

    // Save key to local storage
    const handleGeminiKeyChange = (key: string) => {
        setCustomGeminiKey(key);
        localStorage.setItem('user_gemini_api_key', key);
    };

    const handleOpenAiKeyChange = (key: string) => {
        setCustomOpenAiKey(key);
        localStorage.setItem('user_openai_api_key', key);
    };

    // Initialize PDF document on mount
    useEffect(() => {
        const loadPdf = async () => {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) });
                const pdf = await loadingTask.promise;
                setPdfProxy(pdf);
                setTotalPages(pdf.numPages);
                setLoading(false);
            } catch (err: any) {
                console.error("Error loading PDF:", err);
                showToast(t('tools.split.splitError') || "Failed to load PDF file", 'error');
                onClose();
            }
        };
        loadPdf();
    }, [file, onClose, showToast, t]);

    // Robust Gemini translation helper with automatic retries and exponential backoff on 429 rate limits
    const callGeminiWithRetry = async (
        genAI: any,
        modelName: string,
        requestOptions: any,
        prompt: string,
        systemInstruction: string,
        imageParts: any[] = [],
        maxRetries = 15
    ): Promise<any> => {
        let lastError: any = null;
        const defaultWait = 60000; // 60s fallback to clear minute limits safely

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const model = genAI.getGenerativeModel({ 
                    model: modelName,
                    generationConfig: {
                        temperature: 0.3
                    }
                }, requestOptions);

                const response = await model.generateContent([
                    ...imageParts,
                    { text: `System Instruction: ${systemInstruction}\n\n${prompt}` }
                ]);
                return response;
            } catch (error: any) {
                lastError = error;
                const errorStr = (
                    (error.message ? String(error.message) : '') + ' ' + 
                    (error.status ? String(error.status) : '') + ' ' + 
                    (error.statusText ? String(error.statusText) : '') + ' ' + 
                    String(error)
                ).toLowerCase();
                
                const isRateLimit = errorStr.includes('429') || 
                                    errorStr.includes('quota') || 
                                    errorStr.includes('limit') || 
                                    errorStr.includes('resource_exhausted') || 
                                    errorStr.includes('too many requests');
                
                if (isRateLimit && attempt < maxRetries) {
                    let waitTime = defaultWait;
                    const match = errorStr.match(/retry in ([\d\.]+)\s*s/);
                    if (match && match[1]) {
                        // Add 3.0s safety margin to the parsed wait time to ensure rolling window clears
                        waitTime = Math.ceil(parseFloat(match[1]) + 3.0) * 1000;
                    }
                    
                    console.warn(`Rate limit hit (attempt ${attempt}/${maxRetries}). Waiting ${waitTime / 1000}s before retrying...`);
                    
                    // Display friendly localized waiting message
                    const waitSeconds = Math.round(waitTime / 1000);
                    setCurrentStep(t('tools.translatePdf.rateLimitWait', { seconds: waitSeconds }) || `Rate limit reached. Waiting ${waitSeconds}s before retrying...`);
                    
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    continue;
                }
                
                throw error;
            }
        }
        throw lastError;
    };

    // Handle translation process
    const handleTranslate = async () => {
        const apiKey = getActiveKey();
        if (!apiKey) {
            showToast(t('tools.translatePdf.apiKeyMissing') || "Please enter an API Key for the selected engine.", 'error');
            return;
        }

        if (!pdfProxy) return;

        setProcessing(true);
        setProgress(0);
        setTranslatedHtml('');

        // Use a local variable to maintain proxy status synchronously throughout the page loop
        let activeUseProxy = useProxy;

        const buildFullHtmlDoc = (pages: string[]) => {
            const isTargetAr = targetLang === 'ar';
            return `
                <!DOCTYPE html>
                <html dir="${targetDir}">
                <head>
                    <meta charset="utf-8">
                    <title>Translated PDF</title>
                    <style>
                        body {
                            margin: 0;
                            padding: 0;
                            background-color: #f8fafc;
                        }
                        .page-container {
                            max-width: 210mm;
                            margin: 0 auto 30px;
                            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
                            border: 1px solid #e2e8f0;
                            border-radius: 8px;
                            overflow: hidden;
                        }
                        @media print {
                            body {
                                background-color: #ffffff;
                            }
                            .page-container {
                                margin: 0;
                                box-shadow: none;
                                border: none;
                                border-radius: 0;
                            }
                        }
                        h1, h2, h3, h4 {
                            color: #0f172a;
                            font-weight: 800;
                            margin-top: 0;
                            margin-bottom: 15px;
                            letter-spacing: -0.025em;
                        }
                        h1 { font-size: 2.25em; }
                        h2 { font-size: 1.75em; border-bottom: 2px solid #f1f5f9; padding-bottom: 6px; }
                        h3 { font-size: 1.4em; }
                        p {
                            margin-top: 0;
                            margin-bottom: 18px;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin: 20px 0;
                            font-size: 0.95em;
                        }
                        th, td {
                            border: 1px solid #cbd5e1;
                            padding: 10px 12px;
                            text-align: ${isTargetAr ? 'right' : 'left'};
                        }
                        th {
                            background-color: #f8fafc;
                            font-weight: 700;
                            color: #334155;
                        }
                        tr:nth-child(even) {
                            background-color: rgba(248, 250, 252, 0.5);
                        }
                        ul, ol {
                            margin-top: 0;
                            margin-bottom: 20px;
                            padding-left: ${isTargetAr ? '0' : '24px'};
                            padding-right: ${isTargetAr ? '24px' : '0'};
                        }
                        li {
                            margin-bottom: 8px;
                        }
                    </style>
                </head>
                <body>
                    ${pages.join('\n')}
                </body>
                </html>
            `;
        };

        try {
            const pageHtmls: string[] = [];
            const targetDir = targetLang === 'ar' ? 'rtl' : 'ltr';
            const langName = targetLang === 'ar' ? 'Arabic' : 'English';
            const sourceLabel = sourceLang === 'auto' ? 'Auto Detect' : sourceLang === 'en' ? 'English' : 'Arabic';

            // Loop through pages
            for (let pageNum = 1; pageNum <= pdfProxy.numPages; pageNum++) {
                setCurrentStep(t('tools.translatePdf.renderingPage', { page: pageNum }) || `Rendering page ${pageNum} to image...`);
                const page = await pdfProxy.getPage(pageNum);
                
                // Render page to canvas - scale 1.0 and quality 0.7 for fast compression and transfer
                const viewport = page.getViewport({ scale: 1.0 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                if (!context) {
                    throw new Error("Could not create 2D context for canvas rendering");
                }

                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;

                const base64Image = canvas.toDataURL('image/jpeg', 0.7).split(',')[1];

                setCurrentStep(t('tools.translatePdf.translatingPage', { current: pageNum, total: pdfProxy.numPages }) || `Translating page ${pageNum} of ${pdfProxy.numPages}...`);

                // Call Selected AI Engine for translation and structured HTML output
                const prompt = `You are a professional educational assessment and translation AI.
Translate all text in this document page image from ${sourceLabel} to ${langName}.
The target language text direction is strictly ${targetDir}.

CRITICAL REQUIREMENTS:
1. Translate all text professionally, keeping the tone, layout hierarchy, tables, headings, and lists intact.
2. Output ONLY clean, valid, standard HTML inside the body wrapper. Do NOT wrap the code in a markdown code block (like \`\`\`html). Output only the raw HTML code.
3. Group the translated content logically:
   - Use \`<h1>\`, \`<h2>\`, or \`<h3>\` for page titles and headers.
   - Use \`<p>\` for body paragraphs.
   - Use \`<ul>\`, \`<ol>\`, \`<li>\` for lists.
   - Use \`<table style="width:100%; border-collapse:collapse; margin:15px 0;">\`, \`<tr>\`, \`<td>\` for tables. Add thin borders style to cells (\`border:1px solid #e2e8f0; padding:8px;\`).
4. Keep the output clean, without any comments, notes, or wrapper explanations.`;

                let htmlResult = '';

                try {
                    if (engine === 'gemini') {
                        const genAI = new GoogleGenerativeAI(apiKey);
                        let response;
                        const sysInstruction = "You are a professional translator and document layout designer. Translate the text in the image and format it into clean HTML structure matching the visual paragraphs of the original.";
                        const fullPrompt = prompt;
                        const imageParts = [
                            {
                                inlineData: {
                                    data: base64Image,
                                    mimeType: "image/jpeg"
                                }
                            }
                        ];
                        
                        try {
                            const requestOptions = activeUseProxy 
                                ? { 
                                    baseUrl: 'https://corsproxy.io/?url=https://generativelanguage.googleapis.com',
                                    apiVersion: 'v1'
                                  }
                                : { apiVersion: 'v1' };
                            
                            response = await callGeminiWithRetry(
                                genAI,
                                "gemini-2.5-flash",
                                requestOptions,
                                fullPrompt,
                                sysInstruction,
                                imageParts
                            );
                        } catch (fetchError: any) {
                            const errorStr = String(fetchError.message || fetchError);
                            const errorStrLower = errorStr.toLowerCase();
                            
                            // Check if it is a genuine connection block/network issue (exclude 429 rate limit or quota errors)
                            const isFetchError = (
                                errorStrLower.includes('failed to fetch') || 
                                errorStrLower.includes('typeerror: failed to fetch') ||
                                errorStrLower.includes('networkerror') ||
                                errorStrLower.includes('403') ||
                                errorStrLower.includes('404') ||
                                errorStrLower.includes('not found')
                            ) && 
                            !errorStrLower.includes('429') && 
                            !errorStrLower.includes('quota') && 
                            !errorStrLower.includes('limit') && 
                            !errorStrLower.includes('exhausted');
                            
                            if (isFetchError && !activeUseProxy) {
                                console.warn("Direct connection to Gemini failed or model not found. Retrying via proxy connection...");
                                activeUseProxy = true;
                                handleProxyToggle(true);
                                
                                const proxyOptions = { 
                                    baseUrl: 'https://corsproxy.io/?url=https://generativelanguage.googleapis.com',
                                    apiVersion: 'v1'
                                };
                                
                                response = await callGeminiWithRetry(
                                    genAI,
                                    "gemini-2.5-flash",
                                    proxyOptions,
                                    fullPrompt,
                                    sysInstruction,
                                    imageParts
                                );
                            } else {
                                throw fetchError;
                            }
                        }

                        htmlResult = response.response?.text ? response.response.text().trim() : response.text().trim();
                    } else {
                        let response;
                        try {
                            const openai = new OpenAI({ 
                                apiKey, 
                                baseURL: activeUseProxy ? 'https://corsproxy.io/?url=https://api.openai.com/v1' : undefined,
                                dangerouslyAllowBrowser: true 
                        });
                        response = await openai.chat.completions.create({
                            model: "gpt-4o-mini",
                            messages: [
                                { role: "system", content: "You are a professional translator and document layout designer. Translate the text in the image and format it into clean HTML structure matching the visual paragraphs of the original." },
                                {
                                    role: "user",
                                    content: [
                                        { type: "text", text: prompt },
                                        {
                                            type: "image_url",
                                            image_url: {
                                                url: `data:image/jpeg;base64,${base64Image}`
                                            }
                                        }
                                    ]
                                }
                            ],
                            temperature: 0.3
                        });
                    } catch (fetchError: any) {
                        const errorStr = String(fetchError.message || fetchError);
                        const isFetchError = errorStr.includes('Failed to fetch') || 
                                             errorStr.includes('fetch') || 
                                             errorStr.includes('TypeError: Failed to fetch') ||
                                             errorStr.includes('NetworkError');
                        
                        if (isFetchError && !activeUseProxy) {
                            console.warn("Direct connection to OpenAI failed. Retrying via proxy connection...");
                            activeUseProxy = true;
                            handleProxyToggle(true);
                            
                            const openai = new OpenAI({ 
                                apiKey, 
                                baseURL: 'https://corsproxy.io/?url=https://api.openai.com/v1',
                                dangerouslyAllowBrowser: true 
                            });
                            response = await openai.chat.completions.create({
                                model: "gpt-4o-mini",
                                messages: [
                                    { role: "system", content: "You are a professional translator and document layout designer. Translate the text in the image and format it into clean HTML structure matching the visual paragraphs of the original." },
                                    {
                                        role: "user",
                                        content: [
                                            { type: "text", text: prompt },
                                            {
                                                type: "image_url",
                                                image_url: {
                                                    url: `data:image/jpeg;base64,${base64Image}`
                                                }
                                            }
                                        ]
                                    }
                                ],
                                temperature: 0.3
                            });
                        } else {
                            throw fetchError;
                        }
                    }

                        htmlResult = response.choices[0]?.message?.content?.trim() || '';
                    }
                } catch (err: any) {
                    console.error(`Page ${pageNum} translation failed:`, err);
                    showToast(t('tools.translatePdf.pageFailed', { page: pageNum }) || `Failed to translate page ${pageNum}. Retaining placeholder.`, 'warning');
                    
                    htmlResult = `
                        <div style="padding: 20px; border: 2px dashed #f43f5e; border-radius: 8px; background: #fff1f2; color: #9f1239; font-family: sans-serif; text-align: center; margin: 20px 0;">
                            <h3 style="margin-top: 0; color: #e11d48;">Translation Error (صفحة غير مترجمة)</h3>
                            <p>This page failed to translate due to API limits or connection timeout. (فشلت ترجمة هذه الصفحة بسبب قيود الاتصال أو انتهاء الوقت)</p>
                            <p style="font-size: 11px; color: #f43f5e; margin-bottom: 0;">Error: ${err.message || err}</p>
                        </div>
                    `;
                }
                
                // Clean up any markdown wrapper blocks if the AI accidentally generated them
                if (htmlResult.startsWith('```html')) {
                    htmlResult = htmlResult.replace(/^```html/, '').replace(/```$/, '').trim();
                } else if (htmlResult.startsWith('```')) {
                    htmlResult = htmlResult.replace(/^```/, '').replace(/```$/, '').trim();
                }

                // Add to list of page HTMLs with standard container styles
                pageHtmls.push(`
                    <div class="page-container" style="page-break-after: always; padding: 25mm 20mm; min-height: 297mm; background: white; box-sizing: border-box; position: relative;">
                        <div class="page-header" style="position: absolute; top: 10mm; left: 20mm; right: 20mm; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; font-weight: bold; font-family: sans-serif; text-transform: uppercase; letter-spacing: 1px;">
                            <span>Translated Document (${engine.toUpperCase()})</span>
                            <span>Page ${pageNum} of ${pdfProxy.numPages}</span>
                        </div>
                        <div class="page-content" style="margin-top: 10mm; direction: ${targetDir}; text-align: ${targetDir === 'rtl' ? 'right' : 'left'}; line-height: ${lineHeight}; font-size: ${fontSize}px; font-family: ${targetLang === 'ar' ? 'Arial, sans-serif' : 'system-ui, sans-serif'}; color: #1e293b;">
                            ${htmlResult}
                        </div>
                    </div>
                `);

                setProgress((pageNum / pdfProxy.numPages) * 100);

                // Update the preview dynamically so the user sees translation in real-time
                const currentHtmlDoc = buildFullHtmlDoc(pageHtmls);
                setTranslatedHtml(currentHtmlDoc);

                // Wait a safe duration between pages to avoid API rate limit hits
                if (pageNum < pdfProxy.numPages) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            showToast(t('tools.translatePdf.translationSuccess') || "PDF translated successfully!", 'success');
        } catch (error: any) {
            console.error("Translation Error:", error);
            showToast(error.message || t('common.error'), 'error');
        } finally {
            setProcessing(false);
            setCurrentStep('');
        }
    };

    // Download compiled PDF using html2pdf
    const handleDownload = async () => {
        if (!translatedHtml) return;

        try {
            showToast(t('tools.split.largeFile') || "Compiling layout, please wait...", 'info');
            
            const iframe = iframeRef.current;
            if (!iframe || !iframe.contentWindow) return;

            const body = iframe.contentWindow.document.body;
            
            // Adjust options for print output matching A4 dimensions perfectly
            const opt = {
                margin: 0,
                filename: `translated_${file.name}`,
                image: { type: 'jpeg' as const, quality: 0.98 },
                html2canvas: { 
                    scale: 2.5, 
                    useCORS: true, 
                    windowWidth: 794, // 210mm in pixels at 96 dpi is ~794px
                    window: iframe.contentWindow 
                },
                jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
                pagebreak: { mode: ['avoid-all', 'css', 'legacy'] as any }
            };

            await html2pdf().set(opt).from(body).save();
            showToast(t('editor.exportSuccess') || "Document exported successfully!", 'success');
        } catch (error: any) {
            console.error("Error creating PDF:", error);
            showToast(t('editor.critError') || "Critical Error during PDF finalization.", 'error');
        }
    };

    // Update target language swap helper
    const handleSwapLanguages = () => {
        if (sourceLang === 'auto') {
            setSourceLang(targetLang === 'ar' ? 'en' : 'ar');
            setTargetLang(targetLang === 'ar' ? 'en' : 'ar');
        } else {
            const currentSource = sourceLang;
            setSourceLang(targetLang);
            setTargetLang(currentSource);
        }
    };


    return (
        <div className="fixed inset-0 z-[100] bg-slate-50 dark:bg-[#020617] flex flex-col font-sans overflow-hidden animate-in fade-in duration-300">
            <div className="w-full h-full bg-white dark:bg-slate-900 flex flex-col overflow-hidden">
                {/* Header - Compact 16 height to match convert editor */}
                <header className="h-16 px-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-4">
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-all">
                            <X className="w-5 h-5" />
                        </button>
                        <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 mx-2" />
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                                <Languages className="w-5 h-5 animate-pulse" />
                            </div>
                            <div className="flex flex-col">
                                <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-[400px]" dir="ltr">
                                    {file.name}
                                </h2>
                                <span className="text-[10px] text-slate-400 font-medium">
                                    {(file.size / (1024 * 1024)).toFixed(2)} MB · {totalPages} Pages
                                </span>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 flex flex-col lg:flex-row min-h-0">
                    {/* Left Sidebar (Settings) - RTL aware borders */}
                    <aside className="w-full lg:w-96 border-b lg:border-b-0 ltr:lg:border-r rtl:lg:border-l border-slate-200 dark:border-slate-800 p-8 flex flex-col gap-6 overflow-y-auto shrink-0 bg-white dark:bg-slate-900">
                        {/* AI Engine Selection */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                <Cpu className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                                    {t('tools.translatePdf.engineSelect') || "AI Engine"}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => setEngine('gemini')}
                                    className={`py-3 px-4 rounded-xl border-2 font-bold text-xs transition-all ${
                                        engine === 'gemini'
                                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                                            : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {t('tools.translatePdf.gemini') || "Gemini"}
                                </button>
                                <button
                                    onClick={() => setEngine('openai')}
                                    className={`py-3 px-4 rounded-xl border-2 font-bold text-xs transition-all ${
                                        engine === 'openai'
                                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                                            : 'bg-slate-50 dark:bg-slate-800 border-transparent text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {t('tools.translatePdf.openai') || "OpenAI GPT"}
                                </button>
                            </div>
                        </div>

                        {/* API Key Panel */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                <Key className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                                    {engine === 'gemini' 
                                        ? (t('tools.translatePdf.geminiKeyLabel') || "Gemini API Key")
                                        : (t('tools.translatePdf.openaiKeyLabel') || "OpenAI API Key")
                                    }
                                </span>
                            </div>
                            {engine === 'gemini' ? (
                                <input
                                    type="password"
                                    value={customGeminiKey}
                                    onChange={(e) => handleGeminiKeyChange(e.target.value)}
                                    placeholder={t('tools.translatePdf.geminiKeyPlaceholder') || "AIzaSy... (Optional if in .env)"}
                                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl outline-none transition-all font-medium text-slate-900 dark:text-white placeholder-slate-400 text-sm shadow-inner"
                                />
                            ) : (
                                <input
                                    type="password"
                                    value={customOpenAiKey}
                                    onChange={(e) => handleOpenAiKeyChange(e.target.value)}
                                    placeholder={t('tools.translatePdf.openaiKeyPlaceholder') || "sk-... (Optional if in .env)"}
                                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl outline-none transition-all font-medium text-slate-900 dark:text-white placeholder-slate-400 text-sm shadow-inner"
                                />
                            )}
                            
                            {/* Proxy Toggle Option */}
                            <div className="space-y-2 mt-2 p-1">
                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={useProxy}
                                        onChange={(e) => handleProxyToggle(e.target.checked)}
                                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        {t('tools.translatePdf.useProxy') || "Use Proxy Connection"}
                                    </span>
                                </label>
                                <p className="text-[10px] text-slate-400 leading-normal font-medium">
                                    {t('tools.translatePdf.useProxyDesc') || "Routes requests through a proxy to bypass local network restrictions (Recommended for Middle East/Restricted regions)."}
                                </p>
                            </div>

                            {!getActiveKey() && (
                                <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 shrink-0" />
                                    <span>{t('tools.translatePdf.apiKeyMissing') || "API key is required to start translating."}</span>
                                </div>
                            )}
                        </div>

                        {/* Languages Selection */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                <ArrowRightLeft className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                                    Language Settings
                                </span>
                            </div>
                            <div className="flex flex-col gap-3">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                                        {t('tools.translatePdf.sourceLang') || "Source Language"}
                                    </label>
                                    <select
                                        value={sourceLang}
                                        onChange={(e) => setSourceLang(e.target.value as any)}
                                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl outline-none transition-all font-bold text-slate-900 dark:text-white text-sm"
                                    >
                                        <option value="auto">{t('tools.translatePdf.autoDetect') || "Auto-Detect"}</option>
                                        <option value="en">{t('tools.translatePdf.english') || "English"}</option>
                                        <option value="ar">{t('tools.translatePdf.arabic') || "Arabic"}</option>
                                    </select>
                                </div>

                                <div className="flex justify-center py-1">
                                    <button
                                        onClick={handleSwapLanguages}
                                        className="p-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 rounded-full transition-all active:scale-95 shadow-sm"
                                        title="Swap Languages"
                                    >
                                        <ArrowRightLeft className="w-4 h-4 rotate-90 lg:rotate-0" />
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                                        {t('tools.translatePdf.targetLang') || "Target Language"}
                                    </label>
                                    <select
                                        value={targetLang}
                                        onChange={(e) => setTargetLang(e.target.value as any)}
                                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl outline-none transition-all font-bold text-slate-900 dark:text-white text-sm"
                                    >
                                        <option value="ar">{t('tools.translatePdf.arabic') || "Arabic"}</option>
                                        <option value="en">{t('tools.translatePdf.english') || "English"}</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Layout Configurations */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                                <Layout className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                                    {t('tools.translatePdf.layoutSettings') || "Layout Settings"}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                                        {t('tools.translatePdf.fontSize') || "Font Size"}
                                    </label>
                                    <select
                                        value={fontSize}
                                        onChange={(e) => setFontSize(Number(e.target.value))}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl outline-none transition-all font-bold text-slate-900 dark:text-white text-xs"
                                    >
                                        <option value={12}>{t('tools.translatePdf.small') || "Small (12px)"}</option>
                                        <option value={15}>{t('tools.translatePdf.normal') || "Normal (15px)"}</option>
                                        <option value={18}>{t('tools.translatePdf.large') || "Large (18px)"}</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                                        {t('tools.translatePdf.lineHeight') || "Line Height"}
                                    </label>
                                    <select
                                        value={lineHeight}
                                        onChange={(e) => setLineHeight(Number(e.target.value))}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl outline-none transition-all font-bold text-slate-900 dark:text-white text-xs"
                                    >
                                        <option value={1.3}>{t('tools.translatePdf.small') || "Tight (1.3)"}</option>
                                        <option value={1.6}>{t('tools.translatePdf.normal') || "Normal (1.6)"}</option>
                                        <option value={2.0}>{t('tools.translatePdf.large') || "Double (2.0)"}</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Process Button */}
                        <div className="mt-auto pt-6">
                            <button
                                onClick={handleTranslate}
                                disabled={processing || loading}
                                className={`w-full py-4.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-xl ${
                                    processing || loading
                                        ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 active:scale-95'
                                }`}
                            >
                                {processing ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Sparkles className="w-5 h-5" />
                                )}
                                {processing ? t('tools.translatePdf.translating') || "Translating..." : t('tools.translatePdf.translateButton') || "Translate PDF"}
                            </button>
                        </div>
                    </aside>

                    {/* Main Workspace (Preview) */}
                    <main className="flex-1 p-8 bg-slate-50 dark:bg-[#020617]/50 flex flex-col gap-6 overflow-hidden">
                        {loading ? (
                            <div className="flex-1 flex flex-col items-center justify-center gap-4">
                                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Initializing PDF Context...</p>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col min-h-0 animate-in fade-in duration-300">
                                {/* Progress header during translation */}
                                {processing && (
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-3 shadow-md shrink-0 mb-4">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider truncate max-w-[80vw]">
                                                    {currentStep}
                                                </span>
                                            </div>
                                            <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">{progress.toFixed(0)}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                                            <div 
                                                className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                                                style={{ width: `${progress}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}

                                {/* Main workspace area showing preview and download */}
                                {translatedHtml ? (
                                    <div className="flex-1 flex flex-col min-h-0">
                                        <div className="flex justify-between items-center mb-4 shrink-0 px-2">
                                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                                {processing ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                                                        <span>Translating & Previewing (Real-time)</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                        <span>{t('tools.translatePdf.previewTitle') || "Translated Preview"}</span>
                                                    </>
                                                )}
                                            </h3>
                                            <button
                                                onClick={handleDownload}
                                                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20 active:scale-95 flex items-center gap-2"
                                            >
                                                <Download className="w-4 h-4" /> {t('tools.translatePdf.downloadButton') || "Download File"}
                                            </button>
                                        </div>

                                        <div className="flex-1 bg-slate-200 dark:bg-slate-950 p-6 rounded-[2.5rem] overflow-y-auto border border-slate-300 dark:border-slate-900 custom-scrollbar flex justify-center">
                                            <iframe
                                                ref={iframeRef}
                                                srcDoc={translatedHtml}
                                                className="w-full max-w-[210mm] min-h-[842px] border-none bg-white rounded-lg shadow-2xl"
                                                title="PDF Translation Preview"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    // Show file detail landing page
                                    <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center p-12 text-center shadow-lg max-w-3xl mx-auto w-full">
                                        <div className="w-24 h-24 bg-indigo-55 dark:bg-indigo-950/20 rounded-[2.5rem] flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-8 shadow-inner shadow-indigo-600/10">
                                            <Languages className="w-12 h-12" />
                                        </div>
                                        <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4">
                                            {t('tools.translatePdf.title') || "Translate PDF"}
                                        </h3>
                                        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto font-medium leading-relaxed mb-8">
                                            {t('tools.translatePdf.description') || "Translate your PDF files page by page with full layout preservation. Connect your Gemini or OpenAI API Key and configure settings in the sidebar to begin."}
                                        </p>

                                        <div className="grid grid-cols-2 gap-8 w-full max-w-md border-t border-slate-100 dark:border-slate-800 pt-8 text-right">
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filename</span>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{file.name}</p>
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Pages</span>
                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{totalPages}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}
