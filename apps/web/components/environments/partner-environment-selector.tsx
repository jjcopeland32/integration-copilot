'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { partnerTrpc } from '@/lib/trpc/partner/client';
import {
  ChevronDown,
  Server,
  FlaskConical,
  CheckCircle,
  Rocket,
  Loader2,
  Check,
  Globe,
} from 'lucide-react';

type EnvironmentType = 'MOCK' | 'SANDBOX' | 'UAT' | 'PRODUCTION';

interface Environment {
  id: string;
  name: string;
  type: EnvironmentType;
  baseUrl: string | null;
  isDefault: boolean;
  isActive: boolean;
}

interface PartnerEnvironmentSelectorProps {
  value?: string | null;
  onChange?: (environmentId: string | null, environment: Environment | null) => void;
  showMockOption?: boolean;
  className?: string;
}

const ENV_TYPE_CONFIG: Record<EnvironmentType, { icon: typeof Server; color: string; emoji: string }> = {
  MOCK: { icon: Server, color: 'text-cyan-400', emoji: '🔧' },
  SANDBOX: { icon: FlaskConical, color: 'text-amber-400', emoji: '🧪' },
  UAT: { icon: CheckCircle, color: 'text-emerald-400', emoji: '✅' },
  PRODUCTION: { icon: Rocket, color: 'text-rose-400', emoji: '🚀' },
};

const STORAGE_KEY = 'partner-env-selector';

export function PartnerEnvironmentSelector({
  value,
  onChange,
  showMockOption = true,
  className = '',
}: PartnerEnvironmentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(value ?? null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const environmentsQuery = partnerTrpc.environment.list.useQuery();

  const environments = useMemo(() => environmentsQuery.data ?? [], [environmentsQuery.data]);
  const isLoading = environmentsQuery.isLoading;

  // Load from localStorage on mount
  useEffect(() => {
    if (value !== undefined) return; // Controlled mode
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setSelectedId(stored);
    } else {
      // Default to the default environment or 'mock'
      const defaultEnv = environments.find((e) => e.isDefault);
      if (defaultEnv) {
        setSelectedId(defaultEnv.id);
      }
    }
  }, [value, environments]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (envId: string | null) => {
    setSelectedId(envId);
    setIsOpen(false);
    
    // Persist to localStorage
    if (envId) {
      localStorage.setItem(STORAGE_KEY, envId);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }

    // Notify parent
    if (onChange) {
      const env = envId ? environments.find((e) => e.id === envId) || null : null;
      onChange(envId, env);
    }
  };

  const selectedEnv = selectedId ? environments.find((e) => e.id === selectedId) : null;
  const isMockSelected = selectedId === 'mock' || (!selectedId && showMockOption);

  const getDisplayInfo = () => {
    if (isMockSelected) {
      return {
        name: 'Mock (Built-in)',
        icon: Server,
        color: 'text-cyan-400',
        emoji: '🔧',
      };
    }
    if (selectedEnv) {
      const config = ENV_TYPE_CONFIG[selectedEnv.type as EnvironmentType];
      return {
        name: selectedEnv.name,
        icon: config.icon,
        color: config.color,
        emoji: config.emoji,
      };
    }
    return {
      name: 'Select environment',
      icon: Globe,
      color: 'text-slate-400',
      emoji: '',
    };
  };

  const displayInfo = getDisplayInfo();
  const DisplayIcon = displayInfo.icon;

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left backdrop-blur-sm hover:bg-white/10 hover:border-white/20 transition disabled:opacity-50"
      >
        {isLoading ? (
          <div className="flex items-center gap-2 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading environments...</span>
          </div>
        ) : (
          <>
            <div className={`rounded-lg p-2 ${
              isMockSelected ? 'bg-cyan-500/20' :
              selectedEnv?.type === 'SANDBOX' ? 'bg-amber-500/20' :
              selectedEnv?.type === 'UAT' ? 'bg-emerald-500/20' :
              selectedEnv?.type === 'PRODUCTION' ? 'bg-rose-500/20' :
              'bg-slate-500/20'
            }`}>
              <DisplayIcon className={`h-5 w-5 ${displayInfo.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">{displayInfo.name}</p>
              <p className="text-xs text-slate-400 truncate">
                {isMockSelected
                  ? 'Auto-generated mock server'
                  : selectedEnv?.baseUrl || 'No URL configured'}
              </p>
            </div>
            <ChevronDown className={`h-5 w-5 text-slate-400 transition ${isOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-xl py-2 shadow-2xl animate-in fade-in slide-in-from-top-2">
          {/* Mock Option */}
          {showMockOption && (
            <button
              onClick={() => handleSelect('mock')}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition ${
                isMockSelected ? 'bg-purple-500/10' : ''
              }`}
            >
              <div className="rounded-lg bg-cyan-500/20 p-2">
                <Server className="h-5 w-5 text-cyan-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white">Mock (Built-in)</p>
                <p className="text-xs text-slate-400">Auto-generated mock server</p>
              </div>
              {isMockSelected && <Check className="h-5 w-5 text-purple-400" />}
            </button>
          )}

          {/* Divider */}
          {showMockOption && environments.length > 0 && (
            <div className="my-2 border-t border-white/5" />
          )}

          {/* Environment Options */}
          {environments.map((env) => {
            const config = ENV_TYPE_CONFIG[env.type as EnvironmentType];
            const EnvIcon = config.icon;
            const isSelected = selectedId === env.id;

            return (
              <button
                key={env.id}
                onClick={() => handleSelect(env.id)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition ${
                  isSelected ? 'bg-purple-500/10' : ''
                }`}
              >
                <div className={`rounded-lg p-2 ${
                  env.type === 'SANDBOX' ? 'bg-amber-500/20' :
                  env.type === 'UAT' ? 'bg-emerald-500/20' :
                  env.type === 'PRODUCTION' ? 'bg-rose-500/20' :
                  'bg-cyan-500/20'
                }`}>
                  <EnvIcon className={`h-5 w-5 ${config.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-white truncate">{env.name}</p>
                    {env.isDefault && (
                      <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-300">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">{env.baseUrl || 'No URL'}</p>
                </div>
                {isSelected && <Check className="h-5 w-5 text-purple-400" />}
              </button>
            );
          })}

          {/* Empty State */}
          {environments.length === 0 && !showMockOption && (
            <div className="px-4 py-6 text-center text-slate-400">
              <Globe className="h-8 w-8 mx-auto mb-2 text-slate-600" />
              <p className="text-sm">No environments configured</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}



