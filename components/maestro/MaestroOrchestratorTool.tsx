
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { generateContentInternal, LLMServiceResponse, GenerateContentOptionsInternal } from '../../services/llmService';
import { AgentDefinition, OrchestrationPlan, OrchestrationStep, PlanStatus, OrchestrationStepStatus, AgentTaskStatus, AgentTaskExecutionRecord, AgentStep } from '../../types';
import { GEMINI_AGENT_DEFINITIONS_LS_KEY, GEMINI_TEXT_MODEL, MAESTRO_ORCHESTRATION_PLANS_LS_KEY } from '../../constants';
import { saveTaskExecutionRecord, calculateApproxTokens, getTaskExecutionRecords } from '../../services/analyticsService'; 
import SectionCard from '../shared/SectionCard';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorDisplay from '../shared/ErrorDisplay';
import CopyButton from '../shared/CopyButton';
import PaginationControls from '../shared/PaginationControls';
import { marked } from 'marked';
// import adkService from '../../services/adkService'; // For future deeper ADK integration

type MaestroTab = 'orchestrate' | 'chat' | 'advanced';

interface ChatMessage {
  id: string;
  sender: 'user' | 'maestro';
  content: string;
  isAgentDefinition?: boolean;
  rawContent?: string;
  taskRecordId?: string; 
}

const generatePlanId = () => `plan_${new Date().getTime()}_${Math.random().toString(36).substr(2, 9)}`;
const generateStepId = () => `step_${new Date().getTime()}_${Math.random().toString(36).substr(2, 9)}`;

const parsePlanMarkdownToSteps = (markdown: string, userGoal: string): OrchestrationPlan | null => {
    const planId = generatePlanId();
    const steps: OrchestrationStep[] = [];
    let currentStepNumber = 0;

    const stepBlockRegex = /\*\*Plan Step\s*(\d*):\s*(.*?)\*\*\s*\n([\s\S]*?)(?=(\*\*Plan Step|\Z))/g;
    const detailRegex = /\*\s*\*\*(Task Description|Assigned Agent|Assigned Agent Step|Input|Output):\*\*\s*(.*)/g;

    let match;
    while ((match = stepBlockRegex.exec(markdown)) !== null) {
        currentStepNumber++;
        const stepNumber = match[1] ? parseInt(match[1], 10) : currentStepNumber;
        const taskName = match[2].trim();
        const stepContent = match[3];

        const newStep: Partial<OrchestrationStep> = {
            id: generateStepId(),
            planId,
            serialNumber: stepNumber,
            taskName,
            status: OrchestrationStepStatus.PENDING,
            originalMarkdownLines: stepContent.split('\n').map(l => l.trim()).filter(l => l.length > 0),
        };

        let detailMatch;
        while ((detailMatch = detailRegex.exec(stepContent)) !== null) {
            const key = detailMatch[1].trim();
            let value = detailMatch[2].trim();
             if (value.startsWith('`') && value.endsWith('`')) {
                value = value.substring(1, value.length - 1);
            }
            if (key === 'Task Description') newStep.taskDescription = value;
            else if (key === 'Assigned Agent') newStep.assignedAgentName = value;
            else if (key === 'Assigned Agent Step') newStep.assignedAgentStepName = value;
            else if (key === 'Input') newStep.inputSummary = value;
            else if (key === 'Output') newStep.outputSummary = value;
        }
        
        if (newStep.taskName) {
             steps.push(newStep as OrchestrationStep);
        } else {
            console.warn(`Skipping step ${stepNumber} due to missing task name during parsing.`);
        }
    }
    
    if (steps.length === 0 && markdown.toLowerCase().includes("plan step")) {
        console.error("Failed to parse any steps from Maestro's plan. Check Markdown format.", markdown);
        return {
             id: planId,
             userGoal,
             rawMaestroPlanMarkdown: markdown,
             parsedSteps: [],
             status: PlanStatus.FAILED, 
             createdAt: new Date().toISOString(),
             updatedAt: new Date().toISOString(),
             currentStepIndexToExecute: 0,
             error: "Failed to parse plan steps from Maestro's output. The format might be incorrect. Check the raw Markdown below."
        };
    }
    
    if (steps.length === 0 && !markdown.toLowerCase().includes("plan step")) { 
        return null;
    }

    return {
        id: planId,
        userGoal,
        rawMaestroPlanMarkdown: markdown,
        parsedSteps: steps.sort((a,b) => a.serialNumber - b.serialNumber),
        status: PlanStatus.PENDING_APPROVAL,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        currentStepIndexToExecute: 0,
    };
};


export const MaestroOrchestratorTool: React.FC = () => {
  const [activeTab, setActiveTab] = useState<MaestroTab>('orchestrate');
  const [goal, setGoal] = useState<string>('');
  const [currentDraftPlan, setCurrentDraftPlan] = useState<OrchestrationPlan | null>(null);
  const [isPlanLoading, setIsPlanLoading] = useState<boolean>(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [activeAndCompletedPlans, setActiveAndCompletedPlans] = useState<OrchestrationPlan[]>([]);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  
  const [planSearchTerm, setPlanSearchTerm] = useState('');
  const [planFilterStatus, setPlanFilterStatus] = useState<PlanStatus | 'all'>('all');
  const [planCurrentPage, setPlanCurrentPage] = useState(1);
  const [planItemsPerPage, setPlanItemsPerPage] = useState(5);

  const [chatInput, setChatInput] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);

  const [advancedPrompt, setAdvancedPrompt] = useState<string>('');
  const [advancedResponse, setAdvancedResponse] = useState<string | null>(null);
  const [isAdvancedLoading, setIsAdvancedLoading] = useState<boolean>(false);
  const [advancedError, setAdvancedError] = useState<string | null>(null);
  const [advancedResponseTaskRecordId, setAdvancedResponseTaskRecordId] = useState<string | undefined>();
  
  const [workerAgents, setWorkerAgents] = useState<AgentDefinition[]>([]);
  const [maestroAgentDef, setMaestroAgentDef] = useState<AgentDefinition | null>(null);
  const [initialError, setInitialError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const storedPlans = localStorage.getItem(MAESTRO_ORCHESTRATION_PLANS_LS_KEY);
      if (storedPlans) {
        setActiveAndCompletedPlans(JSON.parse(storedPlans));
      }
    } catch (e) { console.error("Failed to load plans from localStorage:", e); localStorage.removeItem(MAESTRO_ORCHESTRATION_PLANS_LS_KEY); }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(MAESTRO_ORCHESTRATION_PLANS_LS_KEY, JSON.stringify(activeAndCompletedPlans));
    } catch (e) { console.error("Failed to save plans to localStorage:", e); }
  }, [activeAndCompletedPlans]);

  useEffect(() => {
    try {
      const storedAgentsString = localStorage.getItem(GEMINI_AGENT_DEFINITIONS_LS_KEY);
      if (storedAgentsString) {
        const allAgents: AgentDefinition[] = JSON.parse(storedAgentsString);
        const maestro = allAgents.find(agent => agent.id === 'predef_maestro_orchestrator');
        const workers = allAgents.filter(agent => agent.id !== 'predef_maestro_orchestrator');
        setMaestroAgentDef(maestro || null);
        setWorkerAgents(workers);
        if (!maestro) setInitialError("CRITICAL: Maestro Orchestrator Agent definition not found.");
      } else {
        setInitialError("No agents found. Please define agents in Agent Management.");
      }
    } catch (e) { console.error("Error loading agents:", e); setInitialError("Failed to load agent definitions."); }
  }, []);

  useEffect(() => { chatMessagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory]);
  
  useEffect(() => {
    setPlanCurrentPage(1); 
  }, [planSearchTerm, planFilterStatus]);


  const generateSimplifiedAgentSummary = (agents: AgentDefinition[]): string => {
    const summary = agents.map(agent => ({
      name: agent.name,
      description: agent.description,
      documentationPurpose: agent.documentationPurpose,
      steps: agent.steps.map(step => ({ 
          name: step.name, 
          instruction_summary: step.instruction.substring(0,100) + "...",
          provider: step.providerType, 
          model: step.model, 
      })),
      ragResources: (agent.ragResources || []).map(r => ({ name: r.name, type: r.type, description: r.description?.substring(0,50)})),
      tools: (agent.tools || []).map(t => ({ name: t.name, description: t.description?.substring(0,50)}))
    }));
    try { return JSON.stringify(summary); } catch (e) { return "[]"; }
  };

  const checkMaestroReady = (): boolean => {
    if (!maestroAgentDef || maestroAgentDef.steps.length === 0) {
        const errorMsg = "Maestro Agent is not configured correctly.";
        if (activeTab === 'orchestrate') setPlanError(errorMsg);
        else if (activeTab === 'chat') setChatError(errorMsg);
        else if (activeTab === 'advanced') setAdvancedError(errorMsg);
        return false;
    }
    return true;
  };

  const callMaestroService = async (userPromptContent: string, contextType: 'orchestration' | 'chat' | 'advanced'): Promise<LLMServiceResponse> => {
    if (!checkMaestroReady() || !maestroAgentDef) return { text: null, error: "Maestro Agent not ready." };
    
    const maestroStep = maestroAgentDef.steps[0];
    const agentsSummaryJson = (contextType === 'orchestration' || contextType === 'advanced' || userPromptContent.toLowerCase().includes('agent')) 
                              ? generateSimplifiedAgentSummary(workerAgents) : "[]";

    let fullPrompt = maestroStep.instruction
      .replace('{{user_goal_or_chat_input_or_advanced_prompt}}', userPromptContent)
      .replace('{{available_agents_json_summary}}', agentsSummaryJson);

    const options: GenerateContentOptionsInternal = {
      prompt: fullPrompt,
      model: maestroStep.model || GEMINI_TEXT_MODEL,
      providerType: maestroStep.providerType,
      apiEndpoint: maestroStep.apiEndpoint,
      systemInstruction: maestroAgentDef.globalSystemInstruction, // Pass agent's global instruction
      temperature: maestroStep.temperature, topK: maestroStep.topK, topP: maestroStep.topP,
      isJsonOutput: maestroStep.isJsonOutput, 
      disableThinking: contextType === 'chat' ? false : maestroStep.disableThinking,
      apiKey: maestroStep.apiKey,
      agentId: maestroAgentDef.id, 
      stepId: maestroStep.id,
    };
    return generateContentInternal(options);
  };
  
  const handleGeneratePlan = useCallback(async () => {
    if (!goal.trim()) { setPlanError("Please enter a goal."); return; }
    if (workerAgents.length === 0 && !goal.toLowerCase().includes("design an agent")) {
        setPlanError("No worker agents available. Maestro can only design a new agent or orchestrate existing ones.");
    }

    setIsPlanLoading(true); setPlanError(null); setCurrentDraftPlan(null);
    const startedAt = new Date().toISOString();
    const userPromptForMaestro = `User Goal (for Orchestration Plan):\n${goal}`;

    const response = await callMaestroService(userPromptForMaestro, 'orchestration');
    setIsPlanLoading(false);

    const approxInputTokens = calculateApproxTokens(response.requestOptions?.prompt || userPromptForMaestro);
    let maestroTaskStatus = AgentTaskStatus.COMPLETED;
    let maestroTaskError: string | undefined = undefined;

    if (response.error) {
        setPlanError(response.error);
        maestroTaskStatus = AgentTaskStatus.FAILED;
        maestroTaskError = response.error;
    } else if (response.text) {
        const parsedPlan = parsePlanMarkdownToSteps(response.text, goal);
        if (parsedPlan) {
            if(parsedPlan.status === PlanStatus.FAILED && parsedPlan.error){
                setPlanError(parsedPlan.error); 
                 maestroTaskStatus = AgentTaskStatus.COMPLETED; 
                 maestroTaskError = "Maestro output was an unparsable plan.";
            } else if (parsedPlan.parsedSteps.length > 0) {
                 setCurrentDraftPlan(parsedPlan);
            } else { 
                 setPlanError("Maestro responded conversationally instead of generating a plan. Try the 'Chat with Maestro' tab or rephrase your goal for planning.");
                 maestroTaskError = "Maestro responded conversationally, not with a plan.";
            }
        } else { 
            setPlanError("Maestro responded conversationally. If you intended to generate a plan, please rephrase your goal. For conversation, use the 'Chat' tab. Maestro's response: " + response.text.substring(0,150) + "...");
            maestroTaskError = "Maestro responded conversationally, not with a plan.";
        }
    } else {
        setPlanError("The Maestro Agent did not return any text.");
        maestroTaskStatus = AgentTaskStatus.FAILED;
        maestroTaskError = "Maestro returned no text.";
    }

    if (maestroAgentDef) { // Ensure maestroAgentDef is available
        saveTaskExecutionRecord({
            agentId: maestroAgentDef.id, agentName: maestroAgentDef.name,
            stepId: maestroAgentDef.steps[0].id, stepName: maestroAgentDef.steps[0].name,
            status: maestroTaskStatus, startedAt, completedAt: new Date().toISOString(),
            inputSummary: `Goal: ${goal.substring(0,150)}... (Plan Gen)`,
            outputSummary: response.text ? response.text.substring(0, 200) + "..." : "No text response",
            error: maestroTaskError,
            approxInputTokens, approxOutputTokens: calculateApproxTokens(response.text || ""),
        });
    }


  }, [goal, maestroAgentDef, workerAgents]);

  const handleApproveAndRunPlan = () => {
    if (!currentDraftPlan) return;
    const planToRun: OrchestrationPlan = {
        ...currentDraftPlan, status: PlanStatus.RUNNING,
        updatedAt: new Date().toISOString(), currentStepIndexToExecute: 0,
    };
    setActiveAndCompletedPlans(prev => [planToRun, ...prev.filter(p => p.id !== planToRun.id)].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    setCurrentDraftPlan(null);
    executePlanSequentially(planToRun.id);
  };

  const handleDiscardDraftPlan = () => { setCurrentDraftPlan(null); };
  
  const updatePlanState = (planId: string, updates: Partial<OrchestrationPlan> | ((plan: OrchestrationPlan) => Partial<OrchestrationPlan>)) => {
    setActiveAndCompletedPlans(prevPlans =>
      prevPlans.map(p =>
        p.id === planId ? { ...p, ...(typeof updates === 'function' ? updates(p) : updates), updatedAt: new Date().toISOString() } : p
      )
    );
  };

  const executePlanSequentially = async (planId: string) => {
    const findPlan = () => activeAndCompletedPlans.find(p => p.id === planId);
    let plan = findPlan();
    if (!plan || plan.status !== PlanStatus.RUNNING) return;

    for (let i = plan.currentStepIndexToExecute; i < plan.parsedSteps.length; i++) {
        plan = findPlan();
        if (!plan || plan.status !== PlanStatus.RUNNING) break;

        let step = plan.parsedSteps[i];
        const stepStartedAt = new Date().toISOString();
        
        updatePlanState(planId, p => ({
            parsedSteps: p.parsedSteps.map((s, idx) => idx === i ? { ...s, status: OrchestrationStepStatus.IN_PROGRESS, startedAt: stepStartedAt, logs: [`[${new Date().toLocaleTimeString()}] Starting step ${s.serialNumber}: ${s.taskName}`] } : s),
            currentStepIndexToExecute: i,
            overallProgress: Math.round(((i + 0.5) / p.parsedSteps.length) * 100),
        }));
        
        const assignedAgentDef = workerAgents.find(a => a.name === step.assignedAgentName);
        const assignedAgentStepDef = assignedAgentDef?.steps.find(s => s.name === step.assignedAgentStepName);
        let taskRecordId: string | undefined;
        let stepResultText = `Simulated success for '${step.taskName}'.`;
        let stepErrorText: string | undefined;
        let stepStatus = OrchestrationStepStatus.COMPLETED;

        if (assignedAgentDef && assignedAgentStepDef && step.assignedAgentName !== 'N/A (New Capability Needed)') {
            // This is where actual agent invocation would happen via adkService (conceptual for now)
            // Example: const result = await adkService.invokeAgent(assignedAgentDef.id, assignedAgentStepDef.id, { input: step.inputSummary });
            // For now, simulate
            await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000)); 
            const success = Math.random() > 0.15; 

            if (!success) {
                 stepResultText = `Simulated failure for '${step.taskName}'.`;
                 stepErrorText = "Simulated failure during step execution.";
                 stepStatus = OrchestrationStepStatus.FAILED;
            }
            // Log this simulated/actual task
            const workerTaskRecord = saveTaskExecutionRecord({
                agentId: assignedAgentDef.id, agentName: assignedAgentDef.name,
                stepId: assignedAgentStepDef.id, stepName: assignedAgentStepDef.name,
                planId: plan.id, status: success ? AgentTaskStatus.COMPLETED : AgentTaskStatus.FAILED,
                startedAt: stepStartedAt, completedAt: new Date().toISOString(),
                inputSummary: step.inputSummary || "Simulated input",
                outputSummary: success ? stepResultText.substring(0,200) : undefined,
                error: stepErrorText,
                approxInputTokens: calculateApproxTokens(step.inputSummary || ""),
                approxOutputTokens: calculateApproxTokens(stepResultText),
            });
            taskRecordId = workerTaskRecord.id;

        } else if (step.assignedAgentName === 'N/A (New Capability Needed)'){
             stepResultText = "Step skipped - requires new agent/capability.";
             stepStatus = OrchestrationStepStatus.SKIPPED;
             stepErrorText = "Identified as a gap requiring new agent/step.";
        } else {
             stepResultText = `Simulated failure: Agent '${step.assignedAgentName}' or step '${step.assignedAgentStepName}' not found.`;
             stepErrorText = `Configuration error: Agent/Step not found.`;
             stepStatus = OrchestrationStepStatus.FAILED;
        }
        
        plan = findPlan(); 
        if (!plan || plan.status !== PlanStatus.RUNNING) break; 
        
        updatePlanState(planId, p => ({
            parsedSteps: p.parsedSteps.map((s, idx) => 
                idx === i ? { 
                    ...s, status: stepStatus, 
                    completedAt: new Date().toISOString(), 
                    durationMs: new Date().getTime() - new Date(stepStartedAt).getTime(), 
                    result: stepResultText, error: stepErrorText,
                    executionDetails: { taskRecordId },
                    logs: [...(s.logs || []), `[${new Date().toLocaleTimeString()}] ${stepStatus === OrchestrationStepStatus.COMPLETED ? 'Completed' : 'Failed/Skipped'} step ${s.serialNumber}.`]
                } : s
            ),
            status: stepStatus === OrchestrationStepStatus.FAILED ? PlanStatus.FAILED : p.status,
        }));

        if (stepStatus === OrchestrationStepStatus.FAILED) break; 
    }

    plan = findPlan();
    if (plan && plan.status === PlanStatus.RUNNING) {
        updatePlanState(planId, { status: PlanStatus.COMPLETED, overallProgress: 100 });
    } else if (plan && plan.status === PlanStatus.FAILED) {
        updatePlanState(planId, { overallProgress: 100 });
    }
  };

  const handleCancelRun = (planId: string) => {
     updatePlanState(planId, p => ({
        status: PlanStatus.CANCELLED,
        parsedSteps: p.parsedSteps.map(s => (s.status === OrchestrationStepStatus.IN_PROGRESS || s.status === OrchestrationStepStatus.PENDING) ? {...s, status: OrchestrationStepStatus.CANCELLED} : s),
        overallProgress: p.overallProgress 
     }));
  };

  const handleDeletePlan = (planId: string) => {
    setActiveAndCompletedPlans(prev => prev.filter(p => p.id !== planId));
    if (expandedPlanId === planId) setExpandedPlanId(null);
  };
  
  const filteredAndSortedPlans = useMemo(() => {
    let processedPlans = [...activeAndCompletedPlans];
    if (planFilterStatus !== 'all') {
      processedPlans = processedPlans.filter(p => p.status === planFilterStatus);
    }
    if (planSearchTerm.trim() !== '') {
      const lowerSearch = planSearchTerm.toLowerCase();
      processedPlans = processedPlans.filter(p => p.userGoal.toLowerCase().includes(lowerSearch));
    }
    return processedPlans.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [activeAndCompletedPlans, planFilterStatus, planSearchTerm]);

  const totalPlanPages = Math.ceil(filteredAndSortedPlans.length / planItemsPerPage);
  const displayedPlans = useMemo(() => {
    const startIndex = (planCurrentPage - 1) * planItemsPerPage;
    return filteredAndSortedPlans.slice(startIndex, startIndex + planItemsPerPage);
  }, [filteredAndSortedPlans, planCurrentPage, planItemsPerPage]);


  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || !checkMaestroReady() || !maestroAgentDef) return;

    const newUserMessage: ChatMessage = { id: Date.now().toString(), sender: 'user', content: chatInput, rawContent: chatInput };
    setChatHistory(prev => [...prev, newUserMessage]);
    const currentChatInput = chatInput; 
    setChatInput('');
    setIsChatLoading(true); setChatError(null);
    const startedAt = new Date().toISOString();
    
    let chatContextForPrompt = chatHistory.slice(-5).map(msg => `${msg.sender === 'user' ? 'User' : 'Maestro'}: ${msg.rawContent || msg.content}`).join('\n');
    chatContextForPrompt += `\nUser: ${currentChatInput}`;

    const response = await callMaestroService(`User Chat Message (respond conversationally, assist with agent design if asked, or provide info):\n${chatContextForPrompt}`, 'chat');
    setIsChatLoading(false);
    
    const approxInputTokens = calculateApproxTokens(response.requestOptions?.prompt || chatContextForPrompt);
    let maestroTaskStatus = AgentTaskStatus.COMPLETED;
    let maestroTaskError: string | undefined = undefined;

    if (response.error) {
      setChatError(response.error);
      setChatHistory(prev => [...prev, {id: Date.now().toString() + '_error', sender: 'maestro', content: `Error: ${response.error}`}]);
      maestroTaskStatus = AgentTaskStatus.FAILED;
      maestroTaskError = response.error;
    } else if (response.text) {
      const potentialDef = isPotentialAgentDefinition(response.text);
      const maestroMsgId = Date.now().toString() + '_maestro';
      
      const taskRecord = saveTaskExecutionRecord({
          agentId: maestroAgentDef.id, agentName: maestroAgentDef.name,
          stepId: maestroAgentDef.steps[0].id, stepName: maestroAgentDef.steps[0].name,
          status: AgentTaskStatus.COMPLETED, startedAt, completedAt: new Date().toISOString(),
          inputSummary: `Chat: ${currentChatInput.substring(0,150)}...`,
          outputSummary: response.text.substring(0, 200) + "...",
          approxInputTokens, approxOutputTokens: calculateApproxTokens(response.text),
      });

      setChatHistory(prev => [...prev, {
        id: maestroMsgId, sender: 'maestro', 
        content: response.text!, 
        isAgentDefinition: potentialDef, rawContent: response.text!,
        taskRecordId: taskRecord.id,
      }]);

    } else {
      setChatError("Maestro did not respond.");
      setChatHistory(prev => [...prev, {id: Date.now().toString() + '_empty', sender: 'maestro', content: "Maestro did not provide a response."}]);
      maestroTaskStatus = AgentTaskStatus.FAILED;
      maestroTaskError = "Maestro returned no text.";
      saveTaskExecutionRecord({ // Save even if empty response
          agentId: maestroAgentDef.id, agentName: maestroAgentDef.name,
          stepId: maestroAgentDef.steps[0].id, stepName: maestroAgentDef.steps[0].name,
          status: maestroTaskStatus, startedAt, completedAt: new Date().toISOString(),
          inputSummary: `Chat: ${currentChatInput.substring(0,150)}...`,
          error: maestroTaskError,
          approxInputTokens, approxOutputTokens: 0,
      });
    }
  };

  const isPotentialAgentDefinition = (text: string): boolean => {
    const lowerText = text.toLowerCase();
    return lowerText.includes("### new agent design") || 
           (lowerText.includes("**agent name:**") && lowerText.includes("**steps:**") && (lowerText.includes("**instruction:**") || lowerText.includes("**prompt:**")));
  };

  const handleSendAdvancedPrompt = async () => {
    if (!advancedPrompt.trim() || !checkMaestroReady() || !maestroAgentDef) {
        setAdvancedError(!advancedPrompt.trim() ? "Please enter a prompt." : "Maestro not ready.");
        return;
    }
    setIsAdvancedLoading(true); setAdvancedError(null); setAdvancedResponse(null);
    const startedAt = new Date().toISOString();

    const response = await callMaestroService(`Advanced User Prompt:\n${advancedPrompt}`, 'advanced');
    setIsAdvancedLoading(false);

    const approxInputTokens = calculateApproxTokens(response.requestOptions?.prompt || advancedPrompt);
    let maestroTaskStatus = AgentTaskStatus.COMPLETED;
    let maestroTaskError: string | undefined = undefined;

    if (response.error) {
        setAdvancedError(response.error);
        maestroTaskStatus = AgentTaskStatus.FAILED;
        maestroTaskError = response.error;
    } else if (response.text) {
        setAdvancedResponse(response.text);
    } else {
        setAdvancedError("The Maestro Agent did not return a response.");
        maestroTaskStatus = AgentTaskStatus.FAILED;
        maestroTaskError = "Maestro returned no text.";
    }
    const taskRecord = saveTaskExecutionRecord({
        agentId: maestroAgentDef.id, agentName: maestroAgentDef.name,
        stepId: maestroAgentDef.steps[0].id, stepName: maestroAgentDef.steps[0].name,
        status: maestroTaskStatus, startedAt, completedAt: new Date().toISOString(),
        inputSummary: `Advanced Prompt: ${advancedPrompt.substring(0,150)}...`,
        outputSummary: response.text ? response.text.substring(0, 200) + "..." : undefined,
        error: maestroTaskError,
        approxInputTokens, approxOutputTokens: calculateApproxTokens(response.text || ""),
    });
    setAdvancedResponseTaskRecordId(taskRecord.id);
  };
  
  const renderMarkdown = (markdownText: string | null) => {
    if (!markdownText) return { __html: '' };
    try { return { __html: marked.parse(markdownText, { breaks: true, gfm: true }) }; } 
    catch (e) { console.error("Markdown parsing error:", e); return { __html: `<pre>${markdownText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`}; }
  };

  const getStatusColor = (status: PlanStatus | OrchestrationStepStatus): string => {
    switch(status) {
        case PlanStatus.RUNNING: case OrchestrationStepStatus.IN_PROGRESS: return 'text-blue-700 bg-blue-100';
        case PlanStatus.COMPLETED: case OrchestrationStepStatus.COMPLETED: return 'text-green-700 bg-green-100';
        case PlanStatus.FAILED: case OrchestrationStepStatus.FAILED: return 'text-red-700 bg-red-100';
        case PlanStatus.PENDING_APPROVAL: case PlanStatus.APPROVED: case OrchestrationStepStatus.PENDING: return 'text-yellow-700 bg-yellow-100';
        case PlanStatus.CANCELLED: case OrchestrationStepStatus.CANCELLED: case OrchestrationStepStatus.SKIPPED: return 'text-gray-700 bg-gray-100';
        default: return 'text-slate-700 bg-slate-100';
    }
  };
  
  const formatDuration = (ms?: number) => {
    if (ms === undefined) return 'N/A';
    if (ms < 0) return 'N/A'; 
    if (ms < 1000) return `${ms} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
  };

  const renderTabs = () => (
    <div className="mb-6 border-b border-slate-300">
      <nav className="-mb-px flex space-x-1 sm:space-x-4" aria-label="Tabs">
        {([ {key: 'orchestrate' as MaestroTab, name: "Orchestrate & Monitor"}, {key: 'chat' as MaestroTab, name: 'Chat / Build Agent'}, {key: 'advanced' as MaestroTab, name: 'Advanced Prompt'} ])
        .map(tabItem => (
          <button key={tabItem.key} onClick={() => setActiveTab(tabItem.key)}
            className={`whitespace-nowrap py-3 px-2 sm:px-4 border-b-2 font-medium text-xs sm:text-sm transition-colors ${activeTab === tabItem.key ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
            {tabItem.name}
          </button>
        ))}
      </nav>
    </div>
  );

  if (initialError) return <SectionCard title="Maestro Orchestrator"><ErrorDisplay message={initialError} /></SectionCard>;
  if (!maestroAgentDef) return <SectionCard title="Maestro Orchestrator"><LoadingSpinner /></SectionCard>;

  return (
    <SectionCard title="Maestro Orchestrator">
      {renderTabs()}
      <div className="space-y-6">
        {activeTab === 'orchestrate' && (
          <>
            <div className="p-4 border border-slate-200 rounded-lg bg-white">
                <h3 className="text-lg font-semibold text-slate-700 mb-3">1. Generate New Plan</h3>
                <div>
                    <label htmlFor="maestro-goal" className="block text-sm font-medium text-slate-700 mb-1">Enter Your High-Level Goal:</label>
                    <textarea id="maestro-goal" value={goal} onChange={(e) => setGoal(e.target.value)}
                        placeholder="e.g., Develop and optimize a complete blog post about 'the future of renewable energy'..." rows={3}
                        className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                        disabled={isPlanLoading || !!currentDraftPlan}/>
                </div>
                {workerAgents.length > 0 && (
                <div className="mt-3 p-2 bg-slate-50 border border-slate-100 rounded-md">
                    <h4 className="text-xs font-semibold text-slate-600 mb-1">Available Worker Agents:</h4>
                    <ul className="list-disc list-inside text-xs text-slate-500 pl-3">
                    {workerAgents.map(agent => <li key={agent.id}>{agent.name}</li>)}
                    </ul>
                </div>
                )}
                <button onClick={handleGeneratePlan} disabled={isPlanLoading || !maestroAgentDef || !goal.trim() || !!currentDraftPlan}
                    className="mt-4 w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                    {isPlanLoading ? 'Generating Plan...' : 'Generate Orchestration Plan'}
                </button>
                {isPlanLoading && <LoadingSpinner />}
                <ErrorDisplay message={planError} />
            </div>
            {currentDraftPlan && currentDraftPlan.status === PlanStatus.PENDING_APPROVAL && (
              <div className="mt-6 p-4 border border-sky-300 rounded-lg bg-sky-50">
                <h3 className="text-xl font-semibold text-sky-700 mb-3">2. Review Draft Plan</h3>
                <p className="text-sm text-slate-600 mb-1"><strong>Goal:</strong> {currentDraftPlan.userGoal}</p>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {currentDraftPlan.parsedSteps.map((step) => (
                    <div key={step.id} className="p-3 bg-white border border-slate-200 rounded-md shadow-sm">
                      <p className="font-semibold text-slate-700">Step {step.serialNumber}: {step.taskName}</p>
                      {step.taskDescription && <p className="text-xs text-slate-500 mt-0.5"><strong>Desc:</strong> {step.taskDescription}</p>}
                      {step.assignedAgentName && <p className="text-xs text-slate-500"><strong>Agent:</strong> {step.assignedAgentName} {step.assignedAgentStepName ? `(Step: ${step.assignedAgentStepName})` : ''}</p>}
                      {step.inputSummary && <p className="text-xs text-slate-500"><strong>Input:</strong> {step.inputSummary}</p>}
                      {step.outputSummary && <p className="text-xs text-slate-500"><strong>Output:</strong> {step.outputSummary}</p>}
                    </div>
                  ))}
                </div>
                <div className="flex justify-end space-x-3 mt-4">
                    <button onClick={handleDiscardDraftPlan} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-md">Discard Draft</button>
                    <button onClick={handleApproveAndRunPlan} className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md">Approve & Run Plan</button>
                </div>
                <details className="mt-3 text-xs"><summary className="cursor-pointer text-slate-500">View Raw Markdown</summary>
                    <pre className="mt-1 p-2 bg-slate-100 border rounded-md text-slate-600 whitespace-pre-wrap max-h-60 overflow-auto">{currentDraftPlan.rawMaestroPlanMarkdown}</pre>
                </details>
              </div>
            )}
             {currentDraftPlan && currentDraftPlan.status === PlanStatus.FAILED && currentDraftPlan.error && (
                 <div className="mt-6 p-4 border border-red-300 rounded-lg bg-red-50">
                    <h3 className="text-xl font-semibold text-red-700 mb-3">Plan Generation Failed</h3>
                    <ErrorDisplay message={currentDraftPlan.error} />
                     <details className="mt-3 text-xs"><summary className="cursor-pointer text-slate-500">View Raw Markdown</summary>
                        <pre className="mt-1 p-2 bg-slate-100 border rounded-md text-slate-600 whitespace-pre-wrap max-h-60 overflow-auto">{currentDraftPlan.rawMaestroPlanMarkdown}</pre>
                    </details>
                    <button onClick={handleDiscardDraftPlan} className="mt-3 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-md">Clear Failed Plan</button>
                 </div>
             )}

            <div className="mt-8 pt-6 border-t border-slate-300">
                <h3 className="text-xl font-semibold text-slate-700 mb-4">3. Monitor Plans</h3>
                <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200 flex flex-col sm:flex-row gap-4 items-center">
                    <div className="flex-grow w-full sm:w-auto">
                        <label htmlFor="plan-search" className="sr-only">Search Plans</label>
                        <input
                            type="text"
                            id="plan-search"
                            placeholder="Search by plan goal..."
                            value={planSearchTerm}
                            onChange={(e) => setPlanSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                        />
                    </div>
                    <div className="flex-shrink-0 w-full sm:w-auto">
                        <label htmlFor="plan-filter-status" className="sr-only">Filter by status</label>
                        <select
                            id="plan-filter-status"
                            value={planFilterStatus}
                            onChange={(e) => setPlanFilterStatus(e.target.value as PlanStatus | 'all')}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                        >
                            <option value="all">All Statuses</option>
                            {Object.values(PlanStatus).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                {displayedPlans.length === 0 ? (<p className="text-slate-500 italic text-center py-4">
                    {filteredAndSortedPlans.length === 0 && planSearchTerm === '' && planFilterStatus === 'all' 
                    ? 'No plans are active or completed yet.' 
                    : 'No plans match your current search/filter criteria.'}
                </p>) : (
                    <ul className="space-y-4">
                        {displayedPlans.map(plan => (
                            <li key={plan.id} className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="font-semibold text-md text-slate-800">{plan.userGoal}</p>
                                        <p className={`text-xs px-2 py-0.5 rounded-full inline-block font-medium ${getStatusColor(plan.status)}`}>{plan.status}</p>
                                        <p className="text-xs text-slate-400 mt-0.5">Created: {new Date(plan.createdAt).toLocaleString()} | Last Updated: {new Date(plan.updatedAt).toLocaleString()}</p>
                                        {plan.status === PlanStatus.RUNNING && plan.overallProgress !== undefined && (
                                            <div className="w-full bg-slate-200 rounded-full h-2.5 mt-1.5"><div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${plan.overallProgress}%` }}></div></div>
                                        )}
                                    </div>
                                    <div className="flex space-x-2 flex-shrink-0 ml-2">
                                        <button onClick={() => setExpandedPlanId(expandedPlanId === plan.id ? null : plan.id)} className="p-1 text-xs text-sky-600 hover:text-sky-800">{expandedPlanId === plan.id ? 'Hide' : 'Show'} Steps</button>
                                        {plan.status === PlanStatus.RUNNING && (<button onClick={() => handleCancelRun(plan.id)} className="p-1 text-xs text-orange-600 hover:text-orange-800">Cancel Run</button>)}
                                        {[PlanStatus.COMPLETED, PlanStatus.FAILED, PlanStatus.CANCELLED].includes(plan.status) && (<button onClick={() => handleDeletePlan(plan.id)} className="p-1 text-xs text-red-600 hover:text-red-800">Delete</button>)}
                                    </div>
                                </div>
                                {expandedPlanId === plan.id && (
                                    <div className="mt-2 space-y-2 border-t border-slate-100 pt-2 pl-2">
                                        {plan.parsedSteps.map(step => (
                                            <div key={step.id} className="p-2 bg-slate-50 rounded border border-slate-100">
                                                <p className="text-sm font-medium text-slate-700">Step {step.serialNumber}: {step.taskName}</p>
                                                <p className={`text-xs px-1.5 py-0.5 rounded-full inline-block ${getStatusColor(step.status)}`}>{step.status}</p>
                                                {step.assignedAgentName && <p className="text-xs text-slate-500">Agent: {step.assignedAgentName} {step.assignedAgentStepName ? `(${step.assignedAgentStepName})` : ''}</p>}
                                                {step.startedAt && <p className="text-xs text-slate-400">Started: {new Date(step.startedAt).toLocaleTimeString()}</p>}
                                                {step.completedAt && <p className="text-xs text-slate-400">Completed: {new Date(step.completedAt).toLocaleTimeString()} (Duration: {formatDuration(step.durationMs)})</p>}
                                                {step.result && <p className="text-xs text-green-600">Result: {typeof step.result === 'string' ? step.result.substring(0,100)+'...' : 'Completed'}</p>}
                                                {step.error && <p className="text-xs text-red-600">Error: {step.error}</p>}
                                                {step.logs && step.logs.length > 0 && (<details className="text-xs mt-1"><summary className="cursor-pointer text-slate-400">Logs ({step.logs.length})</summary><pre className="mt-0.5 p-1 bg-slate-100 text-slate-500 text-[10px] whitespace-pre-wrap max-h-20 overflow-auto rounded">{step.logs.join('\n')}</pre></details>)}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
                 <PaginationControls
                    currentPage={planCurrentPage}
                    totalPages={totalPlanPages}
                    onPageChange={setPlanCurrentPage}
                    itemsPerPage={planItemsPerPage}
                    totalItems={filteredAndSortedPlans.length}
                    onItemsPerPageChange={setPlanItemsPerPage}
                  />
            </div>
          </>
        )}

        {activeTab === 'chat' && (
          <div className="flex flex-col h-[calc(100vh-20rem)] sm:h-[calc(100vh-18rem)]">
            <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-white border border-slate-200 rounded-md mb-4">
              {chatHistory.length === 0 && <p className="text-slate-500 text-center">Chat with Maestro...</p>}
              {chatHistory.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] sm:max-w-[75%] p-3 rounded-lg shadow ${msg.sender === 'user' ? 'bg-sky-500 text-white' : 'bg-slate-200 text-slate-800'}`}>
                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={renderMarkdown(msg.content)}></div>
                    {msg.isAgentDefinition && msg.rawContent && (<CopyButton textToCopy={msg.rawContent} />)}
                  </div>
                </div>
              ))}
              <div ref={chatMessagesEndRef} />
            </div>
            {isChatLoading && <LoadingSpinner />}
            <ErrorDisplay message={chatError} />
            <div className="flex items-center space-x-2">
                <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChatMessage(); }}}
                    placeholder="Ask Maestro to help design an agent, or ask about its capabilities..."
                    rows={2}
                    className="flex-grow px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                />
                <button onClick={handleSendChatMessage} disabled={isChatLoading || !chatInput.trim()}
                    className="bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm disabled:opacity-50 self-end">
                    Send
                </button>
            </div>
          </div>
        )}
        {activeTab === 'advanced' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Directly prompt the Maestro Orchestrator Agent. This is useful for testing specific instructions or getting raw output from its core step.</p>
            <div>
              <label htmlFor="maestro-advanced-prompt" className="block text-sm font-medium text-slate-700 mb-1">Advanced Prompt for Maestro:</label>
              <textarea id="maestro-advanced-prompt" value={advancedPrompt} onChange={(e) => setAdvancedPrompt(e.target.value)}
                  placeholder="e.g., Based on the available agents, how would you handle a goal to 'translate a document and then summarize it'?" rows={5}
                  className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
                  disabled={isAdvancedLoading}/>
            </div>
            <button onClick={handleSendAdvancedPrompt} disabled={isAdvancedLoading || !maestroAgentDef || !advancedPrompt.trim()}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                {isAdvancedLoading ? 'Processing Prompt...' : 'Send Advanced Prompt'}
            </button>
            {isAdvancedLoading && <LoadingSpinner />}
            <ErrorDisplay message={advancedError} />
            {advancedResponse && (
              <div className="mt-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-md font-semibold text-slate-700">Maestro's Response:</h4>
                  <CopyButton textToCopy={advancedResponse} />
                </div>
                <div className="prose prose-sm max-w-none p-4 bg-white border border-slate-200 rounded-md" dangerouslySetInnerHTML={renderMarkdown(advancedResponse)}></div>
                 {advancedResponseTaskRecordId && <p className="text-xs text-slate-400 mt-1">Task Record ID: {advancedResponseTaskRecordId}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </SectionCard>
  );
};
// Removed default export to use named export
// export default MaestroOrchestratorTool;
