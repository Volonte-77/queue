import React from 'react';

interface ToastItem {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
}

export const Toast: React.FC<{item: ToastItem}> = ({ item }) => {
  const color = item.type === 'success' ? 'text-green-400' : item.type === 'warning' ? 'text-yellow-400' : item.type === 'error' ? 'text-red-400' : 'text-blue-400';
  return (
    <div className={`bg-[#222029] border border-[#ffffff10] rounded-lg p-3 shadow-md w-80`}>
      <div className="flex items-start gap-3">
        <div className={`mt-1 ${color}`}>●</div>
        <div className="flex-1">
          {item.title && <div className="font-semibold text-white text-sm">{item.title}</div>}
          <div className="text-gray-300 text-sm">{item.message}</div>
        </div>
      </div>
    </div>
  );
};

export default Toast;
