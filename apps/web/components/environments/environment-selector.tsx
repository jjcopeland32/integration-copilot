'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { trpc } from '@/lib/trpc/client';
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

interface EnvironmentSelectorProps {
  projectId: string;
  value?: string | null;
  onChange?: (environmentId: string | null, environment: Environment | null) => void;
  showMockOption?: boolean;
  className?: string;
  variant?: 'default' | 'compact';
}

const ENV_TYPE_CONFIG: Record<EnvironmentType, { icon: typeof Server; color: string; emoji: string }> = {
  MOCK: { icon: Server, color: 'text-blue-500', emoji: '🔧' },
  SANDBOX: { icon: FlaskConical, color: 'text-amber-500', emoji: '🧪' },
  UAT: { icon: CheckCircle, color: 'text-green-500', emoji: '✅' },
  PRODUCTION: { icon: Rocket, color: 'text-red-500', emoji: '🚀' },
};

const STORAGE_KEY_PREFIX = 'env-selector-';

export function EnvironmentSelector({
  projectId,
  value,
  onChange,
  showMockOption = true,
  className = '',
  variant = 'default',
}: EnvironmentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(value ?? null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const environmentsQuery = trpc.environment.list.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const environments = useMemo(() => environmentsQuery.data ?? [], [environmentsQuery.data]);
  const isLoading = environmentsQuery.isLoading;

  // Load from localStorage on mount
  useEffect(() => {
    if (value !== undefined) return; // Controlled mode
    const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${projectId}`);
    if (stored) {
      setSelectedId(stored);
    } else {
      // Default to the default environment or 'mock'
      const defaultEnv = environments.find((e) => e.isDefault);
      if (defaultEnv) {
        setSelectedId(defaultEnv.id);
      }
    }
  }, [projectId, value, environments]);

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
      localStorage.setItem(`${STORAGE_KEY_PREFIX}${projectId}`, envId);
    } else {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${projectId}`);
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
        color: 'text-blue-500',
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
      color: 'text-gray-400',
      emoji: '',
    };
  };

  const displayInfo = getDisplayInfo();
  const DisplayIcon = displayInfo.icon;

  if (variant === 'compact') {
    return (
      <div ref={dropdownRef} className={`relative ${className}`}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={isLoading}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          ) : (
            <>
              <span>{displayInfo.emoji}</span>
              <span className="truncate max-w-[120px]">{displayInfo.name}</span>
              <ChevronDown className={`h-4 w-4 text-gray-400 transition ${isOpen ? 'rotate-180' : ''}`} />
            </>
          )}
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 z-50 mt-1 min-w-[200px] rounded-xl border border-gray-100 bg-white py-1 shadow-xl animate-in fade-in slide-in-from-top-2">
            {showMockOption && (
              <button
                onClick={() => handleSelect('mock')}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50 transition"
              >
                <span className="text-base">🔧</span>
                <span className="flex-1 font-medium text-gray-700">Mock (Built-in)</span>
                {isMockSelected && <Check className="h-4 w-4 text-indigo-500" />}
              </button>
            )}
            {environments.filter((e) => e.isActive).map((env) => {
              const config = ENV_TYPE_CONFIG[env.type as EnvironmentType];
              const isSelected = selectedId === env.id;
              return (
                <button
                  key={env.id}
                  onClick={() => handleSelect(env.id)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-gray-50 transition"
                >
                  <span className="text-base">{config.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-700 truncate block">{env.name}</span>
                    {env.isDefault && (
                      <span className="text-xs text-amber-600">Default</span>
                    )}
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-indigo-500" />}
                </button>
              );
            })}
            {environments.filter((e) => e.isActive).length === 0 && !showMockOption && (
              <div className="px-3 py-2 text-sm text-gray-500">No environments available</div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        className="flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left shadow-sm hover:border-gray-300 hover:shadow-md transition disabled:opacity-50"
      >
        {isLoading ? (
          <div className="flex items-center gap-2 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Loading environments...</span>
          </div>
        ) : (
          <>
            <div className={`rounded-lg bg-gradient-to-br p-2 ${
              isMockSelected ? 'from-blue-500 to-cyan-500' :
              selectedEnv?.type === 'SANDBOX' ? 'from-amber-500 to-orange-500' :
              selectedEnv?.type === 'UAT' ? 'from-green-500 to-emerald-500' :
              selectedEnv?.type === 'PRODUCTION' ? 'from-red-500 to-rose-500' :
              'from-gray-400 to-gray-500'
            }`}>
              <DisplayIcon className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-900 truncate">{displayInfo.name}</p>
              <p className="text-xs text-gray-500 truncate">
                {isMockSelected
                  ? 'Auto-generated mock server'
                  : selectedEnv?.baseUrl || 'No URL configured'}
              </p>
            </div>
            <ChevronDown className={`h-5 w-5 text-gray-400 transition ${isOpen ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-2 rounded-2xl border border-gray-100 bg-white py-2 shadow-xl animate-in fade-in slide-in-from-top-2">
          {/* Mock Option */}
          {showMockOption && (
            <button
              onClick={() => handleSelect('mock')}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition ${
                isMockSelected ? 'bg-indigo-50' : ''
              }`}
            >
              <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 p-2">
                <Server className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">Mock (Built-in)</p>
                <p className="text-xs text-gray-500">Auto-generated mock server</p>
              </div>
              {isMockSelected && <Check className="h-5 w-5 text-indigo-500" />}
            </button>
          )}

          {/* Divider */}
          {showMockOption && environments.filter((e) => e.isActive).length > 0 && (
            <div className="my-2 border-t border-gray-100" />
          )}

          {/* Environment Options */}
          {environments
            .filter((e) => e.isActive)
            .map((env) => {
              const config = ENV_TYPE_CONFIG[env.type as EnvironmentType];
              const EnvIcon = config.icon;
              const isSelected = selectedId === env.id;

              return (
                <button
                  key={env.id}
                  onClick={() => handleSelect(env.id)}
                  className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition ${
                    isSelected ? 'bg-indigo-50' : ''
                  }`}
                >
                  <div className={`rounded-lg bg-gradient-to-br p-2 ${
                    env.type === 'SANDBOX' ? 'from-amber-500 to-orange-500' :
                    env.type === 'UAT' ? 'from-green-500 to-emerald-500' :
                    env.type === 'PRODUCTION' ? 'from-red-500 to-rose-500' :
                    'from-blue-500 to-cyan-500'
                  }`}>
                    <EnvIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 truncate">{env.name}</p>
                      {env.isDefault && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{env.baseUrl || 'No URL'}</p>
                  </div>
                  {isSelected && <Check className="h-5 w-5 text-indigo-500" />}
                </button>
              );
            })}

          {/* Empty State */}
          {environments.filter((e) => e.isActive).length === 0 && !showMockOption && (
            <div className="px-4 py-6 text-center text-gray-500">
              <Globe className="h-8 w-8 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No environments configured</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}



