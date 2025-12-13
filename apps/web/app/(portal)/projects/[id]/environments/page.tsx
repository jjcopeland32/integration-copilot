'use client';

import { useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/lib/trpc/client';
import { EnvironmentForm } from '@/components/environments/environment-form';
import {
  Globe,
  Plus,
  Server,
  FlaskConical,
  CheckCircle,
  Rocket,
  Pencil,
  Trash2,
  Wifi,
  WifiOff,
  Star,
  Loader2,
  AlertCircle,
  Clock,
} from 'lucide-react';

type EnvironmentType = 'MOCK' | 'SANDBOX' | 'UAT' | 'PRODUCTION';
type AuthType = 'NONE' | 'API_KEY' | 'OAUTH2' | 'BASIC';

interface Environment {
  id: string;
  projectId: string;
  name: string;
  type: EnvironmentType;
  baseUrl: string | null;
  authType: AuthType;
  hasCredentials: boolean;
  credentialsSummary: Record<string, boolean>;
  headers: Record<string, string> | null;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ENV_TYPE_CONFIG: Record<EnvironmentType, { icon: typeof Globe; color: string; bgColor: string; label: string }> = {
  MOCK: { icon: Server, color: 'text-blue-600', bgColor: 'from-blue-500 to-cyan-500', label: 'Mock' },
  SANDBOX: { icon: FlaskConical, color: 'text-amber-600', bgColor: 'from-amber-500 to-orange-500', label: 'Sandbox' },
  UAT: { icon: CheckCircle, color: 'text-green-600', bgColor: 'from-green-500 to-emerald-500', label: 'UAT' },
  PRODUCTION: { icon: Rocket, color: 'text-red-600', bgColor: 'from-red-500 to-rose-500', label: 'Production' },
};

const AUTH_TYPE_LABELS: Record<AuthType, string> = {
  NONE: 'No Auth',
  API_KEY: 'API Key',
  OAUTH2: 'OAuth 2.0',
  BASIC: 'Basic Auth',
};

export default function EnvironmentsPage() {
  const params = useParams();
  const projectId = params.id as string;
  const utils = trpc.useUtils();

  const [showForm, setShowForm] = useState(false);
  const [editingEnv, setEditingEnv] = useState<Environment | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [testingConnectionId, setTestingConnectionId] = useState<string | null>(null);
  const [connectionResult, setConnectionResult] = useState<{
    id: string;
    success: boolean;
    message: string;
    latencyMs?: number;
  } | null>(null);

  const environmentsQuery = trpc.environment.list.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  const deleteMutation = trpc.environment.delete.useMutation({
    onSuccess: async () => {
      await utils.environment.list.invalidate({ projectId });
      setConfirmingDeleteId(null);
    },
  });

  const setDefaultMutation = trpc.environment.setDefault.useMutation({
    onSuccess: async () => {
      await utils.environment.list.invalidate({ projectId });
    },
  });

  const testConnectionMutation = trpc.environment.testConnection.useMutation({
    onSuccess: (result) => {
      setConnectionResult({
        id: result.environmentId,
        success: result.success,
        message: result.success
          ? `Connected successfully (${result.latencyMs}ms)`
          : result.error || 'Connection failed',
        latencyMs: result.latencyMs,
      });
      setTestingConnectionId(null);
    },
    onError: (error, variables) => {
      // Use variables.id instead of testingConnectionId state to handle
      // concurrent connection tests (state may have changed by the time this fires)
      setConnectionResult({
        id: variables.id,
        success: false,
        message: error.message,
      });
      setTestingConnectionId(null);
    },
  });

  const environments = useMemo(() => environmentsQuery.data ?? [], [environmentsQuery.data]);
  const isLoading = environmentsQuery.isLoading;

  const handleTestConnection = (env: Environment) => {
    if (!env.baseUrl) return;
    setTestingConnectionId(env.id);
    setConnectionResult(null);
    testConnectionMutation.mutate({ id: env.id });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({ id });
  };

  const handleSetDefault = (id: string) => {
    setDefaultMutation.mutate({ id });
  };

  const handleEdit = (env: Environment) => {
    setEditingEnv(env);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingEnv(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingEnv(null);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between animate-in">
        <div>
          <h1 className="text-4xl font-bold gradient-text">Environments</h1>
          <p className="text-lg text-gray-600 mt-2">
            Configure API environments for testing (Sandbox, UAT, Production)
          </p>
        </div>
        <Button
          size="lg"
          variant="gradient"
          className="gap-2"
          onClick={() => setShowForm(true)}
        >
          <Plus className="h-5 w-5" />
          Add Environment
        </Button>
      </div>

      {/* Summary Stats */}
      {environments.length > 0 && (
        <div className="grid grid-cols-4 gap-4 animate-in" style={{ animationDelay: '50ms' }}>
          {(['MOCK', 'SANDBOX', 'UAT', 'PRODUCTION'] as EnvironmentType[]).map((type) => {
            const config = ENV_TYPE_CONFIG[type];
            const count = environments.filter((e) => e.type === type).length;
            const Icon = config.icon;
            return (
              <div
                key={type}
                className="rounded-2xl border border-gray-100 bg-white/80 p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className={`rounded-xl bg-gradient-to-br ${config.bgColor} p-2 shadow-lg`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{count}</p>
                    <p className="text-xs text-gray-500">{config.label}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Environment List */}
      {isLoading ? (
        <div className="rounded-3xl border border-gray-100 bg-white/70 p-12 text-center text-gray-500 shadow-inner">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-500" />
          <p className="mt-3">Loading environments...</p>
        </div>
      ) : environments.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-gray-200 bg-white/80 p-12 text-center shadow-inner animate-in">
          <Globe className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No environments configured</h3>
          <p className="text-gray-500 mb-6">
            Add your first environment to start testing against real API endpoints
          </p>
          <Button variant="default" onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Environment
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {environments.map((env, index) => {
            const envType = env.type as EnvironmentType;
            const config = ENV_TYPE_CONFIG[envType];
            const Icon = config.icon;
            const isConfirmingDelete = confirmingDeleteId === env.id;
            const isTestingConnection = testingConnectionId === env.id;
            const connectionResultForEnv = connectionResult?.id === env.id ? connectionResult : null;

            return (
              <Card
                key={env.id}
                className="card-hover animate-in relative"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {env.isDefault && (
                  <div className="absolute -top-2 -right-2 z-10">
                    <div className="rounded-full bg-gradient-to-br from-amber-400 to-orange-500 p-1.5 shadow-lg">
                      <Star className="h-4 w-4 text-white fill-white" />
                    </div>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${config.bgColor} shadow-lg`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={env.isActive ? 'success' : 'default'}>
                        {env.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      <Badge variant="outline">{config.label}</Badge>
                    </div>
                  </div>
                  <CardTitle className="text-lg">{env.name}</CardTitle>
                  <p className="text-sm text-gray-500 truncate">
                    {env.baseUrl || 'Using mock server'}
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Auth Info */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Authentication</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">
                        {AUTH_TYPE_LABELS[env.authType as AuthType]}
                      </span>
                      {env.hasCredentials && (
                        <Badge variant="outline" className="text-xs">
                          Configured
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Connection Result */}
                  {connectionResultForEnv && (
                    <div
                      className={`rounded-xl p-3 text-sm flex items-center gap-2 ${
                        connectionResultForEnv.success
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}
                    >
                      {connectionResultForEnv.success ? (
                        <Wifi className="h-4 w-4 flex-shrink-0" />
                      ) : (
                        <WifiOff className="h-4 w-4 flex-shrink-0" />
                      )}
                      <span className="truncate">{connectionResultForEnv.message}</span>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {env.type !== 'MOCK' && env.baseUrl && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTestConnection(env)}
                        disabled={isTestingConnection}
                        className="gap-1"
                      >
                        {isTestingConnection ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Testing...
                          </>
                        ) : (
                          <>
                            <Wifi className="h-4 w-4" />
                            Test
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(env)}
                      className="gap-1"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </Button>
                    {!env.isDefault && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSetDefault(env.id)}
                        disabled={setDefaultMutation.isPending}
                        className="gap-1"
                      >
                        <Star className="h-4 w-4" />
                        Default
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirmingDeleteId(env.id)}
                      className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Delete Confirmation */}
                  {isConfirmingDelete && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm">
                      <p className="font-medium text-red-700 mb-2">Delete this environment?</p>
                      <p className="text-red-600/80 text-xs mb-3">
                        This action cannot be undone.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(env.id)}
                          disabled={deleteMutation.isPending}
                          className="gap-1"
                        >
                          {deleteMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirmingDeleteId(null)}
                          disabled={deleteMutation.isPending}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Updated {new Date(env.updatedAt).toLocaleDateString()}
                    </div>
                    {env.isDefault && (
                      <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                        Default
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Form Dialog */}
      {showForm && (
        <EnvironmentForm
          projectId={projectId}
          environment={editingEnv || undefined}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}



