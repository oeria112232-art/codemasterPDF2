import { Lock } from 'lucide-react';
import { createToolPage, handleProtect } from './toolFactory';
export const ProtectToolPage = createToolPage({ icon: Lock, translationKey: 'protect', color: 'bg-indigo-600', hasConfig: true, configType: 'password' }, handleProtect);
