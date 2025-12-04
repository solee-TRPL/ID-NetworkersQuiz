import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-2 w-full">
      {label && <label className="text-slate-600 font-semibold text-sm ml-1">{label}</label>}
      <input 
        className={`bg-slate-50 border border-slate-300 text-accent rounded-lg px-4 py-2.5 focus:border-primary focus:ring-1 focus:ring-primary/50 outline-none transition-all duration-200 placeholder-slate-400 ${className}`}
        {...props}
      />
    </div>
  );
};