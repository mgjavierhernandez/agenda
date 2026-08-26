import { useState, type InputHTMLAttributes, forwardRef } from 'react';

interface PasswordInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, className = '', id, required, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const inputId = id || 'password';
    const errorId = error ? `${inputId}-error` : undefined;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
            {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={showPassword ? 'text' : 'password'}
            aria-invalid={!!error || undefined}
            aria-describedby={errorId}
            aria-required={required || undefined}
            className={`w-full px-3 py-2 pr-10 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            } ${className}`}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? '🙈' : '👁'}
          </button>
        </div>
        {error && <p id={errorId} className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  },
);
PasswordInput.displayName = 'PasswordInput';
