
import React, { useState, useEffect } from 'react';
import { AgentDefinition, AgentStep, RagResource, AgentTool, AgentToolParameter, AgentToolCredential } from '../../types';
import AgentStepForm from './AgentStepForm';
import { GEMINI_TEXT_MODEL } from '../../constants';

const generateId = () => `id_${new Date().getTime()}_${Math.random().toString(36).substr(2, 9)}`;

interface AgentFormProps {
  agent?: AgentDefinition | null; // null for new, AgentDefinition for edit
  onSave: (agent: AgentDefinition) => void;
  onCancel: () => void;
}

const AgentForm: React.FC<AgentFormProps> = ({ agent, onSave, onCancel }) => {
  const getInitialAgentState = (agentProp?: AgentDefinition | null): AgentDefinition => {
    if (agentProp) {
      return { 
        ...agentProp, 
        steps: agentProp.steps.map(s => ({
            ...s, 
            apiKey: s.apiKey || '',
            providerType: s.providerType || 'google_gemini', // Default if missing
            apiEndpoint: s.apiEndpoint || '', // Default if missing
        })),
        documentationPurpose: agentProp.documentationPurpose || '',
        documentationWorkflow: agentProp.documentationWorkflow || '',
        documentationOutputExample: agentProp.documentationOutputExample || '',
        ragResources: (agentProp.ragResources || []).map(r => ({...r, lastModified: r.lastModified || new Date().toISOString()})),
        tools: (agentProp.tools || []).map(t => ({
            ...t, 
            lastModified: t.lastModified || new Date().toISOString(),
            parameters: (t.parameters || []).map(p => ({...p, id: p.id || generateId()})),
            credentials: (t.credentials || []).map(c => ({...c, id: c.id || generateId()}))
        })),
      };
    }
    return {
      id: generateId(),
      name: '',
      description: '',
      globalSystemInstruction: '',
      steps: [],
      documentationPurpose: '',
      documentationWorkflow: '',
      documentationOutputExample: '',
      ragResources: [],
      tools: [],
    };
  };
  
  const [currentAgent, setCurrentAgent] = useState<AgentDefinition>(getInitialAgentState(agent));

  useEffect(() => {
    setCurrentAgent(getInitialAgentState(agent));
  }, [agent]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCurrentAgent({ ...currentAgent, [e.target.name]: e.target.value });
  };

  const addStep = () => {
    const newStep: AgentStep = {
      id: generateId(),
      name: `Step ${currentAgent.steps.length + 1}`,
      instruction: '',
      model: GEMINI_TEXT_MODEL,
      providerType: 'google_gemini', // Default provider
      apiEndpoint: '',
      apiKey: '',
    };
    setCurrentAgent({ ...currentAgent, steps: [...currentAgent.steps, newStep] });
  };

  const updateStep = (index: number, updatedStep: AgentStep) => {
    const newSteps = [...currentAgent.steps];
    newSteps[index] = updatedStep;
    setCurrentAgent({ ...currentAgent, steps: newSteps });
  };

  const removeStep = (index: number) => {
    const newSteps = currentAgent.steps.filter((_, i) => i !== index);
    setCurrentAgent({ ...currentAgent, steps: newSteps });
  };
  
  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...currentAgent.steps];
    const stepToMove = newSteps[index];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newSteps.length) return;
    newSteps[index] = newSteps[swapIndex];
    newSteps[swapIndex] = stepToMove;
    setCurrentAgent({ ...currentAgent, steps: newSteps });
  };

  // --- RAG Resource Management ---
  const addRagResource = () => {
    const newResource: RagResource = {
      id: generateId(),
      name: `Resource ${ (currentAgent.ragResources || []).length + 1}`,
      type: 'text_content',
      content: '',
      description: '',
      lastModified: new Date().toISOString(),
    };
    setCurrentAgent(prev => ({ ...prev, ragResources: [...(prev.ragResources || []), newResource] }));
  };

  const updateRagResource = (index: number, updates: Partial<RagResource>) => {
    setCurrentAgent(prev => ({
      ...prev,
      ragResources: (prev.ragResources || []).map((res, i) =>
        i === index ? { ...res, ...updates, lastModified: new Date().toISOString() } : res
      ),
    }));
  };

  const removeRagResource = (index: number) => {
    setCurrentAgent(prev => ({
      ...prev,
      ragResources: (prev.ragResources || []).filter((_, i) => i !== index),
    }));
  };

  // --- Tool Management ---
  const addTool = () => {
    const newTool: AgentTool = {
      id: generateId(),
      name: `Tool ${(currentAgent.tools || []).length + 1}`,
      description: '',
      method: 'GET',
      parameters: [],
      credentials: [],
      lastModified: new Date().toISOString(),
    };
    setCurrentAgent(prev => ({ ...prev, tools: [...(prev.tools || []), newTool] }));
  };

  const updateTool = (toolIndex: number, updates: Partial<AgentTool>) => {
    setCurrentAgent(prev => ({
      ...prev,
      tools: (prev.tools || []).map((tool, i) =>
        i === toolIndex ? { ...tool, ...updates, lastModified: new Date().toISOString() } : tool
      ),
    }));
  };
  
  const removeTool = (toolIndex: number) => {
    setCurrentAgent(prev => ({
      ...prev,
      tools: (prev.tools || []).filter((_, i) => i !== toolIndex),
    }));
  };

  const addToolParameter = (toolIndex: number) => {
    const newParam: AgentToolParameter = { id: generateId(), name: '', type: 'string', description: '', required: false };
    updateTool(toolIndex, { parameters: [...(currentAgent.tools?.[toolIndex]?.parameters || []), newParam] });
  };
  const updateToolParameter = (toolIndex: number, paramIndex: number, updates: Partial<AgentToolParameter>) => {
    const tool = currentAgent.tools?.[toolIndex];
    if (!tool) return;
    const updatedParams = (tool.parameters || []).map((p, i) => i === paramIndex ? { ...p, ...updates } : p);
    updateTool(toolIndex, { parameters: updatedParams });
  };
  const removeToolParameter = (toolIndex: number, paramIndex: number) => {
    const tool = currentAgent.tools?.[toolIndex];
    if (!tool) return;
    updateTool(toolIndex, { parameters: (tool.parameters || []).filter((_, i) => i !== paramIndex) });
  };
  
  const addToolCredential = (toolIndex: number) => {
    const newCred: AgentToolCredential = { id: generateId(), keyName: '', keyValuePlaceholder: '', credentialType: 'header' };
    updateTool(toolIndex, { credentials: [...(currentAgent.tools?.[toolIndex]?.credentials || []), newCred] });
  };
  const updateToolCredential = (toolIndex: number, credIndex: number, updates: Partial<AgentToolCredential>) => {
    const tool = currentAgent.tools?.[toolIndex];
    if (!tool) return;
    const updatedCreds = (tool.credentials || []).map((c, i) => i === credIndex ? { ...c, ...updates } : c);
    updateTool(toolIndex, { credentials: updatedCreds });
  };
  const removeToolCredential = (toolIndex: number, credIndex: number) => {
    const tool = currentAgent.tools?.[toolIndex];
    if (!tool) return;
    updateTool(toolIndex, { credentials: (tool.credentials || []).filter((_, i) => i !== credIndex) });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAgent.name.trim()) {
        alert("Agent name cannot be empty.");
        return;
    }
    if (currentAgent.steps.length > 0 && currentAgent.steps.some(step => 
        !step.name.trim() || 
        !step.instruction.trim() || 
        !step.model.trim() ||
        (step.providerType === 'generic_rest' && !step.apiEndpoint?.trim())
    )) {
        alert("All steps must have a name, instruction, and a model specified. Generic REST steps also require an API Endpoint URL.");
        return;
    }
    onSave(currentAgent);
  };
  
  const [expandedSections, setExpandedSections] = useState({
    documentation: false,
    steps: true,
    rag: false,
    tools: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Agent Name, Description, Global System Instruction (existing fields) */}
      <div>
        <label htmlFor="agent-name" className="block text-sm font-medium text-slate-700">Agent Name</label>
        <input
          type="text"
          id="agent-name"
          name="name"
          value={currentAgent.name}
          onChange={handleChange}
          required
          placeholder="e.g., SEO Article Outliner"
          className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
        />
      </div>
      <div>
        <label htmlFor="agent-description" className="block text-sm font-medium text-slate-700">Description</label>
        <textarea
          id="agent-description"
          name="description"
          value={currentAgent.description}
          onChange={handleChange}
          rows={3}
          placeholder="Describe what this agent does"
          className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
        />
      </div>
      <div>
        <label htmlFor="agent-globalSystemInstruction" className="block text-sm font-medium text-slate-700">
            Global System Instruction (Optional)
        </label>
        <textarea
          id="agent-globalSystemInstruction"
          name="globalSystemInstruction"
          value={currentAgent.globalSystemInstruction || ''}
          onChange={handleChange}
          rows={3}
          placeholder="e.g., You are a helpful SEO assistant. Respond in a friendly, professional tone."
          className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
        />
         <p className="mt-1 text-xs text-slate-500">
            Global API Key (for Google Gemini): The application primarily uses the globally configured Gemini API Key (<code>process.env.API_KEY</code>).
            Individual steps can specify their own API key and provider type to override.
        </p>
      </div>

      {/* Documentation Section */}
      <div className="border-t border-slate-200 pt-4">
        <button type="button" onClick={() => toggleSection('documentation')} className="flex justify-between items-center w-full text-left mb-3">
          <h3 className="text-lg font-medium text-slate-800">Agent Documentation</h3>
          <span>{expandedSections.documentation ? 'Hide' : 'Show'}</span>
        </button>
        {expandedSections.documentation && (
            <div className="space-y-4 pl-2">
                <div>
                <label htmlFor="agent-documentationPurpose" className="block text-sm font-medium text-slate-700">Agent Purpose</label>
                <textarea id="agent-documentationPurpose" name="documentationPurpose" value={currentAgent.documentationPurpose || ''} onChange={handleChange} rows={3} placeholder="What is this agent designed to achieve?" className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"/>
                </div>
                <div>
                <label htmlFor="agent-documentationWorkflow" className="block text-sm font-medium text-slate-700">How it Works (Workflow)</label>
                <textarea id="agent-documentationWorkflow" name="documentationWorkflow" value={currentAgent.documentationWorkflow || ''} onChange={handleChange} rows={4} placeholder="Briefly explain its operational logic, steps, or data flow." className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"/>
                </div>
                <div>
                <label htmlFor="agent-documentationOutputExample" className="block text-sm font-medium text-slate-700">Example Output</label>
                <textarea id="agent-documentationOutputExample" name="documentationOutputExample" value={currentAgent.documentationOutputExample || ''} onChange={handleChange} rows={4} placeholder="Provide a concrete example of what the agent's final output might look like." className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"/>
                </div>
            </div>
        )}
      </div>

      {/* RAG Resources Section */}
      <div className="border-t border-slate-200 pt-4">
        <button type="button" onClick={() => toggleSection('rag')} className="flex justify-between items-center w-full text-left mb-3">
          <h3 className="text-lg font-medium text-slate-800">Knowledge Resources (RAG - Conceptual)</h3>
          <span>{expandedSections.rag ? 'Hide' : 'Show'}</span>
        </button>
        {expandedSections.rag && (
            <div className="pl-2">
                <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-md border border-amber-200 mb-3">
                    <strong>Note:</strong> This section defines knowledge resources. The agent's prompt can be augmented with this content to provide context. True client-side vector search RAG is not implemented in this iteration. URLs are for definition only; content fetching is not performed.
                </p>
                {(currentAgent.ragResources || []).map((resource, index) => (
                <div key={resource.id} className="p-3 border border-slate-300 rounded-lg mb-3 bg-slate-50 space-y-2">
                    <div className="flex justify-between items-center">
                        <h4 className="text-md font-semibold text-slate-600">Resource {index + 1}</h4>
                        <button type="button" onClick={() => removeRagResource(index)} className="text-red-500 hover:text-red-700 text-sm">Remove</button>
                    </div>
                    <input type="text" value={resource.name} onChange={(e) => updateRagResource(index, { name: e.target.value })} placeholder="Resource Name" className="w-full text-sm p-1.5 border rounded-md"/>
                    <select value={resource.type} onChange={(e) => updateRagResource(index, { type: e.target.value as RagResource['type'] })} className="w-full text-sm p-1.5 border rounded-md">
                        <option value="text_content">Text Content</option>
                        <option value="web_url">Web URL (Conceptual)</option>
                    </select>
                    {resource.type === 'text_content' && <textarea value={resource.content || ''} onChange={(e) => updateRagResource(index, { content: e.target.value })} placeholder="Enter text content..." rows={3} className="w-full text-sm p-1.5 border rounded-md"/>}
                    {resource.type === 'web_url' && <input type="url" value={resource.url || ''} onChange={(e) => updateRagResource(index, { url: e.target.value })} placeholder="https://example.com/resource" className="w-full text-sm p-1.5 border rounded-md"/>}
                    <textarea value={resource.description || ''} onChange={(e) => updateRagResource(index, { description: e.target.value })} placeholder="Description for AI (how to use this)" rows={2} className="w-full text-sm p-1.5 border rounded-md"/>
                </div>
                ))}
                <button type="button" onClick={addRagResource} className="mt-2 px-3 py-1.5 border border-dashed border-sky-400 text-sky-600 hover:text-sky-800 rounded-md text-sm">Add Resource</button>
            </div>
        )}
      </div>
      
      {/* External Tools Section */}
      <div className="border-t border-slate-200 pt-4">
        <button type="button" onClick={() => toggleSection('tools')} className="flex justify-between items-center w-full text-left mb-3">
            <h3 className="text-lg font-medium text-slate-800">External Tools (Experimental)</h3>
            <span>{expandedSections.tools ? 'Hide' : 'Show'}</span>
        </button>
        {expandedSections.tools && (
            <div className="pl-2">
                <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded-md border border-amber-200 mb-3">
                    <strong>Note:</strong> Tool definition is for conceptual planning. Actual execution of external tools from the client-side, especially with secure credential handling, is highly complex and not fully implemented. This is for designing agents that *could* use tools if integrated with a backend orchestrator. 
                    <strong className="text-red-600"> NEVER store real API keys or secrets here; use placeholders.</strong>
                </p>
                {(currentAgent.tools || []).map((tool, toolIdx) => (
                    <div key={tool.id} className="p-3 border border-slate-300 rounded-lg mb-3 bg-slate-50 space-y-2">
                        <div className="flex justify-between items-center">
                            <h4 className="text-md font-semibold text-slate-600">Tool {toolIdx + 1}</h4>
                            <button type="button" onClick={() => removeTool(toolIdx)} className="text-red-500 hover:text-red-700 text-sm">Remove Tool</button>
                        </div>
                        <input type="text" value={tool.name} onChange={(e) => updateTool(toolIdx, { name: e.target.value })} placeholder="Tool Name (e.g., getWeather)" className="w-full text-sm p-1.5 border rounded-md"/>
                        <textarea value={tool.description} onChange={(e) => updateTool(toolIdx, { description: e.target.value })} placeholder="Tool Description (for LLM)" rows={2} className="w-full text-sm p-1.5 border rounded-md"/>
                        <input type="url" value={tool.apiEndpoint || ''} onChange={(e) => updateTool(toolIdx, { apiEndpoint: e.target.value })} placeholder="API Endpoint URL (Optional)" className="w-full text-sm p-1.5 border rounded-md"/>
                        <select value={tool.method || 'GET'} onChange={(e) => updateTool(toolIdx, { method: e.target.value as AgentTool['method'] })} className="w-full text-sm p-1.5 border rounded-md">
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                        </select>
                        
                        <div className="pl-3 border-l-2 border-slate-200">
                            <h5 className="text-sm font-medium text-slate-500 mt-2 mb-1">Parameters</h5>
                            {(tool.parameters || []).map((param, paramIdx) => (
                                <div key={param.id} className="p-2 border border-slate-200 rounded-md mb-1 bg-white space-y-1">
                                    <div className="flex justify-between items-center"><span className="text-xs text-slate-500">Param {paramIdx+1}</span> <button type="button" onClick={() => removeToolParameter(toolIdx, paramIdx)} className="text-xs text-red-400 hover:text-red-600">Remove</button></div>
                                    <input type="text" value={param.name} onChange={e => updateToolParameter(toolIdx, paramIdx, {name: e.target.value})} placeholder="Name" className="w-full text-xs p-1 border rounded"/>
                                    <select value={param.type} onChange={e => updateToolParameter(toolIdx, paramIdx, {type: e.target.value as AgentToolParameter['type']})} className="w-full text-xs p-1 border rounded"><option value="string">String</option><option value="number">Number</option><option value="boolean">Boolean</option></select>
                                    <input type="text" value={param.description} onChange={e => updateToolParameter(toolIdx, paramIdx, {description: e.target.value})} placeholder="Description" className="w-full text-xs p-1 border rounded"/>
                                    <label className="text-xs flex items-center"><input type="checkbox" checked={!!param.required} onChange={e => updateToolParameter(toolIdx, paramIdx, {required: e.target.checked})} className="mr-1 h-3 w-3"/> Required</label>
                                </div>
                            ))}
                            <button type="button" onClick={() => addToolParameter(toolIdx)} className="text-xs px-2 py-0.5 border border-dashed rounded mt-1">Add Parameter</button>
                        </div>

                        <div className="pl-3 border-l-2 border-slate-200">
                            <h5 className="text-sm font-medium text-slate-500 mt-2 mb-1">Credentials (Conceptual - <span className="text-red-500 font-bold">Placeholders Only!</span>)</h5>
                             {(tool.credentials || []).map((cred, credIdx) => (
                                <div key={cred.id} className="p-2 border border-red-200 rounded-md mb-1 bg-red-50 space-y-1">
                                    <div className="flex justify-between items-center"><span className="text-xs text-red-500">Credential {credIdx+1}</span> <button type="button" onClick={() => removeToolCredential(toolIdx, credIdx)} className="text-xs text-red-400 hover:text-red-600">Remove</button></div>
                                    <input type="text" value={cred.keyName} onChange={e => updateToolCredential(toolIdx, credIdx, {keyName: e.target.value})} placeholder="Key Name (e.g., API_KEY)" className="w-full text-xs p-1 border rounded"/>
                                    <input type="text" value={cred.keyValuePlaceholder} onChange={e => updateToolCredential(toolIdx, credIdx, {keyValuePlaceholder: e.target.value})} placeholder="Placeholder Value (NOT REAL KEY)" className="w-full text-xs p-1 border rounded"/>
                                    <select value={cred.credentialType} onChange={e => updateToolCredential(toolIdx, credIdx, {credentialType: e.target.value as AgentToolCredential['credentialType']})} className="w-full text-xs p-1 border rounded">
                                        <option value="header">Header</option><option value="query_param">Query Parameter</option><option value="body_placeholder">Body Placeholder</option>
                                    </select>
                                </div>
                            ))}
                            <button type="button" onClick={() => addToolCredential(toolIdx)} className="text-xs px-2 py-0.5 border border-dashed rounded mt-1">Add Credential Placeholder</button>
                        </div>
                        <textarea value={tool.requestBodySchema || ''} onChange={(e) => updateTool(toolIdx, { requestBodySchema: e.target.value })} placeholder="Request Body JSON Schema (Optional)" rows={2} className="w-full text-sm p-1.5 border rounded-md mt-1"/>
                        <textarea value={tool.responseSchema || ''} onChange={(e) => updateTool(toolIdx, { responseSchema: e.target.value })} placeholder="Response JSON Schema (Optional, for AI parsing)" rows={2} className="w-full text-sm p-1.5 border rounded-md mt-1"/>
                    </div>
                ))}
                <button type="button" onClick={addTool} className="mt-2 px-3 py-1.5 border border-dashed border-sky-400 text-sky-600 hover:text-sky-800 rounded-md text-sm">Add Tool</button>
            </div>
        )}
      </div>


      {/* Agent Steps Section */}
      <div className="border-t border-slate-200 pt-4">
        <button type="button" onClick={() => toggleSection('steps')} className="flex justify-between items-center w-full text-left mb-3">
            <h3 className="text-lg font-medium text-slate-800">Agent Steps (Workflow)</h3>
            <span>{expandedSections.steps ? 'Hide' : 'Show'}</span>
        </button>
        {expandedSections.steps && (
            <div className="pl-2">
                {currentAgent.steps.length === 0 && (
                    <p className="text-sm text-slate-500 italic">No steps defined yet. Click "Add Step" to begin building the agent's workflow.</p>
                )}
                {currentAgent.steps.map((step, index) => (
                <AgentStepForm
                    key={step.id} 
                    index={index}
                    totalSteps={currentAgent.steps.length}
                    step={step}
                    onUpdate={(updatedStep) => updateStep(index, updatedStep)}
                    onRemove={() => removeStep(index)}
                    onMoveUp={index > 0 ? () => moveStep(index, 'up') : undefined}
                    onMoveDown={index < currentAgent.steps.length - 1 ? () => moveStep(index, 'down') : undefined}
                />
                ))}
                <button
                type="button"
                onClick={addStep}
                className="mt-4 px-4 py-2 border border-dashed border-sky-400 text-sky-600 hover:text-sky-800 hover:border-sky-500 rounded-md text-sm flex items-center transition-colors"
                >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Add Step
                </button>
            </div>
        )}
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md shadow-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500"
        >
          {agent ? 'Save Changes' : 'Create Agent'}
        </button>
      </div>
    </form>
  );
};

export default AgentForm;
