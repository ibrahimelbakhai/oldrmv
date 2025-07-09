import React, { useState, useMemo, useEffect } from 'react';
import { Project } from '../../types';
import PaginationControls from '../shared/PaginationControls';

interface ProjectListProps {
  projects: Project[];
  onSelectProject: (projectId: string) => void;
  onCreateProject: (name: string, description?: string) => void;
}

const ProjectList: React.FC<ProjectListProps> = ({ projects, onSelectProject, onCreateProject }) => {
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) {
      alert("Project name cannot be empty.");
      return;
    }
    onCreateProject(newProjectName, newProjectDescription);
    setNewProjectName('');
    setNewProjectDescription('');
    setShowCreateForm(false);
  };

  const filteredAndSearchedProjects = useMemo(() => {
    let processedProjects = [...projects];
    if (searchTerm.trim() !== '') {
      const lowerSearch = searchTerm.toLowerCase();
      processedProjects = processedProjects.filter(project =>
        project.name.toLowerCase().includes(lowerSearch) ||
        (project.description && project.description.toLowerCase().includes(lowerSearch))
      );
    }
    return processedProjects.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()); // Sort by creation date desc
  }, [projects, searchTerm]);

  const totalPages = Math.ceil(filteredAndSearchedProjects.length / itemsPerPage);
  const displayedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSearchedProjects.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSearchedProjects, currentPage, itemsPerPage]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
        <h3 className="text-xl font-semibold text-slate-700">Projects</h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="w-full sm:w-auto px-3 py-1.5 text-sm bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-md shadow-sm transition-colors"
        >
          {showCreateForm ? 'Cancel Create' : '+ New Project'}
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={handleCreateProject} className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-3">
          <div>
            <label htmlFor="new-project-name" className="block text-sm font-medium text-slate-600">Project Name</label>
            <input
              type="text"
              id="new-project-name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
              placeholder="Enter project name"
            />
          </div>
          <div>
            <label htmlFor="new-project-desc" className="block text-sm font-medium text-slate-600">Description (Optional)</label>
            <textarea
              id="new-project-desc"
              value={newProjectDescription}
              onChange={(e) => setNewProjectDescription(e.target.value)}
              rows={2}
              className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
              placeholder="Briefly describe the project"
            />
          </div>
          <button type="submit" className="w-full sm:w-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md shadow-sm text-sm">
            Create Project via AI
          </button>
        </form>
      )}

      {/* Search for Projects */}
      <div className="my-4">
          <label htmlFor="project-search" className="sr-only">Search Projects</label>
          <input
            type="text"
            id="project-search"
            placeholder="Search projects by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
          />
      </div>

      {displayedProjects.length === 0 && !showCreateForm ? (
        <p className="text-slate-500 italic text-center py-4">
          {filteredAndSearchedProjects.length === 0 && searchTerm === ''
           ? 'No projects yet. Click "+ New Project" or use the Chat to create one.'
           : 'No projects match your search.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {displayedProjects.map(project => (
            <li 
              key={project.id} 
              className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onSelectProject(project.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelectProject(project.id);}}
            >
              <h4 className="font-medium text-sky-700">{project.name}</h4>
              {project.description && <p className="text-xs text-slate-500 mt-0.5">{project.description.substring(0,150)}{project.description.length > 150 && '...'}</p>}
              <p className="text-xs text-slate-400 mt-1">Created: {new Date(project.createdAt).toLocaleDateString()}</p>
            </li>
          ))}
        </ul>
      )}
      <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          totalItems={filteredAndSearchedProjects.length}
          onItemsPerPageChange={setItemsPerPage}
        />
    </div>
  );
};

export default ProjectList;
