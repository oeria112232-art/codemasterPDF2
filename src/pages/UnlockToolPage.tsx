import { Unlock } from 'lucide-react';
import { createToolPage, handleUnlock } from './toolFactory';
export const UnlockToolPage = createToolPage({ icon: Unlock, translationKey: 'unlock', color: 'bg-purple-500', hasConfig: true, configType: 'password' }, handleUnlock);
