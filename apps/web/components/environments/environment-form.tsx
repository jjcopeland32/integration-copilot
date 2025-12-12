'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc/client';
import {
  X,
  Loader2,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Globe,
  Server,
  FlaskConical,
  CheckCircle,
  Rocket,
} from 'lucide-react';

type EnvironmentType = 'MOCK' | 'SANDBOX' | 'UAT' | 'PRODUCTION';
type AuthType = 'NONE' | 'API_KEY' | 'OAUTH2' | 'BASIC';

interface EnvironmentFormData {
  name: string;
  type: EnvironmentType;
  baseUrl: string;
  authType: AuthType;
  credentials: {
    apiKey?: string;
    headerName?: string;
    clientId?: string;
    clientSecret?: string;
    tokenUrl?: string;
    scopes?: string;
    username?: string;
    password?: string;
  };
  headers: Array<{ key: string; value: string }>;
  isDefault: boolean;
  isActive: boolean;
}

interface EnvironmentFormProps {
  projectId: string;
  environment?: {
    id: string;
    name: string;
    type: EnvironmentType;
    baseUrl: string | null;
    authType: AuthType;
    hasCredentials: boolean;
    headers: Record<string, string> | null;
    isDefault: boolean;
    isActive: boolean;
  };
  onClose: () => void;
  onSuccess: () => void;
}

const ENV_TYPE_OPTIONS: { value: EnvironmentType; label: string; icon: typeof Globe; color: string }[] = [
  { value: 'MOCK', label: 'Mock', icon: Server, color: 'text-blue-500' },
  { value: 'SANDBOX', label: 'Sandbox', icon: FlaskConical, color: 'text-amber-500' },
  { value: 'UAT', label: 'UAT', icon: CheckCircle, color: 'text-green-500' },
  { value: 'PRODUCTION', label: 'Production', icon: Rocket, color: 'text-red-500' },
];

const AUTH_TYPE_OPTIONS: { value: AuthType; label: string; description: string }[] = [
  { value: 'NONE', label: 'None', description: 'No authentication required' },
  { value: 'API_KEY', label: 'API Key', description: 'Header-based API key' },
  { value: 'OAUTH2', label: 'OAuth 2.0', description: 'Client credentials flow' },
  { value: 'BASIC', label: 'Basic Auth', description: 'Username and password' },
];

export function EnvironmentForm({ projectId, environment, onClose, onSuccess }: EnvironmentFormProps) {
  const isEditing = !!environment;
  const utils = trpc.useUtils();

  const [formData, setFormData] = useState<EnvironmentFormData>(() => {
    if (environment) {
      const headers = environment.headers
        ? Object.entries(environment.headers).map(([key, value]) => ({ key, value }))
        : [];
      return {
        name: environment.name,
        type: environment.type,
        baseUrl: environment.baseUrl || '',
        authType: environment.authType,
        credentials: {},
        headers,
        isDefault: environment.isDefault,
        isActive: environment.isActive,
      };
    }
    return {
      name: '',
      type: 'SANDBOX',
      baseUrl: '',
      authType: 'NONE',
      credentials: {},
      headers: [],
      isDefault: false,
      isActive: true,
    };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const createMutation = trpc.environment.create.useMutation({
    onSuccess: async () => {
      await utils.environment.list.invalidate({ projectId });
      onSuccess();
    },
  });

  const updateMutation = trpc.environment.update.useMutation({
    onSuccess: async () => {
      await utils.environment.list.invalidate({ projectId });
      onSuccess();
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (formData.type !== 'MOCK' && !formData.baseUrl.trim()) {
      newErrors.baseUrl = 'Base URL is required for non-mock environments';
    } else if (formData.baseUrl.trim()) {
      try {
        new URL(formData.baseUrl);
      } catch {
        newErrors.baseUrl = 'Invalid URL format';
      }
    }

    // Validate auth-specific fields for new environments or if credentials are being set
    if (!isEditing || Object.keys(formData.credentials).length > 0) {
      if (formData.authType === 'API_KEY') {
        if (!isEditing && !formData.credentials.apiKey?.trim()) {
          newErrors.apiKey = 'API key is required';
        }
      } else if (formData.authType === 'OAUTH2') {
        if (!isEditing) {
          if (!formData.credentials.clientId?.trim()) {
            newErrors.clientId = 'Client ID is required';
          }
          if (!formData.credentials.clientSecret?.trim()) {
            newErrors.clientSecret = 'Client secret is required';
          }
          if (!formData.credentials.tokenUrl?.trim()) {
            newErrors.tokenUrl = 'Token URL is required';
          }
        }
      } else if (formData.authType === 'BASIC') {
        if (!isEditing) {
          if (!formData.credentials.username?.trim()) {
            newErrors.username = 'Username is required';
          }
          if (!formData.credentials.password?.trim()) {
            newErrors.password = 'Password is required';
          }
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const headersObject = formData.headers.reduce(
      (acc, { key, value }) => {
        if (key.trim()) {
          acc[key.trim()] = value;
        }
        return acc;
      },
      {} as Record<string, string>
    );

    // Build credentials based on auth type
    let credentials: Record<string, unknown> | null = null;
    if (formData.authType === 'API_KEY' && formData.credentials.apiKey) {
      credentials = {
        apiKey: formData.credentials.apiKey,
        headerName: formData.credentials.headerName || 'X-API-Key',
      };
    } else if (formData.authType === 'OAUTH2' && formData.credentials.clientId) {
      credentials = {
        clientId: formData.credentials.clientId,
        clientSecret: formData.credentials.clientSecret,
        tokenUrl: formData.credentials.tokenUrl,
        scopes: formData.credentials.scopes?.split(',').map((s) => s.trim()).filter(Boolean),
      };
    } else if (formData.authType === 'BASIC' && formData.credentials.username) {
      credentials = {
        username: formData.credentials.username,
        password: formData.credentials.password,
      };
    }

    const payload = {
      name: formData.name.trim(),
      type: formData.type,
      baseUrl: formData.baseUrl.trim() || null,
      authType: formData.authType,
      credentials,
      headers: Object.keys(headersObject).length > 0 ? headersObject : undefined,
      isDefault: formData.isDefault,
      isActive: formData.isActive,
    };

    if (isEditing && environment) {
      updateMutation.mutate({ id: environment.id, ...payload });
    } else {
      createMutation.mutate({ projectId, ...payload });
    }
  };

  const addHeader = () => {
    setFormData((prev) => ({
      ...prev,
      headers: [...prev.headers, { key: '', value: '' }],
    }));
  };

  const removeHeader = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      headers: prev.headers.filter((_, i) => i !== index),
    }));
  };

  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    setFormData((prev) => ({
      ...prev,
      headers: prev.headers.map((h, i) => (i === index ? { ...h, [field]: value } : h)),
    }));
  };

  const toggleShowSecret = (field: string) => {
    setShowSecrets((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const error = createMutation.error || updateMutation.error;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-gray-100 bg-white shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 backdrop-blur-sm px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isEditing ? 'Edit Environment' : 'Add Environment'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Configure an API environment for testing
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Display */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error.message}
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Environment Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Production Sandbox"
              className={`w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                errors.name ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>

          {/* Environment Type */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Environment Type
            </label>
            <div className="grid grid-cols-4 gap-3">
              {ENV_TYPE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = formData.type === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, type: option.value }))}
                    className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`h-6 w-6 ${isSelected ? 'text-indigo-600' : option.color}`} />
                    <span className={`text-sm font-medium ${isSelected ? 'text-indigo-700' : 'text-gray-700'}`}>
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Base URL */}
          {formData.type !== 'MOCK' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Base URL
              </label>
              <input
                type="url"
                value={formData.baseUrl}
                onChange={(e) => setFormData((prev) => ({ ...prev, baseUrl: e.target.value }))}
                placeholder="https://api.example.com/v1"
                className={`w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.baseUrl ? 'border-red-300 bg-red-50' : 'border-gray-200'
                }`}
              />
              {errors.baseUrl && <p className="text-xs text-red-500">{errors.baseUrl}</p>}
            </div>
          )}

          {/* Auth Type */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Authentication
            </label>
            <div className="grid grid-cols-2 gap-3">
              {AUTH_TYPE_OPTIONS.map((option) => {
                const isSelected = formData.authType === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        authType: option.value,
                        credentials: {},
                      }))
                    }
                    className={`flex flex-col items-start rounded-xl border-2 p-4 text-left transition ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`text-sm font-medium ${isSelected ? 'text-indigo-700' : 'text-gray-700'}`}>
                      {option.label}
                    </span>
                    <span className={`text-xs mt-1 ${isSelected ? 'text-indigo-600' : 'text-gray-500'}`}>
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Auth-specific fields */}
          {formData.authType === 'API_KEY' && (
            <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <h4 className="text-sm font-medium text-gray-700">API Key Configuration</h4>
              {isEditing && environment?.hasCredentials && (
                <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  Credentials are already set. Leave fields empty to keep existing values.
                </p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600">API Key</label>
                  <div className="relative">
                    <input
                      type={showSecrets.apiKey ? 'text' : 'password'}
                      value={formData.credentials.apiKey || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          credentials: { ...prev.credentials, apiKey: e.target.value },
                        }))
                      }
                      placeholder="Enter API key"
                      className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm ${
                        errors.apiKey ? 'border-red-300' : 'border-gray-200'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowSecret('apiKey')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showSecrets.apiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.apiKey && <p className="text-xs text-red-500">{errors.apiKey}</p>}
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600">Header Name</label>
                  <input
                    type="text"
                    value={formData.credentials.headerName || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        credentials: { ...prev.credentials, headerName: e.target.value },
                      }))
                    }
                    placeholder="X-API-Key"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {formData.authType === 'OAUTH2' && (
            <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <h4 className="text-sm font-medium text-gray-700">OAuth 2.0 Configuration</h4>
              {isEditing && environment?.hasCredentials && (
                <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  Credentials are already set. Leave fields empty to keep existing values.
                </p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600">Client ID</label>
                  <input
                    type="text"
                    value={formData.credentials.clientId || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        credentials: { ...prev.credentials, clientId: e.target.value },
                      }))
                    }
                    placeholder="Enter client ID"
                    className={`w-full rounded-lg border px-3 py-2 text-sm ${
                      errors.clientId ? 'border-red-300' : 'border-gray-200'
                    }`}
                  />
                  {errors.clientId && <p className="text-xs text-red-500">{errors.clientId}</p>}
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600">Client Secret</label>
                  <div className="relative">
                    <input
                      type={showSecrets.clientSecret ? 'text' : 'password'}
                      value={formData.credentials.clientSecret || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          credentials: { ...prev.credentials, clientSecret: e.target.value },
                        }))
                      }
                      placeholder="Enter client secret"
                      className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm ${
                        errors.clientSecret ? 'border-red-300' : 'border-gray-200'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowSecret('clientSecret')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showSecrets.clientSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.clientSecret && <p className="text-xs text-red-500">{errors.clientSecret}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-600">Token URL</label>
                <input
                  type="url"
                  value={formData.credentials.tokenUrl || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      credentials: { ...prev.credentials, tokenUrl: e.target.value },
                    }))
                  }
                  placeholder="https://auth.example.com/oauth/token"
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${
                    errors.tokenUrl ? 'border-red-300' : 'border-gray-200'
                  }`}
                />
                {errors.tokenUrl && <p className="text-xs text-red-500">{errors.tokenUrl}</p>}
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-600">Scopes (comma-separated)</label>
                <input
                  type="text"
                  value={formData.credentials.scopes || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      credentials: { ...prev.credentials, scopes: e.target.value },
                    }))
                  }
                  placeholder="read, write, admin"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
          )}

          {formData.authType === 'BASIC' && (
            <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <h4 className="text-sm font-medium text-gray-700">Basic Authentication</h4>
              {isEditing && environment?.hasCredentials && (
                <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                  Credentials are already set. Leave fields empty to keep existing values.
                </p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600">Username</label>
                  <input
                    type="text"
                    value={formData.credentials.username || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        credentials: { ...prev.credentials, username: e.target.value },
                      }))
                    }
                    placeholder="Enter username"
                    className={`w-full rounded-lg border px-3 py-2 text-sm ${
                      errors.username ? 'border-red-300' : 'border-gray-200'
                    }`}
                  />
                  {errors.username && <p className="text-xs text-red-500">{errors.username}</p>}
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-600">Password</label>
                  <div className="relative">
                    <input
                      type={showSecrets.password ? 'text' : 'password'}
                      value={formData.credentials.password || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          credentials: { ...prev.credentials, password: e.target.value },
                        }))
                      }
                      placeholder="Enter password"
                      className={`w-full rounded-lg border px-3 py-2 pr-10 text-sm ${
                        errors.password ? 'border-red-300' : 'border-gray-200'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowSecret('password')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showSecrets.password ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Custom Headers */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Custom Headers
              </label>
              <Button type="button" variant="outline" size="sm" onClick={addHeader} className="gap-1">
                <Plus className="h-4 w-4" />
                Add Header
              </Button>
            </div>
            {formData.headers.length > 0 && (
              <div className="space-y-2">
                {formData.headers.map((header, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={header.key}
                      onChange={(e) => updateHeader(index, 'key', e.target.value)}
                      placeholder="Header name"
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      value={header.value}
                      onChange={(e) => updateHeader(index, 'value', e.target.value)}
                      placeholder="Value"
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeHeader(index)}
                      className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {formData.headers.length === 0 && (
              <p className="text-xs text-gray-500">No custom headers configured</p>
            )}
          </div>

          {/* Options */}
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isDefault}
                onChange={(e) => setFormData((prev) => ({ ...prev, isDefault: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Set as default environment</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEditing ? 'Saving...' : 'Creating...'}
                </>
              ) : isEditing ? (
                'Save Changes'
              ) : (
                'Create Environment'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}



