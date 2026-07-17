import { LifeBuoy } from 'lucide-react';
import { createToolPage, handleRepair } from './toolFactory';
export const RepairToolPage = createToolPage({ icon: LifeBuoy, translationKey: 'repair', color: 'bg-red-500' }, handleRepair);
