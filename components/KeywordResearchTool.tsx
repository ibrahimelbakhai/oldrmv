
import React, { useState, useCallback, useEffect } from 'react';
import adkService from '../services/adkService';
import { LLMServiceResponse } from '../services/llmService'; // LLMServiceResponse might be generic now if agents return diverse types
import { AgentDefinition } from '../types';
import LoadingSpinner from './shared/LoadingSpinner';
import ErrorDisplay from './shared/ErrorDisplay';
import SectionCard from './shared/SectionCard';
import CopyButton from './shared/CopyButton';

const AGENT_ID = 'predef_keyword_researcher'; // This ID must match the one in manifest.json and AgentDefinition

const KeywordResearchTool: React.FC = () => {
  const [topic, setTopic] = useState<string>('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [agentDef, setAgentDef] = useState<AgentDefinition | null>(null); 

  useEffect(() => {
    // Load the agent's configuration for UI display and to confirm availability
    const definition = adkService.getAgentDefinition(AGENT_ID);
    if (definition) {
      setAgentDef(definition);
    } else {
      // This might happen if ADK service hasn't initialized or definition is missing
      const storedAgentsString = localStorage.getItem('geminiAgentDefinitions');
      if (storedAgentsString) {
        const allAgents: AgentDefinition[] = JSON.parse(storedAgentsString);
        const foundAgent = allAgents.find(a => a.id === AGENT_ID);
        if (foundAgent) {
          setAgentDef(foundAgent);
          console.warn(`KeywordResearchTool: Agent definition for ${AGENT_ID} loaded from localStorage as fallback. ADK service might not be initialized or is missing it.`);
        } else {
          setError(`Agent definition for "${AGENT_ID}" not found in localStorage or ADK service.`);
        }
      } else {
        setError("Agent definitions (localStorage) not loaded. Visit Agent Management.");
      }
    }
    
    // Check if the agent instance is ready in ADK service
    if (!adkService.getAgent(AGENT_ID)) {
        console.warn(`KeywordResearchTool: Agent instance for ${AGENT_ID} not yet available in ADK service. It might be loading or there's an issue with manifest/class loading.`);
        // Optionally, trigger a reload or wait for ADK service initialization if it's managed globally
    }

  }, []);


  const handleGenerateKeywords = useCallback(async () => {
    if (!topic.trim()) {
      setError("Please enter a topic.");
      return;
    }
    
    const agentInstance = adkService.getAgent(AGENT_ID);
    if (!agentInstance) {
      setError(`Keyword Researcher agent (ID: ${AGENT_ID}) is not available through ADK service. Please ensure it's configured correctly, listed in manifest.json, and ADK service is initialized.`);
      // Attempt to reload definitions and agents
      adkService.reloadAgentsAndDefinitions().then(() => {
          if(adkService.getAgent(AGENT_ID)) {
            setError(null); // Clear error if reload successful
            alert("Agents reloaded. Please try again.");
          } else {
            alert("Agent reload attempted but still not available. Check console and Agent Management.");
          }
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setKeywords([]);
    
    try {
      // Invoke the agent's action via ADK service
      // The 'actionName' ("generateKeywords") must match what the KeywordResearchAgent expects in its invokeAction method.
      const response: LLMServiceResponse = await adkService.invokeAgentAction(AGENT_ID, 'generateKeywords', { topic });
      setIsLoading(false);

      if (response.error) {
        setError(response.error);
      } else if (response.text) {
        const keywordList = response.text.split(',').map(kw => kw.trim()).filter(kw => kw.length > 0);
        setKeywords(keywordList);
      } else {
        setError("No keywords were generated. The response was empty.");
      }
      // Analytics are now handled within BaseAgent.callLlMAndRecord if using that helper.
      // If not, task recording should be triggered here or within invokeAgentAction.
    } catch (e: any) {
      setIsLoading(false);
      setError(`Failed to invoke agent action: ${e.message || 'Unknown error'}`);
      console.error("Error invoking agent action:", e);
    }

  }, [topic, agentDef]);

  const displayAgentName = agentDef?.name || "Keyword Researcher";
  const isAgentReady = !!adkService.getAgent(AGENT_ID) && !!agentDef;

  if (!agentDef && !error) { 
    return (
      <SectionCard title={displayAgentName}>
        <LoadingSpinner /> <p>Loading agent definition...</p>
         <ErrorDisplay message={!adkService.getAgent(AGENT_ID) ? `Keyword Researcher agent (ID: ${AGENT_ID}) is not available via ADK service. Attempting to reload definitions. If this persists, check Agent Management and console logs.` : null} />
      </SectionCard>
    );
  }
   if (error && !isAgentReady) {
    return <SectionCard title={displayAgentName}><ErrorDisplay message={error} /></SectionCard>;
  }


  return (
    <SectionCard title={displayAgentName}>
      <div className="space-y-4">
        <div>
          <label htmlFor="topic" className="block text-sm font-medium text-slate-700 mb-1">
            Enter Topic:
          </label>
          <input
            type="text"
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., sustainable gardening"
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <button
          onClick={handleGenerateKeywords}
          disabled={isLoading || !isAgentReady}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-live="polite"
        >
          {isLoading ? 'Generating...' : 'Generate Keywords'}
        </button>
        
        {isLoading && <LoadingSpinner />}
        <ErrorDisplay message={error} />

        {keywords.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-slate-700">Generated Keywords:</h3>
            <ul className="list-disc list-inside mt-2 space-y-1 bg-slate-50 p-4 rounded-md">
              {keywords.map((kw, index) => (
                <li key={index} className="text-slate-600">{kw}</li>
              ))}
            </ul>
            <CopyButton textToCopy={keywords.join(', ')} />
          </div>
        )}
      </div>
       {!isAgentReady && !isLoading && (
          <p className="mt-4 text-xs text-amber-700 bg-amber-50 p-2 rounded-md">
              The Keyword Researcher Agent is currently unavailable or not loaded correctly. Please check agent definitions in "Agent Management", ensure `manifest.json` is correct, and ADK service is initialized.
              <button onClick={async () => {
                  await adkService.reloadAgentsAndDefinitions();
                  // Force a re-check
                  const definition = adkService.getAgentDefinition(AGENT_ID);
                  setAgentDef(definition || null);
                  if(!adkService.getAgent(AGENT_ID) || !definition){
                      alert("Agent still not available after reload attempt.");
                  } else {
                      setError(null); // Clear previous errors if successful
                  }
              }} className="ml-2 text-sky-600 underline">Attempt Reload</button>
          </p>
        )}
    </SectionCard>
  );
};

export default KeywordResearchTool;
