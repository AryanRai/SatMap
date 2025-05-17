import React, { createContext, useState, useCallback, ReactNode, useEffect } from 'react';

export type LogType = 'log' | 'warn' | 'error' | 'info' | 'debug';

export interface LogEntry {
  id: string; // Using string for UUID or timestamp-based unique ID
  timestamp: Date;
  type: LogType;
  messages: any[]; // Can be multiple arguments to console.log, etc.
}

interface LogContextType {
  logs: LogEntry[];
  clearLogs: () => void;
  // addLog is not exposed directly via context, it's handled by overriding console methods
}

const LogContext = createContext<LogContextType | undefined>(undefined);

interface LogProviderProps {
  children: ReactNode;
  maxLogs?: number;
}

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

export const LogProvider: React.FC<LogProviderProps> = ({ children, maxLogs = 150 }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback((type: LogType, ...messages: any[]) => {
    setLogs(prevLogs => {
      const newLog: LogEntry = {
        id: generateId(),
        timestamp: new Date(),
        type,
        messages,
      };
      const updatedLogs = [newLog, ...prevLogs]; // Add new log to the beginning
      if (updatedLogs.length > maxLogs) {
        return updatedLogs.slice(0, maxLogs); // Keep only the most recent logs
      }
      return updatedLogs;
    });
  }, [maxLogs]);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  useEffect(() => {
    const originalConsole = { ...console };

    console.log = (...args: any[]) => {
      originalConsole.log(...args);
      addLog('log', ...args);
    };
    console.warn = (...args: any[]) => {
      originalConsole.warn(...args);
      addLog('warn', ...args);
    };
    console.error = (...args: any[]) => {
      originalConsole.error(...args);
      addLog('error', ...args);
    };
    console.info = (...args: any[]) => {
      originalConsole.info(...args);
      addLog('info', ...args);
    };
    console.debug = (...args: any[]) => { // Also capture debug if needed
        originalConsole.debug(...args);
        addLog('debug', ...args);
    };

    // Cleanup function to restore original console methods
    return () => {
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
      console.info = originalConsole.info;
      console.debug = originalConsole.debug;
    };
  }, [addLog]);

  return (
    <LogContext.Provider value={{ logs, clearLogs }}>
      {children}
    </LogContext.Provider>
  );
};

export const useLogs = (): LogContextType => {
  const context = React.useContext(LogContext);
  if (context === undefined) {
    throw new Error('useLogs must be used within a LogProvider');
  }
  return context;
}; 