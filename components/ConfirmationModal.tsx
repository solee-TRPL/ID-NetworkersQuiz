import React from 'react';
import { Button } from './Button';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isConfirming?: boolean;
  type?: 'danger' | 'success'; // Tambahan untuk jenis notifikasi
  singleButton?: boolean; // Tambahan untuk menyembunyikan tombol batal
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Konfirmasi",
  cancelText = "Batal",
  isConfirming = false,
  type = 'danger',
  singleButton = false,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md animate-pop"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 rounded-full p-3 ${type === 'success' ? 'bg-green-100 text-green-600' : 'bg-primary/10 text-primary'}`}>
            {type === 'success' ? <CheckCircle className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-accent mb-2">{title}</h2>
            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">{message}</p>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-8">
          {!singleButton && (
            <Button variant="secondary" onClick={onClose} disabled={isConfirming}>
              {cancelText}
            </Button>
          )}
          <Button 
            variant={type === 'success' ? 'primary' : 'destructive'} 
            onClick={onConfirm} 
            disabled={isConfirming}
            className={type === 'success' ? '!bg-green-600 hover:!bg-green-700' : ''}
          >
            {isConfirming ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : null}
            {isConfirming ? 'Memproses...' : confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};