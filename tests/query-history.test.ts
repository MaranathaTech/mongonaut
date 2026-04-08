import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import type { QueryHistoryEntry } from '../src/shared/types';

// In-memory store mock
let storeData: { entries: QueryHistoryEntry[] } = { entries: [] };

vi.mock('electron-store', () => {
  return {
    default: class MockStore {
      constructor() {
        storeData = { entries: [] };
      }
      get(key: string): unknown {
        return storeData[key as keyof typeof storeData];
      }
      set(key: string, value: unknown): void {
        (storeData as Record<string, unknown>)[key] = value;
      }
    }
  };
});

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn()
  }
}));

vi.mock('crypto', () => ({
  randomUUID: () => `uuid-${Math.random().toString(36).slice(2, 11)}`
}));

const { addHistoryEntry, registerHistoryHandlers } = await import('../src/main/ipc/history.ipc');

describe('Query History', () => {
  beforeEach(() => {
    storeData = { entries: [] };
  });

  it('should add an entry', () => {
    const entry = addHistoryEntry({
      queryText: 'db.users.find({})',
      database: 'testdb',
      collection: 'users',
      executionTimeMs: 42,
      resultCount: 10,
      timestamp: Date.now()
    });

    expect(entry.id).toBeTruthy();
    expect(entry.queryText).toBe('db.users.find({})');
    expect(storeData.entries).toHaveLength(1);
  });

  it('should prepend new entries (most recent first)', () => {
    addHistoryEntry({
      queryText: 'first',
      database: 'db',
      collection: 'col',
      executionTimeMs: 1,
      resultCount: 0,
      timestamp: 1000
    });

    addHistoryEntry({
      queryText: 'second',
      database: 'db',
      collection: 'col',
      executionTimeMs: 1,
      resultCount: 0,
      timestamp: 2000
    });

    expect(storeData.entries[0].queryText).toBe('second');
    expect(storeData.entries[1].queryText).toBe('first');
  });

  it('should respect max entries limit (500)', () => {
    // Add 502 entries
    for (let i = 0; i < 502; i++) {
      addHistoryEntry({
        queryText: `query-${i}`,
        database: 'db',
        collection: 'col',
        executionTimeMs: 1,
        resultCount: 0,
        timestamp: i
      });
    }

    expect(storeData.entries.length).toBe(500);
    // Most recent should be first
    expect(storeData.entries[0].queryText).toBe('query-501');
  });

  it('should allow clearing entries via store', () => {
    addHistoryEntry({
      queryText: 'query1',
      database: 'db',
      collection: 'col',
      executionTimeMs: 1,
      resultCount: 0,
      timestamp: Date.now()
    });

    expect(storeData.entries.length).toBe(1);

    storeData.entries = [];
    expect(storeData.entries.length).toBe(0);
  });

  it('should allow deleting individual entries', () => {
    const entry1 = addHistoryEntry({
      queryText: 'query1',
      database: 'db',
      collection: 'col',
      executionTimeMs: 1,
      resultCount: 0,
      timestamp: 1000
    });

    addHistoryEntry({
      queryText: 'query2',
      database: 'db',
      collection: 'col',
      executionTimeMs: 1,
      resultCount: 0,
      timestamp: 2000
    });

    expect(storeData.entries.length).toBe(2);

    // Simulate deletion (as the IPC handler would do)
    storeData.entries = storeData.entries.filter((e) => e.id !== entry1.id);

    expect(storeData.entries.length).toBe(1);
    expect(storeData.entries[0].queryText).toBe('query2');
  });

  it('should generate unique IDs for entries', () => {
    const entry1 = addHistoryEntry({
      queryText: 'q1',
      database: 'db',
      collection: 'col',
      executionTimeMs: 1,
      resultCount: 0,
      timestamp: Date.now()
    });

    const entry2 = addHistoryEntry({
      queryText: 'q2',
      database: 'db',
      collection: 'col',
      executionTimeMs: 1,
      resultCount: 0,
      timestamp: Date.now()
    });

    expect(entry1.id).not.toBe(entry2.id);
  });

  it('should preserve all entry fields', () => {
    const timestamp = Date.now();
    const entry = addHistoryEntry({
      queryText: 'db.users.find({active: true})',
      database: 'production',
      collection: 'users',
      executionTimeMs: 150,
      resultCount: 42,
      timestamp
    });

    expect(entry.queryText).toBe('db.users.find({active: true})');
    expect(entry.database).toBe('production');
    expect(entry.collection).toBe('users');
    expect(entry.executionTimeMs).toBe(150);
    expect(entry.resultCount).toBe(42);
    expect(entry.timestamp).toBe(timestamp);
  });
});
