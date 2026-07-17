import { Mail, Phone, MapPin, Send, Loader2, Zap, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';

export function ContactPage() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: t('contact.enterpriseOption'),
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const whatsappMessage = `${t('contactPage.whatsappLabel')}\n\n${t('contactPage.nameLabel')} ${formData.name}\n${t('contactPage.emailLabel')} ${formData.email}\n${t('contactPage.subjectLabel')} ${formData.subject}\n${t('contactPage.messageLabel')} ${formData.message}`;
    const whatsappUrl = `https://wa.me/9647771632241?text=${encodeURIComponent(whatsappMessage)}`;

    window.open(whatsappUrl, '_blank');

    setTimeout(() => {
      setLoading(false);
      showToast(t('contact.success'), 'success');
      setFormData({ name: '', email: '', subject: t('contact.enterpriseOption'), message: '' });
    }, 1000);
  };

  return (
    <div className="bg-slate-50 dark:bg-[#020617] py-20 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-5 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400 text-xs font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5" /> {t('contact.connection')}
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold text-slate-900 dark:text-white mb-5 tracking-tight leading-tight">
              {t('contact.future')}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-base font-normal leading-relaxed mb-10 max-w-md">
              {t('contact.futureDesc')}
            </p>

            <div className="space-y-6">
              <ContactItem icon={Mail} title={t('contact.secureChannel')} val="bbjy9821@gmail.com" />
              <ContactItem icon={Phone} title={t('contact.directLine')} val="07771632241" href="https://wa.me/9647771632241" />
              <ContactItem icon={MapPin} title={t('contact.hqCluster')} val="Maysan, Iraq" />
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="bg-white dark:bg-slate-900 rounded-xl p-8 md:p-10 shadow-sm border border-slate-200/80 dark:border-slate-800/80 relative">
              <div className="absolute top-6 right-8">
                <Zap className="w-6 h-6 text-indigo-500/15" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="group">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('contact.identityLabel')}</label>
                    <input
                      required
                      type="text"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg outline-none text-sm font-medium text-slate-900 dark:text-white transition-all"
                    />
                  </div>
                  <div className="group">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('contact.emailLabel')}</label>
                    <input
                      required
                      type="email"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg outline-none text-sm font-medium text-slate-900 dark:text-white transition-all"
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('contact.subjectLabel')}</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg outline-none text-sm font-medium text-slate-900 dark:text-white transition-all appearance-none cursor-pointer"
                  >
                    <option>{t('contact.enterpriseOption')}</option>
                    <option>{t('contact.supportOption')}</option>
                    <option>{t('contact.partnershipOption')}</option>
                    <option>{t('contact.generalOption')}</option>
                  </select>
                </div>

                <div className="group">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('contact.messageLabel')}</label>
                  <textarea
                    required
                    rows={4}
                    placeholder={t('contact.messagePlaceholder')}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg outline-none text-sm font-medium text-slate-900 dark:text-white transition-all resize-none"
                  />
                </div>

                <button disabled={loading} type="submit" className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-sm shadow-lg shadow-indigo-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {loading ? t('contact.sending') : t('contact.send')}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContactItem({ icon: Icon, title, val, href }: any) {
  const content = (
    <div className={`flex items-center gap-4 group ${href ? 'cursor-pointer' : ''}`}>
      <div className="w-11 h-11 bg-white dark:bg-slate-900 rounded-lg flex items-center justify-center text-slate-400 border border-slate-200 dark:border-slate-800 shadow-sm group-hover:bg-indigo-600 group-hover:text-white group-hover:border-indigo-600 transition-all">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs font-medium text-slate-400 mb-0.5">{title}</p>
        <p className="text-base font-semibold text-slate-900 dark:text-white">{val}</p>
      </div>
    </div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block">
        {content}
      </a>
    );
  }

  return content;
}
