
import { AgentTaskExecutionRecord } from '../types';
import { AGENT_TASK_EXECUTION_RECORDS_LS_KEY } from '../constants';

const generateAnalyticsId = () => `task_${new Date().getTime()}_${Math.random().toString(36).substr(2, 9)}`;

export const getTaskExecutionRecords = (agentId?: string): AgentTaskExecutionRecord[] => {
  try {
    const storedRecords = localStorage.getItem(AGENT_TASK_EXECUTION_RECORDS_LS_KEY);
    let records: AgentTaskExecutionRecord[] = storedRecords ? JSON.parse(storedRecords) : [];
    if (agentId) {
      records = records.filter(record => record.agentId === agentId);
    }
    // Sort by startedAt descending by default
    return records.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  } catch (error) {
    console.error("Failed to load task execution records from localStorage:", error);
    return [];
  }
};

export const saveTaskExecutionRecord = (record: Omit<AgentTaskExecutionRecord, 'id' | 'durationMs'> & { completedAt?: string }): AgentTaskExecutionRecord => {
  const records = getTaskExecutionRecords(); // Get all records
  
  const completedAt = record.completedAt || new Date().toISOString();
  const durationMs = record.startedAt ? new Date(completedAt).getTime() - new Date(record.startedAt).getTime() : undefined;

  const newRecord: AgentTaskExecutionRecord = {
    ...record,
    id: generateAnalyticsId(),
    completedAt,
    durationMs,
  };

  records.push(newRecord);
  
  try {
    localStorage.setItem(AGENT_TASK_EXECUTION_RECORDS_LS_KEY, JSON.stringify(records));
  } catch (error) {
    console.error("Failed to save task execution record to localStorage:", error);
    // Potentially handle storage full error
  }
  return newRecord;
};

export const calculateApproxTokens = (text: string): number => {
  if (!text) return 0;
  // Simple approximation: count words. A more sophisticated method might be needed for actual token counts.
  return text.split(/\s+/).filter(Boolean).length;
};
