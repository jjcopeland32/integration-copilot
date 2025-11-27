import { cn } from '@/lib/utils';
import { HTMLAttributes } from 'react';

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'gradient' | 'outline' | 'enterprise' | 'crystal';
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-bold shadow-sm',
        {
          // Standard variants
          'bg-gray-100 text-gray-800 border border-gray-200': variant === 'default',
          'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md': variant === 'success',
          'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-md': variant === 'warning',
          'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-md': variant === 'error',
          'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md': variant === 'info',
          'bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 text-white shadow-lg': variant === 'gradient',
          'border border-gray-200 bg-white text-gray-600 shadow-none': variant === 'outline',
          // Enterprise theme variant
          'bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-sm shadow-indigo-500/10': variant === 'enterprise',
          // Crystal theme variant
          'bg-cyan-500/15 text-cyan-300 border border-cyan-500/25 shadow-sm shadow-cyan-500/10': variant === 'crystal',
        },
        className
      )}
      {...props}
    />
  );
}
