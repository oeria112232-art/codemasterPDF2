import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
    X, Type, Loader2, Trash2,
    ZoomIn, ZoomOut, Move, Settings2,
    Plus, User, FileSignature, Calendar, MoreVertical,
    Save, Download, FileBadge, RotateCcw
} from 'lucide-react';
import { PDFDocument, rgb, StandardFonts, degrees } from '@cantoo/pdf-lib';
import { saveAs } from 'file-saver';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

// Setup worker
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

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
    color?: { r: number, g: number, b: number };
    fontSize?: number;
}

interface SignEditorProps {
    file: File;
    onClose: () => void;
}

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

    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadPdf = async () => {
            try {
                const buffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
                setPdfProxy(pdf);
                setNumPages(pdf.numPages);

                // Generate thumbnails
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
    }, [file, onClose, showToast, t]);

    const addItem = async (type: PageItem['type'], pageNum: number = 1) => {
        const id = Math.random().toString(36).substr(2, 9);
        let newItem: PageItem = {
            id, page: pageNum, x: 50, y: 50, type, w: 15, h: 5, rotation: 0
        };

        if (type === 'text') {
            newItem = { ...newItem, content: '', fontSize: 24, color: { r: 0, g: 0, b: 0 }, h: 8 };
            setItems([...items, newItem]);
            setActiveId(id);
            setEditingId(id);
        } else if (type === 'date') {
            newItem = { ...newItem, content: new Date().toLocaleDateString(), fontSize: 24, h: 6 };
            setItems([...items, newItem]);
            setActiveId(id);
        } else if (type === 'signature' || type === 'initials') {
            fileInputRef.current?.click();
            return;
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile || !pdfProxy) return;

        const buffer = await selectedFile.arrayBuffer();
        const url = URL.createObjectURL(selectedFile);
        const img = new Image();
        img.onload = async () => {
            const id = Math.random().toString(36).substr(2, 9);
            const aspect = img.naturalWidth / img.naturalHeight;

            const newItem: PageItem = {
                id, page: 1, x: 50, y: 50, type: 'signature',
                imgData: new Uint8Array(buffer), imgUrl: url,
                w: 20, h: 20 / aspect, rotation: 0
            };
            setItems([...items, newItem]);
            setActiveId(id);
        };
        img.src = url;
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

                if (item.type === 'image' || item.type === 'signature') {
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
                        y: pdfY - ((item.h / 200) * height), // Approximate center offset fix
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
                                    <p className="text-sm font-bold text-slate-800 truncate">{user?.email || 'Guest User'}</p>
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

                        {activeId && (
                            <div className="mt-8 pt-8 border-t border-slate-100 space-y-6 animate-in slide-in-from-bottom-4">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Edit Current Item</p>
                                <div className="flex flex-col gap-4">
                                    <button
                                        onClick={() => setItems(prev => prev.filter(it => it.id !== activeId))}
                                        className="flex items-center justify-center gap-2 p-3 bg-rose-500 text-white rounded-xl text-xs font-bold hover:bg-rose-600 transition-all shadow-lg shadow-rose-200"
                                    >
                                        <Trash2 className="w-4 h-4" /> Delete Field
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </aside>

                <main className="flex-1 bg-[#eef0f2] overflow-hidden flex relative">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-3">
                        <FloatingBtn icon={Plus} color="bg-rose-500 shadow-rose-200" onClick={() => addItem('signature')} tooltip="Add Signature" />
                        <FloatingBtn icon={User} color="bg-indigo-500 shadow-indigo-200" tooltip="Manage Signers" />
                        <FloatingBtn icon={Download} color="bg-slate-800 shadow-slate-200" onClick={handleSave} tooltip="Export Result" />
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
        </div>
    );
}

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

function DraggableItem({ item, zoom, active, isEditing, onSelect, updateItem, onEditFinish }: any) {
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
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
        }
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
                const nw = Math.abs(nx - item.x) * 2;
                const nh = Math.abs(ny - item.y) * 2;
                updateItem(item.id, { w: nw, h: nh });
            } else if (isRotating) {
                const dx = e.clientX - (rect.left + (item.x / 100) * rect.width);
                const dy = e.clientY - (rect.top + (item.y / 100) * rect.height);
                const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
                updateItem(item.id, { rotation: angle });
            }
        };

        const handleUp = () => {
            setIsDragging(false);
            setIsResizing(false);
            setIsRotating(false);
        };

        window.addEventListener('mousemove', handleMove);
        window.addEventListener('mouseup', handleUp);
        return () => {
            window.removeEventListener('mousemove', handleMove);
            window.removeEventListener('mouseup', handleUp);
        };
    }, [isDragging, isResizing, isRotating, item.id, item.x, item.y, updateItem]);

    return (
        <div
            onMouseDown={handleMouseDown}
            className={`absolute group select-none flex items-center justify-center transition-shadow ${active ? 'ring-2 ring-rose-500 shadow-2xl z-50' : 'hover:ring-1 hover:ring-rose-300'
                }`}
            style={{
                left: `${item.x}%`, top: `${item.y}%`,
                width: `${item.w}%`,
                height: `${item.h}%`,
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
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        onEditFinish(item.id, e.currentTarget.value);
                                    }
                                }}
                                onClick={(e) => e.stopPropagation()}
                            />
                        ) : (
                            <span
                                className="font-bold whitespace-nowrap overflow-hidden select-none"
                                style={{ fontSize: (item.fontSize || 14) * zoom }}>
                                {item.content || 'Double click to edit'}
                            </span>
                        )
                    )}
            </div>

            {active && !isEditing && (
                <>
                    {/* Rotate Handle */}
                    <div
                        onMouseDown={handleRotateDown}
                        className="absolute -top-10 left-1/2 -translate-x-1/2 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center cursor-alias shadow-lg border-2 border-white"
                    >
                        <RotateCcw className="w-3 h-3 text-white" />
                    </div>
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-indigo-600" />

                    {/* Resize Handle */}
                    <div
                        onMouseDown={handleResizeDown}
                        className="absolute -bottom-1 -right-1 w-4 h-4 bg-rose-500 rounded-full cursor-nwse-resize shadow-md border-2 border-white"
                    />
                    <div
                        onMouseDown={handleResizeDown}
                        className="absolute -bottom-1 -left-1 w-4 h-4 bg-rose-500 rounded-full cursor-nesw-resize shadow-md border-2 border-white"
                    />
                    <div
                        onMouseDown={handleResizeDown}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full cursor-nesw-resize shadow-md border-2 border-white"
                    />
                    <div
                        onMouseDown={handleResizeDown}
                        className="absolute -top-1 -left-1 w-4 h-4 bg-rose-500 rounded-full cursor-nwse-resize shadow-md border-2 border-white"
                    />

                    {/* Drag Handle Icon */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Move className="w-4 h-4 text-rose-500/50" />
                    </div>
                </>
            )}
        </div>
    );
}
