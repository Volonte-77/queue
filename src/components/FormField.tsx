import React from 'react';

interface FormFieldProps {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  icon?: React.ReactNode;
  rows?: number;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  required = false,
  error,
  icon,
  rows
}) => {
  const InputComponent = rows ? 'textarea' : 'input';

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">
        {label}
        {required && <span className="text-[#FF6B6B] ml-1">*</span>}
      </label>
      
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        
        <InputComponent
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className={`
            w-full px-4 py-3 ${icon ? 'pl-10' : ''} 
            bg-[#1F1B2E] border border-gray-600 rounded-xl
            text-white placeholder-gray-400
            focus:border-[#00FFF7] focus:ring-2 focus:ring-[#00FFF7]/20
            transition-all duration-200
            hover:border-gray-500
            ${error ? 'border-[#FF6B6B] focus:border-[#FF6B6B] focus:ring-[#FF6B6B]/20' : ''}
          `}
        />
      </div>
      
      {error && (
        <p className="text-sm text-[#FF6B6B] flex items-center gap-1">
          <span className="w-1 h-1 bg-[#FF6B6B] rounded-full" />
          {error}
        </p>
      )}
    </div>
  );
};

export default FormField;