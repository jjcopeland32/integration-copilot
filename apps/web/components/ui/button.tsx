import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'gradient' | 'enterprise' | 'crystal';
  size?: 'default' | 'sm' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-300',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500',
          'disabled:pointer-events-none disabled:opacity-50',
          'active:scale-95',
          {
            // Standard variants
            'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-indigo-700': variant === 'default',
            'border-2 border-gray-300 bg-white hover:bg-gray-50 hover:border-gray-400 shadow-sm': variant === 'outline',
            'hover:bg-gray-100 hover:shadow-sm': variant === 'ghost',
            'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg hover:shadow-xl hover:from-red-700 hover:to-rose-700': variant === 'destructive',
            'bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white shadow-lg hover:shadow-2xl shine': variant === 'gradient',
            // Enterprise theme variant
            'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 hover:from-indigo-700 hover:to-purple-700 hover:-translate-y-0.5': variant === 'enterprise',
            // Crystal theme variant
            'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25 hover:shadow-xl hover:shadow-cyan-500/40 hover:from-cyan-400 hover:to-blue-500 hover:-translate-y-0.5': variant === 'crystal',
          },
          {
            'h-11 px-6 py-2.5 text-sm': size === 'default',
            'h-9 px-4 text-xs': size === 'sm',
            'h-12 px-8 text-base': size === 'lg',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };
