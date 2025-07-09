
import React, { useState } from 'react';
import { PCPProject } from '../../types';

interface ProjectManagerProps {
  projects: PCPProject[];
  selectedProjectId: string | null;
  onSelectProject: (projectId: string | null) => void;
  onCreateProject: (name: string, description?: string) => PCPProject;
  companyName: string;
}

const ProjectManager: React.FC<ProjectManagerProps> = ({
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
  companyName
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newProjectName.trim()) {
      setCreateError("Project name cannot be empty.");
      return;
    }
    try {
      const newProject = onCreateProject(newProjectName, newProjectDescription);
      onSelectProject(newProject.id); // Automatically select the new project
      setNewProjectName('');
      setNewProjectDescription('');
      setShowCreateForm(false);
      setCreateError(null);
    } catch (e: any) {
      setCreateError(e.message || "Failed to create project.");
    }
  };

  return (
    <div className="p-4 bg-white shadow-md rounded-lg">
      <h2 className="text-xl font-semibold text-slate-700 mb-4">
        2. Select or Create Project for <span className="text-sky-600">{companyName}</span>
      </h2>
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-grow">
          <label htmlFor="project-select" className="block text-sm font-medium text-slate-700 mb-1">
            Select Project:
          </label>
          <select
            id="project-select"
            value={selectedProjectId || ''}
            onChange={(e) => onSelectProject(e.target.value || null)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
            disabled={projects.length === 0 && !showCreateForm}
          >
            <option value="">-- Select a Project --</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => { setShowCreateForm(!showCreateForm); setCreateError(null); setNewProjectName(''); setNewProjectDescription('');}}
          className="flex-shrink-0 px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md shadow-sm transition-colors"
        >
          {showCreateForm ? 'Cancel Create' : 'Create New Project'}
        </button>
      </div>

      {showCreateForm && (
        <div className="mt-4 p-3 border border-slate-200 rounded-md bg-slate-50 space-y-3">
          <h3 className="text-md font-medium text-slate-600">Create New Project</h3>
          <div>
            <label htmlFor="new-project-name" className="block text-xs font-medium text-slate-500">Project Name:</label>
            <input
              type="text"
              id="new-project-name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Enter new project name"
              className="mt-1 w-full sm:w-2/3 px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
            />
          </div>
           <div>
            <label htmlFor="new-project-description" className="block text-xs font-medium text-slate-500">Description (Optional):</label>
            <textarea
              id="new-project-description"
              value={newProjectDescription}
              onChange={(e) => setNewProjectDescription(e.target.value)}
              rows={2}
              placeholder="Briefly describe this project"
              className="mt-1 w-full sm:w-2/3 px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
            />
          </div>
          {createError && <p className="text-xs text-red-500">{createError}</p>}
          <button
            onClick={handleCreate}
            className="px-4 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md shadow-sm"
          >
            Save Project
          </button>
        </div>
      )}
      {projects.length === 0 && !showCreateForm && (
          <p className="text-sm text-slate-500 italic mt-3">No projects found for this company. Click "Create New Project" to add one.</p>
      )}
    </div>
  );
};

export default ProjectManager;
