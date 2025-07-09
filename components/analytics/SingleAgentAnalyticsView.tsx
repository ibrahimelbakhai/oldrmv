import React, { useState, useEffect, useMemo } from 'react';
import { AgentDefinition, AgentTaskExecutionRecord, AgentTaskStatus } from '../../types';
import { getTaskExecutionRecords } from '../../services/analyticsService';
import LoadingSpinner from '../shared/LoadingSpinner';
import PaginationControls from '../shared/PaginationControls';

interface SingleAgentAnalyticsViewProps {
  agent: AgentDefinition;
}

const SingleAgentAnalyticsView: React.FC<SingleAgentAnalyticsViewProps> = ({ agent }) => {
  const [allTasksForAgent, setAllTasksForAgent] = useState<AgentTaskExecutionRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<AgentTaskStatus | 'all'>('all');
  const [filterStepName, setFilterStepName] = useState<string | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    try {
      const agentTasks = getTaskExecutionRecords(agent.id); // Already sorted by date desc
      setAllTasksForAgent(agentTasks);
    } catch (e) {
      console.error(`Error loading tasks for agent ${agent.name}:`, e);
      setError("Failed to load task execution records.");
    } finally {
      setIsLoading(false);
    }
  }, [agent.id, agent.name]);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters or search term change
  }, [searchTerm, filterStatus, filterStepName]);

  const uniqueStepNames = useMemo(() => {
    const names = new Set(allTasksForAgent.map(task => task.stepName));
    return Array.from(names).sort();
  }, [allTasksForAgent]);

  const filteredAndSearchedTasks = useMemo(() => {
    let processedTasks = [...allTasksForAgent];

    if (filterStatus !== 'all') {
      processedTasks = processedTasks.filter(task => task.status === filterStatus);
    }
    if (filterStepName !== 'all') {
      processedTasks = processedTasks.filter(task => task.stepName === filterStepName);
    }
    if (searchTerm.trim() !== '') {
      const lowerSearch = searchTerm.toLowerCase();
      processedTasks = processedTasks.filter(task =>
        task.stepName.toLowerCase().includes(lowerSearch) ||
        (task.inputSummary && task.inputSummary.toLowerCase().includes(lowerSearch)) ||
        (task.outputSummary && task.outputSummary.toLowerCase().includes(lowerSearch)) ||
        (task.error && task.error.toLowerCase().includes(lowerSearch)) ||
        task.id.toLowerCase().includes(lowerSearch) ||
        (task.planId && task.planId.toLowerCase().includes(lowerSearch))
      );
    }
    return processedTasks; // Already sorted by date desc from getTaskExecutionRecords
  }, [allTasksForAgent, searchTerm, filterStatus, filterStepName]);
  
  const totalPages = Math.ceil(filteredAndSearchedTasks.length / itemsPerPage);
  const displayedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSearchedTasks.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSearchedTasks, currentPage, itemsPerPage]);


  const stats = useMemo(() => {
    const tasksToConsider = filteredAndSearchedTasks; // Stats based on filtered data
    const totalTasks = tasksToConsider.length;
    const successfulTasks = tasksToConsider.filter(t => t.status === AgentTaskStatus.COMPLETED).length;
    const failedTasks = tasksToConsider.filter(t => t.status === AgentTaskStatus.FAILED).length;
    const totalApproxInputTokens = tasksToConsider.reduce((sum, t) => sum + (t.approxInputTokens || 0), 0);
    const totalApproxOutputTokens = tasksToConsider.reduce((sum, t) => sum + (t.approxOutputTokens || 0), 0);
    const averageDurationMs = totalTasks > 0 
        ? tasksToConsider.reduce((sum, t) => sum + (t.durationMs || 0), 0) / totalTasks
        : 0;

    return {
      totalTasks,
      successfulTasks,
      failedTasks,
      totalApproxInputTokens,
      totalApproxOutputTokens,
      averageDuration: averageDurationMs > 0 ? (averageDurationMs / 1000).toFixed(2) + 's' : 'N/A',
    };
  }, [filteredAndSearchedTasks]);

  const formatDuration = (ms?: number) => {
    if (ms === undefined) return 'N/A';
    if (ms < 0) return 'N/A';
    if (ms < 1000) return `${ms} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
  };
  
  const getStatusColorClass = (status: AgentTaskStatus) => {
    switch (status) {
      case AgentTaskStatus.COMPLETED: return 'bg-green-100 text-green-700';
      case AgentTaskStatus.FAILED: return 'bg-red-100 text-red-700';
      case AgentTaskStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  if (isLoading) {
    return <div className="p-4"><LoadingSpinner /> <p className="text-center">Loading analytics for {agent.name}...</p></div>;
  }
  if (error) {
    return <p className="text-red-500 p-4">Error: {error}</p>;
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-slate-700">Analytics for: <span className="text-sky-600">{agent.name}</span></h3>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Tasks (Filtered)', value: stats.totalTasks.toLocaleString() },
          { label: 'Successful Tasks', value: stats.successfulTasks.toLocaleString() },
          { label: 'Failed Tasks', value: stats.failedTasks.toLocaleString() },
          { label: 'Avg. Duration', value: stats.averageDuration },
          { label: 'Input Tokens (Words)', value: stats.totalApproxInputTokens.toLocaleString() },
          { label: 'Output Tokens (Words)', value: stats.totalApproxOutputTokens.toLocaleString() },
        ].map(stat => (
          <div key={stat.label} className="bg-slate-50 p-4 rounded-lg shadow">
            <dt className="text-sm font-medium text-slate-500 truncate">{stat.label}</dt>
            <dd className="mt-1 text-2xl font-semibold text-sky-600">{stat.value}</dd>
          </div>
        ))}
      </div>

      <div>
        <h4 className="text-lg font-medium text-slate-700 mb-3">Task Execution History</h4>
        {/* Search and Filter Controls */}
        <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-1">
            <label htmlFor="task-search" className="block text-sm font-medium text-slate-600 mb-1">Search Tasks</label>
            <input
              type="text"
              id="task-search"
              placeholder="Search by step, summary, error..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="task-filter-status" className="block text-sm font-medium text-slate-600 mb-1">Filter by Status</label>
            <select
              id="task-filter-status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as AgentTaskStatus | 'all')}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
            >
              <option value="all">All Statuses</option>
              {Object.values(AgentTaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="task-filter-step" className="block text-sm font-medium text-slate-600 mb-1">Filter by Step Name</label>
            <select
              id="task-filter-step"
              value={filterStepName}
              onChange={(e) => setFilterStepName(e.target.value)}
              disabled={uniqueStepNames.length === 0}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm disabled:bg-slate-100"
            >
              <option value="all">All Steps</option>
              {uniqueStepNames.map(name => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
        </div>

        {displayedTasks.length === 0 ? (
          <p className="text-slate-500 italic text-center py-4">
            {filteredAndSearchedTasks.length === 0 && searchTerm === '' && filterStatus === 'all' && filterStepName === 'all'
             ? 'No tasks have been recorded for this agent yet.'
             : 'No tasks match your current search or filter criteria.'}
          </p>
        ) : (
          <div className="overflow-x-auto bg-white shadow rounded-lg">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {['Timestamp', 'Step Name', 'Status', 'Duration', 'In Tokens', 'Out Tokens', 'Details'].map(header => (
                    <th key={header} scope="col" className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {displayedTasks.map(task => (
                  <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{new Date(task.startedAt).toLocaleString()}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700">{task.stepName}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColorClass(task.status)}`}>
                            {task.status}
                        </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{formatDuration(task.durationMs)}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 text-center">{task.approxInputTokens?.toLocaleString() || 0}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500 text-center">{task.approxOutputTokens?.toLocaleString() || 0}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">
                      <details>
                        <summary className="cursor-pointer text-sky-600 hover:text-sky-800">View</summary>
                        <div className="p-2 mt-1 bg-slate-100 rounded shadow text-xs space-y-1 min-w-[250px] absolute z-10 border border-slate-300">
                          <p><strong>Task ID:</strong> {task.id}</p>
                          {task.planId && <p><strong>Plan ID:</strong> {task.planId}</p>}
                          <p><strong>Input:</strong> <span className="font-mono block max-h-20 overflow-y-auto whitespace-pre-wrap">{task.inputSummary}</span></p>
                          {task.outputSummary && <p><strong>Output:</strong> <span className="font-mono block max-h-20 overflow-y-auto whitespace-pre-wrap">{task.outputSummary}</span></p>}
                          {task.error && <p><strong>Error:</strong> <span className="text-red-500 font-mono block max-h-20 overflow-y-auto whitespace-pre-wrap">{task.error}</span></p>}
                        </div>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              itemsPerPage={itemsPerPage}
              totalItems={filteredAndSearchedTasks.length}
              onItemsPerPageChange={setItemsPerPage}
            />
          </div>
        )}
      </div>
       <div className="mt-8 p-4 border-t border-slate-200">
            <h4 className="text-lg font-medium text-slate-700 mb-3">Visualizations (Coming Soon)</h4>
            <p className="text-slate-500 italic">Charts displaying task trends, success rates, and token usage will be available here in a future update.</p>
        </div>
    </div>
  );
};

export default SingleAgentAnalyticsView;
