import { ToolPage } from '../components/ToolPage';
import { Scissors } from 'lucide-react';
import { PDFDocument } from '@cantoo/pdf-lib';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';

export function SplitPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const handleSplit = async (files: File[]) => {
    if (files.length === 0) return;

    try {
      const file = files[0];
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const numberOfPages = pdfDoc.getPageCount();

      if (numberOfPages > 50) {
        showToast(t('tools.split.largeFile'), 'info');
      }

      const zip = new JSZip();
      const folder = zip.folder(file.name.replace('.pdf', '') + '_split');

      for (let i = 0; i < numberOfPages; i++) {
        const subPdf = await PDFDocument.create();
        const [copiedPage] = await subPdf.copyPages(pdfDoc, [i]);
        subPdf.addPage(copiedPage);
        const pdfBytes = await subPdf.save();
        folder?.file(`page_${i + 1}.pdf`, pdfBytes);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${file.name.replace('.pdf', '')}_split.zip`);
      showToast(t('tools.split.splitSuccess'), 'success');
    } catch (err) {
      console.error(err);
      showToast(t('tools.split.splitError'), 'error');
    }
  };

  return (
    <ToolPage
      icon={Scissors}
      title={t('tools.split.title')}
      description={t('tools.split.description')}
      color="bg-sky-500"
      onProcess={handleSplit}
    />
  );
}
