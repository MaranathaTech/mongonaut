import { useState, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import * as Switch from '@radix-ui/react-switch';
import { X, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import type { StoredConnectionConfig, FullConnectionConfig } from '../../../../shared/types';
import { useConnectionStore } from '../../stores/connection-store';

interface ConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editConfig?: StoredConnectionConfig | null;
}

function generateId(): string {
  return `conn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

const defaultFormState = {
  name: '',
  mode: 'uri' as const,
  uri: '',
  host: 'localhost',
  port: 27017,
  database: '',
  username: '',
  password: '',
  authMechanism: 'None',
  tls: false
};

export default function ConnectionDialog({
  open,
  onOpenChange,
  editConfig
}: ConnectionDialogProps): React.JSX.Element {
  const connect = useConnectionStore((s) => s.connect);

  const [form, setForm] = useState(() =>
    editConfig
      ? {
          name: editConfig.name,
          mode: editConfig.mode,
          uri: '',
          host: editConfig.host || 'localhost',
          port: editConfig.port || 27017,
          database: editConfig.database || '',
          username: editConfig.username || '',
          password: '',
          authMechanism: editConfig.authMechanism || 'None',
          tls: editConfig.tls || false
        }
      : { ...defaultFormState }
  );

  const [testStatus, setTestStatus] = useState<{
    state: 'idle' | 'testing' | 'success' | 'error';
    message?: string;
  }>({ state: 'idle' });

  const [connectError, setConnectError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const resetForm = useCallback(() => {
    setForm({ ...defaultFormState });
    setTestStatus({ state: 'idle' });
    setConnectError(null);
  }, []);

  const buildConfig = useCallback((): FullConnectionConfig => {
    return {
      id: editConfig?.id || generateId(),
      name: form.name || (form.mode === 'uri' ? 'New Connection' : `${form.host}:${form.port}`),
      mode: form.mode,
      uri: form.mode === 'uri' ? form.uri : undefined,
      host: form.mode === 'form' ? form.host : undefined,
      port: form.mode === 'form' ? form.port : undefined,
      database: form.database || undefined,
      username: form.username || undefined,
      password: form.password || undefined,
      authMechanism: form.authMechanism !== 'None' ? form.authMechanism : undefined,
      tls: form.tls || undefined
    };
  }, [form, editConfig]);

  const handleTest = useCallback(async () => {
    setTestStatus({ state: 'testing' });
    try {
      const config = buildConfig();
      const result = await window.api.testConnection(config);
      if (result.success) {
        setTestStatus({ state: 'success', message: 'Connection successful' });
      } else {
        setTestStatus({ state: 'error', message: result.error || 'Connection failed' });
      }
    } catch (err) {
      setTestStatus({
        state: 'error',
        message: err instanceof Error ? err.message : 'Connection test failed'
      });
    }
  }, [buildConfig]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const config = buildConfig();
      await window.api.saveConnection(config);
      onOpenChange(false);
      resetForm();
    } finally {
      setIsSaving(false);
    }
  }, [buildConfig, onOpenChange, resetForm]);

  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    setConnectError(null);
    try {
      const config = buildConfig();
      await window.api.saveConnection(config);
      const result = await window.api.connect(config);
      if (result.success) {
        // Store only the secret-free shape in renderer state
        connect({
          id: config.id,
          name: config.name,
          mode: config.mode,
          host: config.host,
          port: config.port,
          database: config.database,
          username: config.username,
          authMechanism: config.authMechanism,
          tls: config.tls
        });
        onOpenChange(false);
        resetForm();
      } else {
        setConnectError(result.error || 'Connection failed');
      }
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  }, [buildConfig, connect, onOpenChange, resetForm]);

  const inputClass =
    'w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-gray-200 bg-white shadow-xl focus:outline-none dark:border-zinc-700 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-zinc-700">
            <Dialog.Title className="text-sm font-medium">
              {editConfig ? 'Edit Connection' : 'New Connection'}
            </Dialog.Title>
            <Dialog.Close className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="px-5 py-4">
            {/* Connection name */}
            <div className="mb-4">
              <label className="mb-1 block text-xs text-gray-500 dark:text-zinc-400">
                Connection Name
              </label>
              <input
                className={inputClass}
                placeholder="My MongoDB Server"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <Tabs.Root
              value={form.mode}
              onValueChange={(v) => setForm((f) => ({ ...f, mode: v as 'uri' | 'form' }))}
            >
              <Tabs.List className="mb-4 flex gap-1 rounded bg-gray-100 p-1 dark:bg-zinc-800">
                <Tabs.Trigger
                  value="uri"
                  className="flex-1 rounded px-3 py-1 text-xs text-gray-500 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm dark:text-zinc-400 dark:data-[state=active]:bg-zinc-700 dark:data-[state=active]:text-zinc-100"
                >
                  URI
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="form"
                  className="flex-1 rounded px-3 py-1 text-xs text-gray-500 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm dark:text-zinc-400 dark:data-[state=active]:bg-zinc-700 dark:data-[state=active]:text-zinc-100"
                >
                  Form
                </Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="uri">
                <label className="mb-1 block text-xs text-gray-500 dark:text-zinc-400">
                  Connection String
                </label>
                <input
                  className={inputClass}
                  placeholder="mongodb://localhost:27017"
                  value={form.uri}
                  onChange={(e) => setForm((f) => ({ ...f, uri: e.target.value }))}
                />
              </Tabs.Content>

              <Tabs.Content value="form">
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="mb-1 block text-xs text-gray-500 dark:text-zinc-400">
                        Host
                      </label>
                      <input
                        className={inputClass}
                        placeholder="localhost"
                        value={form.host}
                        onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
                      />
                    </div>
                    <div className="w-24">
                      <label className="mb-1 block text-xs text-gray-500 dark:text-zinc-400">
                        Port
                      </label>
                      <input
                        className={inputClass}
                        type="number"
                        placeholder="27017"
                        value={form.port}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, port: parseInt(e.target.value) || 27017 }))
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-gray-500 dark:text-zinc-400">
                      Database
                    </label>
                    <input
                      className={inputClass}
                      placeholder="(optional)"
                      value={form.database}
                      onChange={(e) => setForm((f) => ({ ...f, database: e.target.value }))}
                    />
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="mb-1 block text-xs text-gray-500 dark:text-zinc-400">
                        Username
                      </label>
                      <input
                        className={inputClass}
                        placeholder="(optional)"
                        value={form.username}
                        onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="mb-1 block text-xs text-gray-500 dark:text-zinc-400">
                        Password
                      </label>
                      <input
                        className={inputClass}
                        type="password"
                        placeholder="(optional)"
                        value={form.password}
                        onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <label className="mb-1 block text-xs text-gray-500 dark:text-zinc-400">
                        Auth Mechanism
                      </label>
                      <select
                        className={inputClass}
                        value={form.authMechanism}
                        onChange={(e) => setForm((f) => ({ ...f, authMechanism: e.target.value }))}
                      >
                        <option value="None">None</option>
                        <option value="SCRAM-SHA-1">SCRAM-SHA-1</option>
                        <option value="SCRAM-SHA-256">SCRAM-SHA-256</option>
                        <option value="MONGODB-X509">X.509</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2 pb-1.5">
                      <label className="text-xs text-gray-500 dark:text-zinc-400">TLS</label>
                      <Switch.Root
                        checked={form.tls}
                        onCheckedChange={(checked) => setForm((f) => ({ ...f, tls: checked }))}
                        className="relative h-5 w-9 rounded-full bg-gray-300 data-[state=checked]:bg-blue-600 dark:bg-zinc-700"
                      >
                        <Switch.Thumb className="block h-4 w-4 translate-x-0.5 rounded-full bg-white transition-transform data-[state=checked]:translate-x-[18px]" />
                      </Switch.Root>
                    </div>
                  </div>
                </div>
              </Tabs.Content>
            </Tabs.Root>

            {/* Test status */}
            {testStatus.state !== 'idle' && (
              <div
                className={`mt-4 flex items-center gap-2 rounded px-3 py-2 text-xs ${
                  testStatus.state === 'testing'
                    ? 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400'
                    : testStatus.state === 'success'
                      ? 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                }`}
              >
                {testStatus.state === 'testing' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {testStatus.state === 'success' && <CheckCircle2 className="h-3.5 w-3.5" />}
                {testStatus.state === 'error' && <XCircle className="h-3.5 w-3.5" />}
                <span>{testStatus.message || 'Testing connection...'}</span>
              </div>
            )}

            {/* Connect error */}
            {connectError && (
              <div className="mt-3 flex items-center gap-2 rounded bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/30 dark:text-red-400">
                <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>{connectError}</span>
              </div>
            )}
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-between border-t border-gray-200 px-5 py-3 dark:border-zinc-700">
            <button
              onClick={handleTest}
              disabled={testStatus.state === 'testing'}
              className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Test Connection
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onOpenChange(false);
                  resetForm();
                }}
                className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="rounded border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Save
              </button>
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="rounded bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
