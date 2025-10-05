import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative w-full ${sizeClasses[size]} bg-[#2A2738] rounded-2xl border border-[#00FFF7]/20 shadow-2xl animate-modal-enter`}>
        {/* Glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-[#00FFF7]/20 via-[#8C1AFF]/20 to-[#FF6B6B]/20 rounded-2xl blur-sm opacity-75" />
        
        <div className="relative bg-[#2A2738] rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#00FFF7]/10">
            <h2 className="text-xl font-semibold text-white gradient-animate">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white hover:bg-[#00FFF7]/10 rounded-lg transition-all duration-200 hover:scale-110"
            >
              <X size={20} />
            </button>
          </div>
          
          {/* Content */}
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;