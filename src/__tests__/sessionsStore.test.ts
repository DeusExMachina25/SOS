import { describe, it, expect, beforeEach } from 'vitest';
import { getStoredSessions, saveSessions, Session } from '../utils/sessionsStore';

// Explicitly mock localStorage to guarantee environment independence
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] || null,
  setItem: (key: string, value: string) => { store[key] = value; },
  clear: () => {
    for (const key in store) {
      delete store[key];
    }
  },
  removeItem: (key: string) => { delete store[key]; },
  length: 0,
  key: (index: number) => null,
};

Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
}

describe('sessionsStore', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should return default sessions when localStorage is empty', () => {
    const sessions = getStoredSessions();
    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions[0].id).toBe('sess-101');
  });

  it('should successfully save and retrieve sessions from localStorage', () => {
    const customSessions: Session[] = [
      { 
        id: "custom-1", 
        name: "Test Consultation", 
        client: "Client", 
        expert: "Expert", 
        date: "Oct 24, 2026", 
        time: "10:00 AM", 
        status: "scheduled", 
        duration: "60 min" 
      }
    ];
    saveSessions(customSessions);
    const retrieved = getStoredSessions();
    expect(retrieved).toEqual(customSessions);
  });
});
