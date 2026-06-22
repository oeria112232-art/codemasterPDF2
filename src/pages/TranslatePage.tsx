import { useState } from 'react';
import { ToolPage } from '../components/ToolPage';
import { TranslateEditor } from '../components/TranslateEditor';
import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function TranslatePage() {
    const { t } = useTranslation();
    const [activeFile, setActiveFile] = useState<File | null>(null);

    const handleProcess = async (files: File[]) => {
        if (files && files.length > 0) {
            setActiveFile(files[0]);
        }
    };

    if (activeFile) {
        return (
            <TranslateEditor 
                file={activeFile} 
                onClose={() => setActiveFile(null)} 
            />
        );
    }

    return (
        <div className="bg-slate-50 dark:bg-[#020617] relative">
            <ToolPage
                icon={Languages}
                title={t('tools.translatePdf.title') || "Translate PDF"}
                description={t('tools.translatePdf.description') || "Translate PDF documents between Arabic and English with high fidelity."}
                color="bg-indigo-600"
                onProcess={handleProcess}
            />
        </div>
    );
}
