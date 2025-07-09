import React, { useState, useMemo, useEffect } from 'react';
import { AgentDefinition } from '../../types';
import PaginationControls from '../shared/PaginationControls';

interface AgentListProps {
  agents: AgentDefinition[];
  onEditAgent: (agentId: string) => void;
  onDeleteAgent: (agentId: string) => void;
  onCreateAgent: () => void;
}

type AgentFilterType = 'all' | 'predefined' | 'custom';

const AgentList: React.FC<AgentListProps> = ({ agents, onEditAgent, onDeleteAgent, onCreateAgent }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<AgentFilterType>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when search term or filter changes
  }, [searchTerm, filterType]);

  const filteredAndSearchedAgents = useMemo(() => {
    let processedAgents = [...agents];

    // Apply filter
    if (filterType === 'predefined') {
      processedAgents = processedAgents.filter(agent => agent.isPredefined);
    } else if (filterType === 'custom') {
      processedAgents = processedAgents.filter(agent => !agent.isPredefined);
    }

    // Apply search
    if (searchTerm.trim() !== '') {
      const lowerSearchTerm = searchTerm.toLowerCase();
      processedAgents = processedAgents.filter(agent =>
        agent.name.toLowerCase().includes(lowerSearchTerm) ||
        (agent.description && agent.description.toLowerCase().includes(lowerSearchTerm)) ||
        (agent.documentationPurpose && agent.documentationPurpose.toLowerCase().includes(lowerSearchTerm))
      );
    }
    return processedAgents.sort((a,b) => a.name.localeCompare(b.name)); // Sort alphabetically by name
  }, [agents, searchTerm, filterType]);

  const totalPages = Math.ceil(filteredAndSearchedAgents.length / itemsPerPage);
  const displayedAgents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSearchedAgents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSearchedAgents, currentPage, itemsPerPage]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-xl font-semibold text-slate-700 flex-shrink-0">Your AI Agents</h2>
        <button
          onClick={onCreateAgent}
          className="w-full sm:w-auto px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-md shadow-sm text-sm flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Create New Agent
        </button>
      </div>

      {/* Search and Filter Controls */}
      <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row gap-4 items-center">
        <div className="flex-grow w-full sm:w-auto">
          <label htmlFor="agent-search" className="sr-only">Search Agents</label>
          <input
            type="text"
            id="agent-search"
            placeholder="Search by name, description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
          />
        </div>
        <div className="flex-shrink-0 w-full sm:w-auto">
          <label htmlFor="agent-filter-type" className="sr-only">Filter by type</label>
          <select
            id="agent-filter-type"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as AgentFilterType)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
          >
            <option value="all">All Types</option>
            <option value="predefined">Predefined</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>

      {displayedAgents.length === 0 ? (
        <p className="text-slate-500 text-center py-8">
          {filteredAndSearchedAgents.length === 0 && searchTerm === '' && filterType === 'all'
            ? 'You haven\'t created any agents yet. Click "Create New Agent" to get started.'
            : 'No agents match your current search or filter criteria.'}
        </p>
      ) : (
        <ul className="space-y-4">
          {displayedAgents.map((agent) => (
            <li key={agent.id} className="bg-white p-4 shadow rounded-lg flex flex-col sm:flex-row justify-between items-start">
              <div 
                className="flex-grow mb-3 sm:mb-0 cursor-pointer hover:bg-slate-50 p-2 -m-2 rounded"
                onClick={() => onEditAgent(agent.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onEditAgent(agent.id);}}
                aria-label={`View or edit agent ${agent.name}`}
              >
                <h3 className="text-lg font-medium text-sky-700">
                  {agent.name}
                  {agent.isPredefined && <span className="ml-2 text-xs bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full">Predefined</span>}
                </h3>
                <p className="text-sm text-slate-600 mt-1 pr-4">
                  {agent.description || "No description provided."}
                </p>
                {agent.documentationPurpose && (
                  <p className="text-xs text-slate-500 mt-1 pr-4 italic">
                    <strong>Purpose:</strong> {agent.documentationPurpose.substring(0, 150)}{agent.documentationPurpose.length > 150 ? '...' : ''}
                  </p>
                )}
                <p className="text-xs text-slate-400 mt-2">
                  Steps: {agent.steps.length} | ID: {agent.id}
                </p>
              </div>
              <div className="flex-shrink-0 space-x-2 pt-1 self-start sm:self-center sm:ml-4">
                <button
                  onClick={(e) => { e.stopPropagation(); onEditAgent(agent.id); }}
                  className="px-3 py-1 text-sm font-medium text-sky-600 hover:text-sky-800 border border-sky-300 hover:bg-sky-50 rounded-md"
                  aria-label={`Edit agent ${agent.name}`}
                >
                  Edit
                </button>
                {!agent.isPredefined && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Are you sure you want to delete the agent "${agent.name}"?`)) {
                        onDeleteAgent(agent.id);
                      }
                    }}
                    className="px-3 py-1 text-sm font-medium text-red-600 hover:text-red-800 border border-red-300 hover:bg-red-50 rounded-md"
                    aria-label={`Delete agent ${agent.name}`}
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
       <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          totalItems={filteredAndSearchedAgents.length}
          onItemsPerPageChange={setItemsPerPage}
        />
    </div>
  );
};

export default AgentList;
