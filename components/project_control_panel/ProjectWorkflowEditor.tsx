
import React, { useState } from 'react';
import { AgentStep, AgentDefinition } from '../../types';
import AgentStepForm from '../agent_management/AgentStepForm'; // Reusing this form
import { GEMINI_TEXT_MODEL } from '../../constants';

const generateId = (prefix: string = 'id') => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

interface ProjectWorkflowEditorProps {
  steps: AgentStep[];
  onStepsChange: (updatedSteps: AgentStep[]) => void;
  baseAgentDefinition: AgentDefinition | null; // Used for suggesting new steps based on original agent
}

const ProjectWorkflowEditor: React.FC<ProjectWorkflowEditorProps> = ({ steps, onStepsChange, baseAgentDefinition }) => {
  const [editingStepId, setEditingStepId] = useState<string | null>(null);

  const handleAddStep = () => {
    // Try to get a default step from baseAgentDefinition if available, otherwise a generic new step
    const defaultNewStepInstruction = baseAgentDefinition?.steps[0]?.instruction || "New step instruction: {{input_placeholder}}";
    const defaultNewStepModel = baseAgentDefinition?.steps[0]?.model || GEMINI_TEXT_MODEL;
    const defaultNewStepProvider = baseAgentDefinition?.steps[0]?.providerType || "google_gemini";

    const newStep: AgentStep = {
      id: generateId('step'),
      name: `Custom Step ${steps.length + 1}`,
      instruction: defaultNewStepInstruction,
      model: defaultNewStepModel,
      providerType: defaultNewStepProvider,
    };
    onStepsChange([...steps, newStep]);
    setEditingStepId(newStep.id); // Optionally open new step for editing
  };

  const handleRemoveStep = (stepId: string) => {
    if (window.confirm("Are you sure you want to remove this step from the project workflow?")) {
      onStepsChange(steps.filter(step => step.id !== stepId));
      if (editingStepId === stepId) setEditingStepId(null);
    }
  };

  const handleUpdateStep = (updatedStep: AgentStep) => {
    onStepsChange(steps.map(step => step.id === updatedStep.id ? updatedStep : step));
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...steps];
    const stepToMove = newSteps[index];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;

    if (swapIndex < 0 || swapIndex >= newSteps.length) return;

    newSteps[index] = newSteps[swapIndex];
    newSteps[swapIndex] = stepToMove;
    onStepsChange(newSteps);
  };

  return (
    <div className="p-3 border border-slate-200 rounded-md bg-slate-50 space-y-3">
      <h4 className="text-sm font-semibold text-slate-600 mb-2">Agent Workflow Steps for this Project</h4>
      {steps.length === 0 && (
        <p className="text-xs text-slate-500 italic">No steps defined for this configuration. Click "Add Step".</p>
      )}
      {steps.map((step, index) => (
        <div key={step.id} className="border border-slate-300 rounded-md shadow-sm bg-white">
          <div className="p-2 bg-slate-100 border-b border-slate-300 flex justify-between items-center">
            <button 
                onClick={() => setEditingStepId(editingStepId === step.id ? null : step.id)}
                className="font-medium text-xs text-sky-700 hover:text-sky-900 text-left flex-grow"
            >
               {editingStepId === step.id ? '▼' : '►'} Step {index + 1}: {step.name} ({step.model})
            </button>
            <div className="flex space-x-1 items-center flex-shrink-0">
              {index > 0 && (
                <button onClick={() => handleMoveStep(index, 'up')} title="Move Up" className="p-0.5 text-slate-400 hover:text-slate-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
                </button>
              )}
              {index < steps.length - 1 && (
                <button onClick={() => handleMoveStep(index, 'down')} title="Move Down" className="p-0.5 text-slate-400 hover:text-slate-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
              )}
              <button onClick={() => handleRemoveStep(step.id)} className="text-xs px-1.5 py-0.5 text-red-500 hover:text-red-700">
                Remove
              </button>
            </div>
          </div>
          {editingStepId === step.id && (
            // AgentStepForm needs to be adapted to fit here or a new one created.
            // For simplicity, I'm passing it directly. It might need some styling adjustments.
            <div className="p-2">
                 <AgentStepForm
                    step={step}
                    onUpdate={handleUpdateStep}
                    onRemove={() => handleRemoveStep(step.id)} // This remove is for the form, but we use the list remove
                    index={index} // This index from AgentStepForm is for its own context, might not be needed
                    totalSteps={1} // From AgentStepForm's perspective, it's editing one step
                 />
            </div>
          )}
        </div>
      ))}
      <button
        onClick={handleAddStep}
        className="mt-2 px-3 py-1.5 border border-dashed border-green-400 text-green-600 hover:text-green-800 hover:border-green-500 rounded-md text-xs"
      >
        + Add Step to Workflow
      </button>
    </div>
  );
};

export default ProjectWorkflowEditor;
