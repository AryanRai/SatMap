import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLogs, LogEntry, LogType } from '../contexts/LogContext';
import styles from './ConsolePanel.module.css';

interface ConsolePanelProps {
  isVisible: boolean;
  onClose: () => void;
  initialPosition?: { x: number; y: number };
  maxDisplayedLogs?: number; // New prop to control displayed logs
}

const formatLogMessage = (messages: any[]): string => {
  return messages.map(msg => {
    if (typeof msg === 'string') return msg;
    if (typeof msg === 'object' && msg !== null) {
      try {
        // Attempt to stringify. If it's a very complex object, this might still be slow.
        // Consider a more robust solution for very complex objects if needed (e.g., custom replacer, depth limiting).
        let str = JSON.stringify(msg, null, 2);
        if (str.length > 1000) { // Truncate very long strings
          str = str.substring(0, 1000) + '... [truncated]';
        }
        return str;
      } catch (e) {
        // Handle potential circular structures or other stringify errors
        if (e instanceof TypeError && e.message.toLowerCase().includes('circular json')) {
          return '[Circular Object]';
        }
        return '[Unserializable Object]';
      }
    }
    return String(msg);
  }).join(' ');
};

const getLogTypeStyle = (type: LogType): string => {
  switch (type) {
    case 'error': return styles.logError;
    case 'warn': return styles.logWarn;
    case 'info': return styles.logInfo;
    case 'debug': return styles.logDebug;
    default: return styles.logDefault;
  }
};

const ConsolePanel: React.FC<ConsolePanelProps> = ({
  isVisible,
  onClose,
  initialPosition = { x: window.innerWidth - 420, y: 50 },
  maxDisplayedLogs = 75, // Increased maxDisplayedLogs to 75
}) => {
  const { logs, clearLogs } = useLogs(); // Full logs from context (up to LogProvider's maxLogs)
  
  // Slice the logs to display only the most recent ones, up to maxDisplayedLogs
  // Logs are stored with newest first, so slice from the beginning.
  const displayedLogs = logs.slice(0, maxDisplayedLogs);

  const [panelPosition, setPanelPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [allowTextSelection, setAllowTextSelection] = useState(false);

  useEffect(() => {
    setPanelPosition(initialPosition);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPosition?.x, initialPosition?.y]); // Dependency on x and y if initialPosition can change

  useEffect(() => {
    if (!isMinimized && logContainerRef.current) {
      // When logs change, scroll to the bottom (since new logs are added at the top of the array, visually bottom)
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [displayedLogs, isMinimized]); // Change dependency to displayedLogs

  const handleMouseDownOnHeader = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).classList.contains(styles.headerButton)) return;
    if (!panelRef.current || allowTextSelection) return;

    setIsDragging(true);
    const panelRect = panelRef.current.getBoundingClientRect();
    setDragStartOffset({
      x: e.clientX - panelRect.left,
      y: e.clientY - panelRect.top,
    });
    e.preventDefault();
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !panelRef.current) return;
    let newX = e.clientX - dragStartOffset.x;
    let newY = e.clientY - dragStartOffset.y;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const panelCurrent = panelRef.current;
    const panelRect = panelCurrent.getBoundingClientRect();
    
    const headerElement = panelCurrent.querySelector(`.${styles.panelHeader}`) as HTMLElement;
    const headerHeight = headerElement ? headerElement.offsetHeight : 40;

    newX = Math.max(0, Math.min(newX, vw - panelRect.width));
    newY = Math.max(0, Math.min(newY, vh - headerHeight));

    setPanelPosition({ x: newX, y: newY });
  }, [isDragging, dragStartOffset]); // Removed panelRef from deps as it's stable

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    if (!isVisible) {
        setIsMinimized(false);
        setAllowTextSelection(false);
    }
  }, [isVisible]);

  const toggleMinimize = () => setIsMinimized(!isMinimized);
  const toggleCopyMode = () => setAllowTextSelection(!allowTextSelection);

  if (!isVisible) {
    return null;
  }

  const panelClasses = `${styles.consolePanel} ${isMinimized ? styles.minimized : ''}`;

  return (
    <div
      ref={panelRef}
      className={panelClasses}
      style={{
        left: `${panelPosition.x}px`,
        top: `${panelPosition.y}px`,
        position: 'fixed',
        cursor: isDragging ? 'grabbing' : (allowTextSelection ? 'text' : 'grab'),
        zIndex: 1040, 
        userSelect: allowTextSelection ? 'auto' : 'none'
      }}
    >
      <div className={styles.panelHeader} onMouseDown={handleMouseDownOnHeader}>
        <h4 className={styles.panelTitle}>Console ({displayedLogs.length}/{logs.length})</h4> {/* Show displayed/total */} 
        <div className={styles.headerButtons}>
          <button onClick={toggleCopyMode} className={styles.headerButton} title={allowTextSelection ? "Enable Panel Dragging" : "Enable Text Selection"}>
            {allowTextSelection ? '✋' : '✂️'} <span className={styles.buttonTextSmall}>{allowTextSelection ? 'Drag' : 'Select'}</span>
          </button>
          <button onClick={clearLogs} className={styles.headerButton} title="Clear Logs">
            🗑️ <span className={styles.buttonTextSmall}>Clear</span>
          </button>
          <button onClick={toggleMinimize} className={styles.headerButton} title={isMinimized ? "Maximize" : "Minimize"}>
            {isMinimized ? '□' : '−'}
          </button>
          <button onClick={onClose} className={`${styles.headerButton} ${styles.closeButtonCustom}`} title="Close Console">
            ×
          </button>
        </div>
      </div>
      {!isMinimized && (
        <div ref={logContainerRef} className={styles.panelContent}>
          {displayedLogs.length === 0 ? (
            <p className={styles.emptyLogMessage}>No console messages captured.</p>
          ) : (
            // Iterate over displayedLogs (which are newest first) and then reverse for rendering order (oldest at top)
            // Or, keep as is and expect newest at top of console panel.
            // Current LogProvider adds newest to front, so displayedLogs[0] is newest.
            // To show oldest at top, newest at bottom (traditional console): displayedLogs.slice().reverse().map(...)
            displayedLogs.slice().reverse().map(log => (
              <div key={log.id} className={`${styles.logEntry} ${getLogTypeStyle(log.type)}`}>
                <span className={styles.logTimestamp}>{log.timestamp.toLocaleTimeString()}</span>
                <span className={styles.logType}>[{log.type.toUpperCase()}]</span>
                <pre className={styles.logMessage}>{formatLogMessage(log.messages)}</pre>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ConsolePanel; 