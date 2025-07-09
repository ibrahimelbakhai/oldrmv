
import React, { useState, useEffect, useCallback } from 'react';
import { PCPCompany, PCPProject, PCPAgentRunConfiguration, ActiveTool, AgentStep } from '../../types';
import { PCP_COMPANIES_LS_KEY, PCP_PROJECTS_LS_KEY } from '../../constants';
import SectionCard from '../shared/SectionCard';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorDisplay from '../shared/ErrorDisplay';
import CompanyManager from './CompanyManager';
import ProjectManager from './ProjectManager';
import { AgentRunConfigurationManager } from './AgentRunConfigurationManager'; // Changed to named import
import adkService from '../../services/adkService'; // To get base agent list

const generateId = (prefix: string = 'id') => `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

const ProjectControlPanelPage: React.FC = () => {
  const [companies, setCompanies] = useState<PCPCompany[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<PCPCompany | null>(null);
  
  const [projects, setProjects] = useState<PCPProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<PCPProject | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data from localStorage on mount
  useEffect(() => {
    try {
      const storedCompanies = localStorage.getItem(PCP_COMPANIES_LS_KEY);
      if (storedCompanies) {
        setCompanies(JSON.parse(storedCompanies));
      } else {
        // Initialize with a default company if none exist
        const defaultCompany = { id: generateId('comp'), name: 'Default Company' };
        setCompanies([defaultCompany]);
        localStorage.setItem(PCP_COMPANIES_LS_KEY, JSON.stringify([defaultCompany]));
      }

      const storedProjects = localStorage.getItem(PCP_PROJECTS_LS_KEY);
      if (storedProjects) {
        setProjects(JSON.parse(storedProjects));
      }
    } catch (e) {
      console.error("Error loading data from localStorage:", e);
      setError("Failed to load initial data. localStorage might be corrupted.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Persist companies to localStorage
  useEffect(() => {
    if (companies.length > 0) {
        try {
            localStorage.setItem(PCP_COMPANIES_LS_KEY, JSON.stringify(companies));
        } catch (e) {
            console.error("Error saving companies to localStorage:", e);
            setError("Could not save company data.");
        }
    }
  }, [companies]);

  // Persist projects to localStorage
  useEffect(() => {
     try {
        localStorage.setItem(PCP_PROJECTS_LS_KEY, JSON.stringify(projects));
     } catch (e) {
        console.error("Error saving projects to localStorage:", e);
        setError("Could not save project data.");
     }
  }, [projects]);

  const handleCreateCompany = (name: string): PCPCompany => {
    if (!name.trim()) {
      setError("Company name cannot be empty.");
      throw new Error("Company name cannot be empty.");
    }
    if (companies.find(c => c.name.toLowerCase() === name.toLowerCase().trim())) {
        setError(`Company with name "${name}" already exists.`);
        throw new Error(`Company with name "${name}" already exists.`);
    }
    const newCompany: PCPCompany = { id: generateId('comp'), name: name.trim() };
    setCompanies(prev => [...prev, newCompany]);
    return newCompany;
  };

  const handleSelectCompany = (companyId: string | null) => {
    const company = companyId ? companies.find(c => c.id === companyId) || null : null;
    setSelectedCompany(company);
    setSelectedProject(null); // Reset project when company changes
  };

  const projectsForSelectedCompany = selectedCompany 
    ? projects.filter(p => p.companyId === selectedCompany.id)
    : [];

  const handleCreateProject = (name: string, description?: string): PCPProject => {
    if (!selectedCompany) {
      setError("Please select a company first to create a project.");
      throw new Error("No company selected.");
    }
    if (!name.trim()) {
      setError("Project name cannot be empty.");
      throw new Error("Project name cannot be empty.");
    }
    if (projectsForSelectedCompany.find(p => p.name.toLowerCase() === name.toLowerCase().trim())) {
        setError(`Project with name "${name}" already exists in this company.`);
        throw new Error(`Project with name "${name}" already exists in this company.`);
    }
    const newProject: PCPProject = { 
      id: generateId('proj'), 
      companyId: selectedCompany.id, 
      name: name.trim(), 
      description: description?.trim() || '',
      agentRunConfigs: [],
    };
    setProjects(prev => [...prev, newProject]);
    return newProject;
  };

  const handleSelectProject = (projectId: string | null) => {
    const project = projectId ? projects.find(p => p.id === projectId) || null : null;
    setSelectedProject(project);
  };

  const handleUpdateProject = (updatedProject: PCPProject) => {
    setProjects(prev => prev.map(p => p.id === updatedProject.id ? updatedProject : p));
    // If the currently selected project is updated, update the selectedProject state as well
    if (selectedProject && selectedProject.id === updatedProject.id) {
        setSelectedProject(updatedProject);
    }
  };


  if (isLoading) {
    return <SectionCard title="Project Control Panel"><LoadingSpinner /></SectionCard>;
  }

  return (
    <SectionCard title="Project Control Panel">
      <div className="space-y-8">
        <ErrorDisplay message={error} />

        {/* Step 1: Company Management */}
        <CompanyManager
          companies={companies}
          selectedCompanyId={selectedCompany?.id || null}
          onSelectCompany={handleSelectCompany}
          onCreateCompany={handleCreateCompany}
        />

        {/* Step 2: Project Management (conditional on company selection) */}
        {selectedCompany && (
          <ProjectManager
            projects={projectsForSelectedCompany}
            selectedProjectId={selectedProject?.id || null}
            onSelectProject={handleSelectProject}
            onCreateProject={handleCreateProject}
            companyName={selectedCompany.name}
          />
        )}

        {/* Step 3: Agent Run Configuration (conditional on project selection) */}
        {selectedCompany && selectedProject && (
          <AgentRunConfigurationManager
            project={selectedProject}
            onUpdateProject={handleUpdateProject} // Pass the handler to update project with new/modified configs
            baseAgents={adkService.getAllAgentManifests()}
            baseAgentDefinitionsMap={new Map(adkService.getAllAgentDefinitions().map(def => [def.id, def]))}
          />
        )}
        
        {!selectedCompany && (
            <p className="text-slate-500 mt-6 text-center">Please select or create a company to begin.</p>
        )}
        {selectedCompany && !selectedProject && (
            <p className="text-slate-500 mt-6 text-center">Please select or create a project to configure agents.</p>
        )}
      </div>
    </SectionCard>
  );
};

export default ProjectControlPanelPage;
