
import React from 'react';
import { GEMINI_TEXT_MODEL } from '../../constants';

interface ProjectCredentialFormProps {
  projectApiKey: string;
  onProjectApiKeyChange: (value: string) => void;
  projectModel: string;
  onProjectModelChange: (value: string) => void;
  baseModelFromAgent: string; // To show as placeholder or default
}

const ProjectCredentialForm: React.FC<ProjectCredentialFormProps> = ({
  projectApiKey,
  onProjectApiKeyChange,
  projectModel,
  onProjectModelChange,
  baseModelFromAgent,
}) => {
  return (
    <div className="p-3 border border-slate-200 rounded-md bg-slate-50 space-y-3">
      <h4 className="text-sm font-semibold text-slate-600">Project-Specific Agent Settings (Optional Overrides)</h4>
      <div>
        <label htmlFor="project-api-key" className="block text-xs font-medium text-slate-500">
          API Key for this Project & Agent
        </label>
        <input
          type="password"
          id="project-api-key"
          value={projectApiKey}
          onChange={(e) => onProjectApiKeyChange(e.target.value)}
          placeholder="If blank, uses step-specific or global API key"
          className="mt-1 block w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md shadow-sm text-sm"
        />
        <p className="text-xs text-slate-400 mt-0.5">Overrides any API key defined in agent steps or globally for this specific project run.</p>
      </div>
      <div>
        <label htmlFor="project-model" className="block text-xs font-medium text-slate-500">
          Model Name for this Project & Agent
        </label>
        <input
          type="text"
          id="project-model"
          value={projectModel}
          onChange={(e) => onProjectModelChange(e.target.value)}
          placeholder={`Default: ${baseModelFromAgent || GEMINI_TEXT_MODEL}`}
          className="mt-1 block w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md shadow-sm text-sm"
        />
        <p className="text-xs text-slate-400 mt-0.5">Overrides model names defined in agent steps for this specific project run.</p>
      </div>
    </div>
  );
};

export default ProjectCredentialForm;
