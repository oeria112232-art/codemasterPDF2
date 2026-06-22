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
    subject: 'Enterprise Integration',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Format message for WhatsApp
    const whatsappMessage = `*New Contact Request*\n\n*Name:* ${formData.name}\n*Email:* ${formData.email}\n*Subject:* ${formData.subject}\n*Message:* ${formData.message}`;
    const whatsappUrl = `https://wa.me/9647771632241?text=${encodeURIComponent(whatsappMessage)}`;

    // Open WhatsApp
    window.open(whatsappUrl, '_blank');

    setTimeout(() => {
      setLoading(false);
      showToast(t('contact.success'), 'success');
      setFormData({ name: '', email: '', subject: 'Enterprise Integration', message: '' });
    }, 1000);
  };

  return (
    <div className="bg-slate-50 dark:bg-[#020617] py-24 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-500/5 blur-[150px] rounded-full -z-10 animate-pulse" />

      <div className="max-w-7xl mx-auto px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">

          {/* Left Side - Info */}
          <div className="lg:col-span-5 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-[10px] font-black uppercase tracking-[4px] mb-8">
              <Sparkles className="w-4 h-4" /> {t('contact.connection')}
            </div>
            <h1 className="text-6xl font-black text-slate-900 dark:text-white mb-6 tracking-tighter leading-none">
              {t('contact.future')}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-lg font-medium leading-relaxed mb-12 max-w-md">
              {t('contact.futureDesc')}
            </p>

            <div className="space-y-8">
              <ContactItem icon={Mail} title={t('contact.secureChannel')} val="info@codemaster.com" />
              <ContactItem icon={Phone} title={t('contact.directLine')} val="07771632241" href="https://wa.me/9647771632241" />
              <ContactItem icon={MapPin} title={t('contact.hqCluster')} val="Maysan, Iraq" />
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="lg:col-span-7">
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-12 shadow-2xl border border-slate-100 dark:border-slate-800 relative">
              <div className="absolute top-8 right-12">
                <Zap className="w-8 h-8 text-indigo-500/20" />
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1 group-focus-within:text-indigo-500 transition-colors">{t('contact.identityLabel')}</label>
                    <div className="relative">
                      <input
                        required
                        type="text"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/30 rounded-[2rem] outline-none font-medium text-slate-900 dark:text-white transition-all"
                      />
                    </div>
                  </div>
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1 group-focus-within:text-indigo-500 transition-colors">{t('contact.emailLabel')}</label>
                    <div className="relative">
                      <input
                        required
                        type="email"
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/30 rounded-[2rem] outline-none font-medium text-slate-900 dark:text-white transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1 group-focus-within:text-indigo-500 transition-colors">{t('contact.subjectLabel')}</label>
                  <select
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/30 rounded-[2rem] outline-none font-medium text-slate-900 dark:text-white transition-all appearance-none cursor-pointer"
                  >
                    <option>{t('contact.enterpriseOption')}</option>
                    <option>{t('contact.supportOption')}</option>
                    <option>{t('contact.partnershipOption')}</option>
                    <option>{t('contact.generalOption')}</option>
                  </select>
                </div>

                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1 group-focus-within:text-indigo-500 transition-colors">{t('contact.messageLabel')}</label>
                  <textarea
                    required
                    rows={5}
                    placeholder={t('contact.messagePlaceholder')}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-8 py-5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-500/30 rounded-[2rem] outline-none font-medium text-slate-900 dark:text-white transition-all resize-none"
                  />
                </div>

                <button disabled={loading} type="submit" className="w-full py-6 px-10 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2.5rem] font-black text-xs uppercase tracking-[4px] shadow-2xl shadow-indigo-600/30 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
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
    <div className={`flex items-center gap-6 group ${href ? 'cursor-pointer' : ''}`}>
      <div className="w-14 h-14 bg-white dark:bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-slate-400 border border-slate-100 dark:border-slate-800 shadow-xl group-hover:bg-indigo-600 group-hover:text-white transition-all group-hover:-rotate-6">
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
        <p className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{val}</p>
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
