import React, { createContext, useCallback, useState } from 'react';
import Toast from '../components/Toast';

type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
}

type ConfirmState = {
  resolve: (value: boolean) => void;
  title?: string;
  message: string;
};

interface ToastContextShape {
  notify: (message: string, type?: ToastType, title?: string) => void;
  confirm: (options: { title?: string; message: string }) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextShape | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

  const notify = useCallback((message: string, type: ToastType = 'info', title?: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const t: ToastItem = { id, type, message, title };
    setToasts((s) => [...s, t]);
    // auto remove
    setTimeout(() => setToasts((s) => s.filter(x => x.id !== id)), 4500);
  }, []);

  const confirm = useCallback((options: { title?: string; message: string }) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ resolve, title: options.title, message: options.message });
    });
  }, []);

  const handleConfirm = (val: boolean) => {
    if (!confirmState) return;
    confirmState.resolve(val);
    setConfirmState(null);
  };

  return (
    <ToastContext.Provider value={{ notify, confirm }}>
      {children}

      {/* Toast container */}
      <div className="fixed right-4 bottom-6 z-50 flex flex-col gap-3">
        {toasts.map((t) => (
          <Toast key={t.id} item={t} />
        ))}
      </div>

      {/* Confirm dialog */}
      {confirmState && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50">
          <div className="bg-[#121017] p-6 rounded-lg w-full max-w-md">
            {confirmState.title && <h3 className="text-white text-lg font-semibold mb-2">{confirmState.title}</h3>}
            <p className="text-gray-300 mb-4">{confirmState.message}</p>
            <div className="flex justify-end gap-3">
              <button className="px-4 py-2 rounded bg-[#2A2738] text-white" onClick={() => handleConfirm(false)}>Annuler</button>
              <button className="px-4 py-2 rounded bg-gradient-to-r from-[#00FFF7] to-[#8C1AFF] text-black font-semibold" onClick={() => handleConfirm(true)}>Confirmer</button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

export default ToastContext;
