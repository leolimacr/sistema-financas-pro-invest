import React, { useState } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  ExternalLink,
  Download,
  FileText,
} from 'lucide-react';

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileBase64: string | null;
  mimeType?: string | null;
  title?: string;
  transactionId?: string;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  isOpen,
  onClose,
  fileBase64,
  mimeType = 'image/jpeg',
  title = 'Visualização do Comprovante',
  transactionId = 'comprovante',
}) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  if (!isOpen || !fileBase64) return null;

  const isPdf = mimeType?.toLowerCase().includes('pdf');
  const dataUrl = `data:${mimeType || 'image/jpeg'};base64,${fileBase64}`;

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 4));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
  };
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleOpenInNewTab = () => {
    try {
      const byteCharacters = atob(fileBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType || 'image/jpeg' });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (e) {
      window.open(dataUrl, '_blank');
    }
  };

  const handleDownload = () => {
    const extension = isPdf ? 'pdf' : (mimeType?.split('/')[1] || 'jpg');
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `comprovante_${transactionId}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[92vh] bg-slate-900 rounded-3xl shadow-2xl border border-slate-700/60 flex flex-col overflow-hidden">
        {/* Barra de Ferramentas Superior */}
        <div className="px-4 py-3 bg-slate-800/90 border-b border-slate-700 flex flex-wrap items-center justify-between gap-2 text-white shrink-0">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-emerald-400 shrink-0" />
            <div>
              <h4 className="text-xs sm:text-sm font-bold truncate max-w-[200px] sm:max-w-xs">{title}</h4>
              <span className="text-[10px] text-slate-400">ID: {transactionId}</span>
            </div>
          </div>

          {/* Controles de Zoom e Visualização */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {!isPdf && (
              <>
                <button
                  onClick={handleZoomOut}
                  title="Diminuir Zoom"
                  disabled={zoom <= 0.5}
                  className="p-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-600 text-slate-200 disabled:opacity-40 transition-colors"
                >
                  <ZoomOut size={16} />
                </button>
                <span className="text-xs font-mono font-bold text-emerald-400 min-w-[45px] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  onClick={handleZoomIn}
                  title="Aumentar Zoom"
                  disabled={zoom >= 4}
                  className="p-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-600 text-slate-200 disabled:opacity-40 transition-colors"
                >
                  <ZoomIn size={16} />
                </button>
                <button
                  onClick={handleRotate}
                  title="Girar 90°"
                  className="p-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-600 text-slate-200 transition-colors"
                >
                  <RotateCw size={16} />
                </button>
                <button
                  onClick={handleReset}
                  title="Ajustar / 100%"
                  className="p-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-600 text-slate-200 transition-colors text-xs font-bold px-2"
                >
                  <RotateCcw size={14} className="inline mr-1" />
                  100%
                </button>
              </>
            )}

            <button
              onClick={handleOpenInNewTab}
              title="Abrir em Nova Aba (Zoom Nativo do Navegador)"
              className="p-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-600 text-sky-300 transition-colors flex items-center gap-1 text-xs font-bold px-2.5"
            >
              <ExternalLink size={14} />
              <span className="hidden sm:inline">Nova Aba</span>
            </button>

            <button
              onClick={handleDownload}
              title="Baixar Comprovante"
              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1 text-xs font-bold px-2.5"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Baixar</span>
            </button>

            <button
              onClick={onClose}
              title="Fechar"
              className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 transition-colors ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Área Central de Visualização com Scroll Livre */}
        <div className="flex-1 w-full overflow-auto bg-slate-950 p-4 flex items-center justify-center">
          {isPdf ? (
            <iframe
              src={dataUrl}
              title="Comprovante Pix PDF"
              className="w-full h-full rounded-xl border border-slate-800 bg-white"
            />
          ) : (
            <div className="flex items-center justify-center min-w-full min-h-full">
              <img
                src={dataUrl}
                alt="Comprovante Pix"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.15s ease-out',
                }}
                className="max-h-[82vh] max-w-full object-contain rounded-lg shadow-2xl select-none"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
