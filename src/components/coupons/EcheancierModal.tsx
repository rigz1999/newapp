import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { EcheancierContent } from './EcheancierContent';

interface EcheancierModalProps {
  projectId: string;
  onClose: () => void;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string | null) => string;
}

function EcheancierModalContent({
  projectId,
  onClose,
  formatCurrency,
  formatDate,
}: EcheancierModalProps) {
  const navigate = useNavigate();

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEsc, { capture: true });
    return () => document.removeEventListener('keydown', handleEsc, { capture: true });
  }, [onClose]);

  const handleOpenFullPage = () => {
    navigate(`/projets/${projectId}/echeancier`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] m-4 flex flex-col animate-slide-in-right"
        onClick={e => e.stopPropagation()}
      >
        {/* Close button in top-right corner */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-slate-400 hover:text-slate-600 transition-colors bg-white rounded-lg p-1.5 shadow-sm"
        >
          <X className="w-6 h-6" />
        </button>

        <EcheancierContent
          projectId={projectId}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          onOpenFullPage={handleOpenFullPage}
          isFullPage={false}
        />
      </div>
    </div>
  );
}

export function EcheancierModal(props: EcheancierModalProps) {
  return createPortal(<EcheancierModalContent {...props} />, document.body);
}
