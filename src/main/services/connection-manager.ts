import { MongoClient } from 'mongodb';
import type { ConnectionConfig } from '../../shared/types';

function buildUri(config: ConnectionConfig): string {
  if (config.mode === 'uri' && config.uri) {
    return config.uri;
  }

  const host = config.host || 'localhost';
  const port = config.port || 27017;

  let userInfo = '';
  if (config.username) {
    const user = encodeURIComponent(config.username);
    const pass = config.password ? `:${encodeURIComponent(config.password)}` : '';
    userInfo = `${user}${pass}@`;
  }

  const db = config.database ? `/${config.database}` : '';

  const params: string[] = [];
  if (config.authMechanism && config.authMechanism !== 'None') {
    params.push(`authMechanism=${config.authMechanism}`);
  }
  if (config.tls) {
    params.push('tls=true');
  }
  const query = params.length > 0 ? `?${params.join('&')}` : '';

  return `mongodb://${userInfo}${host}:${port}${db}${query}`;
}

class ConnectionManager {
  private client: MongoClient | null = null;
  private config: ConnectionConfig | null = null;

  async connect(config: ConnectionConfig): Promise<void> {
    if (this.client) {
      await this.disconnect();
    }

    const uri = buildUri(config);
    this.client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000
    });

    await this.client.connect();
    this.config = config;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.config = null;
    }
  }

  async testConnection(
    config: ConnectionConfig
  ): Promise<{ success: boolean; error?: string; serverInfo?: unknown }> {
    let tempClient: MongoClient | null = null;
    try {
      const uri = buildUri(config);
      tempClient = new MongoClient(uri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 10000
      });
      await tempClient.connect();
      const admin = tempClient.db().admin();
      const serverInfo = await admin.command({ ping: 1 });
      return { success: true, serverInfo };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    } finally {
      if (tempClient) {
        await tempClient.close().catch(() => {});
      }
    }
  }

  getClient(): MongoClient {
    if (!this.client) {
      throw new Error('Not connected to MongoDB');
    }
    return this.client;
  }

  getConfig(): ConnectionConfig | null {
    return this.config;
  }

  isConnected(): boolean {
    return this.client !== null;
  }
}

export const connectionManager = new ConnectionManager();
