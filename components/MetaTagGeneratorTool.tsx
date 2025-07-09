
import React, { useState, useCallback, useEffect } from 'react';
import { generateMetaTags } from '../services/llmService'; 
import { saveTaskExecutionRecord, calculateApproxTokens } from '../services/analyticsService';
import { MetaTags, AgentTaskStatus, AgentDefinition, AgentStep } from '../types'; 
import { GenerateContentOptionsInternal } from '../services/llmService'; 
import { GEMINI_AGENT_DEFINITIONS_LS_KEY } from '../constants'; 
import LoadingSpinner from './shared/LoadingSpinner';
import ErrorDisplay from './shared/ErrorDisplay';
import SectionCard from './shared/SectionCard';
import CopyButton from './shared/CopyButton';

const AGENT_ID_METATAG = 'predef_meta_tag_generator';

const MetaTagGeneratorTool: React.FC = () => {
  const [contentSummary, setContentSummary] = useState<string>('');
  const [metaTags, setMetaTags] = useState<MetaTags | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [agentDef, setAgentDef] = useState<AgentDefinition | null>(null);

  useEffect(() => {
    const storedAgentsString = localStorage.getItem(GEMINI_AGENT_DEFINITIONS_LS_KEY);
    if (storedAgentsString) {
      const allAgents: AgentDefinition[] = JSON.parse(storedAgentsString);
      const foundAgent = allAgents.find(a => a.id === AGENT_ID_METATAG);
      if (foundAgent) {
        setAgentDef(foundAgent);
      } else {
        setError(`Agent definition for '${AGENT_ID_METATAG}' not found.`);
      }
    } else {
      setError("Agent definitions not loaded.");
    }
  }, []);

  const handleGenerateMetaTags = useCallback(async () => {
    if (!contentSummary.trim()) {
      setError("Please enter a content summary.");
      return;
    }
    if (!agentDef || agentDef.steps.length === 0) {
      setError("Meta Tag Generator Agent is not configured correctly.");
      return;
    }
    const agentStep = agentDef.steps[0];

    setIsLoading(true);
    setError(null);
    setMetaTags(null);
    const startedAt = new Date().toISOString();

    const { tags, error: apiError, requestOptions } = await generateMetaTags(contentSummary, agentDef.id, agentStep.id, {...agentStep, globalSystemInstruction: agentDef.globalSystemInstruction});
    setIsLoading(false);
    
    const approxInputTokens = calculateApproxTokens((requestOptions as GenerateContentOptionsInternal)?.prompt || `Summary: ${contentSummary}`);
    let taskStatus = AgentTaskStatus.COMPLETED;
    let taskError: string | undefined = undefined;
    let outputSummary: string | undefined = undefined;

    if (apiError) {
      setError(apiError);
      taskStatus = AgentTaskStatus.FAILED;
      taskError = apiError;
    } else if (tags) {
      setMetaTags(tags);
      outputSummary = `Title: ${tags.title}, Desc: ${tags.description.substring(0,100)}...`;
    } else {
      setError("No meta tags were generated. The response was empty or invalid.");
      taskStatus = AgentTaskStatus.FAILED;
      taskError = "No meta tags generated (empty/invalid response).";
    }

    saveTaskExecutionRecord({
      agentId: agentDef.id,
      agentName: agentDef.name,
      stepId: agentStep.id,
      stepName: agentStep.name,
      status: taskStatus,
      startedAt,
      completedAt: new Date().toISOString(),
      inputSummary: `Summary: ${contentSummary.substring(0,150)}...`,
      outputSummary: outputSummary,
      error: taskError,
      approxInputTokens,
      approxOutputTokens: tags ? calculateApproxTokens(JSON.stringify(tags)) : 0,
    });

  }, [contentSummary, agentDef]);

  if (!agentDef && !error) {
    return <SectionCard title="Meta Tag Generator"><LoadingSpinner /> <p>Loading agent definition...</p></SectionCard>;
  }
  if (error && !agentDef) {
    return <SectionCard title="Meta Tag Generator"><ErrorDisplay message={error} /></SectionCard>;
  }

  const textToCopy = metaTags ? `Title: ${metaTags.title}\nDescription: ${metaTags.description}` : "";

  return (
    <SectionCard title="Meta Tag Generator">
      <div className="space-y-4">
        <div>
          <label htmlFor="content-summary" className="block text-sm font-medium text-slate-700 mb-1">
            Enter Content Summary or Page Topic:
          </label>
          <textarea
            id="content-summary"
            value={contentSummary}
            onChange={(e) => setContentSummary(e.target.value)}
            placeholder="e.g., A blog post discussing the impact of renewable energy on climate change, covering solar, wind, and geothermal sources."
            rows={5}
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <button
          onClick={handleGenerateMetaTags}
          disabled={isLoading || !agentDef}
          className="w-full bg-pink-600 hover:bg-pink-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Generating...' : 'Generate Meta Tags'}
        </button>
        
        {isLoading && <LoadingSpinner />}
        <ErrorDisplay message={error} />

        {metaTags && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-slate-700">Generated Meta Tags:</h3>
            <div className="mt-2 p-4 bg-slate-50 rounded-md space-y-2">
              <div>
                <strong className="text-slate-600">Title:</strong>
                <p className="text-sm text-slate-700 pl-2">{metaTags.title}</p>
              </div>
              <div>
                <strong className="text-slate-600">Description:</strong>
                <p className="text-sm text-slate-700 pl-2">{metaTags.description}</p>
              </div>
            </div>
            <CopyButton textToCopy={textToCopy} />
          </div>
        )}
      </div>
    </SectionCard>
  );
};

export default MetaTagGeneratorTool;
