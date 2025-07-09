
import React, { useState } from 'react';
import { AgentStep } from '../../types';
import { GEMINI_TEXT_MODEL } from '../../constants';

interface AgentStepFormProps {
  step: AgentStep;
  onUpdate: (updatedStep: AgentStep) => void;
  onRemove: () => void;
  index: number;
  totalSteps: number;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

const AgentStepForm: React.FC<AgentStepFormProps> = ({
  step,
  onUpdate,
  onRemove,
  index,
  totalSteps,
  onMoveUp,
  onMoveDown
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let processedValue: string | number | boolean = value;

    if (type === 'checkbox') {
      processedValue = (e.target as HTMLInputElement).checked;
    } else if (type === 'number' && name !== 'topK') { 
      processedValue = value === '' ? undefined : parseFloat(value);
    } else if (name === 'topK' && type === 'number') {
      processedValue = value === '' ? undefined : parseInt(value, 10);
    }

    // If providerType is changed to google_gemini, clear apiEndpoint
    if (name === 'providerType' && value === 'google_gemini') {
        onUpdate({ ...step, [name]: value as AgentStep['providerType'], apiEndpoint: '' }); // Type assertion
        return;
    }
    
    if (name === 'providerType') {
         onUpdate({ ...step, [name]: processedValue as AgentStep['providerType'] }); // Type assertion
    } else {
        onUpdate({ ...step, [name]: processedValue });
    }
  };

  const handleConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let processedValue: string | number | boolean = value;

    if (type === 'checkbox') {
      processedValue = (e.target as HTMLInputElement).checked;
    } else if (type === 'number') {
       processedValue = value === '' ? undefined : parseFloat(value);
       if (name === 'temperature' || name === 'topP') {
        if (processedValue !== undefined && (processedValue < 0 || processedValue > 1)) {
            alert(`${name} must be between 0 and 1.`);
            return;
        }
       }
       if (name === 'topK') {
         const intVal = value === '' ? undefined : parseInt(value, 10);
         if (intVal !== undefined && intVal < 1) {
            alert(`${name} must be at least 1.`);
            return;
         }
         processedValue = intVal;
       }
    }
    onUpdate({ ...step, [name]: processedValue });
  };


  return (
    <div className="p-4 border border-slate-300 rounded-lg mb-4 bg-slate-50">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-md font-semibold text-slate-700">Step {index + 1}: {step.name || "Untitled Step"}</h4>
        <div className="flex items-center space-x-2">
          {onMoveUp && index > 0 && (
            <button onClick={onMoveUp} title="Move Up" className="p-1 text-slate-500 hover:text-slate-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </button>
          )}
          {onMoveDown && index < totalSteps - 1 && (
            <button onClick={onMoveDown} title="Move Down" className="p-1 text-slate-500 hover:text-slate-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 17a1 1 0 01-.707-.293l-3-3a1 1 0 011.414-1.414L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3A1 1 0 0110 17zm-3.707-9.293a1 1 0 011.414 0L10 5.414l2.293 2.293a1 1 0 011.414-1.414l-3-3a1 1 0 01-1.414 0l-3-3a1 1 0 010 1.414zM10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3z" clipRule="evenodd" transform="rotate(180 10 10)" /></svg>
            </button>
          )}
          <button onClick={onRemove} className="text-red-500 hover:text-red-700 font-medium text-sm">Remove Step</button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label htmlFor={`step-name-${step.id}`} className="block text-sm font-medium text-slate-600">Step Name</label>
          <input
            type="text"
            id={`step-name-${step.id}`}
            name="name"
            value={step.name}
            onChange={handleChange}
            placeholder="e.g., Analyze Input Data"
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor={`step-instruction-${step.id}`} className="block text-sm font-medium text-slate-600">Instruction / Prompt</label>
          <textarea
            id={`step-instruction-${step.id}`}
            name="instruction"
            value={step.instruction}
            onChange={handleChange}
            rows={3}
            placeholder="Enter detailed instructions for this step..."
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor={`step-providerType-${step.id}`} className="block text-sm font-medium text-slate-600">LLM Provider</label>
                <select
                    id={`step-providerType-${step.id}`}
                    name="providerType"
                    value={step.providerType}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                >
                    <option value="google_gemini">Google Gemini</option>
                    <option value="generic_rest">Generic REST API</option>
                    {/* Add other providers like 'openai', 'anthropic' later */}
                </select>
            </div>
            <div>
              <label htmlFor={`step-model-${step.id}`} className="block text-sm font-medium text-slate-600">AI Model Name</label>
              <input
                type="text"
                id={`step-model-${step.id}`}
                name="model"
                value={step.model}
                onChange={handleChange}
                list={`model-suggestions-${step.id}`}
                placeholder={step.providerType === 'google_gemini' ? "e.g., gemini-2.5-flash-preview-04-17" : "e.g., mistral-7b-instruct"}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
              />
              <datalist id={`model-suggestions-${step.id}`}>
                {step.providerType === 'google_gemini' && <option value={GEMINI_TEXT_MODEL} />}
                {step.providerType === 'google_gemini' && <option value="gemini-pro" />} 
                {/* Add other common models based on provider type or generic examples */}
              </datalist>
            </div>
        </div>
        {step.providerType === 'generic_rest' && (
            <div>
                <label htmlFor={`step-apiEndpoint-${step.id}`} className="block text-sm font-medium text-slate-600">API Endpoint URL</label>
                <input
                type="url"
                id={`step-apiEndpoint-${step.id}`}
                name="apiEndpoint"
                value={step.apiEndpoint || ''}
                onChange={handleChange}
                placeholder="e.g., https://api.example.com/v1/chat/completions"
                required={step.providerType === 'generic_rest'}
                className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                />
            </div>
        )}


        <div>
          <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-sm text-sky-600 hover:text-sky-800">
            {showAdvanced ? 'Hide' : 'Show'} Advanced Options {step.providerType === 'google_gemini' ? '(Gemini Specific)' : '(Generic)'}
          </button>
        </div>

        {showAdvanced && (
          <div className="p-3 border border-slate-200 rounded-md mt-2 space-y-3 bg-white">
            <h5 className="text-xs font-semibold text-slate-500 uppercase">
                {step.providerType === 'google_gemini' ? 'Gemini Model Configuration' : 'Generic LLM Configuration'}
            </h5>
             <div>
                <label htmlFor={`step-apiKey-${step.id}`} className="block text-xs font-medium text-slate-500">Step-Specific API Key (Optional)</label>
                <input
                  type="password"
                  id={`step-apiKey-${step.id}`}
                  name="apiKey"
                  value={step.apiKey || ''}
                  onChange={handleChange}
                  placeholder={`API Key for ${step.providerType === 'google_gemini' ? 'Gemini' : 'selected endpoint'}`}
                  className="mt-1 block w-full px-2 py-1 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                />
                <p className="text-xs text-slate-400 mt-0.5">
                    {step.providerType === 'google_gemini' ? 'If blank, uses global process.env.API_KEY for Gemini.' : 'Required for most Generic REST APIs unless auth is handled differently.'}
                </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor={`step-temperature-${step.id}`} className="block text-xs font-medium text-slate-500">Temperature (0-1)</label>
                <input
                  type="number"
                  id={`step-temperature-${step.id}`}
                  name="temperature"
                  value={step.temperature === undefined ? '' : step.temperature}
                  onChange={handleConfigChange}
                  step="0.1" min="0" max="1" // Max can be higher for some models, but 1 is common.
                  placeholder="Default (e.g., 0.7)"
                  className="mt-1 block w-full px-2 py-1 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor={`step-topK-${step.id}`} className="block text-xs font-medium text-slate-500">TopK</label>
                <input
                  type="number"
                  id={`step-topK-${step.id}`}
                  name="topK"
                  value={step.topK === undefined ? '' : step.topK}
                  onChange={handleConfigChange}
                  step="1" min="1"
                  placeholder="Default"
                  className="mt-1 block w-full px-2 py-1 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                />
              </div>
              <div>
                <label htmlFor={`step-topP-${step.id}`} className="block text-xs font-medium text-slate-500">TopP (0-1)</label>
                <input
                  type="number"
                  id={`step-topP-${step.id}`}
                  name="topP"
                  value={step.topP === undefined ? '' : step.topP}
                  onChange={handleConfigChange}
                  step="0.1" min="0" max="1"
                  placeholder="Default"
                  className="mt-1 block w-full px-2 py-1 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                />
              </div>
            </div>
            <div className="flex items-start space-x-4 mt-2">
                <div className="flex items-center">
                    <input
                    id={`step-isJsonOutput-${step.id}`}
                    name="isJsonOutput"
                    type="checkbox"
                    checked={!!step.isJsonOutput}
                    onChange={handleConfigChange}
                    className="h-4 w-4 text-sky-600 border-slate-300 rounded focus:ring-sky-500"
                    />
                    <label htmlFor={`step-isJsonOutput-${step.id}`} className="ml-2 block text-sm text-slate-700">
                    Request JSON Output
                    </label>
                </div>
                {/* Disable Thinking is Gemini Flash specific for now */}
                {step.providerType === 'google_gemini' && (step.model === GEMINI_TEXT_MODEL || step.model?.toLowerCase().includes('flash')) && (
                    <div className="flex items-center">
                        <input
                        id={`step-disableThinking-${step.id}`}
                        name="disableThinking"
                        type="checkbox"
                        checked={!!step.disableThinking}
                        onChange={handleConfigChange}
                        className="h-4 w-4 text-sky-600 border-slate-300 rounded focus:ring-sky-500"
                        />
                        <label htmlFor={`step-disableThinking-${step.id}`} className="ml-2 block text-sm text-slate-700">
                        Disable Thinking (Low Latency for Gemini Flash)
                        </label>
                    </div>
                )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentStepForm;
