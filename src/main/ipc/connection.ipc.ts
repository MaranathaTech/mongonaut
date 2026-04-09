import { ipcMain, safeStorage } from 'electron';
import Store from 'electron-store';
import { IPC_CHANNELS } from '../../shared/ipc-channels';
import type { FullConnectionConfig, StoredConnectionConfig } from '../../shared/types';
import { connectionManager } from '../services/connection-manager';

/** Shape persisted in electron-store (secret fields are always encrypted). */
interface PersistedConnection extends StoredConnectionConfig {
  encryptedPassword?: string;
  encryptedUri?: string;
}

/** Legacy shape that may exist before migration. */
interface LegacyConnection extends StoredConnectionConfig {
  password?: string;
  uri?: string;
  encryptedPassword?: string;
  encryptedUri?: string;
}

const store = new Store({
  defaults: {
    connections: [] as LegacyConnection[]
  }
}) as unknown as {
  get(key: 'connections'): LegacyConnection[];
  set(key: 'connections', value: PersistedConnection[]): void;
};

const encryptionAvailable = safeStorage.isEncryptionAvailable();

// ---------------------------------------------------------------------------
// Migration: encrypt any legacy plaintext credentials on first load
// ---------------------------------------------------------------------------
function migrateLegacyCredentials(): void {
  const connections = store.get('connections');
  let migrated = 0;

  const updated = connections.map((conn) => {
    const record: PersistedConnection = { ...conn };
    let needsMigration = false;

    if ('password' in record && (record as LegacyConnection).password) {
      if (encryptionAvailable) {
        record.encryptedPassword = safeStorage
          .encryptString((record as LegacyConnection).password!)
          .toString('base64');
        needsMigration = true;
      }
      // If encryption unavailable, leave plaintext alone (don't delete credentials).
    }

    if ('uri' in record && (record as LegacyConnection).uri) {
      if (encryptionAvailable) {
        record.encryptedUri = safeStorage
          .encryptString((record as LegacyConnection).uri!)
          .toString('base64');
        needsMigration = true;
      }
    }

    if (needsMigration) {
      delete (record as LegacyConnection).password;
      delete (record as LegacyConnection).uri;
      migrated++;
    }

    return record;
  });

  if (migrated > 0) {
    store.set('connections', updated);
    console.info(`[connection] migrated ${migrated} legacy plaintext credentials`);
  } else if (!encryptionAvailable && connections.some((c) => c.password || c.uri)) {
    console.warn(
      '[connection] OS credential storage is unavailable — legacy plaintext credentials were not migrated'
    );
  }
}

migrateLegacyCredentials();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Strip secret / encrypted fields; return only the shape safe for the renderer. */
function toStoredConfig(record: PersistedConnection): StoredConnectionConfig {
  const stored: StoredConnectionConfig = {
    id: record.id,
    name: record.name,
    mode: record.mode,
    host: record.host,
    port: record.port,
    database: record.database,
    username: record.username,
    authMechanism: record.authMechanism,
    tls: record.tls,
    lastUsed: record.lastUsed
  };
  return stored;
}

/** Hydrate a persisted record back to a FullConnectionConfig (with decrypted secrets). */
function hydrateConfig(record: PersistedConnection): FullConnectionConfig {
  const config: FullConnectionConfig = { ...toStoredConfig(record) };

  if (record.encryptedPassword) {
    config.password = safeStorage.decryptString(
      Buffer.from(record.encryptedPassword, 'base64')
    );
  }
  if (record.encryptedUri) {
    config.uri = safeStorage.decryptString(Buffer.from(record.encryptedUri, 'base64'));
  }

  return config;
}

/** Encrypt incoming secrets and return a PersistedConnection. */
function toPersistedConfig(config: FullConnectionConfig): PersistedConnection {
  const {
    password,
    uri,
    ...base
  } = config;

  const persisted: PersistedConnection = { ...base };

  if (password) {
    persisted.encryptedPassword = safeStorage.encryptString(password).toString('base64');
  }
  if (uri) {
    persisted.encryptedUri = safeStorage.encryptString(uri).toString('base64');
  }

  return persisted;
}

// ---------------------------------------------------------------------------
// IPC handlers
// ---------------------------------------------------------------------------

export function registerConnectionHandlers(): void {
  ipcMain.handle(
    IPC_CHANNELS.CONNECTION_CONNECT,
    async (_event, config: FullConnectionConfig) => {
      try {
        // If the renderer sends an id for a saved connection, prefer stored (encrypted) secrets.
        const connections = store.get('connections');
        const stored = connections.find((c) => c.id === config.id);

        let fullConfig: FullConnectionConfig;
        if (stored && (stored.encryptedPassword || stored.encryptedUri)) {
          fullConfig = hydrateConfig(stored);
          // Merge any non-secret fields the renderer may have updated
          fullConfig = { ...fullConfig, ...toStoredConfig(config as unknown as PersistedConnection) };
        } else {
          // Unsaved / new connection — secrets come from the renderer form
          fullConfig = config;
        }

        await connectionManager.connect(fullConfig);

        // Update lastUsed timestamp
        if (stored) {
          const idx = connections.findIndex((c) => c.id === config.id);
          if (idx !== -1) {
            connections[idx] = { ...connections[idx], lastUsed: Date.now() };
            store.set('connections', connections as PersistedConnection[]);
          }
        }

        return { success: true };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: message };
      }
    }
  );

  ipcMain.handle(IPC_CHANNELS.CONNECTION_DISCONNECT, async () => {
    await connectionManager.disconnect();
    return { success: true };
  });

  ipcMain.handle(
    IPC_CHANNELS.CONNECTION_TEST,
    async (_event, config: FullConnectionConfig) => {
      // For test, the renderer sends secrets from the form directly.
      // If this is a saved connection, hydrate stored secrets instead.
      const connections = store.get('connections');
      const stored = connections.find((c) => c.id === config.id);

      let fullConfig: FullConnectionConfig;
      if (stored && (stored.encryptedPassword || stored.encryptedUri)) {
        fullConfig = hydrateConfig(stored);
        fullConfig = { ...fullConfig, ...toStoredConfig(config as unknown as PersistedConnection) };
      } else {
        fullConfig = config;
      }

      return connectionManager.testConnection(fullConfig);
    }
  );

  ipcMain.handle(IPC_CHANNELS.CONNECTION_SAVE, (_event, config: FullConnectionConfig) => {
    const hasSecrets = Boolean(config.password || config.uri);

    if (hasSecrets && !encryptionAvailable) {
      return {
        success: false,
        error:
          'Cannot save connection: OS credential storage is unavailable. ' +
          'Install libsecret or use a keychain-capable environment.'
      };
    }

    const persisted = toPersistedConfig(config);
    const connections = store.get('connections') as PersistedConnection[];
    const idx = connections.findIndex((c) => c.id === config.id);
    if (idx !== -1) {
      // Preserve existing encrypted fields if the user didn't provide new secrets
      if (!persisted.encryptedPassword && connections[idx].encryptedPassword) {
        persisted.encryptedPassword = connections[idx].encryptedPassword;
      }
      if (!persisted.encryptedUri && connections[idx].encryptedUri) {
        persisted.encryptedUri = connections[idx].encryptedUri;
      }
      connections[idx] = persisted;
    } else {
      connections.push(persisted);
    }
    store.set('connections', connections);
    return { success: true };
  });

  ipcMain.handle(IPC_CHANNELS.CONNECTION_LIST, () => {
    const connections = store.get('connections');
    return connections.map(toStoredConfig);
  });

  ipcMain.handle(IPC_CHANNELS.CONNECTION_DELETE, (_event, id: string) => {
    const connections = store.get('connections') as PersistedConnection[];
    store.set(
      'connections',
      connections.filter((c) => c.id !== id)
    );
    return { success: true };
  });
}
