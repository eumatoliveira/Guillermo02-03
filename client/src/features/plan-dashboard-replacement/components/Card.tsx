import React from 'react';
import { LucideIcon, ArrowUpRight, ArrowDownRight, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useLanguage } from '@/contexts/LanguageContext';
import { translateDashboardText } from '../i18n';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface CardProps {
  title: string;
  value?: string | number | null;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: { value: number; isUp: boolean };
  badge?: { text: string; color: 'red' | 'yellow' | 'green' };
  children?: React.ReactNode;
  className?: string;
  glowOnHover?: boolean;
}

export function Card({ title, value, subtitle, icon: Icon, trend, badge, children, className, glowOnHover = true }: CardProps) {
  const { language } = useLanguage();
  const actionLabel =
    language === 'en'
      ? 'open calculation and source'
      : language === 'es'
        ? 'abrir cálculo y fuente'
        : 'abrir cálculo e fonte';

  return (
    <div className={cn(
      "group relative bg-[#111318]/50 backdrop-blur-xl border border-[#1f2833]/70 rounded-2xl p-6 overflow-hidden transition-all duration-500 cursor-pointer",
      glowOnHover && "hover:border-[#ff5a1f]/30 hover:bg-[#111318]",
      className
    )}
      data-kpi-title={title}
      role="button"
      tabIndex={0}
      aria-label={`${translateDashboardText(title, language)}: ${actionLabel}`}
    >
      {glowOnHover && (
        <div className="absolute inset-0 bg-gradient-to-br from-[#ff5a1f]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      )}
      
      <div className="relative z-10 flex justify-between items-start mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            {Icon && <Icon className="w-5 h-5 text-[#8892b0]" />}
            <h3 className="text-sm font-semibold tracking-wider text-[#8892b0] uppercase">{title}</h3>
            {badge && (
              <span className={cn(
                "px-2.5 py-0.5 text-[10px] uppercase tracking-widest font-bold rounded-full border bg-opacity-10 animate-fade-in",
                badge.color === 'red' && "border-red-500/50 text-red-500 bg-red-500",
                badge.color === 'yellow' && "border-yellow-500/50 text-yellow-500 bg-yellow-500",
                badge.color === 'green' && "border-green-500/50 text-green-500 bg-green-500"
              )}>
                {badge.text}
              </span>
            )}
          </div>
          
          {value !== undefined && (
            <div className="flex items-baseline gap-4 mt-2">
              {value === null ? (
                <span className="text-sm font-medium text-[#8892b0]/60 italic tracking-wide">
                  Dados não entrados
                </span>
              ) : (
                <span className="text-4xl font-bold tracking-tight text-white drop-shadow-sm">{value}</span>
              )}
              {value !== null && trend && (
                <div className={cn(
                  "flex items-center text-sm font-medium",
                  trend.isUp ? "text-green-500" : "text-red-500"
                )}>
                  {trend.isUp ? <ArrowUpRight className="w-4 h-4 mr-1" /> : <ArrowDownRight className="w-4 h-4 mr-1" />}
                  {trend.value}%
                </div>
              )}
            </div>
          )}
          {subtitle && (
            <p className="text-xs text-[#8892b0] mt-1 tracking-wide">{subtitle}</p>
          )}
        </div>
      </div>
      
      {children && (
        <div className="relative z-10 mt-4 min-h-[220px]">
          {children}
        </div>
      )}
    </div>
  );
}
