
import React, { useState, useCallback, useEffect } from 'react';
import { writeContentPiece, LLMServiceResponse } from '../services/llmService';
import { saveTaskExecutionRecord, calculateApproxTokens } from '../services/analyticsService';
import { AgentTaskStatus, AgentDefinition, AgentStep } from '../types'; // Added AgentDefinition, AgentStep
import { GEMINI_AGENT_DEFINITIONS_LS_KEY } from '../constants'; // For fetching agent def
import LoadingSpinner from './shared/LoadingSpinner';
import ErrorDisplay from './shared/ErrorDisplay';
import SectionCard from './shared/SectionCard';
import CopyButton from './shared/CopyButton';

const AGENT_ID_WRITER = 'predef_content_writer';

const ContentWriterTool: React.FC = () => {
  const [topic, setTopic] = useState<string>('');
  const [contentType, setContentType] = useState<string>('an introductory paragraph');
  const [length, setLength] = useState<string>('approximately 100 words');
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [agentDef, setAgentDef] = useState<AgentDefinition | null>(null);

  useEffect(() => {
    const storedAgentsString = localStorage.getItem(GEMINI_AGENT_DEFINITIONS_LS_KEY);
    if (storedAgentsString) {
      const allAgents: AgentDefinition[] = JSON.parse(storedAgentsString);
      const foundAgent = allAgents.find(a => a.id === AGENT_ID_WRITER);
      if (foundAgent) {
        setAgentDef(foundAgent);
      } else {
        setError(`Agent definition for '${AGENT_ID_WRITER}' not found.`);
      }
    } else {
      setError("Agent definitions not loaded.");
    }
  }, []);


  const handleGenerateContent = useCallback(async () => {
    if (!topic.trim()) {
      setError("Please enter a topic or instructions.");
      return;
    }
    if (!agentDef || agentDef.steps.length === 0) {
      setError("Content Writer Agent is not configured correctly.");
      return;
    }
    const agentStep = agentDef.steps[0];

    setIsLoading(true);
    setError(null);
    setGeneratedContent(null);
    const startedAt = new Date().toISOString();

    const response: LLMServiceResponse = await writeContentPiece(topic, contentType, length, agentDef.id, agentStep.id, {...agentStep, globalSystemInstruction: agentDef.globalSystemInstruction});
    setIsLoading(false);

    const approxInputTokens = calculateApproxTokens(response.requestOptions?.prompt || `Topic: ${topic}, Type: ${contentType}, Length: ${length}`);
    let taskStatus = AgentTaskStatus.COMPLETED;
    let taskError: string | undefined = undefined;
    let outputSummary: string | undefined = undefined;

    if (response.error) {
      setError(response.error);
      taskStatus = AgentTaskStatus.FAILED;
      taskError = response.error;
    } else if (response.text) {
      setGeneratedContent(response.text);
      outputSummary = response.text.substring(0, 200) + (response.text.length > 200 ? "..." : "");
    } else {
      setError("No content was generated. The response was empty.");
      taskStatus = AgentTaskStatus.FAILED;
      taskError = "No content generated (empty response).";
    }

    saveTaskExecutionRecord({
      agentId: agentDef.id,
      agentName: agentDef.name,
      stepId: agentStep.id,
      stepName: agentStep.name,
      status: taskStatus,
      startedAt,
      completedAt: new Date().toISOString(),
      inputSummary: `Topic: ${topic.substring(0,100)}..., Type: ${contentType}, Length: ${length}`,
      outputSummary: outputSummary,
      error: taskError,
      approxInputTokens,
      approxOutputTokens: calculateApproxTokens(response.text || ""),
    });

  }, [topic, contentType, length, agentDef]);

  if (!agentDef && !error) {
    return <SectionCard title="Content Writer"><LoadingSpinner /> <p>Loading agent definition...</p></SectionCard>;
  }
  if (error && !agentDef) {
    return <SectionCard title="Content Writer"><ErrorDisplay message={error} /></SectionCard>;
  }

  return (
    <SectionCard title="Content Writer">
      <div className="space-y-4">
        <div>
          <label htmlFor="writer-topic" className="block text-sm font-medium text-slate-700 mb-1">
            Topic / Detailed Instructions:
          </label>
          <textarea
            id="writer-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Write a blog post intro about the future of remote work, focusing on challenges and opportunities."
            rows={4}
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="content-type" className="block text-sm font-medium text-slate-700 mb-1">
                    Content Type:
                </label>
                <select 
                    id="content-type" 
                    value={contentType} 
                    onChange={(e) => setContentType(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                    <option value="an introductory paragraph">Introductory Paragraph</option>
                    <option value="a short blog post section">Short Blog Post Section</option>
                    <option value="a product description">Product Description</option>
                    <option value="a social media post">Social Media Post</option>
                    <option value="a concluding paragraph">Concluding Paragraph</option>
                </select>
            </div>
            <div>
                <label htmlFor="content-length" className="block text-sm font-medium text-slate-700 mb-1">
                    Approximate Length:
                </label>
                <select 
                    id="content-length" 
                    value={length} 
                    onChange={(e) => setLength(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                    <option value="approximately 50 words">~50 words</option>
                    <option value="approximately 100 words">~100 words</option>
                    <option value="approximately 150 words">~150 words</option>
                    <option value="approximately 200 words">~200 words</option>
                </select>
            </div>
        </div>
        <button
          onClick={handleGenerateContent}
          disabled={isLoading || !agentDef}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Generating...' : 'Generate Content'}
        </button>
        
        {isLoading && <LoadingSpinner />}
        <ErrorDisplay message={error} />

        {generatedContent && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-slate-700">Generated Content:</h3>
            <div className="mt-2 p-4 bg-slate-50 rounded-md whitespace-pre-wrap text-sm text-slate-700">
              {generatedContent}
            </div>
            <CopyButton textToCopy={generatedContent} />
          </div>
        )}
      </div>
    </SectionCard>
  );
};

export default ContentWriterTool;
