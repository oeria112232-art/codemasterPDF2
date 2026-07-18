import { useState, useEffect } from 'react';
import { ToolPage } from '../components/ToolPage';
import { FormInput, Loader2, Download, CheckCircle, RotateCcw } from 'lucide-react';
import { PDFDocument } from '@cantoo/pdf-lib';
import { saveAs } from 'file-saver';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

interface FieldInfo {
  name: string;
  type: string;
  value: string;
}

export function FillFormsPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [fields, setFields] = useState<FieldInfo[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState('');
  const [saved, setSaved] = useState(false);

  const handleFile = async (files: File[]) => {
    if (!files.length) return;
    setLoading(true);
    setFileName(files[0].name);
    setSaved(false);
    const buf = await files[0].arrayBuffer();
    setPdfBytes(buf);

    try {
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true } as any);
      const form = doc.getForm();
      const pdfFields = form.getFields();
      const fieldList: FieldInfo[] = [];
      const initialValues: Record<string, string> = {};

      for (const field of pdfFields) {
        const name = field.getName();
        let type = 'text';
        let value = '';
        try {
          if ('getText' in field) { value = (field as any).getText() || ''; type = 'text'; }
          else if ('getCheckBox' in field) { type = 'checkbox'; value = (field as any).isChecked() ? 'Yes' : 'No'; }
          else if ('getDropdown' in field) { type = 'dropdown'; value = (field as any).getSelected() || ''; }
          else if ('getRadioGroup' in field) { type = 'radio'; value = (field as any).getSelected() || ''; }
        } catch {}
        fieldList.push({ name, type, value });
        initialValues[name] = value;
      }

      setFields(fieldList);
      setValues(initialValues);
    } catch (err) {
      console.error(err);
      showToast(t('common.error'), 'error');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!pdfBytes) return;
    try {
      setLoading(true);
      const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true } as any);
      const form = doc.getForm();

      for (const field of fields) {
        const val = values[field.name] || '';
        try {
          const pdfField = form.getField(field.name);
          if (field.type === 'checkbox') {
            if ('setCheckBox' in pdfField) {
              if (val === 'Yes' || val === 'true') (pdfField as any).check();
              else (pdfField as any).uncheck();
            }
          } else if (field.type === 'dropdown') {
            if ('select' in pdfField && val) (pdfField as any).select(val);
          } else if (field.type === 'radio') {
            if ('select' in pdfField && val) (pdfField as any).select(val);
          } else {
            if ('setText' in pdfField) (pdfField as any).setText(val);
          }
        } catch {}
      }

      form.flatten();
      const bytes = await doc.save();
      saveAs(new Blob([bytes as any], { type: 'application/pdf' }), `filled_${fileName}`);
      setSaved(true);
      showToast(t('fillForms.complete'), 'success');
    } catch (err) {
      console.error(err);
      showToast(t('common.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  if (saved) {
    return (
      <div className="bg-slate-50 py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase">{t('fillForms.complete')}</h2>
          <p className="text-slate-500 mb-8">{fields.length} {t('fillForms.fieldsFound')}</p>
          <button onClick={() => { setFields([]); setValues({}); setPdfBytes(null); setSaved(false); setFileName(''); }}
            className="px-8 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center gap-2 mx-auto">
            <RotateCcw className="w-4 h-4" /> {t('fillForms.processAnother')}
          </button>
        </div>
      </div>
    );
  }

  if (fields.length > 0) {
    return (
      <div className="bg-slate-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black text-slate-900 mb-2">{t('fillForms.title')}</h1>
            <p className="text-slate-500 text-sm">{fileName} — {fields.length} {t('fillForms.fieldsFound')}</p>
          </div>
          <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-slate-100 space-y-4">
            {fields.map((field, i) => (
              <div key={i}>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                  {field.name} <span className="text-slate-300 normal-case">({field.type})</span>
                </label>
                {field.type === 'checkbox' ? (
                  <select value={values[field.name] || ''} onChange={(e) => setValues(prev => ({ ...prev, [field.name]: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all">
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                ) : (
                  <input type="text" value={values[field.name] || ''}
                    onChange={(e) => setValues(prev => ({ ...prev, [field.name]: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all" />
                )}
              </div>
            ))}
            <div className="flex gap-4 pt-4">
              <button onClick={() => { setFields([]); setValues({}); setPdfBytes(null); setFileName(''); }}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 transition-all flex items-center justify-center gap-2">
                <RotateCcw className="w-4 h-4" /> {t('common.cancel', 'Back')}
              </button>
              <button onClick={handleSave} disabled={loading}
                className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-rose-200 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {t('fillForms.downloadFilled')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-slate-50 py-12 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <Loader2 className="w-12 h-12 text-rose-500 animate-spin mx-auto mb-4" />
          <p className="text-sm text-slate-400 font-bold">{t('fillForms.filling')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-600 rounded-full mb-6">
            <FormInput className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-[2px]">{t('fillForms.badge')}</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-black text-slate-900 mb-4 tracking-tight">{t('fillForms.title')}</h1>
          <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto">{t('fillForms.description')}</p>
        </div>
        <div className="bg-white rounded-[3rem] p-1 shadow-2xl shadow-slate-200/50 border border-slate-100">
          <ToolPage icon={FormInput} title="" description="" color="bg-rose-500" onProcess={handleFile} hideContent={true} />
        </div>
      </div>
    </div>
  );
}
