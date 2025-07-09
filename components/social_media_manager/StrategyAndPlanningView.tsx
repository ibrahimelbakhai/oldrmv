
import React, { useState, useCallback } from 'react';
import { AgentDefinition, AgentTaskStatus, AgentStep } from '../../types'; 
import { generateContentInternal, LLMServiceResponse, GenerateContentOptionsInternal } from '../../services/llmService'; 
import { saveTaskExecutionRecord, calculateApproxTokens } from '../../services/analyticsService';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorDisplay from '../shared/ErrorDisplay';
import CopyButton from '../shared/CopyButton';
import { marked } from 'marked';

interface StrategyAndPlanningViewProps {
  strategistAgent: AgentDefinition;
  onStrategyGenerated: (planText: string) => void; 
}

const StrategyAndPlanningView: React.FC<StrategyAndPlanningViewProps> = ({ strategistAgent, onStrategyGenerated }) => {
  const [campaignGoal, setCampaignGoal] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [keyMessages, setKeyMessages] = useState('');
  const [duration, setDuration] = useState('1 month'); 
  const [currentAction, setCurrentAction] = useState<'campaignBrief' | 'contentCalendar' | 'generalAdvice'>('campaignBrief');
  
  const [generatedOutput, setGeneratedOutput] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    if (!strategistAgent || strategistAgent.steps.length === 0) {
      setError("Strategist Agent is not configured correctly.");
      return;
    }

    let stepName = '';
    let promptInput = '';
    let stepToExecute: AgentStep | undefined; 

    if (currentAction === 'campaignBrief') {
        if (!campaignGoal.trim() || !targetAudience.trim()) {
            setError("Campaign Goal and Target Audience are required for a campaign brief.");
            return;
        }
        stepName = 'DevelopCampaignBrief';
        stepToExecute = strategistAgent.steps.find(s => s.name === stepName);
        if (stepToExecute) {
            promptInput = stepToExecute.instruction
                .replace("{{userInput_campaignGoals}}", campaignGoal)
                .replace("{{userInput_targetAudience}}", targetAudience)
                .replace("{{userInput_keyMessages}}", keyMessages || "Not specified");
        }
    } else if (currentAction === 'contentCalendar') {
        if (!keyMessages.trim() && !campaignGoal.trim()) { 
            setError("Key Messages/Themes or Campaign Goal are required for a content calendar.");
            return;
        }
        stepName = 'GenerateContentCalendar';
        stepToExecute = strategistAgent.steps.find(s => s.name === stepName);
        if (stepToExecute) {
             promptInput = stepToExecute.instruction
                .replace("{{userInput_themes_or_brief}}", keyMessages || `Based on campaign goal: ${campaignGoal}`)
                .replace("{{userInput_duration}}", duration);
        }
    } else if (currentAction === 'generalAdvice') {
        if (!campaignGoal.trim() && !keyMessages.trim()) { 
             setError("Please provide a topic or goal for general advice.");
             return;
        }
        stepName = 'GetGeneralStrategyAdvice';
        stepToExecute = strategistAgent.steps.find(s => s.name === stepName);
        if (stepToExecute) {
            promptInput = stepToExecute.instruction
                .replace("{{userInput_query}}", campaignGoal || keyMessages);
        }
    }

    if (!stepToExecute) {
        setError(`Could not find step '${stepName}' in Strategist Agent.`);
        return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedOutput(null);
    const startedAt = new Date().toISOString();

    const options: GenerateContentOptionsInternal = {
      prompt: promptInput,
      model: stepToExecute.model,
      providerType: stepToExecute.providerType,
      apiEndpoint: stepToExecute.apiEndpoint,
      apiKey: stepToExecute.apiKey,
      systemInstruction: strategistAgent.globalSystemInstruction, // Pass agent's global instruction
      agentId: strategistAgent.id,
      stepId: stepToExecute.id,
      temperature: stepToExecute.temperature,
      topK: stepToExecute.topK,
      topP: stepToExecute.topP,
      isJsonOutput: stepToExecute.isJsonOutput,
      disableThinking: stepToExecute.disableThinking,
    };

    const response: LLMServiceResponse = await generateContentInternal(options);
    setIsLoading(false);

    const approxInputTokens = calculateApproxTokens(options.prompt);
    let taskStatus = AgentTaskStatus.COMPLETED;
    let taskError: string | undefined = undefined;

    if (response.error) {
      setError(response.error);
      taskStatus = AgentTaskStatus.FAILED;
      taskError = response.error;
    } else if (response.text) {
      setGeneratedOutput(response.text);
      onStrategyGenerated(response.text);
    } else {
      setError("Strategist AI returned no response.");
      taskStatus = AgentTaskStatus.FAILED;
      taskError = "Strategist AI returned no response.";
    }

    saveTaskExecutionRecord({
      agentId: strategistAgent.id,
      agentName: strategistAgent.name,
      stepId: stepToExecute.id,
      stepName: stepToExecute.name,
      status: taskStatus,
      startedAt,
      completedAt: new Date().toISOString(),
      inputSummary: promptInput.substring(0, 200) + "...",
      outputSummary: response.text ? response.text.substring(0, 200) + "..." : undefined,
      error: taskError,
      approxInputTokens,
      approxOutputTokens: calculateApproxTokens(response.text || ""),
    });

  }, [strategistAgent, campaignGoal, targetAudience, keyMessages, duration, currentAction, onStrategyGenerated]);
  
  const renderMarkdown = (markdownText: string | null) => {
    if (!markdownText) return { __html: '' };
    try { return { __html: marked.parse(markdownText, { breaks: true, gfm: true }) }; } 
    catch (e) { console.error("Markdown parsing error:", e); return { __html: `<pre>${markdownText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`}; }
  };

  return (
    <div className="space-y-6">
      <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-4">
        <h3 className="text-lg font-semibold text-slate-700">Social Media Strategy & Planning</h3>
        
        <div className="mb-4">
            <label className="block text-sm font-medium text-slate-600 mb-1">Select Action:</label>
            <select 
                value={currentAction} 
                onChange={(e) => setCurrentAction(e.target.value as 'campaignBrief' | 'contentCalendar' | 'generalAdvice')}
                className="mt-1 block w-full sm:w-1/2 px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
            >
                <option value="campaignBrief">Develop Campaign Brief</option>
                <option value="contentCalendar">Generate Content Calendar</option>
                <option value="generalAdvice">Get General Strategy Advice</option>
            </select>
        </div>

        <div>
          <label htmlFor="sm-campaignGoal" className="block text-sm font-medium text-slate-600">
            {currentAction === 'generalAdvice' ? 'Topic/Query for Advice:' : 'Primary Campaign Goal / Theme:'}
          </label>
          <textarea
            id="sm-campaignGoal"
            value={campaignGoal}
            onChange={(e) => setCampaignGoal(e.target.value)}
            rows={2}
            placeholder={currentAction === 'generalAdvice' ? "e.g., How to increase engagement on Instagram?" : "e.g., Increase brand awareness for new product launch"}
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
          />
        </div>

        {currentAction !== 'generalAdvice' && (
            <div>
            <label htmlFor="sm-targetAudience" className="block text-sm font-medium text-slate-600">Target Audience (Optional for Calendar)</label>
            <textarea
                id="sm-targetAudience"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                rows={2}
                placeholder="e.g., Tech enthusiasts aged 18-35, interested in AI"
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
            />
            </div>
        )}

        <div>
          <label htmlFor="sm-keyMessages" className="block text-sm font-medium text-slate-600">
            {currentAction === 'contentCalendar' ? 'Key Messages / Content Pillars / Themes:' : 'Key Messages (Optional):'}
          </label>
          <textarea
            id="sm-keyMessages"
            value={keyMessages}
            onChange={(e) => setKeyMessages(e.target.value)}
            rows={3}
            placeholder={currentAction === 'contentCalendar' ? "e.g., Innovation, User Benefits, Behind-the-Scenes" : "e.g., Product X is fast and reliable. Our company values sustainability."}
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
          />
        </div>
        
        {currentAction === 'contentCalendar' && (
             <div>
                <label htmlFor="sm-duration" className="block text-sm font-medium text-slate-600">Calendar Duration:</label>
                <select
                    id="sm-duration"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="mt-1 block w-full sm:w-1/2 px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                >
                    <option value="1 week">1 Week</option>
                    <option value="2 weeks">2 Weeks</option>
                    <option value="1 month">1 Month</option>
                    <option value="1 quarter">1 Quarter (high-level)</option>
                </select>
            </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Generating...' : 
            currentAction === 'campaignBrief' ? 'Generate Campaign Brief' :
            currentAction === 'contentCalendar' ? 'Generate Content Calendar' :
            'Get Strategy Advice'
          }
        </button>
      </div>

      {isLoading && <LoadingSpinner />}
      <ErrorDisplay message={error} />

      {generatedOutput && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xl font-semibold text-slate-700">Generated Output:</h3>
            <CopyButton textToCopy={generatedOutput}/>
          </div>
          <div 
            className="prose prose-sm max-w-none p-4 bg-white border border-slate-200 rounded-md overflow-x-auto"
            dangerouslySetInnerHTML={renderMarkdown(generatedOutput)}
          ></div>
        </div>
      )}
    </div>
  );
};

export default StrategyAndPlanningView;
