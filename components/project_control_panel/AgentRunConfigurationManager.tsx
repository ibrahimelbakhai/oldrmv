
import React, { useState, useEffect } from 'react';
import { PCPProject, PCPAgentRunConfiguration, AgentManifestEntry, AgentDefinition, AgentStep } from '../../types';
import AgentRunConfigurationEditor from './AgentRunConfigurationEditor'; 
import adkService from '../../services/adkService'; // Added import for adkService

const generateId = (prefix: string = 'id') => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

interface AgentRunConfigurationManagerProps {
  project: PCPProject;
  onUpdateProject: (updatedProject: PCPProject) => void;
  baseAgents: AgentManifestEntry[]; 
  baseAgentDefinitionsMap: Map<string, AgentDefinition>; 
}

export const AgentRunConfigurationManager: React.FC<AgentRunConfigurationManagerProps> = ({
  project,
  onUpdateProject,
  baseAgents,
  baseAgentDefinitionsMap,
}) => {
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [showAddConfigForm, setShowAddConfigForm] = useState(false);
  const [newConfigBaseAgentId, setNewConfigBaseAgentId] = useState<string>('');
  const [newConfigName, setNewConfigName] = useState('');
  const [formError, setFormError] = useState<string | null>(null); // For errors specific to the add form

  useEffect(() => {
    // If a config is selected, or project changes, hide the add form and clear its fields.
    if (selectedConfigId || project.id) { 
        setShowAddConfigForm(false);
        setNewConfigBaseAgentId('');
        setNewConfigName('');
        setFormError(null);
    }
  }, [selectedConfigId, project.id]);

  const handleAddAgentConfig = () => {
    setFormError(null); 
    if (!newConfigBaseAgentId) {
      setFormError("Please select a base agent type.");
      return;
    }
    if (!newConfigName.trim()) {
      setFormError("Please provide a configuration name.");
      return;
    }

    const baseAgentDef = baseAgentDefinitionsMap.get(newConfigBaseAgentId);
    if (!baseAgentDef) {
        setFormError(`Critical error: Base agent definition for ID "${newConfigBaseAgentId}" not found. Agent might not be correctly registered or configured.`);
        return;
    }
    
    if (!baseAgentDef.steps || baseAgentDef.steps.length === 0) {
        setFormError(`Critical error: Base agent definition for "${baseAgentDef.name}" has no steps defined. Cannot create a run configuration.`);
        return;
    }
    
    const newConfig: PCPAgentRunConfiguration = {
      id: generateId('arc'),
      baseAgentId: newConfigBaseAgentId,
      configName: newConfigName.trim(),
      workflowSteps: baseAgentDef.steps.map(step => ({ ...step, id: generateId('step') })), 
      projectApiKey: '',
      projectModel: '',
      outputPath: '',
      lastRunStatus: 'idle',
      lastRunLog: [],
    };

    const updatedProject = {
      ...project,
      agentRunConfigs: [...project.agentRunConfigs, newConfig],
    };
    onUpdateProject(updatedProject);
    
    setSelectedConfigId(newConfig.id); 
  };
  
  const handleUpdateAgentConfig = (updatedConfig: PCPAgentRunConfiguration) => {
     const updatedProject = {
      ...project,
      agentRunConfigs: project.agentRunConfigs.map(config =>
        config.id === updatedConfig.id ? updatedConfig : config
      ),
    };
    onUpdateProject(updatedProject);
  };

  const handleDeleteAgentConfig = (configId: string) => {
    if (window.confirm("Are you sure you want to delete this agent configuration?")) {
        const updatedProject = {
            ...project,
            agentRunConfigs: project.agentRunConfigs.filter(config => config.id !== configId),
        };
        onUpdateProject(updatedProject);
        if (selectedConfigId === configId) {
            setSelectedConfigId(null); 
        }
    }
  };

  const selectedConfig = project.agentRunConfigs.find(c => c.id === selectedConfigId);
  const baseAgentForSelectedConfig = selectedConfig ? baseAgents.find(ba => ba.agentId === selectedConfig.baseAgentId) : null;

  return (
    <div className="p-4 bg-white shadow-md rounded-lg mt-6">
      <h2 className="text-xl font-semibold text-slate-700 mb-4">3. Configure Agents for Project: <span className="text-sky-600">{project.name}</span></h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-3">
          <h3 className="text-md font-semibold text-slate-600 border-b pb-2">Agent Setups ({project.agentRunConfigs.length})</h3>
          {project.agentRunConfigs.length === 0 && !showAddConfigForm && (
            <p className="text-sm text-slate-500 italic">No agent setups configured for this project yet.</p>
          )}
          <div className="max-h-96 overflow-y-auto pr-2 space-y-2">
            {project.agentRunConfigs.map(config => (
              <div
                key={config.id}
                onClick={() => setSelectedConfigId(config.id)}
                className={`p-2.5 border rounded-md cursor-pointer transition-all ${
                  selectedConfigId === config.id 
                    ? 'bg-sky-100 border-sky-400 shadow-lg ring-2 ring-sky-300' 
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="flex justify-between items-start">
                    <span className="font-medium text-sm text-slate-700">{config.configName}</span>
                    {selectedConfigId === config.id && (
                         <span className="text-xs text-sky-600 font-semibold">Selected</span>
                    )}
                </div>
                <p className="text-xs text-slate-500">
                    Base Agent: {baseAgents.find(ba => ba.agentId === config.baseAgentId)?.name || 'Unknown'}
                </p>
                 <p className={`mt-0.5 text-xs capitalize px-1.5 py-0.5 inline-block rounded-full ${
                        config.lastRunStatus === 'success' ? 'bg-green-100 text-green-700' :
                        config.lastRunStatus === 'failed' ? 'bg-red-100 text-red-700' :
                        config.lastRunStatus === 'running' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-600'
                    }`}>{config.lastRunStatus || 'Idle'}
                </p>
              </div>
            ))}
          </div>

          {!showAddConfigForm && (
            <button
              onClick={() => { 
                  setShowAddConfigForm(true); 
                  setSelectedConfigId(null); 
                  setFormError(null); 
                }}
              className="mt-3 w-full px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md shadow-sm"
            >
              + Add Agent Setup
            </button>
          )}

          {showAddConfigForm && (
            <div className="mt-4 p-3 border border-slate-300 rounded-md bg-slate-100 space-y-3">
              <h4 className="text-sm font-semibold text-slate-700">New Agent Setup</h4>
              {formError && <p className="text-xs text-red-500 bg-red-100 p-2 rounded-md">{formError}</p>}
              <div>
                <label htmlFor="new-config-name" className="block text-xs font-medium text-slate-500">Configuration Name:</label>
                <input
                  type="text"
                  id="new-config-name"
                  value={newConfigName}
                  onChange={(e) => setNewConfigName(e.target.value)}
                  placeholder="e.g., Daily Report Generator"
                  className="mt-1 w-full px-2 py-1.5 bg-white border-slate-300 rounded-md shadow-sm text-sm"
                />
              </div>
              <div>
                <label htmlFor="base-agent-select" className="block text-xs font-medium text-slate-500">Base Agent Type:</label>
                <select
                  id="base-agent-select"
                  value={newConfigBaseAgentId}
                  onChange={(e) => setNewConfigBaseAgentId(e.target.value)}
                  className="mt-1 w-full px-2 py-1.5 bg-white border-slate-300 rounded-md shadow-sm text-sm"
                >
                  <option value="">-- Select Base Agent --</option>
                  {baseAgents.map(agent => (
                    <option key={agent.agentId} value={agent.agentId}>{agent.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddAgentConfig} className="px-3 py-1 text-xs text-white bg-sky-600 hover:bg-sky-700 rounded-md">
                  Add and Configure
                </button>
                <button onClick={() => {
                    setShowAddConfigForm(false); 
                    setFormError(null); 
                    setNewConfigBaseAgentId(''); 
                    setNewConfigName('');
                }} className="px-3 py-1 text-xs text-slate-700 bg-slate-200 hover:bg-slate-300 rounded-md">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="md:col-span-2">
          {selectedConfig && baseAgentForSelectedConfig ? (
            <AgentRunConfigurationEditor
              key={selectedConfig.id} 
              config={selectedConfig}
              baseAgentManifest={baseAgentForSelectedConfig}
              baseAgentDefinition={baseAgentDefinitionsMap.get(selectedConfig.baseAgentId) || null}
              onUpdateConfig={handleUpdateAgentConfig}
              onDeleteConfig={handleDeleteAgentConfig}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-slate-50 rounded-md p-10 border-2 border-dashed border-slate-300">
              <p className="text-slate-500 text-center">
                {showAddConfigForm ? "Fill in the details for the new agent setup." : "Select an agent setup from the list, or add a new one to begin configuration."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
