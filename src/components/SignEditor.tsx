import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
    X, Type, Loader2, Trash2, Undo2,
    ZoomIn, ZoomOut, Move, Settings2,
    Plus, User, FileSignature, Calendar, MoreVertical,
    Save, Download, FileBadge, RotateCcw, PenTool, Upload as UploadIcon,
    ChevronLeft, Check
} from 'lucide-react';
import { PDFDocument, rgb, StandardFonts, degrees } from '@cantoo/pdf-lib';
import { saveAs } from 'file-saver';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { generateId } from '../lib/security';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

interface PageItem {
    id: string;
    page: number;
    x: number;
    y: number;
    type: 'text' | 'signature' | 'initials' | 'date' | 'image';
    content?: string;
    imgData?: Uint8Array;
    imgUrl?: string;
    w: number;
    h: number;
    rotation: number;
    color?: { r: number; g: number; b: number };
    fontSize?: number;
}

interface SignEditorProps {
    file: File;
    onClose: () => void;
}

const SIGNATURE_FONTS = [
    { name: 'Dancing Script', url: 'https://fonts.gstatic.com/s/dancingscript/v25/If2cXTr6YS-zF4S-kcSWSVi_sxjsohD9F50Ruu7BMSo3Sup6hNX6plRP.woff2', style: 'cursive' },
    { name: 'Great Vibes', url: 'https://fonts.gstatic.com/s/greatvibes/v19/RWmMoKWR9v4ksMfaWd_JN9XFiaQ.woff2', style: 'cursive' },
    { name: 'Pacifico', url: 'https://fonts.gstatic.com/s/pacifico/v22/FwZY7-Qmy14u9lezJ-6H6MmB.woff2', style: 'cursive' },
    { name: 'Satisfy', url: 'https://fonts.gstatic.com/s/satisfy/v20/raxhHiqOu8IVPmnRc6SY1KXgnF_Y.woff2', style: 'cursive' },
    { name: 'Caveat', url: 'https://fonts.gstatic.com/s/caveat/v18/WnznHAc5bAfYB2QRah7pcpNvOx-pjfJ9SIKjYBxPigs.woff2', style: 'cursive' },
    { name: 'Sacramento', url: 'https://fonts.gstatic.com/s/sacramento/v15/buEzpo6gcdjy0EiZMBUG4C0f-w.woff2', style: 'cursive' },
];

export function SignEditor({ file, onClose }: SignEditorProps) {
    const { t, i18n } = useTranslation();
    const { showToast } = useToast();
    const { user } = useAuth();
    const isRtl = i18n.language === 'ar';

    const [loading, setLoading] = useState(true);
    const [pdfProxy, setPdfProxy] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
    const [numPages, setNumPages] = useState(0);
    const [items, setItems] = useState<PageItem[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [zoom, setZoom] = useState(0.8);
    const [signMode, setSignMode] = useState<'simple' | 'digital'>('simple');
    const [thumbnails, setThumbnails] = useState<string[]>([]);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [signatureModalType, setSignatureModalType] = useState<'signature' | 'initials'>('signature');
    const [savedSignatures, setSavedSignatures] = useState<{ imgUrl: string; imgData: Uint8Array }[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadPdf = async () => {
            try {
                const buffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
                setPdfProxy(pdf);
                setNumPages(pdf.numPages);

                const thumbs: string[] = [];
                for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 0.2 });
                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    const context = canvas.getContext('2d')!;
                    await page.render({ canvasContext: context, viewport, canvas }).promise;
                    thumbs.push(canvas.toDataURL());
                }
                setThumbnails(thumbs);
                setLoading(false);
            } catch (err) {
                console.error(err);
                showToast(t('common.error'), 'error');
                onClose();
            }
        };
        loadPdf();
    }, [file, showToast, t]);

    const addItem = useCallback((type: PageItem['type'], pageNum: number = 1) => {
        const id = generateId();
        let newItem: PageItem = {
            id, page: pageNum, x: 50, y: 50, type, w: 15, h: 5, rotation: 0
        };

        if (type === 'text') {
            newItem = { ...newItem, content: '', fontSize: 24, color: { r: 0, g: 0, b: 0 }, h: 8 };
            setItems(prev => [...prev, newItem]);
            setActiveId(id);
            setEditingId(id);
        } else if (type === 'date') {
            newItem = { ...newItem, content: new Date().toLocaleDateString(), fontSize: 24, h: 6 };
            setItems(prev => [...prev, newItem]);
            setActiveId(id);
        } else if (type === 'signature' || type === 'initials') {
            setSignatureModalType(type);
            setShowSignatureModal(true);
        }
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile || !pdfProxy) return;

        const buffer = await selectedFile.arrayBuffer();
        const url = URL.createObjectURL(selectedFile);
        const img = new Image();
        img.onload = () => {
            const id = generateId();
            const aspect = img.naturalWidth / img.naturalHeight;
            const newItem: PageItem = {
                id, page: 1, x: 50, y: 50, type: 'signature',
                imgData: new Uint8Array(buffer), imgUrl: url,
                w: 20, h: 20 / aspect, rotation: 0
            };
            setItems(prev => [...prev, newItem]);
            setActiveId(id);
        };
        img.src = url;
    };

    const addSignatureFromModal = (imgData: Uint8Array, imgUrl: string) => {
        const id = generateId();
        const img = new Image();
        img.onload = () => {
            const aspect = img.naturalWidth / img.naturalHeight;
            const newItem: PageItem = {
                id, page: 1, x: 50, y: 50,
                type: signatureModalType,
                imgData, imgUrl,
                w: signatureModalType === 'initials' ? 10 : 20,
                h: (signatureModalType === 'initials' ? 10 : 20) / aspect,
                rotation: 0
            };
            setItems(prev => [...prev, newItem]);
            setActiveId(id);
        };
        img.src = imgUrl;

        setSavedSignatures(prev => {
            const exists = prev.some(s => s.imgUrl === imgUrl);
            if (exists) return prev;
            return [...prev, { imgUrl, imgData }];
        });
    };

    const updateItem = (id: string, updates: Partial<PageItem>) => {
        setItems(prev => prev.map(it => it.id === id ? { ...it, ...updates } : it));
    };

    const finishEditing = (id: string, content: string) => {
        if (!content.trim()) {
            setItems(prev => prev.filter(it => it.id !== id));
        } else {
            updateItem(id, { content });
        }
        setEditingId(null);
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            const pdfDoc = await PDFDocument.load(await file.arrayBuffer());
            const pages = pdfDoc.getPages();
            const standardFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

            for (const item of items) {
                const page = pages[item.page - 1];
                const { width, height } = page.getSize();
                const pdfX = (item.x / 100) * width;
                const pdfY = (1 - (item.y / 100)) * height;

                if (item.type === 'image' || item.type === 'signature' || item.type === 'initials') {
                    if (!item.imgData) continue;
                    let img;
                    try { img = await pdfDoc.embedPng(item.imgData!); }
                    catch { img = await pdfDoc.embedJpg(item.imgData!); }

                    const iW = (item.w / 100) * width;
                    const iH = (item.h / 100) * height;

                    page.drawImage(img, {
                        x: pdfX - iW / 2,
                        y: pdfY - iH / 2,
                        width: iW,
                        height: iH,
                        rotate: degrees(item.rotation)
                    });
                } else if (item.content) {
                    page.drawText(item.content, {
                        x: pdfX - ((item.w / 200) * width),
                        y: pdfY - ((item.h / 200) * height),
                        size: item.fontSize || 12,
                        font: standardFont,
                        color: item.color ? rgb(item.color.r, item.color.g, item.color.b) : rgb(0, 0, 0),
                        rotate: degrees(item.rotation)
                    });
                }
            }

            const blob = new Blob([await pdfDoc.save() as any]);
            saveAs(blob, `signed_${file.name}`);
            showToast(t('editor.exportSuccess'), 'success');
            onClose();
        } catch (err) {
            console.error(err);
            showToast(t('editor.critError'), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return (
        <div className="fixed inset-0 z-[100] bg-slate-900 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                <p className="text-white font-black uppercase tracking-widest">{t('editor.highFidelityRender')}</p>
            </div>
        </div>
    );

    return (
        <div className={`fixed inset-0 z-[100] bg-[#f8f9fa] flex flex-col font-sans overflow-hidden ${isRtl ? 'rtl' : 'ltr'}`}>
            <input type="file" hidden ref={fileInputRef} accept="image/*" onChange={handleFileUpload} />

            <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-30 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-all">
                        <X className="w-5 h-5" />
                    </button>
                    <div className="h-8 w-[1px] bg-slate-200 mx-2" />
                    <div className="flex flex-col">
                        <h2 className="text-sm font-bold text-slate-900 truncate max-w-[300px]">{file.name}</h2>
                        <span className="text-[10px] text-slate-400 font-medium">PDF Tool · Signature Engine</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-slate-100 rounded-lg p-1">
                        <button onClick={() => setZoom(z => Math.max(0.4, z - 0.1))} className="p-1.5 hover:bg-white rounded-md text-slate-500 shadow-sm transition-all"><ZoomOut className="w-4 h-4" /></button>
                        <span className="px-3 text-[11px] font-bold text-slate-600 min-w-[50px] text-center">{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-1.5 hover:bg-white rounded-md text-slate-500 shadow-sm transition-all"><ZoomIn className="w-4 h-4" /></button>
                    </div>
                    <button onClick={handleSave} disabled={isSaving} className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50">
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {t('signTool.apply')}
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shrink-0 z-20 shadow-xl">
                    <div className="p-6 border-b border-slate-100 h-full overflow-y-auto custom-scrollbar">
                        <h3 className="text-lg font-black text-slate-800 mb-6">{t('signTool.options')}</h3>

                        <div className="flex p-1 bg-slate-100 rounded-xl mb-8">
                            <button
                                onClick={() => setSignMode('simple')}
                                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${signMode === 'simple' ? 'bg-white text-rose-500 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <div className="flex flex-col items-center gap-1">
                                    <FileSignature className="w-4 h-4" />
                                    {t('signTool.simple')}
                                </div>
                            </button>
                            <button
                                onClick={() => setSignMode('digital')}
                                className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${signMode === 'digital' ? 'bg-white text-amber-500 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <div className="flex flex-col items-center gap-1 relative">
                                    <FileBadge className="w-4 h-4" />
                                    {t('signTool.digital')}
                                    <div className="absolute -top-1 -right-1 w-2 h-2 bg-amber-400 rounded-full border-2 border-white" />
                                </div>
                            </button>
                        </div>

                        <div className="mb-8">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{t('signTool.signers')}</p>
                            <div className="flex items-center gap-3 p-3 bg-rose-50 border border-rose-100 rounded-xl">
                                <div className="w-10 h-10 bg-rose-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                    {user?.email?.substring(0, 1).toUpperCase() || 'U'}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-sm font-bold text-slate-800 truncate">{user?.email || t('signEditor.guestUser')}</p>
                                    <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest">OWNER</p>
                                </div>
                                <Settings2 className="w-4 h-4 text-slate-300" />
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{t('signTool.requiredFields')}</p>
                                <div className="grid grid-cols-1 gap-2">
                                    <FieldButton icon={FileSignature} label={t('signTool.signature')} onClick={() => addItem('signature')} />
                                    <FieldButton icon={Type} label={t('signTool.initials')} onClick={() => addItem('initials')} />
                                </div>
                            </div>
                        </div>

                        {savedSignatures.length > 0 && (
                            <div className="mt-8">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{t('signEditor.savedSignatures')}</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {savedSignatures.map((sig, i) => (
                                        <button
                                            key={i}
                                            onClick={() => addSignatureFromModal(sig.imgData, sig.imgUrl)}
                                            className="relative group border-2 border-slate-100 rounded-xl p-3 hover:border-rose-400 hover:bg-rose-50 transition-all"
                                        >
                                            <img src={sig.imgUrl} alt="saved signature" className="w-full h-auto max-h-12 object-contain" />
                                            <div className="absolute inset-0 flex items-center justify-center bg-white/80 opacity-0 group-hover:opacity-100 rounded-xl transition-all">
                                                <span className="text-[10px] font-bold text-rose-500">{t('signEditor.clickToUse')}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {activeId && (
                            <div className="mt-8 pt-8 border-t border-slate-100 space-y-6 animate-in slide-in-from-bottom-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{t('signTool.options')}</p>
                                <div className="flex flex-col gap-4">
                                    <button
                                        onClick={() => setItems(prev => prev.filter(it => it.id !== activeId))}
                                        className="flex items-center justify-center gap-2 p-3 bg-rose-500 text-white rounded-xl text-xs font-bold hover:bg-rose-600 transition-all shadow-lg shadow-rose-200"
                                    >
                                        <Trash2 className="w-4 h-4" /> {t('signEditor.delete')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </aside>

                <main className="flex-1 bg-[#eef0f2] overflow-hidden flex relative">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-3">
                        <FloatingBtn icon={Plus} color="bg-rose-500 shadow-rose-200" onClick={() => addItem('signature')} tooltip={t('signEditor.addSignature')} />
                        <FloatingBtn icon={User} color="bg-indigo-500 shadow-indigo-200" tooltip={t('signEditor.manageSigners')} />
                        <FloatingBtn icon={Download} color="bg-slate-800 shadow-slate-200" onClick={handleSave} tooltip={t('signEditor.exportResult')} />
                    </div>

                    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-12 scroll-smooth flex flex-col items-center gap-12 custom-scrollbar">
                        {pdfProxy && Array.from({ length: pdfProxy.numPages }, (_, i) => (
                            <EditorPage
                                key={i + 1} pageNum={i + 1} zoom={zoom} pdf={pdfProxy}
                                items={items.filter(it => it.page === i + 1)}
                                activeId={activeId}
                                editingId={editingId}
                                onSelect={(id: string) => setActiveId(id)}
                                onClick={() => { if (activeId && !editingId) setActiveId(null); }}
                                updateItem={updateItem}
                                removeItem={(id: string) => setItems(prev => prev.filter(it => it.id !== id))}
                                onEditFinish={finishEditing}
                            />
                        ))}
                    </div>
                </main>

                <aside className="w-52 bg-white border-l border-slate-200 flex flex-col shrink-0 z-20 overflow-y-auto p-4 gap-4 custom-scrollbar">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2">Pages ({numPages})</p>
                    {thumbnails.map((src, i) => (
                        <div
                            key={i}
                            className={`group relative cursor-pointer rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all border-2 ${items.some(it => it.page === i + 1) ? 'border-rose-400' : 'border-transparent'}`}
                            onClick={() => {
                                const pageEl = scrollContainerRef.current?.children[i] as HTMLElement;
                                pageEl?.scrollIntoView({ behavior: 'smooth' });
                            }}
                        >
                            <img src={src} className="w-full h-auto" alt={`Page ${i + 1}`} />
                            <div className="absolute bottom-2 right-2 bg-slate-900/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur-sm">
                                {i + 1}
                            </div>
                            {items.some(it => it.page === i + 1) && (
                                <div className="absolute top-2 left-2 bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-lg">FIELDS</div>
                            )}
                        </div>
                    ))}
                    {numPages > thumbnails.length && (
                        <div className="flex flex-col items-center p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400">
                            <MoreVertical className="w-5 h-5 mb-1" />
                            <span className="text-[10px] font-bold">+{numPages - thumbnails.length} more pages</span>
                        </div>
                    )}
                </aside>
            </div>

            {showSignatureModal && (
                <SignatureModal
                    type={signatureModalType}
                    onClose={() => setShowSignatureModal(false)}
                    onSave={addSignatureFromModal}
                    savedSignatures={savedSignatures}
                    onDeleteSaved={(idx) => setSavedSignatures(prev => prev.filter((_, i) => i !== idx))}
                />
            )}
        </div>
    );
}

// ─── Signature Modal ─────────────────────────────────────────────
interface SignatureModalProps {
    type: 'signature' | 'initials';
    onClose: () => void;
    onSave: (imgData: Uint8Array, imgUrl: string) => void;
    savedSignatures: { imgUrl: string; imgData: Uint8Array }[];
    onDeleteSaved: (idx: number) => void;
}

function SignatureModal({ type, onClose, onSave, savedSignatures, onDeleteSaved }: SignatureModalProps) {
    const { t } = useTranslation();
    const [tab, setTab] = useState<'draw' | 'type' | 'upload'>('draw');

    return (
        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 fade-in">
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                            <PenTool className="w-5 h-5 text-rose-500" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900">
                                {type === 'signature' ? t('signTool.signature') : t('signTool.initials')}
                            </h3>
                            <p className="text-xs text-slate-400">
                                {type === 'signature' ? t('signEditor.drawHint') : t('signEditor.typeHint')}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex border-b border-slate-100">
                    {[
                        { key: 'draw' as const, icon: PenTool, label: t('signEditor.drawTab') },
                        { key: 'type' as const, icon: Type, label: t('signEditor.typeTab') },
                        { key: 'upload' as const, icon: UploadIcon, label: t('signEditor.uploadTab') },
                    ].map(({ key, icon: Icon, label }) => (
                        <button
                            key={key}
                            onClick={() => setTab(key)}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold transition-all border-b-2 ${
                                tab === key
                                    ? 'text-rose-500 border-rose-500 bg-rose-50/50'
                                    : 'text-slate-400 border-transparent hover:text-slate-600'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                        </button>
                    ))}
                </div>

                <div className="p-5">
                    {tab === 'draw' && <DrawPanel type={type} onSave={onSave} onClose={onClose} />}
                    {tab === 'type' && <TypePanel type={type} onSave={onSave} onClose={onClose} />}
                    {tab === 'upload' && <UploadPanel type={type} onSave={onSave} onClose={onClose} />}
                </div>

                {savedSignatures.length > 0 && (
                    <div className="px-5 pb-5">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">{t('signEditor.savedSignatures')}</p>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {savedSignatures.map((sig, i) => (
                                <div key={i} className="relative group flex-shrink-0">
                                    <button
                                        onClick={() => onSave(sig.imgData, sig.imgUrl)}
                                        className="border-2 border-slate-100 rounded-xl p-3 hover:border-rose-400 transition-all"
                                    >
                                        <img src={sig.imgUrl} alt="" className="h-10 w-auto object-contain" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDeleteSaved(i); }}
                                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Draw Panel ──────────────────────────────────────────────────
function DrawPanel({ type, onSave, onClose }: { type: string; onSave: (d: Uint8Array, u: string) => void; onClose: () => void }) {
    const { t } = useTranslation();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [penColor, setPenColor] = useState('#1e293b');
    const [penSize, setPenSize] = useState(3);
    const [history, setHistory] = useState<ImageData[]>([]);
    const lastPos = useRef<{ x: number; y: number } | null>(null);

    const COLORS = ['#1e293b', '#dc2626', '#2563eb', '#16a34a', '#9333ea', '#ea580c'];

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d')!;
        canvas.width = 480;
        canvas.height = 160;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }, []);

    const getPos = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current!;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        if ('touches' in e) {
            return {
                x: (e.touches[0].clientX - rect.left) * scaleX,
                y: (e.touches[0].clientY - rect.top) * scaleY,
            };
        }
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    };

    const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        const pos = getPos(e);
        ctx.strokeStyle = penColor;
        ctx.lineWidth = penSize;
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        lastPos.current = pos;
        setIsDrawing(true);

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setHistory(prev => [...prev, imgData]);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || !lastPos.current) return;
        e.preventDefault();
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        const pos = getPos(e);
        ctx.strokeStyle = penColor;
        ctx.lineWidth = penSize;
        ctx.beginPath();
        ctx.moveTo(lastPos.current.x, lastPos.current.y);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        lastPos.current = pos;
    };

    const endDraw = () => {
        setIsDrawing(false);
        lastPos.current = null;
    };

    const undo = () => {
        if (history.length === 0) return;
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        const prev = history[history.length - 1];
        ctx.putImageData(prev, 0, 0);
        setHistory(h => h.slice(0, -1));
    };

    const clear = () => {
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setHistory([]);
    };

    const handleSave = () => {
        const canvas = canvasRef.current!;
        canvas.toBlob((blob) => {
            if (!blob) return;
            blob.arrayBuffer().then(buf => {
                const url = URL.createObjectURL(blob);
                onSave(new Uint8Array(buf), url);
                onClose();
            });
        }, 'image/png');
    };

    return (
        <div className="space-y-4">
            <div className="bg-gradient-to-b from-slate-50 to-white rounded-xl border-2 border-dashed border-slate-200 overflow-hidden">
                <canvas
                    ref={canvasRef}
                    className="w-full cursor-crosshair touch-none"
                    style={{ aspectRatio: '3/1' }}
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={endDraw}
                    onMouseLeave={endDraw}
                    onTouchStart={startDraw}
                    onTouchMove={draw}
                    onTouchEnd={endDraw}
                />
            </div>

            <div className="flex items-center gap-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('signEditor.penColor')}</p>
                <div className="flex gap-1.5">
                    {COLORS.map(c => (
                        <button
                            key={c}
                            onClick={() => setPenColor(c)}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${penColor === c ? 'border-rose-500 scale-110 ring-2 ring-rose-200' : 'border-slate-200 hover:scale-110'}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('signEditor.penSize')}</p>
                <div className="flex gap-2">
                    {[
                        { size: 2, label: t('signEditor.thin') },
                        { size: 4, label: t('signEditor.medium') },
                        { size: 7, label: t('signEditor.thick') },
                    ].map(({ size, label }) => (
                        <button
                            key={size}
                            onClick={() => setPenSize(size)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                penSize === size ? 'bg-rose-500 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex items-center justify-between pt-2">
                <div className="flex gap-2">
                    <button onClick={undo} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-600 transition-all">
                        <Undo2 className="w-3.5 h-3.5" /> {t('signEditor.undo')}
                    </button>
                    <button onClick={clear} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-600 transition-all">
                        <Trash2 className="w-3.5 h-3.5" /> {t('signEditor.clearCanvas')}
                    </button>
                </div>
                <div className="flex gap-2">
                    <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-600 transition-all">
                        {t('signEditor.cancel')}
                    </button>
                    <button onClick={handleSave} className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold shadow-md transition-all active:scale-95 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" /> {t('signEditor.saveSignature')}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Type Panel ──────────────────────────────────────────────────
function TypePanel({ type, onSave, onClose }: { type: string; onSave: (d: Uint8Array, u: string) => void; onClose: () => void }) {
    const { t } = useTranslation();
    const [text, setText] = useState('');
    const [selectedFont, setSelectedFont] = useState(0);
    const [fontSize, setFontSize] = useState(48);
    const [textColor, setTextColor] = useState('#1e293b');
    const previewRef = useRef<HTMLDivElement>(null);

    const COLORS = ['#1e293b', '#dc2626', '#2563eb', '#16a34a', '#9333ea', '#ea580c'];

    const handleSave = async () => {
        if (!text.trim()) return;
        const div = previewRef.current!;
        const canvas = document.createElement('canvas');
        const scale = 2;
        const rect = div.getBoundingClientRect();
        canvas.width = rect.width * scale;
        canvas.height = rect.height * scale;
        const ctx = canvas.getContext('2d')!;
        ctx.scale(scale, scale);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, rect.width, rect.height);

        const fontFamily = SIGNATURE_FONTS[selectedFont].name;
        ctx.font = `${fontSize}px "${fontFamily}", cursive`;
        ctx.fillStyle = textColor;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillText(text, rect.width / 2, rect.height / 2);

        canvas.toBlob((blob) => {
            if (!blob) return;
            blob.arrayBuffer().then(buf => {
                const url = URL.createObjectURL(blob);
                onSave(new Uint8Array(buf), url);
                onClose();
            });
        }, 'image/png');
    };

    return (
        <div className="space-y-4">
            <div
                ref={previewRef}
                className="w-full h-32 bg-white rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden"
            >
                {text ? (
                    <p
                        className="truncate px-4"
                        style={{
                            fontFamily: `"${SIGNATURE_FONTS[selectedFont].name}", cursive`,
                            fontSize: `${Math.min(fontSize, 40)}px`,
                            color: textColor,
                        }}
                    >
                        {text}
                    </p>
                ) : (
                    <p className="text-slate-300 text-sm">{t('signEditor.typeYourName')}</p>
                )}
            </div>

            <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t('signEditor.typeYourName')}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
            />

            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('signEditor.chooseFont')}</p>
                <div className="grid grid-cols-3 gap-2">
                    {SIGNATURE_FONTS.map((f, i) => (
                        <button
                            key={i}
                            onClick={() => setSelectedFont(i)}
                            className={`p-2.5 rounded-xl border-2 text-center transition-all ${
                                selectedFont === i ? 'border-rose-500 bg-rose-50 shadow-md' : 'border-slate-100 hover:border-slate-300'
                            }`}
                        >
                            <p style={{ fontFamily: `"${f.name}", cursive`, fontSize: '14px' }} className="text-slate-700">
                                {text || 'Abc'}
                            </p>
                            <p className="text-[8px] text-slate-400 mt-1 font-bold">{f.name}</p>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('signEditor.penColor')}</p>
                <div className="flex gap-1.5">
                    {COLORS.map(c => (
                        <button
                            key={c}
                            onClick={() => setTextColor(c)}
                            className={`w-6 h-6 rounded-full border-2 transition-all ${textColor === c ? 'border-rose-500 scale-110 ring-2 ring-rose-200' : 'border-slate-200 hover:scale-110'}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                </div>
            </div>

            <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('signEditor.penSize')}</p>
                <input
                    type="range"
                    min={24}
                    max={72}
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full accent-rose-500"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                    <span>24px</span>
                    <span>{fontSize}px</span>
                    <span>72px</span>
                </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
                <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-600 transition-all">
                    {t('signEditor.cancel')}
                </button>
                <button onClick={handleSave} disabled={!text.trim()} className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold shadow-md transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                    <Check className="w-3.5 h-3.5" /> {t('signEditor.saveSignature')}
                </button>
            </div>
        </div>
    );
}

// ─── Upload Panel ────────────────────────────────────────────────
function UploadPanel({ type, onSave, onClose }: { type: string; onSave: (d: Uint8Array, u: string) => void; onClose: () => void }) {
    const { t } = useTranslation();
    const [preview, setPreview] = useState<string | null>(null);
    const [fileData, setFileData] = useState<Uint8Array | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result as string;
            setPreview(result);
            setFileData(new Uint8Array(e.target?.result as ArrayBuffer));
        };
        reader.readAsArrayBuffer(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) handleFile(file);
    };

    const handleSave = () => {
        if (!preview || !fileData) return;
        onSave(fileData, preview);
        onClose();
    };

    return (
        <div className="space-y-4">
            <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

            {preview ? (
                <div className="relative bg-white rounded-xl border-2 border-slate-200 p-6 flex items-center justify-center">
                    <img src={preview} alt="preview" className="max-h-32 w-auto object-contain" />
                    <button
                        onClick={() => { setPreview(null); setFileData(null); }}
                        className="absolute top-2 right-2 p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-400 transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            ) : (
                <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileRef.current?.click()}
                    className="w-full h-40 bg-gradient-to-b from-slate-50 to-white rounded-xl border-2 border-dashed border-slate-200 hover:border-rose-400 hover:bg-rose-50/30 transition-all cursor-pointer flex flex-col items-center justify-center gap-3"
                >
                    <UploadIcon className="w-8 h-8 text-slate-300" />
                    <p className="text-xs font-bold text-slate-400">{t('signEditor.dragDropOrClick')}</p>
                    <p className="text-[10px] text-slate-300">{t('signEditor.acceptsPng')}</p>
                </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
                <button onClick={onClose} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-600 transition-all">
                    {t('signEditor.cancel')}
                </button>
                <button onClick={handleSave} disabled={!preview} className="px-5 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold shadow-md transition-all active:scale-95 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                    <Check className="w-3.5 h-3.5" /> {t('signEditor.saveSignature')}
                </button>
            </div>
        </div>
    );
}

// ─── Field Button ────────────────────────────────────────────────
function FieldButton({ icon: Icon, label, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-rose-400 hover:bg-rose-50 transition-all group w-full"
        >
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-rose-100 group-hover:text-rose-500 transition-all">
                <Icon className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-600 group-hover:text-slate-800">{label}</span>
            <div className="ms-auto opacity-0 group-hover:opacity-100 transition-all">
                <Plus className="w-3.5 h-3.5 text-rose-500" />
            </div>
        </button>
    );
}

// ─── Floating Button ─────────────────────────────────────────────
function FloatingBtn({ icon: Icon, color, onClick, tooltip }: any) {
    return (
        <div className="relative group">
            <button
                onClick={onClick}
                className={`w-12 h-12 rounded-2xl ${color} text-white flex items-center justify-center shadow-lg transition-all active:scale-90 hover:-translate-y-1 hover:brightness-110`}
            >
                <Icon className="w-6 h-6" />
            </button>
            <div className="absolute left-16 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-[10px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">
                {tooltip}
                <div className="absolute left-0 top-1/2 -translate-x-full -translate-y-1/2 border-8 border-transparent border-r-slate-900" />
            </div>
        </div>
    );
}

// ─── Editor Page ─────────────────────────────────────────────────
function EditorPage({ pageNum, pdf, zoom, items, activeId, editingId, onSelect, onClick, updateItem, removeItem, onEditFinish }: any) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [size, setSize] = useState({ w: 0, h: 0 });

    useEffect(() => {
        const render = async () => {
            const page = await pdf.getPage(pageNum);
            const vp = page.getViewport({ scale: 1.5 * zoom });
            setSize({ w: vp.width, h: vp.height });
            const canvas = canvasRef.current;
            if (canvas) {
                canvas.width = vp.width; canvas.height = vp.height;
                const context = canvas.getContext('2d')!;
                await page.render({ canvasContext: context, viewport: vp, canvas }).promise;
            }
        };
        render();
    }, [pdf, pageNum, zoom]);

    return (
        <div className="flex flex-col items-center">
            <div className="mb-4 text-[10px] font-black text-slate-400 uppercase tracking-[4px]">P. {pageNum}</div>
            <div
                className="relative bg-white shadow-2xl transition-all duration-300 group cursor-crosshair"
                style={{ width: size.w, height: size.h }}
                onClick={onClick}
            >
                <canvas ref={canvasRef} className="block pointer-events-none" />
                {items.map((it: PageItem) => (
                    <DraggableItem
                        key={it.id} item={it} zoom={zoom}
                        active={activeId === it.id}
                        isEditing={editingId === it.id}
                        onSelect={(id: string) => onSelect(id)}
                        updateItem={(id: string, updates: any) => updateItem(id, updates)}
                        onRemove={(id: string) => removeItem(id)}
                        onEditFinish={onEditFinish}
                    />
                ))}
            </div>
        </div>
    );
}

// ─── Draggable Item ──────────────────────────────────────────────
function DraggableItem({ item, zoom, active, isEditing, onSelect, updateItem, onEditFinish }: any) {
    const { t } = useTranslation();
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [isRotating, setIsRotating] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (isEditing) return;
        e.stopPropagation();
        onSelect(item.id);
        setIsDragging(true);
    };

    const handleResizeDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsResizing(true);
    };

    const handleRotateDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsRotating(true);
    };

    useEffect(() => {
        if (isEditing && inputRef.current) inputRef.current.focus();
    }, [isEditing]);

    useEffect(() => {
        if (!isDragging && !isResizing && !isRotating) return;
        const handleMove = (e: MouseEvent) => {
            const parent = (e.target as HTMLElement).closest('.relative');
            if (!parent) return;
            const rect = parent.getBoundingClientRect();
            if (isDragging) {
                const nx = ((e.clientX - rect.left) / rect.width) * 100;
                const ny = ((e.clientY - rect.top) / rect.height) * 100;
                updateItem(item.id, { x: nx, y: ny });
            } else if (isResizing) {
                const nx = ((e.clientX - rect.left) / rect.width) * 100;
                const ny = ((e.clientY - rect.top) / rect.height) * 100;
                updateItem(item.id, { w: Math.abs(nx - item.x) * 2, h: Math.abs(ny - item.y) * 2 });
            } else if (isRotating) {
                const dx = e.clientX - (rect.left + (item.x / 100) * rect.width);
                const dy = e.clientY - (rect.top + (item.y / 100) * rect.height);
                updateItem(item.id, { rotation: Math.atan2(dy, dx) * (180 / Math.PI) + 90 });
            }
        };
        const handleUp = () => { setIsDragging(false); setIsResizing(false); setIsRotating(false); };
        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        return () => { window.removeEventListener('mousemove', handleMove); window.removeEventListener('mouseup', handleUp); };
    }, [isDragging, isResizing, isRotating, item.id, item.x, item.y, updateItem]);

    return (
        <div
            onMouseDown={handleMouseDown}
            className={`absolute group select-none flex items-center justify-center transition-shadow ${active ? 'ring-2 ring-rose-500 shadow-2xl z-50' : 'hover:ring-1 hover:ring-rose-300'}`}
            style={{
                left: `${item.x}%`, top: `${item.y}%`,
                width: `${item.w}%`, height: `${item.h}%`,
                transform: `translate(-50%, -50%) rotate(${item.rotation}deg)`,
            }}
        >
            <div className={`p-1 w-full h-full flex items-center justify-center ${item.type === 'signature' ? 'bg-rose-50/10' : 'bg-transparent'}`}>
                {item.type === 'signature' && item.imgUrl && (
                    <img src={item.imgUrl} className="max-w-full max-h-full object-contain pointer-events-none" alt="signature" />
                ) || (
                    isEditing ? (
                        <textarea
                            ref={inputRef}
                            defaultValue={item.content}
                            className="bg-transparent text-black resize-none outline-none overflow-hidden font-bold text-center border-none p-0 m-0 w-full h-full"
                            style={{
                                fontSize: `${(item.fontSize || 14) * zoom}px`,
                                color: item.color ? `rgb(${item.color.r * 255}, ${item.color.g * 255}, ${item.color.b * 255})` : 'black',
                            }}
                            onBlur={(e) => onEditFinish(item.id, e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEditFinish(item.id, e.currentTarget.value); } }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span className="font-bold whitespace-nowrap overflow-hidden select-none" style={{ fontSize: (item.fontSize || 14) * zoom }}>
                            {item.content || t('signEditor.doubleClickEdit')}
                        </span>
                    )
                )}
            </div>

            {active && !isEditing && (
                <>
                    <div onMouseDown={handleRotateDown} className="absolute -top-10 left-1/2 -translate-x-1/2 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center cursor-alias shadow-lg border-2 border-white">
                        <RotateCcw className="w-3 h-3 text-white" />
                    </div>
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-indigo-600" />
                    <div onMouseDown={handleResizeDown} className="absolute -bottom-1 -right-1 w-4 h-4 bg-rose-500 rounded-full cursor-nwse-resize shadow-md border-2 border-white" />
                    <div onMouseDown={handleResizeDown} className="absolute -bottom-1 -left-1 w-4 h-4 bg-rose-500 rounded-full cursor-nesw-resize shadow-md border-2 border-white" />
                    <div onMouseDown={handleResizeDown} className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full cursor-nesw-resize shadow-md border-2 border-white" />
                    <div onMouseDown={handleResizeDown} className="absolute -top-1 -left-1 w-4 h-4 bg-rose-500 rounded-full cursor-nwse-resize shadow-md border-2 border-white" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Move className="w-4 h-4 text-rose-500/50" />
                    </div>
                </>
            )}
        </div>
    );
}
