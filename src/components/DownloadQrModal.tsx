import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Smartphone, Check, Copy, ExternalLink } from 'lucide-react';

interface DownloadQrModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DOWNLOAD_URL = 'https://www.financasproinvest.com.br/download';

export const DownloadQrModal: React.FC<DownloadQrModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(DOWNLOAD_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 md:p-10 max-w-md w-full shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Fechar modal"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 flex items-center justify-center shrink-0">
            <Smartphone size={24} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400 block">
              Aplicativo Mobile
            </span>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Instale no seu Celular
            </h3>
          </div>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-6">
          Aponte a câmera do seu smartphone para o QR Code abaixo e acesse a página de download do instalador oficial do <strong>Finanças Pro Invest</strong>.
        </p>

        {/* QR Code Container */}
        <div className="bg-slate-50 dark:bg-slate-800/50 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-6 flex flex-col items-center justify-center mb-6">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
            <QRCodeSVG
              value={DOWNLOAD_URL}
              size={190}
              level="H"
              includeMargin={false}
            />
          </div>
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-4">
            Compatível com Android
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handleCopy}
            className="w-full py-3.5 px-4 rounded-xl bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md"
          >
            {copied ? <Check size={16} className="text-emerald-400 dark:text-emerald-200" /> : <Copy size={16} />}
            <span>{copied ? 'Link de Download Copiado!' : 'Copiar Link para Enviar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DownloadQrModal;
