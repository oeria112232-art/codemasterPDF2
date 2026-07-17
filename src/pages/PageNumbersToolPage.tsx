import { FilePlus2 } from 'lucide-react';
import { createToolPage, handlePageNumbers } from './toolFactory';
export const PageNumbersToolPage = createToolPage({ icon: FilePlus2, translationKey: 'pageNumbers', color: 'bg-lime-600', hasConfig: true, configType: 'page-position' }, handlePageNumbers);
