import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', id, ...props }) => {
  const inputId = id || label.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="w-full">
      <label htmlFor={inputId} className="block text-sm font-bold text-gray-900 mb-1">
        {label}
      </label>
      <input
        id={inputId}
        className={`w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-500 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900 sm:text-sm shadow-sm ${error ? 'border-red-500' : ''} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600 font-medium">{error}</p>}
    </div>
  );
};