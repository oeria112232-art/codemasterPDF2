import React, { useEffect, useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
    X, Loader2, FileText, Image as ImageIcon,
    Settings2, RefreshCw, Trash2, Plus, GripVertical, Globe, RefreshCcw, Download
} from 'lucide-react';
import { PDFDocument, StandardFonts } from '@cantoo/pdf-lib';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { Document as DocxDocument, Packer, Paragraph, TextRun, PageBreak, ImageRun } from 'docx';
import * as XLSX from 'xlsx';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from 'react-i18next';
// @ts-ignore
import mammoth from 'mammoth';
import Tesseract from 'tesseract.js';
// @ts-ignore
import PptxGenJS from 'pptxgenjs';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface ConvertEditorProps {
    files: File[];
    toolType: string;
    onClose: () => void;
    defaultUrl?: string; // For Web to PDF url mode
}

interface ImageFile {
    id: string;
    file: File;
    preview: string;
}

// Sub-component for rendering PDF thumbnails
const PdfPageThumbnail = ({ pageNum, pdfProxy, quality }: { pageNum: number, pdfProxy: pdfjsLib.PDFDocumentProxy, quality: number }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const renderPage = async () => {
            if (!pdfProxy || !canvasRef.current) return;
            try {
                const page = await pdfProxy.getPage(pageNum);
                const viewport = page.getViewport({ scale: 0.5 }); // Thumbnail scale
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');
                if (context) {
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    await page.render({ canvasContext: context, viewport, canvas }).promise;
                }
            } catch (err) {
                // Error handling logic
                // console.error(err);
            } finally {
                setLoading(false);
            }
        };
        renderPage();
    }, [pdfProxy, pageNum]);

    const handleDownload = async (e: React.MouseEvent) => {
        e.stopPropagation();
        const page = await pdfProxy.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 }); // High res for download
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d')!;
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
        canvas.toBlob((blob) => {
            if (blob) saveAs(blob, `page_${pageNum}.jpg`);
        }, 'image/jpeg', quality);
    };

    return (
        <div className="relative group aspect-[1/1.4] bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
            <canvas ref={canvasRef} className={`w-full h-full object-contain ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity`} />
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    <span className="sr-only">Loading page {pageNum}...</span>
                </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                    onClick={handleDownload}
                    className="p-2 bg-white text-indigo-600 rounded-full hover:bg-indigo-50 transition-colors shadow-lg transform translate-y-2 group-hover:translate-y-0 duration-200"
                    title="Download this page"
                >
                    <Download className="w-5 h-5" />
                </button>
            </div>
            <div className="absolute bottom-2 left-2 bg-slate-900/60 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-md">
                PAGE {pageNum}
            </div>
        </div>
    );
};

export function ConvertEditor({ files: initialFiles, toolType, onClose, defaultUrl }: ConvertEditorProps) {
    const { t, i18n } = useTranslation();
    const { showToast } = useToast();
    const isRtl = i18n.language === 'ar';

    const [loading, setLoading] = useState(true);
    const [loadingStep, setLoadingStep] = useState(0); // 0: Init, 1: Connecting, 2: Fetching, 3: Processing, 4: Finalizing
    const [processing, setProcessing] = useState(false);
    const [progress, setProgress] = useState(0);

    // JPG to PDF State
    const [images, setImages] = useState<ImageFile[]>([]);
    const [pdfSettings, setPdfSettings] = useState({
        pageSize: 'a4', // a4, fit, letter
        orientation: 'portrait', // portrait, landscape
        margin: 'small' // none, small, big
    });

    // PDF to JPG State
    const [pdfProxy, setPdfProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
    const [jpgSettings, setJpgSettings] = useState({
        quality: 0.9, // 0.1 - 1.0
        mode: 'pages' // pages, extract
    });

    // Web to PDF State
    const [webUrl, setWebUrl] = useState(defaultUrl || '');
    const [webMode, setWebMode] = useState<'file' | 'url'>(defaultUrl ? 'url' : 'file');
    const [htmlContent, setHtmlContent] = useState<string>('');
    const [htmlSettings, setHtmlSettings] = useState({
        screenSize: '1352',
        pageSize: 'a4',
        onePage: false,
        orientation: 'portrait',
        margin: 'none',
        blockAds: false,
        removeOverlays: false
    });

    // Professional Conversion Settings
    const [conversionSettings, setConversionSettings] = useState({
        groupByParagraphs: true, // For PDF to Word
        smartRowDetection: true, // For PDF to Excel
        imageQuality: 0.85, // For PDF to PowerPoint
        pptEditable: false, // For PDF to PowerPoint
        pageSize: 'a4', // For Office to PDF
        orientation: 'portrait', // For Office to PDF
        margin: 'small', // For Office to PDF
        ocrEnabled: false, // Professional OCR
        ocrLanguage: 'eng', // eng, ara
        renderAsImage: false
    });

    const iframeRef = useRef<HTMLIFrameElement>(null);

    const validateFile = (file: File) => {
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
            throw new Error(t('errors.fileTooLarge') || 'File too large (Max 50MB)');
        }
        if (file.size === 0) {
            throw new Error(t('errors.emptyFile') || 'File is empty');
        }
    };

    const updateIframeHeight = () => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
            try {
                const height = iframeRef.current.contentWindow.document.body.scrollHeight;
                if (height > 0) {
                    iframeRef.current.style.height = (height + 100) + 'px';
                }
            } catch (e) { }
        }
    };

    // Load Data
    useEffect(() => {
        const init = async () => {
            try {
                if (initialFiles.length > 0) validateFile(initialFiles[0]);

                if (toolType === 'jpg-to-pdf') {
                    const loadedImages: ImageFile[] = [];
                    for (const f of initialFiles) {
                        // validate image type?
                        if (f.type.startsWith('image/')) {
                            loadedImages.push({
                                id: Math.random().toString(36).substr(2, 9),
                                file: f,
                                preview: URL.createObjectURL(f)
                            });
                        }
                    }
                    if (loadedImages.length === 0) throw new Error('No valid images found');
                    setImages(loadedImages);
                    setLoading(false);
                } else if (['pdf-to-jpg', 'pdf-to-word', 'pdf-to-excel', 'pdf-to-powerpoint'].includes(toolType)) {
                    if (initialFiles.length > 0) {
                        try {
                            const buffer = await initialFiles[0].arrayBuffer();
                            const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
                            const pdf = await loadingTask.promise;
                            setPdfProxy(pdf);
                        } catch (pdfErr: any) {
                            if (pdfErr.name === 'PasswordException') {
                                throw new Error(t('errors.passwordProtected') || 'PDF is password protected');
                            }
                            throw new Error(t('errors.corruptPdf') || 'Failed to load PDF file');
                        }
                    }
                    setLoading(false);
                } else if (toolType === 'html-to-pdf') {
                    if (initialFiles.length > 0) {
                        const text = await initialFiles[0].text();
                        setHtmlContent(text);
                        setWebMode('file');
                    } else {
                        setWebMode('url');
                    }
                    setLoading(false);
                } else if (['word-to-pdf', 'excel-to-pdf', 'powerpoint-to-pdf'].includes(toolType)) {
                    if (initialFiles.length > 0) {
                        const buffer = await initialFiles[0].arrayBuffer();
                        if (toolType === 'word-to-pdf') {
                            const res = await mammoth.convertToHtml({ arrayBuffer: buffer });
                            const isArabic = /[\u0600-\u06FF]/.test(res.value);
                            setHtmlContent(`
                                <!DOCTYPE html>
                                <html dir="${isArabic ? 'rtl' : 'ltr'}">
                                <body style="font-family: ${isArabic ? 'Arial, sans-serif' : 'system-ui, sans-serif'}; padding: 25px; line-height: 1.6; color: #333;">
                                    <style>
                                        img { max-width: 100%; height: auto; display: block; margin: 10px 0; border-radius: 4px; }
                                        table { width: 100%; border-collapse: collapse; margin: 1em 0; }
                                        td, th { border: 1px solid #e2e8f0; padding: 8px; text-align: ${isArabic ? 'right' : 'left'}; }
                                        p { margin-bottom: 0.8em; }
                                    </style>
                                    ${res.value}
                                </body>
                                </html>
                            `);
                        } else if (toolType === 'powerpoint-to-pdf') {
                            try {
                                const zip = await JSZip.loadAsync(buffer);
                                // Case insensitive search for slides
                                const slideFiles = Object.keys(zip.files).filter(f => f.match(/ppt\/slides\/slide\d+\.xml/i));

                                if (slideFiles.length === 0) throw new Error('No slides found');

                                slideFiles.sort((a, b) => {
                                    const na = parseInt(a.match(/slide(\d+)\.xml/i)![1]);
                                    const nb = parseInt(b.match(/slide(\d+)\.xml/i)![1]);
                                    return na - nb;
                                });

                                let slidesHtml = '';
                                for (const file of slideFiles) {
                                    const xml = await zip.file(file)!.async('string');

                                    // Structured Text (Paragraphs)
                                    const paragraphs = xml.match(/<a:p[\s>].*?<\/a:p>/g) || [];
                                    let slideContent = '';

                                    for (const p of paragraphs) {
                                        const texts = p.match(/<a:t.*?>(.*?)<\/a:t>/g) || [];
                                        const line = texts.map(t => t.replace(/<\/?a:t.*?>/g, '')).join('');
                                        if (line.trim()) slideContent += `<p style="margin: 4px 0;">${line}</p>`;
                                    }

                                    // Deep Image Scan
                                    let imagesHtml = '';
                                    try {
                                        const fileName = file.split('/').pop();
                                        const relsFile = `ppt/slides/_rels/${fileName}.rels`;
                                        // Try case insensitive find for rels
                                        const relsKey = Object.keys(zip.files).find(k => k.toLowerCase().endsWith(relsFile.toLowerCase()));
                                        const relsXml = relsKey ? await zip.file(relsKey)?.async('string') : null;

                                        if (relsXml) {
                                            const relMap: any = {};
                                            const rels = relsXml.match(/<Relationship\s+[^>]*>/g) || [];
                                            rels.forEach(r => {
                                                const idMatch = r.match(/Id="([^"]+)"/);
                                                const targetMatch = r.match(/Target="([^"]+)"/);
                                                if (idMatch && targetMatch) relMap[idMatch[1]] = targetMatch[1];
                                            });

                                            const rawXml = xml;
                                            const imgRefRegex = /(?:r:embed|r:id)="([^"]+)"/g;
                                            const foundIds = new Set<string>();
                                            let match;
                                            while ((match = imgRefRegex.exec(rawXml)) !== null) foundIds.add(match[1]);

                                            for (const rId of Array.from(foundIds)) {
                                                if (relMap[rId]) {
                                                    const rawTarget = relMap[rId];
                                                    if (/\.(jpg|jpeg|png|gif|bmp|svg)$/i.test(rawTarget)) {
                                                        const targetName = rawTarget.split('/').pop()!;
                                                        const realPath = Object.keys(zip.files).find(f => f.toLowerCase().endsWith(targetName.toLowerCase()));

                                                        if (realPath) {
                                                            const imgData = await zip.file(realPath)!.async('base64');
                                                            const ext = realPath.split('.').pop()!.toLowerCase();
                                                            let mime = 'image/jpeg';
                                                            if (ext === 'png') mime = 'image/png';
                                                            if (ext === 'svg') mime = 'image/svg+xml';
                                                            imagesHtml += `<img src="data:${mime};base64,${imgData}" style="max-width:100%; max-height:60vh; width: auto; display:block; margin: 10px auto; border-radius: 4px;" />`;
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    } catch (e) { console.error(e); }

                                    const isArabic = /[\u0600-\u06FF]/.test(slideContent);

                                    slidesHtml += `
                                        <div class="slide" style="position: relative; width: 100%; max-width: 800px; margin: 0 auto 40px; padding: 40px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); page-break-after: always; overflow: hidden;">
                                            <div style="position: absolute; top: 15px; left: 20px; font-size: 10px; font-weight: 800; color: #cbd5e1; text-transform: uppercase; letter-spacing: 1px;">Slide ${file.match(/\d+/)?.[0]}</div>
                                            
                                            <div style="margin-top: 10px;">
                                                ${imagesHtml}
                                            </div>

                                            <div style="font-family: ${isArabic ? 'Arial, sans-serif' : 'system-ui, -apple-system, sans-serif'}; direction: ${isArabic ? 'rtl' : 'ltr'}; font-size: 16px; color: #334155; line-height: 1.8; text-align: ${isArabic ? 'right' : 'left'};">
                                                ${slideContent || '<div style="text-align:center; color:#94a3b8; font-style:italic; padding: 20px;">No Text Content</div>'}
                                            </div>
                                        </div>
                                    `;
                                }

                                setHtmlContent(`
                                    <!DOCTYPE html>
                                    <html dir="auto">
                                    <body style="background: #f1f5f9; padding: 40px 20px; margin: 0; font-family: system-ui;">
                                        ${slidesHtml}
                                    </body>
                                    </html>
                                `);
                            } catch (err: any) {
                                // Error handling logic
                                // console.error(err);
                                setHtmlContent(`<div style="padding:40px; text-align:center; color: #ef4444;">Failed to parse PowerPoint: ${err.message}</div>`);
                            }
                        } else {
                            // Excel
                            const wb = XLSX.read(buffer, { type: 'array' });
                            const ws = wb.Sheets[wb.SheetNames[0]];
                            setHtmlContent(XLSX.utils.sheet_to_html(ws));
                        }
                        setWebMode('file');
                    }
                    setLoading(false);
                } else if (['word-to-pdf', 'excel-to-pdf'].includes(toolType)) {
                    // Removing old block if it existed, but using replacement to handle structure
                    // Actually this block replaces the old logic entirely

                } else {
                    setLoading(false);
                }
            } catch (e: any) {
                console.error(e);
                showToast(e.message || t('common.error'), 'error');
                onClose();
            }
        };
        init();
    }, [initialFiles, toolType, onClose, showToast, t]);

    const handleDragStart = (e: React.DragEvent, index: number) => {
        e.dataTransfer.setData('index', index.toString());
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        const sourceIndex = parseInt(e.dataTransfer.getData('index'));
        if (isNaN(sourceIndex)) return;

        const newImages = [...images];
        const [moved] = newImages.splice(sourceIndex, 1);
        newImages.splice(targetIndex, 0, moved);
        setImages(newImages);
    };

    const handleAddImages = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const newImgs = Array.from(e.target.files).map(f => ({
                id: Math.random().toString(36).substr(2, 9),
                file: f,
                preview: URL.createObjectURL(f)
            }));
            setImages([...images, ...newImgs]);
        }
    };

    // Professional Loading Steps
    const LOADING_STEPS = [
        { title: t('tools.htmlToPdf.status.connecting') || 'Connecting to Server', sub: t('tools.htmlToPdf.status.connectingSub') || 'Establishing secure connection...' },
        { title: t('tools.htmlToPdf.status.smartRouting') || 'Smart Routing', sub: t('tools.htmlToPdf.status.smartRoutingSub') || 'Finding fastest proxy gateway...' },
        { title: t('tools.htmlToPdf.status.fetching') || 'Fetching Content', sub: t('tools.htmlToPdf.status.fetchingSub') || 'Downloading HTML structure...' },
        { title: t('tools.htmlToPdf.status.processingCss') || 'Processing Assets', sub: t('tools.htmlToPdf.status.processingCssSub') || 'Inlining CSS & Images...' },
        { title: t('tools.htmlToPdf.status.preparing') || 'Finalizing PDF', sub: t('tools.htmlToPdf.status.preparingSub') || 'Rendering document layout...' }
    ];

    const fixRelativeLinks = (html: string, baseUrl: string, useProxy: (url: string) => string) => {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const base = new URL(baseUrl);

            const proxify = (url: string) => {
                if (!url || url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('#')) return url;
                try {
                    const abs = new URL(url, base.href).href;
                    return useProxy(abs);
                } catch { return url; }
            };

            const inlineAllCss = async (document: Document) => {
                setLoadingStep(3); // Step 3: Processing Assets
                const stylePromises: Promise<void>[] = [];
                const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));

                links.forEach(link => {
                    const href = link.getAttribute('href');
                    if (href) {
                        const proxifiedHref = proxify(href);

                        // Timeout promise to prevent hanging
                        const fetchWithTimeout = async () => {
                            const controller = new AbortController();
                            const id = setTimeout(() => controller.abort(), 3000); // 3s timeout per CSS
                            try {
                                const res = await fetch(proxifiedHref, { signal: controller.signal });
                                clearTimeout(id);
                                if (!res.ok) throw new Error('Failed');
                                const cssText = await res.text();
                                const style = document.createElement('style');
                                style.textContent = cssText;
                                link.replaceWith(style);
                            } catch (e) {
                                // console.warn(`Skipped CSS: ${href}`);
                            }
                        };
                        stylePromises.push(fetchWithTimeout());
                    }
                });
                await Promise.all(stylePromises);
            };

            // Images: Proxy and enable CORS
            doc.querySelectorAll('img').forEach(el => {
                const src = el.getAttribute('src');
                if (src) {
                    el.setAttribute('src', proxify(src));
                    el.setAttribute('crossorigin', 'anonymous');
                    el.removeAttribute('loading');
                    el.removeAttribute('srcset');
                }
            });

            // Scripts - Remove them to prevent execution errors/popups in iframe
            doc.querySelectorAll('script').forEach(el => el.remove());

            // Remove interactive elements that might block rendering
            doc.querySelectorAll('iframe, frame, embed, object').forEach(el => el.remove());

            // Fix Base Hrefs for Anchors (just for visuals)
            doc.querySelectorAll('a').forEach(el => {
                const href = el.getAttribute('href');
                if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
                    try { el.setAttribute('href', new URL(href, base.href).href); } catch { }
                }
            });

            return { html: doc.documentElement.outerHTML, inlineAllCss };
        } catch (e) {
            console.error('Error fixing links', e);
            return { html: html, inlineAllCss: async () => { } };
        }
    };

    const fetchUrlData = async () => {
        if (!webUrl) return;
        setLoading(true);
        setLoadingStep(0); // Reset

        let targetUrl = webUrl.trim().replace(/^[\/\s]+/, '');
        if (!/^https?:\/\//i.test(targetUrl)) {
            targetUrl = 'https://' + targetUrl;
        }
        setWebUrl(targetUrl);

        // Proxy Definitions
        const proxies = {
            corsproxy: (u: string) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
            allorigins: (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
            codetabs: (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`
        };

        let bestProxy = proxies.corsproxy; // Default

        const handleSuccess = async (html: string) => {
            if (!html || html.trim().length < 100) throw new Error('Empty response');

            setLoadingStep(4); // Finalizing
            // Use the "best" proxy for all resources
            const useBestProxy = (u: string) => bestProxy(u);

            const { html: fixedHtml, inlineAllCss } = fixRelativeLinks(html, targetUrl, useBestProxy);
            const parser = new DOMParser();
            const doc = parser.parseFromString(fixedHtml, 'text/html');

            await inlineAllCss(doc);

            setHtmlContent(doc.documentElement.outerHTML);
            setWebMode('url');
            showToast(t('common.success'), 'success');
        };

        try {
            // Speed Optimization: Race proxies to find the fastest one
            const raceProxy = async (name: keyof typeof proxies, fn: (u: string) => string) => {
                const res = await fetch(fn(targetUrl));
                if (!res.ok) throw new Error(`${name} failed`);
                const text = await res.text();
                if (!text || text.length < 200 || text.includes('Access Denied') || text.includes('404 Not Found')) {
                    throw new Error(`${name} blocked`);
                }
                return { name, text, fn };
            };

            setLoadingStep(1); // Connecting

            // Visual delay for "Connecting" step to be readable
            await new Promise(r => setTimeout(r, 600));

            setLoadingStep(2); // Smart Routing (Fetching)

            // Speed Optimization: Race proxies to find the fastest one
            const raceToSuccess = (promises: Promise<{ name: string, text: string, fn: any }>[]) => {
                return new Promise<{ name: string, text: string, fn: any }>((resolve, reject) => {
                    let failures = 0;
                    if (promises.length === 0) reject(new Error('No proxies'));
                    promises.forEach(p => {
                        p.then(resolve).catch(() => {
                            failures++;
                            if (failures === promises.length) reject(new Error('All proxies failed'));
                        });
                    });
                });
            };

            const winner = await raceToSuccess([
                raceProxy('corsproxy', proxies.corsproxy),
                raceProxy('allorigins', proxies.allorigins),
                raceProxy('codetabs', proxies.codetabs)
            ]);

            // console.log(`[SpeedEngine] Winner: ${winner.name}`);
            bestProxy = winner.fn;
            await handleSuccess(winner.text);

        } catch (e) {
            console.error(e);
            showToast(t('editor.fetchFailed'), 'error');
            if (targetUrl.includes('microsoft') || targetUrl.includes('google') || targetUrl.includes('office')) {
                showToast(t('editor.authLinkError') || 'Cannot convert authenticated pages (like Office 365). Try a public URL.', 'error');
            }
        } finally {
            setLoading(false);
            setLoadingStep(0);
        }
    };

    // --- Helper Processing Functions ---

    const processPdfToWord = async () => {
        if (!pdfProxy) return;
        const paragraphs: Paragraph[] = [];
        let totalTextFound = false;

        for (let i = 1; i <= pdfProxy.numPages; i++) {
            const page = await pdfProxy.getPage(i);
            if (conversionSettings.renderAsImage) {
                const viewport = page.getViewport({ scale: 2.0 });
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d')!;
                await page.render({ canvasContext: ctx, viewport, canvas }).promise;

                totalTextFound = true;
                const imgDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                const base64Data = imgDataUrl.split(',')[1];
                paragraphs.push(new Paragraph({
                    children: [new ImageRun({
                        data: base64Data,
                        transformation: { width: 600, height: (canvas.height / canvas.width) * 600 },
                        type: 'jpg'
                    })]
                }));
            } else if (conversionSettings.ocrEnabled) {
                const viewport = page.getViewport({ scale: 2.0 });
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d')!;
                await page.render({ canvasContext: ctx, viewport, canvas }).promise;

                try {
                    const { data: { text } } = await Tesseract.recognize(canvas, conversionSettings.ocrLanguage, {
                        logger: m => {
                            if (m.status === 'recognizing text') {
                                setProgress(10 + (i / pdfProxy.numPages) * 80 + (m.progress * (80 / pdfProxy.numPages)));
                            }
                        }
                    });

                    if (text.trim().length > 10) {
                        totalTextFound = true;
                        text.split('\n').forEach(line => {
                            if (line.trim()) {
                                const isArabic = conversionSettings.ocrLanguage === 'ara';
                                paragraphs.push(new Paragraph({
                                    bidirectional: isArabic,
                                    children: [new TextRun({
                                        text: line.trim(),
                                        font: isArabic ? 'Arial' : 'Times New Roman',
                                        size: 24,
                                        rightToLeft: isArabic
                                    })]
                                }));
                            }
                        });
                    } else {
                        // Fallback: Embed as Image if OCR fails to read sufficient text
                        totalTextFound = true;
                        const imgDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                        const base64Data = imgDataUrl.split(',')[1];

                        paragraphs.push(new Paragraph({
                            children: [new ImageRun({
                                data: base64Data,
                                transformation: {
                                    width: 600,
                                    height: (canvas.height / canvas.width) * 600
                                },
                                type: 'jpg'
                            })]
                        }));
                    }
                } catch (e) {
                    console.error("OCR Failed", e);
                }
            } else {
                const content = await page.getTextContent();
                if (content.items.length > 0) totalTextFound = true;
                // Advanced Sort: Top -> Bottom, Left -> Right
                const items = content.items.map((item: any) => ({
                    str: item.str,
                    x: item.transform[4],
                    y: item.transform[5],
                    w: item.width, // capture width
                    height: item.transform[3], // capture height
                    hasEOL: item.hasEOL
                })).sort((a, b) => {
                    const yDiff = b.y - a.y;
                    if (Math.abs(yDiff) > 5) return yDiff;
                    return a.x - b.x;
                });

                let currentLineText = '';
                let lastY = items[0]?.y;
                let lastItemEnd = 0; // x + w of last item

                items.forEach((item) => {
                    const lineDiff = lastY ? Math.abs(item.y - lastY) : 0;
                    const paragraphThreshold = conversionSettings.groupByParagraphs ? 20 : 8;

                    if (lastY && lineDiff > paragraphThreshold) {
                        // New Paragraph detected
                        if (currentLineText.trim()) {
                            const isRTL = /[\u0600-\u06FF]/.test(currentLineText);
                            paragraphs.push(new Paragraph({
                                bidirectional: isRTL,
                                children: [new TextRun({
                                    text: currentLineText,
                                    size: Math.round((item.height || 12) * 1.5),
                                    font: isRTL ? 'Arial' : 'Times New Roman',
                                    rightToLeft: isRTL
                                })],
                                spacing: { after: 120 }
                            }));
                        }
                        currentLineText = '';
                        lastY = item.y;
                        lastItemEnd = 0;
                        currentLineText += item.str; // Start new line

                    } else {
                        // Same paragraph (could be same line or next line if grouped)

                        // If it's a new line (but same paragraph), always add space
                        if (lineDiff > 8) {
                            if (!currentLineText.endsWith(' ') && !item.str.startsWith(' ')) {
                                currentLineText += ' ';
                            }
                        }
                        // If same line, use smart space detection
                        else if (lastItemEnd > 0 && (item.x - lastItemEnd) > 2) {
                            if (!currentLineText.endsWith(' ') && !item.str.startsWith(' ')) {
                                currentLineText += ' ';
                            }
                        }
                        currentLineText += item.str;

                        // Update lastY only if this item pushes the line down significantly (which it shouldn't in this block usually, unless lineDiff < threshold)
                        // Actually strictly tracking lastY of the *current item* is safest for next iteration
                        lastY = item.y;
                    }
                    lastItemEnd = item.x + (item.w || 0);
                });

                if (currentLineText.trim()) {
                    const isRTL = /[\u0600-\u06FF]/.test(currentLineText);
                    paragraphs.push(new Paragraph({
                        bidirectional: isRTL,
                        children: [new TextRun({
                            text: currentLineText,
                            size: 24,
                            font: isRTL ? 'Arial' : 'Times New Roman',
                            rightToLeft: isRTL
                        })]
                    }));
                }
            }



            if (i < pdfProxy.numPages) paragraphs.push(new Paragraph({ children: [new PageBreak()] }));
            setProgress(10 + (i / pdfProxy.numPages) * 80);
        }

        if (!totalTextFound && !conversionSettings.ocrEnabled) {
            showToast('Warning: No text found. This looks like a scanned file. Please enable OCR.', 'error');
        } else if (!totalTextFound && conversionSettings.ocrEnabled) {
            showToast('OCR Warning: No text recognized. Try checking the document language.', 'error');
        }

        const doc = new DocxDocument({ sections: [{ children: paragraphs }] });
        const blob = await Packer.toBlob(doc);
        saveAs(blob, `${initialFiles[0].name.replace('.pdf', '')}.docx`);
    };

    const processPdfToExcel = async () => {
        if (!pdfProxy) return;
        const workbook = XLSX.utils.book_new();

        for (let i = 1; i <= pdfProxy.numPages; i++) {
            const page = await pdfProxy.getPage(i);
            const content = await page.getTextContent();

            const items = content.items.map((item: any) => ({
                str: item.str,
                x: Math.round(item.transform[4]),
                y: Math.round(item.transform[5])
            })).sort((a, b) => (b.y - a.y) || (a.x - b.x));

            const rows: string[][] = [];

            // Smart Row & Column Detection (Professional Mode)
            if (items.length > 0) {
                if (conversionSettings.smartRowDetection) {
                    const sortedItems = items.sort((a, b) => (b.y - a.y) || (a.x - b.x));
                    let currentRowY = sortedItems[0]?.y;
                    let currentRow: { str: string, x: number }[] = [];

                    // Identify potential columns by clustering X coordinates
                    // Simple logic: Group X coords that are close (within 20px)
                    const xClusters: number[] = [];
                    sortedItems.forEach(i => {
                        const match = xClusters.find(c => Math.abs(c - i.x) < 20);
                        if (!match) xClusters.push(i.x);
                    });
                    xClusters.sort((a, b) => a - b);

                    sortedItems.forEach(item => {
                        if (Math.abs(item.y - currentRowY) > 8) { // New row threshold
                            // Flush current row
                            const rowData: string[] = new Array(xClusters.length).fill('');
                            currentRow.forEach(cell => {
                                // Find closest column
                                let bestColIdx = 0;
                                let minDiff = 10000;
                                xClusters.forEach((cx, idx) => {
                                    const diff = Math.abs(cell.x - cx);
                                    if (diff < minDiff) { minDiff = diff; bestColIdx = idx; }
                                });
                                rowData[bestColIdx] = cell.str;
                            });

                            rows.push(rowData);
                            currentRow = [];
                            currentRowY = item.y;
                        }
                        currentRow.push({ str: item.str, x: item.x });
                    });
                    // Flush last
                    if (currentRow.length > 0) {
                        const rowData: string[] = new Array(xClusters.length).fill('');
                        currentRow.forEach(cell => {
                            let bestColIdx = 0;
                            let minDiff = 10000;
                            xClusters.forEach((cx, idx) => {
                                const diff = Math.abs(cell.x - cx);
                                if (diff < minDiff) { minDiff = diff; bestColIdx = idx; }
                            });
                            rowData[bestColIdx] = cell.str;
                        });
                        rows.push(rowData);
                    }

                } else {
                    // Legacy raw extraction
                    rows.push(items.map(i => i.str));
                }
            }

            const sheet = XLSX.utils.aoa_to_sheet(rows);
            XLSX.utils.book_append_sheet(workbook, sheet, `Page ${i}`);
            setProgress(10 + (i / pdfProxy.numPages) * 80);
        }

        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        saveAs(new Blob([wbout], { type: 'application/octet-stream' }), `${initialFiles[0].name.replace('.pdf', '')}.xlsx`);
    };

    const processPdfToPowerPoint = async () => {
        if (!pdfProxy) throw new Error('PDF not loaded');
        // @ts-ignore
        const pptx = new PptxGenJS();

        // Dynamic Layout based on first page
        try {
            const page1 = await pdfProxy.getPage(1);
            const vp1 = page1.getViewport({ scale: 1 });
            const wInch = vp1.width / 72;
            const hInch = vp1.height / 72;

            pptx.defineLayout({ name: 'CUSTOM_PDF', width: wInch, height: hInch });
            pptx.layout = 'CUSTOM_PDF';
        } catch (e) {
            console.error('Layout error', e);
            pptx.layout = 'LAYOUT_16x9'; // Fallback
        }

        for (let i = 1; i <= pdfProxy.numPages; i++) {
            try {
                const page = await pdfProxy.getPage(i);
                const slide = pptx.addSlide();

                if (conversionSettings.pptEditable) {
                    // Editable Mode: Extract Text
                    const content = await page.getTextContent();
                    const viewport = page.getViewport({ scale: 1.0 });
                    const pageHeightPoints = viewport.height;

                    content.items.forEach((item: any) => {
                        const x = item.transform[4];
                        const y = item.transform[5];
                        const xInch = x / 72;
                        const yInch = (pageHeightPoints - y) / 72;
                        const fontSize = Math.abs(item.transform[0]); // Approx font size

                        if (item.str.trim().length > 0) {
                            const isArabic = /[\u0600-\u06FF]/.test(item.str);
                            slide.addText(item.str, {
                                x: xInch, y: yInch,
                                fontSize: fontSize > 4 ? fontSize : 11,
                                fontFace: isArabic ? 'Arial' : 'Arial',
                                color: '000000',
                                // @ts-ignore
                                rtl: isArabic,
                                align: isArabic ? 'right' : 'left'
                            });
                        }
                    });
                } else {
                    // Visual Mode: Render as Image
                    // Use optimized scale relative to quality setting
                    const qualityScale = conversionSettings.imageQuality ? (1 + conversionSettings.imageQuality) : 1.5;
                    const viewport = page.getViewport({ scale: Math.min(qualityScale, 2.0) });

                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    const ctx = canvas.getContext('2d')!;

                    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
                    const dataUrl = canvas.toDataURL('image/jpeg', conversionSettings.imageQuality || 0.8);
                    slide.addImage({ data: dataUrl, x: 0, y: 0, w: '100%', h: '100%' });
                }

                setProgress(10 + (i / pdfProxy.numPages) * 80);
                await new Promise(r => setTimeout(r, 100)); // Prevent freeze
            } catch (pageErr) {
                console.error(`Error processing page ${i}`, pageErr);
            }
        }
        await pptx.writeFile({ fileName: `${initialFiles[0].name.replace(/\.[^/.]+$/, "")}.pptx` });
    };

    const processOfficeToPdf = async () => {
        const file = initialFiles[0];
        const buffer = await file.arrayBuffer();
        let html = '';

        if (toolType === 'word-to-pdf') {
            const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
            const isArabic = /[\u0600-\u06FF]/.test(result.value);

            html = `
                <div class="word-content" dir="${isArabic ? 'rtl' : 'ltr'}" style="font-family: ${isArabic ? 'Arial, sans-serif' : "'Times New Roman', serif"}; line-height: 1.6; color: #000; padding: 0; text-align: ${isArabic ? 'right' : 'justify'};">
                    <style>
                        p { margin-bottom: 0.8em; text-align: inherit; }
                        table { border-collapse: collapse; width: 100%; margin-bottom: 1em; direction: inherit; }
                        td, th { border: 1px solid #444; padding: 6px; vertical-align: top; }
                        img { max-width: 100%; height: auto; display: block; margin: 10px auto; }
                        h1, h2, h3, h4, h5, h6 { color: #2E74B5; margin-top: 1em; text-align: inherit; }
                        ul, ol { margin-inline-start: 20px; }
                        li { margin-bottom: 4px; }
                    </style>
                    ${result.value}
                </div>
            `;
        } else if (toolType === 'excel-to-pdf') {
            const wb = XLSX.read(buffer, { type: 'array' });
            const ws = wb.Sheets[wb.SheetNames[0]]; // First sheet only for now
            const sheetHtml = XLSX.utils.sheet_to_html(ws);
            html = `
                <style>
                    table { border-collapse: collapse; width: 100%; font-size: 11px; font-family: Arial, sans-serif; }
                    td, th { border: 1px solid #ccc; padding: 6px; text-align: left; color: #333; }
                    th { background-color: #f3f3f3; font-weight: bold; border-bottom: 2px solid #999; }
                    tr:nth-child(even) { background-color: #fcfcfc; }
                    .excel-content { padding: 20px; }
                    h3 { color: #1f7244; border-bottom: 2px solid #1f7244; padding-bottom: 10px; margin-bottom: 20px; }
                </style>
                <div class="excel-content">
                    <h3>${file.name.replace(/\.[^/.]+$/, "")}</h3>
                    ${sheetHtml}
                </div>
            `;
        } else if (toolType === 'powerpoint-to-pdf') {
            const zip = await JSZip.loadAsync(buffer);
            const slideFiles = Object.keys(zip.files).filter(f => f.match(/ppt\/slides\/slide\d+\.xml/));
            slideFiles.sort((a, b) => {
                const na = parseInt(a.match(/slide(\d+)\.xml/)![1]);
                const nb = parseInt(b.match(/slide(\d+)\.xml/)![1]);
                return na - nb;
            });
            let slidesHtml = '';
            for (const file of slideFiles) {
                const xml = await zip.file(file)!.async('string');

                // Text
                const texts = xml.match(/<a:t.*?>(.*?)<\/a:t>/g) || [];
                const slideText = texts.map(t => t.replace(/<\/?a:t.*?>/g, '')).join(' ');
                const isArabic = /[\u0600-\u06FF]/.test(slideText);

                // Professional Image Parsing (Deep Scan)
                let imagesHtml = '';
                try {
                    const fileName = file.split('/').pop();
                    const relsFile = `ppt/slides/_rels/${fileName}.rels`;
                    const relsXml = await zip.file(relsFile)?.async('string').catch(() => null);

                    if (relsXml) {
                        const relMap: any = {};
                        const rels = relsXml.match(/<Relationship\s+[^>]*>/g) || [];
                        rels.forEach(r => {
                            const idMatch = r.match(/Id="([^"]+)"/);
                            const targetMatch = r.match(/Target="([^"]+)"/);
                            if (idMatch && targetMatch) relMap[idMatch[1]] = targetMatch[1];
                        });

                        // Find ALL image references (blip, imagedata, etc)
                        // Captures r:embed="rId1" AND r:id="rId1"
                        const rawXml = xml;
                        const imgRefRegex = /(?:r:embed|r:id)="([^"]+)"/g;
                        const foundIds = new Set<string>();
                        let match;
                        while ((match = imgRefRegex.exec(rawXml)) !== null) {
                            foundIds.add(match[1]);
                        }

                        for (const rId of Array.from(foundIds)) {
                            if (relMap[rId]) {
                                const rawTarget = relMap[rId];
                                // Check if target is image
                                if (/\.(jpg|jpeg|png|gif|bmp|svg)$/i.test(rawTarget)) {
                                    const targetName = rawTarget.split('/').pop();
                                    const realPath = Object.keys(zip.files).find(f => f.endsWith(targetName));

                                    if (realPath) {
                                        const imgData = await zip.file(realPath)!.async('base64');
                                        const ext = realPath.split('.').pop();
                                        let mime = 'image/jpeg';
                                        if (ext === 'png') mime = 'image/png';
                                        if (ext === 'gif') mime = 'image/gif';
                                        if (ext === 'svg') mime = 'image/svg+xml';

                                        // Render with reasonable constraint
                                        imagesHtml += `<img src="data:${mime};base64,${imgData}" style="max-width:100%; max-height:90vh; display:block; margin: 10px auto; object-fit: contain;" />`;
                                    }
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.error('Deep scan error', e);
                }

                slidesHtml += `
                    <div class="slide" style="page-break-after: always; padding: 40px; min-height: 100vh; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                        ${imagesHtml}
                        <div style="font-family: ${isArabic ? 'Arial' : 'sans-serif'}; direction: ${isArabic ? 'rtl' : 'ltr'}; font-size: 24px; text-align: center; color: #333; margin-top: 20px;">
                             ${slideText}
                        </div>
                    </div>
                `;
            }
            html = slidesHtml;
        } else {
            throw new Error('Unsupported');
        }

        // Render HTML to PDF
        const element = document.createElement('div');
        element.innerHTML = html;

        // Professional Dynamic Layout
        let pageW = 210; // A4 Portrait width
        const size = conversionSettings.pageSize || 'a4';
        const orient = conversionSettings.orientation || 'portrait';

        // Calculate width in mm based on format
        if (size === 'letter') pageW = 215.9;
        if (size === 'legal') pageW = 215.9;

        // Swap for landscape
        if (orient === 'landscape') {
            if (size === 'a4') pageW = 297;
            else if (size === 'letter') pageW = 279.4;
            else if (size === 'legal') pageW = 355.6;
        }

        element.style.width = `${pageW}mm`;
        // Dynamic Margins
        const marginMap: any = { none: '0mm', small: '12mm', big: '25mm' };
        element.style.padding = marginMap[conversionSettings.margin || 'small'] || '12mm';

        element.style.backgroundColor = 'white';
        element.style.boxSizing = 'border-box'; // Ensure padding is included in width

        // Hide off-screen
        element.style.position = 'fixed';
        element.style.left = '-10000px';
        element.style.top = '0';
        document.body.appendChild(element);

        try {
            const scale = file.size > 5 * 1024 * 1024 ? 1 : 2; // Prevent crashes on large files
            await html2pdf().set({
                margin: 10,
                filename: `${file.name.replace(/\.[^/.]+$/, "")}.pdf`,
                image: { type: 'jpeg', quality: 0.95 },
                html2canvas: { scale: scale, useCORS: true, logging: false },
                jsPDF: { unit: 'mm', format: conversionSettings.pageSize || 'a4', orientation: conversionSettings.orientation as any || 'portrait' }
            }).from(element).save();
        } finally {
            document.body.removeChild(element);
        }
    };

    const processPowerPointToPdf = async () => {
        // Client-side PPTX -> PDF is extremely limited.
        // We will extract text and slides overview if possible,
        // but mainly we will provide a text-based PDF report of the presentation.
        const file = initialFiles[0];
        try {
            const zip = new JSZip();
            const content = await zip.loadAsync(file);
            const slides: string[] = [];

            // Find slide files
            const slideFiles = Object.keys(content.files).filter(k => k.match(/ppt\/slides\/slide\d+\.xml/));
            // Sort by number: ppt/slides/slide1.xml, slide2.xml...
            slideFiles.sort((a, b) => {
                const getNum = (s: string) => {
                    const m = s.match(/slide(\d+)\.xml/);
                    return m ? parseInt(m[1]) : 0;
                };
                return getNum(a) - getNum(b);
            });

            if (slideFiles.length === 0) throw new Error("No slides found in PowerPoint file");

            for (const slidePath of slideFiles) {
                const slideXml = await content.files[slidePath].async('string');
                const parser = new DOMParser();
                const doc = parser.parseFromString(slideXml, 'application/xml');
                // Extract all text (<a:t>)
                const textNodes = doc.getElementsByTagName('a:t');
                let slideText = '';
                for (let i = 0; i < textNodes.length; i++) {
                    slideText += textNodes[i].textContent + ' ';
                }
                slides.push(slideText.trim());
            }

            // Generate PDF
            const pdfDoc = await PDFDocument.create();
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

            for (let i = 0; i < slides.length; i++) {
                const page = pdfDoc.addPage([595, 842]);
                const { height } = page.getSize();
                const fontSize = 12;

                page.drawText(`Slide ${i + 1}`, { x: 50, y: height - 50, size: 18, font });
                // Simple word wrap
                const text = slides[i] || '(No text content)';
                const words = text.split(' ');
                let x = 50;
                let y = height - 80;

                let line = '';
                for (const word of words) {
                    if (line.length + word.length > 80) {
                        page.drawText(line, { x, y, size: fontSize, font });
                        y -= 20;
                        line = word + ' ';
                    } else {
                        line += word + ' ';
                    }
                }
                if (line) page.drawText(line, { x, y, size: fontSize, font });
            }

            const pdfBytes = await pdfDoc.save();
            saveAs(new Blob([pdfBytes as any]), `${file.name.replace(/\.[^/.]+$/, "")}.pdf`);

        } catch (e) {
            console.error(e);
            throw new Error("Failed to parse PowerPoint file");
        }
    };

    const handleProcess = async () => {
        setProcessing(true);
        setProgress(10);
        try {
            if (toolType === 'pdf-to-word') await processPdfToWord();
            else if (toolType === 'pdf-to-excel') await processPdfToExcel();
            else if (toolType === 'pdf-to-powerpoint') await processPdfToPowerPoint();
            else if (['word-to-pdf', 'excel-to-pdf'].includes(toolType)) await processOfficeToPdf();
            else if (toolType === 'powerpoint-to-pdf') await processPowerPointToPdf();
            else if (toolType === 'html-to-pdf') {
                // ... Existing HTML logic ...
                const iframe = document.createElement('iframe');
                iframe.style.position = 'fixed'; iframe.style.left = '-10000px';
                iframe.style.width = htmlSettings.screenSize + 'px'; iframe.style.height = '100vh'; iframe.style.border = 'none';
                let safeContent = htmlContent.replace(/<meta[^>]*http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi, '');

                // Security Hardening: Remove Scripts & Event Handlers
                safeContent = safeContent.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");
                safeContent = safeContent.replace(/<[^>]+>/gim, (tag) => tag.replace(/on\w+="[^"]*"/gi, "").replace(/on\w+='[^']*'/gi, ""));
                safeContent = safeContent.replace(/javascript:/gi, "");

                // Pro Cleaning: Remove Ads & Overlays before rendering
                if (htmlSettings.blockAds) {
                    safeContent = safeContent.replace(/<div[^>]*class=["']?[^"']*(ad|banner|popup|cookie|subscription)[^"']*["']?[^>]*>[\s\S]*?<\/div>/gi, '');
                    safeContent = safeContent.replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, ''); // Aggressive iframe removal for ads
                }
                if (htmlSettings.removeOverlays) {
                    safeContent = safeContent.replace(/<div[^>]*class=["']?[^"']*(overlay|modal|backdrop|dialog)[^"']*["']?[^>]*>[\s\S]*?<\/div>/gi, '');
                    safeContent = safeContent.replace(/style=["'][^"']*z-index:\s*[9]{3,}[^"']*["']/gi, 'style="display:none !important;"'); // Hide high z-index
                }
                document.body.appendChild(iframe);
                const doc = iframe.contentWindow?.document;
                if (!doc) throw new Error('Iframe creation failed');
                doc.open(); doc.write(safeContent); doc.close();
                await new Promise<void>((resolve) => {
                    if (iframe.contentWindow) iframe.contentWindow.onload = () => resolve();
                    else iframe.onload = () => resolve();
                    setTimeout(resolve, 4000);
                });
                await new Promise(r => setTimeout(r, 2000));
                const body = iframe.contentDocument?.body;
                if (body) {
                    // ... logic ...
                    let format: any = htmlSettings.pageSize;
                    let orientation: any = htmlSettings.orientation;
                    if (htmlSettings.onePage) {
                        const pxHeight = body.scrollHeight + 50;
                        const pxWidth = parseInt(htmlSettings.screenSize);
                        const mmWidth = (pxWidth * 25.4) / 96;
                        const mmHeight = (pxHeight * 25.4) / 96;
                        format = [mmWidth, mmHeight]; orientation = 'portrait';
                    }
                    const opt = {
                        margin: htmlSettings.margin === 'none' ? 0 : htmlSettings.margin === 'small' ? 5 : 15,
                        filename: 'webpage_converted.pdf',
                        image: { type: 'jpeg' as const, quality: 1.0 },
                        html2canvas: { scale: 3, useCORS: true, windowWidth: parseInt(htmlSettings.screenSize), window: iframe.contentWindow },
                        jsPDF: { unit: 'mm' as const, format: format, orientation: orientation },
                        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
                    };
                    await html2pdf().set(opt).from(body).save();
                }
                document.body.removeChild(iframe);

            } else if (toolType === 'jpg-to-pdf') {
                // Existing JPG logic
                const pdfDoc = await PDFDocument.create();
                for (let i = 0; i < images.length; i++) {
                    const imgFile = images[i];
                    const buffer = await imgFile.file.arrayBuffer();
                    let img;
                    try { img = imgFile.file.type === 'image/png' ? await pdfDoc.embedPng(buffer) : await pdfDoc.embedJpg(buffer); }
                    catch { img = await pdfDoc.embedJpg(buffer); }
                    let pageWidth, pageHeight;
                    if (pdfSettings.pageSize === 'a4') { pageWidth = 595.28; pageHeight = 841.89; }
                    else if (pdfSettings.pageSize === 'letter') { pageWidth = 612; pageHeight = 792; }
                    else { pageWidth = img.width; pageHeight = img.height; }
                    if (pdfSettings.orientation === 'landscape' && pdfSettings.pageSize !== 'fit') [pageWidth, pageHeight] = [pageHeight, pageWidth];
                    const page = pdfDoc.addPage([pageWidth, pageHeight]);
                    if (pdfSettings.pageSize === 'fit') {
                        page.drawImage(img, { x: 0, y: 0, width: pageWidth, height: pageHeight });
                    } else {
                        const margin = pdfSettings.margin === 'none' ? 0 : pdfSettings.margin === 'big' ? 50 : 20;
                        const availableW = pageWidth - (margin * 2); const availableH = pageHeight - (margin * 2);
                        const scale = Math.min(availableW / img.width, availableH / img.height);
                        page.drawImage(img, { x: (pageWidth - (img.width * scale)) / 2, y: (pageHeight - (img.height * scale)) / 2, width: img.width * scale, height: img.height * scale });
                    }
                    setProgress(10 + ((i + 1) / images.length) * 80);
                }
                const pdfBytes = await pdfDoc.save();
                saveAs(new Blob([pdfBytes as any]), 'images_converted.pdf');

            } else if (toolType === 'pdf-to-jpg' && pdfProxy) {
                // Enhanced PDF -> JPG Logic with Dynamic Scaling
                // Map quality (0.1-1.0) to Scale (1.5 - 4.0) for "Real Accuracy"
                const renderScale = jpgSettings.quality >= 0.9 ? 4.0 : jpgSettings.quality >= 0.6 ? 2.5 : 1.5;

                if (pdfProxy.numPages === 1) {
                    const page = await pdfProxy.getPage(1);
                    const viewport = page.getViewport({ scale: renderScale });
                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    const ctx = canvas.getContext('2d')!;
                    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
                    canvas.toBlob((blob) => { if (blob) saveAs(blob, `${initialFiles[0].name.replace('.pdf', '')}.jpg`); }, 'image/jpeg', jpgSettings.quality);
                } else {
                    const zip = new JSZip();
                    for (let i = 1; i <= pdfProxy.numPages; i++) {
                        const page = await pdfProxy.getPage(i);
                        const viewport = page.getViewport({ scale: renderScale });
                        const canvas = document.createElement('canvas');
                        canvas.width = viewport.width;
                        canvas.height = viewport.height;
                        const ctx = canvas.getContext('2d')!;
                        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
                        const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', jpgSettings.quality));
                        zip.file(`page_${i}.jpg`, blob);
                        setProgress(10 + (i / pdfProxy.numPages) * 80);
                    }
                    const content = await zip.generateAsync({ type: 'blob' });
                    saveAs(content, `${initialFiles[0].name.replace('.pdf', '')}_images.zip`);
                }
            }

            if (!['pdf-to-word', 'pdf-to-excel', 'pdf-to-powerpoint', 'word-to-pdf', 'excel-to-pdf', 'powerpoint-to-pdf'].includes(toolType)) {
                setProgress(100);
                showToast(t('editor.exportSuccess'), 'success');
                onClose();
            }
        } catch (err) {
            // Error handling logic
            // console.error(err);
            showToast(t('common.error'), 'error');
        } finally {
            setProcessing(false);
        }
    };

    if (loading) return (
        <div className="fixed inset-0 z-[100] bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center font-sans p-6">
            <div className="w-full max-w-sm bg-slate-800/50 rounded-3xl border border-slate-700/50 p-8 shadow-2xl backdrop-blur-xl">
                <div className="flex flex-col items-center mb-8">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-indigo-500 blur-2xl opacity-20 animate-pulse"></div>
                        <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg relative z-10 animate-spin-slow">
                            <RefreshCcw className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-white tracking-tight text-center">
                        {t('common.processing') || 'Optimizing Content'}
                    </h3>
                </div>

                <div className="space-y-4">
                    {LOADING_STEPS.map((step, idx) => {
                        const isActive = idx === loadingStep;
                        const isDone = idx < loadingStep;

                        return (
                            <div key={idx} className={`flex items-center gap-3 transition-all duration-500 ${isActive || isDone ? 'opacity-100 translate-x-0' : 'opacity-40 translate-x-2'}`}>
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition-all ${isDone ? 'bg-emerald-500 border-emerald-500' : isActive ? 'border-indigo-500 bg-indigo-500/20' : 'border-slate-600 bg-slate-800'}`}>
                                    {isDone ? (
                                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                    ) : isActive ? (
                                        <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                                    ) : (
                                        <span className="text-[10px] font-bold text-slate-500">{idx + 1}</span>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <p className={`text-xs font-bold transition-colors ${isActive || isDone ? 'text-white' : 'text-slate-500'}`}>{step.title}</p>
                                    {isActive && <p className="text-[10px] text-indigo-300 font-medium animate-pulse">{step.sub}</p>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    return (
        <div className={`fixed inset-0 z-[100] bg-[#f8f9fa] flex flex-col font-sans overflow-hidden ${isRtl ? 'rtl' : 'ltr'}`}>
            <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-30 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-all"><X className="w-5 h-5" /></button>
                    <div className="h-8 w-[1px] bg-slate-200 mx-2" />
                    <div className="flex flex-col">
                        <h2 className="text-sm font-bold text-slate-900 truncate max-w-[300px]" dir="ltr">
                            {toolType === 'html-to-pdf' ? (webMode === 'url' ? (webUrl || 'New HTML Conversion').replace(/^[\/\s]+/, '') : 'HTML Conversion') : (initialFiles[0]?.name || 'Conversion')}
                        </h2>
                        <span className="text-[10px] text-slate-400 font-medium">Pro Conversion Engine · {toolType.replace(/-/g, ' ').toUpperCase()}</span>
                    </div>
                </div>
                {toolType !== 'html-to-pdf' && (
                    <button
                        onClick={handleProcess} disabled={processing || (toolType === 'jpg-to-pdf' && images.length === 0)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-indigo-200 active:scale-95 disabled:opacity-50"
                    >
                        {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        {t('editor.finalize')}
                    </button>
                )}
            </header>

            <div className="flex-1 flex overflow-hidden">
                <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 z-20 shadow-xl p-6 overflow-y-auto">
                    {toolType !== 'html-to-pdf' && (
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                                <Settings2 className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-black text-slate-800">{t('editor.configuration')}</h3>
                        </div>
                    )}

                    {toolType === 'html-to-pdf' && (
                        <div className="space-y-6">
                            {webMode === 'url' && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tools.htmlToPdf.websiteUrl')}</label>
                                    <div className="flex gap-2 relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                            <Globe className="h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                        </div>
                                        <input
                                            type="url" placeholder="https://example.com"
                                            value={webUrl} onChange={(e) => setWebUrl(e.target.value)}
                                            className="w-full pl-10 p-3.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm placeholder:font-normal"
                                        />
                                        <button
                                            onClick={fetchUrlData}
                                            className="p-3.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 hover:-translate-y-0.5 active:translate-y-0 transition-all shadow-md"
                                        >
                                            <RefreshCcw className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-4">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                                    <span className="w-1 h-4 bg-indigo-500 rounded-full"></span>
                                    {t('editor.layout')}
                                </h4>

                                <div className="p-4 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('tools.htmlToPdf.screenSize')}</label>
                                        <select
                                            value={htmlSettings.screenSize}
                                            onChange={(e) => setHtmlSettings({ ...htmlSettings, screenSize: e.target.value })}
                                            className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all shadow-sm"
                                        >
                                            <option value="1352">{t('tools.htmlToPdf.desktop')} (1352px)</option>
                                            <option value="1920">{t('tools.htmlToPdf.desktopLarge') || 'Desktop Large'} (1920px)</option>
                                            <option value="768">{t('tools.htmlToPdf.tablet')} (768px)</option>
                                            <option value="360">{t('tools.htmlToPdf.mobile')} (360px)</option>
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('editor.pageSize')}</label>
                                            <select
                                                value={htmlSettings.pageSize}
                                                onChange={(e) => setHtmlSettings({ ...htmlSettings, pageSize: e.target.value })}
                                                className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all shadow-sm"
                                            >
                                                <option value="a4">A4</option>
                                                <option value="letter">Letter</option>
                                                <option value="legal">Legal</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('editor.orientation')}</label>
                                            <div className="flex bg-slate-200/50 p-1 rounded-xl">
                                                <button
                                                    onClick={() => setHtmlSettings({ ...htmlSettings, orientation: 'portrait' })}
                                                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${htmlSettings.orientation === 'portrait' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                >
                                                    {t('editor.portraitShort') || 'Port'}
                                                </button>
                                                <button
                                                    onClick={() => setHtmlSettings({ ...htmlSettings, orientation: 'landscape' })}
                                                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${htmlSettings.orientation === 'landscape' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                                >
                                                    {t('editor.landscapeShort') || 'Land'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('editor.margins')}</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {['none', 'small', 'big'].map(m => (
                                                <button
                                                    key={m}
                                                    onClick={() => setHtmlSettings({ ...htmlSettings, margin: m })}
                                                    className={`py-2 px-1 rounded-xl text-[10px] uppercase font-black border transition-all ${htmlSettings.margin === m ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'}`}
                                                >
                                                    {t(`editor.${m}`)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pt-2">
                                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                                    <span className="w-1 h-4 bg-emerald-500 rounded-full"></span>
                                    {t('tools.htmlToPdf.htmlSettings')}
                                </h4>

                                <div className="space-y-3">
                                    <label className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all group">
                                        <span className="text-xs font-bold text-slate-600 group-hover:text-slate-800">{t('tools.htmlToPdf.onePage')}</span>
                                        <div className={`w-10 h-5 rounded-full relative transition-colors ${htmlSettings.onePage ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                                            <input type="checkbox" checked={htmlSettings.onePage} onChange={(e) => setHtmlSettings({ ...htmlSettings, onePage: e.target.checked })} className="hidden" />
                                            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${htmlSettings.onePage ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </div>
                                    </label>

                                    <label className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all group">
                                        <span className="text-xs font-bold text-slate-600 group-hover:text-slate-800">{t('tools.htmlToPdf.blockAds')}</span>
                                        <div className={`w-10 h-5 rounded-full relative transition-colors ${htmlSettings.blockAds ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                                            <input type="checkbox" checked={htmlSettings.blockAds} onChange={(e) => setHtmlSettings({ ...htmlSettings, blockAds: e.target.checked })} className="hidden" />
                                            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${htmlSettings.blockAds ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </div>
                                    </label>

                                    <label className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all group">
                                        <span className="text-xs font-bold text-slate-600 group-hover:text-slate-800">{t('tools.htmlToPdf.removeOverlays')}</span>
                                        <div className={`w-10 h-5 rounded-full relative transition-colors ${htmlSettings.removeOverlays ? 'bg-indigo-500' : 'bg-slate-200'}`}>
                                            <input type="checkbox" checked={htmlSettings.removeOverlays} onChange={(e) => setHtmlSettings({ ...htmlSettings, removeOverlays: e.target.checked })} className="hidden" />
                                            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${htmlSettings.removeOverlays ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <button
                                onClick={handleProcess}
                                disabled={processing}
                                className="w-full py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl font-black text-sm shadow-xl shadow-rose-200 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
                            >
                                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                                {t('tools.htmlToPdf.convertButton').toUpperCase()}
                            </button>
                        </div>
                    )}

                    {toolType === 'jpg-to-pdf' && (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('editor.pageSize')}</label>
                                <select
                                    value={pdfSettings.pageSize} onChange={(e) => setPdfSettings({ ...pdfSettings, pageSize: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-700 focus:border-indigo-500 outline-none transition-all"
                                >
                                    <option value="fit">{t('editor.fitToImage')}</option>
                                    <option value="a4">A4 (ISO)</option>
                                    <option value="letter">US Letter</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('editor.orientation')}</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setPdfSettings({ ...pdfSettings, orientation: 'portrait' })}
                                        className={`p-3 rounded-xl text-xs font-bold border-2 transition-all ${pdfSettings.orientation === 'portrait' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-500'}`}
                                    >
                                        {t('editor.portrait')}
                                    </button>
                                    <button
                                        onClick={() => setPdfSettings({ ...pdfSettings, orientation: 'landscape' })}
                                        className={`p-3 rounded-xl text-xs font-bold border-2 transition-all ${pdfSettings.orientation === 'landscape' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-500'}`}
                                    >
                                        {t('editor.landscape')}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('editor.margins')}</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['none', 'small', 'big'].map(m => (
                                        <button
                                            key={m}
                                            onClick={() => setPdfSettings({ ...pdfSettings, margin: m })}
                                            className={`p-2 rounded-xl text-[10px] uppercase font-black border-2 transition-all ${pdfSettings.margin === m ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-400'}`}
                                        >
                                            {t(`editor.${m}`)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100">
                                <label className="flex flex-col items-center justify-center p-6 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl cursor-pointer hover:bg-slate-100 hover:border-indigo-400 transition-all group">
                                    <input type="file" multiple accept="image/*" onChange={handleAddImages} className="hidden" />
                                    <Plus className="w-8 h-8 text-slate-300 group-hover:text-indigo-400 mb-2 transition-colors" />
                                    <span className="text-xs font-bold text-slate-400 group-hover:text-indigo-500">{t('editor.addMoreImages')}</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {toolType === 'pdf-to-jpg' && (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('editor.imageQuality')} ({Math.round(jpgSettings.quality * 100)}%)</label>
                                <input
                                    type="range" min="0.1" max="1" step="0.1"
                                    value={jpgSettings.quality} onChange={(e) => setJpgSettings({ ...jpgSettings, quality: parseFloat(e.target.value) })}
                                    className="w-full h-2 bg-slate-100 rounded-full appearance-none accent-indigo-600 cursor-pointer"
                                />
                                <div className="flex justify-between text-[10px] font-bold text-slate-400">
                                    <span>{t('editor.lowFileSize')}</span>
                                    <span>{t('editor.highDef')}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {['pdf-to-word'].includes(toolType) && (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('editor.textGrouping')}</label>
                                <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={conversionSettings.groupByParagraphs}
                                        onChange={(e) => setConversionSettings({ ...conversionSettings, groupByParagraphs: e.target.checked })}
                                        className="w-4 h-4 text-indigo-600 rounded"
                                    />
                                    <span className="text-xs font-bold text-slate-700">{t('editor.smartParagraphs')}</span>
                                </label>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('editor.ocrMode')}</label>
                                <div className="space-y-4">
                                    <label className={`flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all ${!conversionSettings.ocrEnabled && !conversionSettings.renderAsImage ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                        <input
                                            type="radio"
                                            name="ocrMode"
                                            checked={!conversionSettings.ocrEnabled && !conversionSettings.renderAsImage}
                                            onChange={() => setConversionSettings({ ...conversionSettings, ocrEnabled: false, renderAsImage: false })}
                                            className="mt-1 w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div>
                                            <span className={`block text-xs font-bold ${!conversionSettings.ocrEnabled && !conversionSettings.renderAsImage ? 'text-indigo-700' : 'text-slate-700'}`}>{t('editor.ocrStandard')}</span>
                                            <span className="block text-[10px] text-slate-500 mt-1">{t('editor.ocrStandardDesc')}</span>
                                        </div>
                                    </label>

                                    <label className={`relative flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all ${conversionSettings.ocrEnabled ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                        <input
                                            type="radio"
                                            name="ocrMode"
                                            checked={conversionSettings.ocrEnabled}
                                            onChange={() => setConversionSettings({ ...conversionSettings, ocrEnabled: true, renderAsImage: false })}
                                            className="mt-1 w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={`block text-xs font-bold ${conversionSettings.ocrEnabled ? 'text-indigo-700' : 'text-slate-700'}`}>{t('editor.ocrPro')}</span>
                                                <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[9px] font-black rounded uppercase">AI</span>
                                            </div>
                                            <span className="block text-[10px] text-slate-500 mt-1">{t('editor.ocrProDesc')}</span>
                                        </div>
                                    </label>

                                    <label className={`relative flex items-start gap-3 p-3 border rounded-xl cursor-pointer transition-all ${conversionSettings.renderAsImage ? 'bg-indigo-50 border-indigo-500 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                        <input
                                            type="radio"
                                            name="ocrMode"
                                            checked={conversionSettings.renderAsImage}
                                            onChange={() => setConversionSettings({ ...conversionSettings, ocrEnabled: false, renderAsImage: true })}
                                            className="mt-1 w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className={`block text-xs font-bold ${conversionSettings.renderAsImage ? 'text-indigo-700' : 'text-slate-700'}`}>{t('editor.exactCopy') || 'Exact Visual Copy'}</span>
                                            </div>
                                            <span className="block text-[10px] text-slate-500 mt-1">{t('editor.exactCopyDesc') || 'Images in Word.'}</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {conversionSettings.ocrEnabled && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('editor.language')}</label>
                                    <select
                                        value={conversionSettings.ocrLanguage}
                                        onChange={(e) => setConversionSettings({ ...conversionSettings, ocrLanguage: e.target.value })}
                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-indigo-500"
                                    >
                                        <option value="eng">English</option>
                                        <option value="ara">Arabic (العربية)</option>
                                        <option value="fra">French</option>
                                        <option value="spa">Spanish</option>
                                        <option value="deu">German</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    {['pdf-to-excel'].includes(toolType) && (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Extraction Mode</label>
                                <label className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={conversionSettings.smartRowDetection}
                                        onChange={(e) => setConversionSettings({ ...conversionSettings, smartRowDetection: e.target.checked })}
                                        className="w-4 h-4 text-indigo-600 rounded"
                                    />
                                    <span className="text-xs font-bold text-slate-700">Smart Rows</span>
                                </label>
                            </div>
                        </div>
                    )}

                    {['pdf-to-powerpoint'].includes(toolType) && (
                        <div className="space-y-6">
                            <div className="space-y-2">

                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('editor.conversionMode')}</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setConversionSettings({ ...conversionSettings, pptEditable: false })}
                                        className={`p-3 rounded-xl text-xs font-bold border-2 transition-all ${!conversionSettings.pptEditable ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-500'}`}
                                    >
                                        {t('editor.visualExact')}
                                    </button>
                                    <button
                                        onClick={() => setConversionSettings({ ...conversionSettings, pptEditable: true })}
                                        className={`p-3 rounded-xl text-xs font-bold border-2 transition-all ${conversionSettings.pptEditable ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-500'}`}
                                    >
                                        {t('editor.editableText')}
                                    </button>
                                </div>
                            </div>
                            {!conversionSettings.pptEditable && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('editor.slideQuality')} ({Math.round(conversionSettings.imageQuality * 100)}%)</label>
                                    <input
                                        type="range" min="0.5" max="1" step="0.05"
                                        value={conversionSettings.imageQuality} onChange={(e) => setConversionSettings({ ...conversionSettings, imageQuality: parseFloat(e.target.value) })}
                                        className="w-full h-2 bg-slate-100 rounded-full appearance-none accent-indigo-600 cursor-pointer"
                                    />
                                    <div className="flex justify-between text-[10px] font-bold text-slate-400">
                                        <span>{t('editor.standard')}</span>
                                        <span>{t('editor.ultraHd')}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {['word-to-pdf', 'excel-to-pdf'].includes(toolType) && (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('editor.pageSize')}</label>
                                <select
                                    value={conversionSettings.pageSize} onChange={(e) => setConversionSettings({ ...conversionSettings, pageSize: e.target.value })}
                                    className="w-full p-3 bg-slate-50 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-700 focus:border-indigo-500 outline-none transition-all"
                                >
                                    <option value="a4">{t('editor.pageSizeA4') || 'A4 (ISO)'}</option>
                                    <option value="letter">{t('editor.pageSizeLetter') || 'US Letter'}</option>
                                    <option value="legal">{t('editor.pageSizeLegal') || 'Legal'}</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('editor.orientation')}</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setConversionSettings({ ...conversionSettings, orientation: 'portrait' })}
                                        className={`p-3 rounded-xl text-xs font-bold border-2 transition-all ${conversionSettings.orientation === 'portrait' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-500'}`}
                                    >

                                        {t('editor.portrait')}
                                    </button>
                                    <button
                                        onClick={() => setConversionSettings({ ...conversionSettings, orientation: 'landscape' })}
                                        className={`p-3 rounded-xl text-xs font-bold border-2 transition-all ${conversionSettings.orientation === 'landscape' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-500'}`}
                                    >
                                        {t('editor.landscape')}
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('editor.margin') || 'Margins'}</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['none', 'small', 'big'].map(m => (
                                        <button
                                            key={m}
                                            onClick={() => setConversionSettings({ ...conversionSettings, margin: m })}
                                            className={`p-2 rounded-lg text-xs font-bold border transition-all ${conversionSettings.margin === m ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500'}`}
                                        >
                                            {m === 'none' ? (t('editor.marginNone') || '0px') : m === 'small' ? (t('editor.marginSmall') || 'Normal') : (t('editor.marginBig') || 'Big')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </aside>

                <main className="flex-1 overflow-y-auto bg-[#eef0f2] p-8 custom-scrollbar relative">
                    {processing && (
                        <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
                            <div className="w-64 h-2 bg-slate-200 rounded-full overflow-hidden mb-4">
                                <div className="h-full bg-indigo-600 transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
                            </div>
                            <p className="text-indigo-600 font-black uppercase tracking-widest text-xs animate-pulse">{t('editor.processing')} {Math.round(progress)}%</p>
                        </div>
                    )}

                    <div className="max-w-5xl mx-auto min-h-full bg-white rounded-[2rem] shadow-xl border border-slate-200 p-8">
                        {toolType === 'jpg-to-pdf' ? (
                            <div className={`grid gap-8 ${pdfSettings.orientation === 'landscape' && pdfSettings.pageSize !== 'fit'
                                ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                                : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
                                }`}>
                                {images.map((img, i) => (
                                    <div
                                        key={img.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, i)}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => handleDrop(e, i)}
                                        className={`group relative bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-move active:cursor-grabbing flex items-center justify-center ${pdfSettings.margin === 'big' ? 'p-8' : pdfSettings.margin === 'small' ? 'p-4' : 'p-0'
                                            }`}
                                        style={{
                                            aspectRatio: pdfSettings.pageSize === 'fit' ? 'auto' : (pdfSettings.orientation === 'landscape' ? '1.414/1' : '1/1.414'),
                                            minHeight: pdfSettings.pageSize === 'fit' ? '300px' : undefined
                                        }}
                                    >
                                        <div className="w-full h-full flex items-center justify-center bg-white shadow-sm overflow-hidden relative">
                                            <img src={img.preview} className="w-full h-full object-contain" alt="preview" />
                                        </div>

                                        <div className="absolute top-2 left-2 bg-white/80 backdrop-blur rounded p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                            <GripVertical className="w-4 h-4 text-slate-500" />
                                        </div>
                                        <div className="absolute bottom-2 left-2 bg-slate-900/60 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-md z-10">
                                            {t('editor.pageIndex', { defaultValue: 'Page' }) + ' ' + (i + 1)}
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setImages(images.filter(x => x.id !== img.id)); }}
                                            className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600 shadow-lg z-10"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                                {images.length === 0 && (
                                    <div className="col-span-full py-20 text-center text-slate-400 flex flex-col items-center">
                                        <ImageIcon className="w-12 h-12 mb-4 text-slate-300" />
                                        <p>No images selected</p>
                                    </div>
                                )}
                            </div>
                        ) : ['html-to-pdf', 'word-to-pdf', 'excel-to-pdf'].includes(toolType) ? (
                            <div className="flex flex-col h-full">
                                {webMode === 'url' && !htmlContent ? (
                                    <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
                                        <Globe className="w-16 h-16 text-indigo-100" />
                                        <p className="font-bold">Enter a URL to fetch content</p>
                                    </div>
                                ) : (
                                    <div className="flex-1 w-full bg-[#eef0f2] overflow-auto relative flex justify-center p-8 custom-scrollbar" dir="ltr">
                                        <iframe
                                            ref={iframeRef}
                                            srcDoc={htmlContent}
                                            onLoad={updateIframeHeight}
                                            sandbox="allow-scripts allow-same-origin"
                                            className="bg-white shadow-2xl transition-all duration-300 origin-top"
                                            style={{
                                                width: (['word-to-pdf', 'excel-to-pdf', 'powerpoint-to-pdf'].includes(toolType))
                                                    ? (conversionSettings.orientation === 'landscape'
                                                        ? (conversionSettings.pageSize === 'legal' ? '356mm' : conversionSettings.pageSize === 'letter' ? '279.4mm' : '297mm')
                                                        : (conversionSettings.pageSize === 'letter' || conversionSettings.pageSize === 'legal' ? '215.9mm' : '210mm'))
                                                    : htmlSettings.screenSize + 'px',
                                                minHeight: '1000px',
                                                transform: 'scale(0.85)',
                                                border: 'none',
                                                transition: 'width 0.3s ease'
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        ) : ['pdf-to-jpg', 'pdf-to-word', 'pdf-to-excel', 'pdf-to-powerpoint'].includes(toolType) ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                                {Array.from({ length: pdfProxy?.numPages || 0 }).map((_, i) => (
                                    <PdfPageThumbnail key={i} pageNum={i + 1} pdfProxy={pdfProxy!} quality={jpgSettings.quality} />
                                ))}
                            </div>
                        ) : (
                            // Generic Beta State
                            <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                                <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6 animate-bounce">
                                    <FileText className="w-10 h-10 text-indigo-600" />
                                </div>
                                <h2 className="text-2xl font-black text-slate-800 mb-2">{t('editor.readyToConvert')}</h2>
                                <p className="text-slate-500 max-w-md mx-auto">
                                    {initialFiles[0]?.name}
                                </p>
                            </div>
                        )}
                    </div>
                </main>
            </div >
        </div >
    );
}
