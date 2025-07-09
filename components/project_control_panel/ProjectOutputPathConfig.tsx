
import React from 'react';

interface ProjectOutputPathConfigProps {
  outputPath: string;
  onOutputPathChange: (value: string) => void;
}

const ProjectOutputPathConfig: React.FC<ProjectOutputPathConfigProps> = ({ outputPath, onOutputPathChange }) => {
  return (
    <div className="p-3 border border-slate-200 rounded-md bg-slate-50 space-y-2">
      <h4 className="text-sm font-semibold text-slate-600">Output Configuration</h4>
      <div>
        <label htmlFor="output-path" className="block text-xs font-medium text-slate-500">
          Output Path / Destination
        </label>
        <input
          type="text"
          id="output-path"
          value={outputPath}
          onChange={(e) => onOutputPathChange(e.target.value)}
          placeholder="e.g., Google Doc ID, Sheet ID, Folder Path"
          className="mt-1 block w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md shadow-sm text-sm"
        />
        <p className="text-xs text-slate-400 mt-0.5">
          Specify where the agent's final output should be stored. This is conceptual for now.
        </p>
      </div>
    </div>
  );
};

export default ProjectOutputPathConfig;
