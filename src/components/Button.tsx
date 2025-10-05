import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  className = '',
  type = 'button'
}) => {
  const baseClasses = 'inline-flex items-center justify-center gap-2 font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1F1B2E] disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-[#00FFF7] to-[#8C1AFF] text-white hover:shadow-lg hover:shadow-[#00FFF7]/25 focus:ring-[#00FFF7]/50 hover:scale-105',
    secondary: 'bg-[#2A2738] text-white border border-[#00FFF7]/30 hover:bg-[#00FFF7]/10 hover:border-[#00FFF7] focus:ring-[#00FFF7]/50 hover:scale-105',
    danger: 'bg-gradient-to-r from-[#FF6B6B] to-[#FF1744] text-white hover:shadow-lg hover:shadow-[#FF6B6B]/25 focus:ring-[#FF6B6B]/50 hover:scale-105',
    ghost: 'text-gray-300 hover:text-white hover:bg-[#2A2738] focus:ring-gray-500 hover:scale-105'
  };
  
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {loading ? (
        <div className="loading-spinner" />
      ) : icon ? (
        icon
      ) : null}
      {children}
    </button>
  );
};

export default Button;