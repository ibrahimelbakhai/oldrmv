
import React from 'react';
import { PCPExecutionLogEntry } from '../../types';
import LoadingSpinner from '../shared/LoadingSpinner'; // Re-use existing spinner

interface ExecutionControlsProps {
  onRun: () => void;
  isRunning: boolean;
  progress: number; // 0-100
  logs: PCPExecutionLogEntry[];
  lastRunStatus?: 'success' | 'failed' | 'running' | 'idle';
  lastRunOutputLink?: string;
}

const ExecutionControls: React.FC<ExecutionControlsProps> = ({
  onRun,
  isRunning,
  progress,
  logs,
  lastRunStatus,
  lastRunOutputLink
}) => {

  const getLogColor = (type: PCPExecutionLogEntry['type']): string => {
    switch (type) {
      case 'error': return 'text-red-500';
      case 'success': return 'text-green-600';
      case 'step_start':
      case 'step_end': return 'text-blue-600';
      case 'info': return 'text-slate-600';
      case 'debug': return 'text-purple-600';
      default: return 'text-slate-500';
    }
  };

  return (
    <div className="mt-6 pt-6 border-t border-slate-300 space-y-4">
      <h3 className="text-lg font-semibold text-slate-700">Run & Monitor Execution</h3>
      
      <button
        onClick={onRun}
        disabled={isRunning}
        className="w-full px-6 py-3 text-base font-medium text-white bg-green-600 hover:bg-green-700 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {isRunning ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Executing...
          </>
        ) : (
          'Run Agent Configuration'
        )}
      </button>

      {isRunning && (
        <div className="w-full bg-slate-200 rounded-full h-4 mt-3">
          <div
            className="bg-blue-500 h-4 rounded-full transition-all duration-300 ease-linear"
            style={{ width: `${progress}%` }}
          >
             <span className="text-xs text-white text-center block leading-4">{progress}%</span>
          </div>
        </div>
      )}

      {logs.length > 0 && (
        <div className="mt-4 space-y-2">
          <h4 className="text-sm font-semibold text-slate-600">Execution Log:</h4>
          <div className="max-h-60 overflow-y-auto p-3 bg-slate-800 text-white rounded-md font-mono text-xs space-y-1">
            {logs.map((log) => (
              <p key={log.id} className={`${getLogColor(log.type)}`}>
                <span className="text-slate-400">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                {log.stepName && <span className="font-semibold mx-1">[{log.stepName}]</span>}
                {log.message}
              </p>
            ))}
          </div>
        </div>
      )}
      
      {!isRunning && lastRunStatus === 'success' && lastRunOutputLink && (
        <div className="mt-3 p-3 bg-green-50 border border-green-300 rounded-md">
            <p className="text-sm text-green-700">
                Last execution successful! 
                <a 
                    href={lastRunOutputLink} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="ml-2 font-medium text-sky-600 hover:text-sky-800 underline"
                >
                    View Output (Simulated Link)
                </a>
            </p>
        </div>
      )}
      {!isRunning && lastRunStatus === 'failed' && (
         <div className="mt-3 p-3 bg-red-50 border border-red-300 rounded-md">
            <p className="text-sm text-red-700">Last execution failed. Check logs for details.</p>
        </div>
      )}
    </div>
  );
};

export default ExecutionControls;
