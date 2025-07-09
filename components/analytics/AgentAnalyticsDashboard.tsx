
import React, { useState, useEffect } from 'react';
import { AgentDefinition } from '../../types';
import { GEMINI_AGENT_DEFINITIONS_LS_KEY } from '../../constants';
import SectionCard from '../shared/SectionCard';
import SingleAgentAnalyticsView from './SingleAgentAnalyticsView'; // We'll create this next

const AgentAnalyticsDashboard: React.FC = () => {
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentDefinition | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const storedAgentsString = localStorage.getItem(GEMINI_AGENT_DEFINITIONS_LS_KEY);
      if (storedAgentsString) {
        const allAgents: AgentDefinition[] = JSON.parse(storedAgentsString);
        // Filter out the Maestro agent itself if we only want to show worker agents,
        // or include it if we want to see its own analytics (e.g. planning tasks)
        // For now, let's include all agents that might have tasks.
        setAgents(allAgents); 
        if (allAgents.length > 0) {
           // setSelectedAgent(allAgents[0]); // Optionally select the first agent by default
        } else {
            setError("No agents defined. Please create agents in 'Agent Management'.")
        }
      } else {
        setError("No agent definitions found in storage. Please visit 'Agent Management'.");
      }
    } catch (e) {
      console.error("Error loading agents for analytics:", e);
      setError("Failed to load agent definitions.");
    } finally {
        setIsLoading(false);
    }
  }, []);

  if (isLoading) {
    return <SectionCard title="Agent Analytics"><p>Loading agent data...</p></SectionCard>;
  }

  if (error) {
    return <SectionCard title="Agent Analytics"><p className="text-red-500">{error}</p></SectionCard>;
  }

  if (agents.length === 0) {
    return <SectionCard title="Agent Analytics"><p>No agents available to display analytics for. Please define agents in the 'Agent Management' section.</p></SectionCard>;
  }

  return (
    <SectionCard title="Agent Analytics Dashboard">
      <div className="mb-6">
        <label htmlFor="agent-select" className="block text-sm font-medium text-slate-700 mb-1">
          Select Agent to View Analytics:
        </label>
        <select
          id="agent-select"
          value={selectedAgent?.id || ''}
          onChange={(e) => {
            const agent = agents.find(a => a.id === e.target.value);
            setSelectedAgent(agent || null);
          }}
          className="mt-1 block w-full md:w-1/2 px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
        >
          <option value="">-- Select an Agent --</option>
          {agents.map(agent => (
            <option key={agent.id} value={agent.id}>
              {agent.name} ({agent.isPredefined ? 'Predefined' : 'Custom'})
            </option>
          ))}
        </select>
      </div>

      {selectedAgent ? (
        <SingleAgentAnalyticsView agent={selectedAgent} />
      ) : (
        <p className="text-slate-500 italic">Please select an agent from the dropdown to view its analytics.</p>
      )}
    </SectionCard>
  );
};

export default AgentAnalyticsDashboard;
