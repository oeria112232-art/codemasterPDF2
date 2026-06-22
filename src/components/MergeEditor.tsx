import React, { useEffect, useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
    X, Loader2, ArrowRight, Plus, Trash2, RotateCw,
    GripVertical, FileText, Combine, ArrowUp, ArrowDown
} from 'lucide-react';
import { PDFDocument, degrees } from '@cantoo/pdf-lib';
import { saveAs } from 'file-saver';
import { useToast } from '../contexts/ToastContext';
import { useTranslation } from 'react-i18next';

// Setup worker
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

interface MergeFile {
    id: string;
    file: File;
    rotation: number;
    thumbnail?: string;
    numPages: number;
}

interface MergeEditorProps {
    files: File[];
    onClose: () => void;
}

export function MergeEditor({ files: initialFiles, onClose }: MergeEditorProps) {
    const { t, i18n } = useTranslation();
    const { showToast } = useToast();
    const isRtl = i18n.language === 'ar';

    const [files, setFiles] = useState<MergeFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [dragOverId, setDragOverId] = useState<string | null>(null);
    const draggingIdParams = useRef<string | null>(null);

    // Initial load
    useEffect(() => {
        const loadFiles = async () => {
            const newFiles: MergeFile[] = [];
            for (const f of initialFiles) {
                const id = Math.random().toString(36).substr(2, 9);
                newFiles.push({ id, file: f, rotation: 0, numPages: 0 });
            }
            setFiles(newFiles);
            setLoading(false);

            // Process thumbnails in background
            newFiles.forEach(async (mf) => {
                try {
                    const buffer = await mf.file.arrayBuffer();
                    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
                    const page = await pdf.getPage(1);
                    const viewport = page.getViewport({ scale: 0.3 });
                    const canvas = document.createElement('canvas');
                    canvas.width = viewport.width;
                    canvas.height = viewport.height;
                    const context = canvas.getContext('2d')!;
                    await page.render({ canvasContext: context, viewport, canvas }).promise;

                    setFiles(prev => prev.map(p => p.id === mf.id ? {
                        ...p,
                        thumbnail: canvas.toDataURL(),
                        numPages: pdf.numPages
                    } : p));
                } catch (e) {
                    console.error("Thumbnail error", e);
                }
            });
        };
        loadFiles();
    }, [initialFiles]);

    const handleAddMore = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return;
        const newFileList = Array.from(e.target.files);
        const newMergeFiles: MergeFile[] = [];

        for (const f of newFileList) {
            const id = Math.random().toString(36).substr(2, 9);
            newMergeFiles.push({ id, file: f, rotation: 0, numPages: 0 });
        }

        setFiles(prev => [...prev, ...newMergeFiles]);

        // Process thumbnails
        newMergeFiles.forEach(async (mf) => {
            try {
                const buffer = await mf.file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
                const page = await pdf.getPage(1);
                const viewport = page.getViewport({ scale: 0.3 });
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const context = canvas.getContext('2d')!;
                await page.render({ canvasContext: context, viewport, canvas }).promise;

                setFiles(prev => prev.map(p => p.id === mf.id ? {
                    ...p,
                    thumbnail: canvas.toDataURL(),
                    numPages: pdf.numPages
                } : p));
            } catch (e) { console.error(e); }
        });
    };

    const handleMerge = async () => {
        if (files.length < 2) {
            showToast(t('toolPage.selectFile'), 'error');
            return;
        }

        try {
            setProcessing(true);
            const mergedPdf = await PDFDocument.create();

            for (const mf of files) {
                const srcPdf = await PDFDocument.load(await mf.file.arrayBuffer());
                const copiedPages = await mergedPdf.copyPages(srcPdf, srcPdf.getPageIndices());
                copiedPages.forEach(p => {
                    p.setRotation(degrees(p.getRotation().angle + mf.rotation));
                    mergedPdf.addPage(p);
                });
            }

            saveAs(new Blob([await mergedPdf.save() as any]), `merged_${files.length}_files.pdf`);
            showToast(t('editor.exportSuccess'), 'success');
            onClose();
        } catch (err) {
            console.error(err);
            showToast(t('common.error'), 'error');
        } finally {
            setProcessing(false);
        }
    };

    const rotateFile = (id: string) => {
        setFiles(prev => prev.map(f => f.id === id ? { ...f, rotation: (f.rotation + 90) % 360 } : f));
    };

    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const moveFile = (dragIndex: number, hoverIndex: number) => {
        const result = Array.from(files);
        const [removed] = result.splice(dragIndex, 1);
        result.splice(hoverIndex, 0, removed);
        setFiles(result);
    };

    // Simple Drag and Drop
    const handleDragStart = (e: React.DragEvent, id: string) => {
        draggingIdParams.current = id;
        e.dataTransfer.effectAllowed = "move";
        // e.target.style.opacity = '0.5';
    };

    const handleDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault();
        setDragOverId(id);
    };

    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        const draggedId = draggingIdParams.current;
        if (!draggedId || draggedId === targetId) return;

        const dragIndex = files.findIndex(f => f.id === draggedId);
        const dropIndex = files.findIndex(f => f.id === targetId);
        moveFile(dragIndex, dropIndex);
        setDragOverId(null);
        draggingIdParams.current = null;
    };

    if (loading) return (
        <div className="fixed inset-0 z-[100] bg-slate-900 flex items-center justify-center">
            <Loader2 className="w-12 h-12 text-rose-500 animate-spin" />
        </div>
    );

    return (
        <div className={`fixed inset-0 z-[100] bg-[#f8f9fa] flex flex-col font-sans overflow-hidden ${isRtl ? 'rtl' : 'ltr'}`}>
            <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 z-30 shadow-sm">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-all"><X className="w-5 h-5" /></button>
                    <div className="h-8 w-[1px] bg-slate-200 mx-2" />
                    <div className="flex flex-col">
                        <h2 className="text-sm font-bold text-slate-900">{t('tools.merge.title')}</h2>
                        <span className="text-[10px] text-slate-400 font-medium">PDF Tool · Merge Engine</span>
                    </div>
                </div>
                <button
                    onClick={handleMerge} disabled={processing || files.length < 2}
                    className="bg-rose-500 hover:bg-rose-600 text-white px-8 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-rose-200 active:scale-95 disabled:opacity-50"
                >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Combine className="w-4 h-4" />}
                    {t('tools.merge.title')}
                </button>
            </header>

            <main className="flex-1 overflow-y-auto p-12 custom-scrollbar bg-[#eef0f2]">
                <div className="max-w-6xl mx-auto">
                    {files.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-300">
                            <Combine className="w-20 h-20 text-slate-200 mb-6" />
                            <p className="text-slate-400 font-bold mb-6">No files selected</p>
                            <label className="px-8 py-4 bg-rose-500 text-white rounded-2xl font-bold cursor-pointer hover:bg-rose-600 shadow-xl shadow-rose-200 transition-all">
                                <input type="file" multiple accept=".pdf" className="hidden" onChange={handleAddMore} />
                                Select PDF Files
                            </label>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                            {files.map((file, idx) => (
                                <div
                                    key={file.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, file.id)}
                                    onDragOver={(e) => handleDragOver(e, file.id)}
                                    onDrop={(e) => handleDrop(e, file.id)}
                                    className={`relative bg-white rounded-2xl shadow-xl transition-all duration-300 group hover:-translate-y-1 ${dragOverId === file.id ? 'border-2 border-rose-500 scale-105 z-10' : 'border border-slate-100'}`}
                                >
                                    {/* Grip Handle */}
                                    <div className="absolute top-2 left-1/2 -translate-x-1/2 text-slate-300 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                        <GripVertical className="w-4 h-4" />
                                    </div>

                                    <div className="p-3">
                                        <div className="relative aspect-[1/1.4] bg-slate-50 rounded-xl overflow-hidden mb-3 flex items-center justify-center border border-slate-100">
                                            {file.thumbnail ? (
                                                <img
                                                    src={file.thumbnail}
                                                    style={{ transform: `rotate(${file.rotation}deg)` }}
                                                    className="w-full h-full object-contain transition-transform duration-300"
                                                    alt="thumb"
                                                />
                                            ) : (
                                                <Loader2 className="w-6 h-6 text-slate-200 animate-spin" />
                                            )}

                                            {/* Overlay Actions */}
                                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 backdrop-blur-[1px]">
                                                <button onClick={() => rotateFile(file.id)} className="p-2 bg-white/20 hover:bg-white text-white hover:text-slate-900 rounded-full backdrop-blur-md transition-all">
                                                    <RotateCw className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => removeFile(file.id)} className="p-2 bg-rose-500/80 hover:bg-rose-500 text-white rounded-full backdrop-blur-md transition-all shadow-lg">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="absolute top-2 right-2 w-6 h-6 bg-slate-900 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg pointer-events-none">
                                                {idx + 1}
                                            </div>
                                        </div>

                                        <div className="px-1">
                                            <p className="text-xs font-bold text-slate-700 truncate mb-1" title={file.file.name}>{file.file.name}</p>
                                            <p className="text-[10px] text-slate-400 font-medium">{file.numPages > 0 ? `${file.numPages} Pages` : 'Loading...'}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Add More Card */}
                            <label className="flex flex-col items-center justify-center gap-4 bg-slate-100 hover:bg-slate-200 rounded-2xl border-2 border-dashed border-slate-300 cursor-pointer transition-all min-h-[280px] group">
                                <input type="file" multiple accept=".pdf" className="hidden" onChange={handleAddMore} />
                                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                    <Plus className="w-8 h-8 text-rose-500" />
                                </div>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Add Files</span>
                            </label>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
