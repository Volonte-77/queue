import { useContext } from 'react';
import ToastContext from './ToastContext';

export const useToasts = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToasts must be used within a ToastProvider');
  return ctx;
};

export default useToasts;
