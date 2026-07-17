import { RotateCw } from 'lucide-react';
import { createToolPage, handleRotate } from './toolFactory';
export const RotateToolPage = createToolPage({ icon: RotateCw, translationKey: 'rotate', color: 'bg-rose-400' }, handleRotate);
