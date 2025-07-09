
import React, { useState, useCallback, useEffect } from 'react';
import { generateContentOutline, LLMServiceResponse } from '../services/llmService';
import { saveTaskExecutionRecord, calculateApproxTokens } from '../services/analyticsService';
import { AgentTaskStatus, AgentDefinition, AgentStep } from '../types'; // Added AgentDefinition, AgentStep
import { GEMINI_AGENT_DEFINITIONS_LS_KEY } from '../constants'; // For fetching agent def
import LoadingSpinner from './shared/LoadingSpinner';
import ErrorDisplay from './shared/ErrorDisplay';
import SectionCard from './shared/SectionCard';
import CopyButton from './shared/CopyButton';

const AGENT_ID_PLANNER = 'predef_content_planner';

const ContentPlannerTool: React.FC = () => {
  const [topic, setTopic] = useState<string>('');
  const [outline, setOutline] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [agentDef, setAgentDef] = useState<AgentDefinition | null>(null);

  useEffect(() => {
    const storedAgentsString = localStorage.getItem(GEMINI_AGENT_DEFINITIONS_LS_KEY);
    if (storedAgentsString) {
      const allAgents: AgentDefinition[] = JSON.parse(storedAgentsString);
      const foundAgent = allAgents.find(a => a.id === AGENT_ID_PLANNER);
      if (foundAgent) {
        setAgentDef(foundAgent);
      } else {
        setError(`Agent definition for '${AGENT_ID_PLANNER}' not found.`);
      }
    } else {
      setError("Agent definitions not loaded.");
    }
  }, []);

  const handleGenerateOutline = useCallback(async () => {
    if (!topic.trim()) {
      setError("Please enter a topic.");
      return;
    }
    if (!agentDef || agentDef.steps.length === 0) {
      setError("Content Planner Agent is not configured correctly.");
      return;
    }
    const agentStep = agentDef.steps[0];

    setIsLoading(true);
    setError(null);
    setOutline(null);
    const startedAt = new Date().toISOString();
    
    // Pass the full agentStep which now includes globalSystemInstruction at the agentDef level for llmService
    const response: LLMServiceResponse = await generateContentOutline(topic, agentDef.id, agentStep.id, {...agentStep, globalSystemInstruction: agentDef.globalSystemInstruction});
    setIsLoading(false);

    const approxInputTokens = calculateApproxTokens(response.requestOptions?.prompt || `Topic: ${topic}`);
    let taskStatus = AgentTaskStatus.COMPLETED;
    let taskError: string | undefined = undefined;
    let outputSummary: string | undefined = undefined;

    if (response.error) {
      setError(response.error);
      taskStatus = AgentTaskStatus.FAILED;
      taskError = response.error;
    } else if (response.text) {
      setOutline(response.text);
      outputSummary = response.text.substring(0, 200) + (response.text.length > 200 ? "..." : "");
    } else {
      setError("No outline was generated. The response was empty.");
      taskStatus = AgentTaskStatus.FAILED;
      taskError = "No outline generated (empty response).";
    }

    saveTaskExecutionRecord({
      agentId: agentDef.id,
      agentName: agentDef.name,
      stepId: agentStep.id,
      stepName: agentStep.name,
      status: taskStatus,
      startedAt,
      completedAt: new Date().toISOString(),
      inputSummary: `Topic: ${topic}`,
      outputSummary: outputSummary,
      error: taskError,
      approxInputTokens,
      approxOutputTokens: calculateApproxTokens(response.text || ""),
    });

  }, [topic, agentDef]);
  
  if (!agentDef && !error) {
    return <SectionCard title="Content Planner"><LoadingSpinner /> <p>Loading agent definition...</p></SectionCard>;
  }
  if (error && !agentDef) {
    return <SectionCard title="Content Planner"><ErrorDisplay message={error} /></SectionCard>;
  }

  return (
    <SectionCard title="Content Planner">
      <div className="space-y-4">
        <div>
          <label htmlFor="planner-topic" className="block text-sm font-medium text-slate-700 mb-1">
            Enter Topic or Keyword:
          </label>
          <input
            type="text"
            id="planner-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., benefits of AI in marketing"
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <button
          onClick={handleGenerateOutline}
          disabled={isLoading || !agentDef}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Generating...' : 'Generate Outline'}
        </button>
        
        {isLoading && <LoadingSpinner />}
        <ErrorDisplay message={error} />

        {outline && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-slate-700">Generated Content Outline:</h3>
            <pre className="mt-2 p-4 bg-slate-50 rounded-md whitespace-pre-wrap text-sm text-slate-700 overflow-x-auto">
              {outline}
            </pre>
            <CopyButton textToCopy={outline} />
          </div>
        )}
      </div>
    </SectionCard>
  );
};

export default ContentPlannerTool;
