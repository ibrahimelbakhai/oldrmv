
import React, { useState, useEffect } from 'react';
import { PCPAgentRunConfiguration, AgentManifestEntry, AgentDefinition, AgentStep, PCPExecutionLogEntry } from '../../types';
import ProjectCredentialForm from './ProjectCredentialForm';
import ProjectWorkflowEditor from './ProjectWorkflowEditor';
import ProjectOutputPathConfig from './ProjectOutputPathConfig';
import ExecutionControls from './ExecutionControls'; // Will be created
import { GEMINI_TEXT_MODEL } from '../../constants';
import adkService from '../../services/adkService';

const generateId = (prefix: string = 'id') => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

interface AgentRunConfigurationEditorProps {
  config: PCPAgentRunConfiguration;
  baseAgentManifest: AgentManifestEntry;
  baseAgentDefinition: AgentDefinition | null; // Might be null if definition not found
  onUpdateConfig: (updatedConfig: PCPAgentRunConfiguration) => void;
  onDeleteConfig: (configId: string) => void;
}

const AgentRunConfigurationEditor: React.FC<AgentRunConfigurationEditorProps> = ({
  config,
  baseAgentManifest,
  baseAgentDefinition,
  onUpdateConfig,
  onDeleteConfig,
}) => {
  const [editableConfig, setEditableConfig] = useState<PCPAgentRunConfiguration>(config);
  const [executionLogs, setExecutionLogs] = useState<PCPExecutionLogEntry[]>(config.lastRunLog || []);
  const [isRunning, setIsRunning] = useState(false);
  const [runProgress, setRunProgress] = useState(0);


  useEffect(() => {
    // Ensure editableConfig is updated if the parent 'config' prop changes (e.g., different config selected)
    setEditableConfig(config);
    setExecutionLogs(config.lastRunLog || []);
  }, [config]);

  const handleChange = (field: keyof PCPAgentRunConfiguration, value: any) => {
    setEditableConfig(prev => ({ ...prev, [field]: value }));
  };
  
  const handleWorkflowStepsChange = (updatedSteps: AgentStep[]) => {
    setEditableConfig(prev => ({ ...prev, workflowSteps: updatedSteps }));
  };

  const handleSave = () => {
    onUpdateConfig(editableConfig);
    // Could add a success message here
  };
  
  const addLog = (message: string, type: PCPExecutionLogEntry['type'], stepName?: string) => {
    setExecutionLogs(prev => [...prev, {id: generateId('log'), timestamp: new Date().toISOString(), message, type, stepName }]);
  };

  const handleRun = async () => {
    setIsRunning(true);
    setRunProgress(0);
    setExecutionLogs([]); // Clear previous logs for this run
    addLog(`Starting execution for "${editableConfig.configName}"...`, 'info');

    let overallSuccess = true;

    for (let i = 0; i < editableConfig.workflowSteps.length; i++) {
        const step = editableConfig.workflowSteps[i];
        addLog(`Step ${i+1}: ${step.name}`, 'step_start', step.name);
        setRunProgress(Math.round(((i + 0.5) / editableConfig.workflowSteps.length) * 100));

        // Determine API Key and Model to use
        // Priority: Project Config -> Step Definition -> Global
        const apiKeyToUse = editableConfig.projectApiKey || step.apiKey /* || process.env.API_KEY (handled by llmService) */;
        const modelToUse = editableConfig.projectModel || step.model || GEMINI_TEXT_MODEL;
        
        // Simulate API call
        // In a real scenario, you'd call something like:
        // const result = await adkService.invokeAgentAction(editableConfig.baseAgentId, step.name /* or a specific action if steps map to actions */, { /* params for step */ prompt: step.instruction, ... });
        // For now, we simulate a call and use llmService directly for simplicity if we want to test the Gemini part
        
        // Simulate step execution based on placeholder substitution in instruction
        let prompt = step.instruction;
        // Basic placeholder for previous step output - this would need actual data flow in real system
        if (i > 0 && executionLogs.some(log => log.type === 'success' && log.stepName === editableConfig.workflowSteps[i-1].name)) {
           const prevStepOutput = executionLogs.find(log => log.type === 'success' && log.stepName === editableConfig.workflowSteps[i-1].name)?.message || "Output from previous step";
           prompt = prompt.replace(/{{previous_step_output}}/gi, prevStepOutput.substring(0,500)); // Limit length
        } else if (i > 0) {
            prompt = prompt.replace(/{{previous_step_output}}/gi, "Previous step output not available or failed.");
        }


        try {
            // If you want to make a real Gemini call for simulation:
            /*
            const { llmService } = await import('../../services/llmService'); // Dynamic import if needed
            const response = await llmService.generateContentInternal({
                prompt: step.instruction,
                model: modelToUse,
                providerType: step.providerType, // Assuming step has providerType
                apiKey: apiKeyToUse,
                temperature: step.temperature,
                topK: step.topK,
                topP: step.topP,
                isJsonOutput: step.isJsonOutput,
                disableThinking: step.disableThinking,
                systemInstruction: baseAgentDefinition?.globalSystemInstruction // Example
            });
            */
            await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000)); // Simulate delay
            // const success = Math.random() > 0.2; // Simulate success/failure
            // if (!success) throw new Error("Simulated step failure.");
            // addLog(`Simulated output for ${step.name}: ${response.text || "Generated some text..."}`, 'success', step.name);
            addLog(`Simulated successful output for step "${step.name}". Placeholder prompt used: "${prompt.substring(0,100)}..."`, 'success', step.name);

        } catch (e:any) {
            addLog(`Error in step ${step.name}: ${e.message}`, 'error', step.name);
            overallSuccess = false;
            break; // Stop execution on error
        }
        addLog(`Step ${i+1}: ${step.name} finished.`, 'step_end', step.name);
    }
    
    setRunProgress(100);
    if(overallSuccess) {
        addLog(`Execution completed successfully for "${editableConfig.configName}".`, 'success');
        // Simulate output path link
        const simulatedLink = editableConfig.outputPath && editableConfig.outputPath.startsWith('http') 
            ? editableConfig.outputPath 
            : `https://docs.google.com/document/d/${editableConfig.outputPath || 'simulated_doc_id_123'}`;

        onUpdateConfig({...editableConfig, lastRunStatus: 'success', lastRunLog: executionLogs, lastRunOutputLink: simulatedLink });
    } else {
        addLog(`Execution failed for "${editableConfig.configName}".`, 'error');
        onUpdateConfig({...editableConfig, lastRunStatus: 'failed', lastRunLog: executionLogs, lastRunOutputLink: undefined });
    }
    setIsRunning(false);
  };


  if (!baseAgentDefinition) {
    return <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-md text-yellow-700">
        Warning: Base agent definition for "{baseAgentManifest.name}" (ID: {config.baseAgentId}) could not be loaded. 
        This might be because it's missing from the Agent Management definitions. Default steps may not be available.
    </div>;
  }
  
  const currentBaseAgentDef = adkService.getAgentDefinition(config.baseAgentId);


  return (
    <div className="p-4 border border-slate-300 rounded-lg bg-white space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h3 className="text-lg font-semibold text-sky-700">{editableConfig.configName}</h3>
            <p className="text-sm text-slate-500">Based on: {baseAgentManifest.name} <span className="text-xs">({baseAgentManifest.description})</span></p>
        </div>
        <button 
            onClick={() => onDeleteConfig(config.id)}
            className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-800 border border-red-300 hover:bg-red-50 rounded-md"
            disabled={isRunning}
        >
            Delete This Setup
        </button>
      </div>

      <div className="space-y-3">
        <div>
            <label htmlFor={`configName-${config.id}`} className="block text-sm font-medium text-slate-700">Configuration Name:</label>
            <input
                type="text"
                id={`configName-${config.id}`}
                value={editableConfig.configName}
                onChange={(e) => handleChange('configName', e.target.value)}
                className="mt-1 block w-full md:w-1/2 px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
            />
        </div>

        <ProjectCredentialForm
            projectApiKey={editableConfig.projectApiKey || ''}
            onProjectApiKeyChange={(val) => handleChange('projectApiKey', val)}
            projectModel={editableConfig.projectModel || ''}
            onProjectModelChange={(val) => handleChange('projectModel', val)}
            baseModelFromAgent={currentBaseAgentDef?.steps[0]?.model || GEMINI_TEXT_MODEL}
        />

        <ProjectWorkflowEditor
            steps={editableConfig.workflowSteps}
            onStepsChange={handleWorkflowStepsChange}
            baseAgentDefinition={currentBaseAgentDef} // To suggest new steps based on original agent
        />
        
        <ProjectOutputPathConfig
            outputPath={editableConfig.outputPath || ''}
            onOutputPathChange={(val) => handleChange('outputPath', val)}
        />
      </div>

      <div className="flex justify-end space-x-3 mt-6 border-t pt-4">
        <button 
            onClick={handleSave}
            className="px-6 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md shadow-sm disabled:opacity-50"
            disabled={isRunning}
        >
            Save Configuration
        </button>
      </div>

      <ExecutionControls
        onRun={handleRun}
        isRunning={isRunning}
        progress={runProgress}
        logs={executionLogs}
        lastRunStatus={config.lastRunStatus}
        lastRunOutputLink={config.lastRunOutputLink}
      />
    </div>
  );
};

export default AgentRunConfigurationEditor;
