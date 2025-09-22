'use client';

import { useAccount, useReconnect } from 'wagmi';
import { useCallback, useEffect, useState } from 'react';
import { STORAGE_KEYS } from '@/lib/constants';

export interface SessionData {
  address?: `0x${string}`;
  chainId?: number;
  connectorId?: string;
  timestamp: number;
  expiresAt: number;
}

export interface UseSessionPersistenceReturn {
  hasStoredSession: boolean;
  isRestoring: boolean;
  restoreSession: () => Promise<void>;
  clearSession: () => void;
  sessionData?: SessionData;
}

const SESSION_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Hook for managing session persistence
 */
export function useSessionPersistence(): UseSessionPersistenceReturn {
  const { address, chainId, connector, isConnected } = useAccount();
  const { reconnectAsync, isPending: isRestoring } = useReconnect();
  const [sessionData, setSessionData] = useState<SessionData | undefined>();
  const [hasStoredSession, setHasStoredSession] = useState(false);

  // Load session data from storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.WALLET_SESSION);
      if (stored) {
        const data = JSON.parse(stored) as SessionData;
        const now = Date.now();

        if (data.expiresAt > now) {
          setSessionData(data);
          setHasStoredSession(true);
        } else {
          // Session expired, clear it
          localStorage.removeItem(STORAGE_KEYS.WALLET_SESSION);
          setHasStoredSession(false);
        }
      }
    } catch (error) {
      console.error('Failed to load session data:', error);
      localStorage.removeItem(STORAGE_KEYS.WALLET_SESSION);
      setHasStoredSession(false);
    }
  }, []);

  // Save session data when connected
  useEffect(() => {
    if (isConnected && address && chainId && connector) {
      const now = Date.now();
      const newSessionData: SessionData = {
        address,
        chainId,
        connectorId: connector.id,
        timestamp: now,
        expiresAt: now + SESSION_DURATION
      };

      try {
        localStorage.setItem(STORAGE_KEYS.WALLET_SESSION, JSON.stringify(newSessionData));
        setSessionData(newSessionData);
        setHasStoredSession(true);
      } catch (error) {
        console.error('Failed to save session data:', error);
      }
    }
  }, [isConnected, address, chainId, connector]);

  const clearSession = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEYS.WALLET_SESSION);
      setSessionData(undefined);
      setHasStoredSession(false);
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }, []);

  const restoreSession = useCallback(async () => {
    if (!hasStoredSession || !sessionData) {
      return;
    }

    try {
      await reconnectAsync();
    } catch (error) {
      console.error('Failed to restore session:', error);
      clearSession();
      throw error;
    }
  }, [hasStoredSession, sessionData, reconnectAsync, clearSession]);

  // Clear session when disconnected
  useEffect(() => {
    if (!isConnected && hasStoredSession) {
      clearSession();
    }
  }, [isConnected, hasStoredSession, clearSession]);

  return {
    hasStoredSession,
    isRestoring,
    restoreSession,
    clearSession,
    sessionData
  };
}