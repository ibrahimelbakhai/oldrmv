
import React, { useState, Fragment, useEffect } from 'react'; // Added useEffect
import { ActiveTool } from './types';
import KeywordResearchTool from './components/KeywordResearchTool';
import ContentPlannerTool from './components/ContentPlannerTool';
import ContentWriterTool from './components/ContentWriterTool';
import MetaTagGeneratorTool from './components/MetaTagGeneratorTool';
import AgentManagementDashboard from './components/agent_management/AgentManagementDashboard';
import { MaestroOrchestratorTool } from './components/maestro/MaestroOrchestratorTool';
import AgentAnalyticsDashboard from './components/analytics/AgentAnalyticsDashboard';
import ProjectManagementDashboard from './components/project_management/ProjectManagementDashboard';
import SocialMediaManagerDashboard from './components/social_media_manager/SocialMediaManagerDashboard';
import ProjectControlPanelPage from './components/project_control_panel/ProjectControlPanelPage'; // New Import
import adkService from './services/adkService'; // Import ADK Service

interface NavLinkProps {
  icon: JSX.Element;
  text: string;
  isActive: boolean;
  onClick: () => void;
  isSubItem?: boolean;
}

const NavLink: React.FC<NavLinkProps> = ({ icon, text, isActive, onClick, isSubItem }) => (
  <button
    onClick={onClick}
    className={`flex items-center w-full text-left px-3 py-2.5 rounded-md text-sm font-medium transition-colors
                ${isSubItem ? 'pl-10' : 'pl-3'}
                ${isActive 
                  ? 'bg-sky-600 text-white shadow-md' 
                  : 'text-slate-200 hover:bg-slate-700 hover:text-white'}`}
    role="menuitem"
  >
    <span className="mr-3 w-5 h-5">{icon}</span>
    {text}
  </button>
);

// Simple SVG Icons
const MaestroIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.25 12L17 13.75l-1.25-1.75L14 13.75l-1.25-1.75L11 13.75l-1.25-1.75L8 13.75l.813 2.846a4.5 4.5 0 003.09 3.09L15 21.75l2.154-.813a4.5 4.5 0 003.09-3.09L21 15l.813-2.846L21 9.25l-.813-2.846a4.5 4.5 0 00-3.09-3.09L15 2.25l-2.154.813a4.5 4.5 0 00-3.09 3.09L9 9.25l-.813 2.846L9 15l.813 2.846L9 18.75l.813-2.846.813 2.846z" /></svg>;
const AgentIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const SeoIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>;
const KeywordIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75l-2.489-2.489m0 0a3.375 3.375 0 10-4.773-4.773 3.375 3.375 0 004.774 4.774zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const PlanIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25M10.5 16.5h.008v.008h-.008V16.5zm.008-3h.008v.008h-.008V13.5zm.008-3h.008v.008h-.008V10.5z" /></svg>;
const WriteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>;
const MetaIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5" /></svg>;
const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>;
const AnalyticsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>;
const ProjectManagementIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M18 15.75a3 3 0 100-6 3 3 0 000 6zM21 12a9 9 0 11-18 0 9 9 0 0118 0zM3.75 12H6m12 0h2.25" /></svg>;
const SocialMediaIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-6.75 3h9m-9 3h9M3.75 6a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM20.25 6a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM3.75 15.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM20.25 15.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0z" /></svg>;
const ControlPanelIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /></svg>;


const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState<ActiveTool>(ActiveTool.MAESTRO_ORCHESTRATOR);
  const [isSeoToolsOpen, setIsSeoToolsOpen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true); 
  const [isAdkInitialized, setIsAdkInitialized] = useState<boolean>(false);

  useEffect(() => {
    adkService.initialize().then(() => {
      setIsAdkInitialized(true);
      console.log("ADK Service initialized from App.tsx");
    }).catch(error => {
      console.error("ADK Service failed to initialize from App.tsx:", error);
      // Optionally set an error state to display to the user
    });
  }, []);


  const renderTool = () => {
    if (!isAdkInitialized) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <svg className="animate-spin h-12 w-12 text-sky-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-slate-600 text-lg">Initializing Agent Development Kit...</p>
                <p className="text-sm text-slate-500">Please wait while agents are being loaded.</p>
            </div>
        );
    }
    switch (activeTool) {
      case ActiveTool.MAESTRO_ORCHESTRATOR:
        return <MaestroOrchestratorTool />;
      case ActiveTool.AGENT_MANAGEMENT:
        return <AgentManagementDashboard />;
      case ActiveTool.AGENT_ANALYTICS:
        return <AgentAnalyticsDashboard />;
      case ActiveTool.PROJECT_MANAGEMENT:
        return <ProjectManagementDashboard />;
      case ActiveTool.SOCIAL_MEDIA_MANAGER:
        return <SocialMediaManagerDashboard />;
      case ActiveTool.PROJECT_CONTROL_PANEL: // New Case
        return <ProjectControlPanelPage />;
      case ActiveTool.KEYWORD_RESEARCH:
        return <KeywordResearchTool />;
      case ActiveTool.CONTENT_PLANNER:
        return <ContentPlannerTool />;
      case ActiveTool.CONTENT_WRITER:
        return <ContentWriterTool />;
      case ActiveTool.META_TAG_GENERATOR:
        return <MetaTagGeneratorTool />;
      default:
        return <MaestroOrchestratorTool />;
    }
  };

  const seoTools: { name: ActiveTool, icon: JSX.Element }[] = [
    { name: ActiveTool.KEYWORD_RESEARCH, icon: <KeywordIcon /> },
    { name: ActiveTool.CONTENT_PLANNER, icon: <PlanIcon /> },
    { name: ActiveTool.CONTENT_WRITER, icon: <WriteIcon /> },
    { name: ActiveTool.META_TAG_GENERATOR, icon: <MetaIcon /> },
  ];

  const handleNavLinkClick = (tool: ActiveTool) => {
    setActiveTool(tool);
    if (window.innerWidth < 768) { // md breakpoint in Tailwind
        setIsSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 text-slate-800">
      <aside className={`bg-slate-800 text-white transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64' : 'w-16'} flex flex-col fixed inset-y-0 left-0 z-30`}>
        <div className={`flex items-center justify-between h-16 border-b border-slate-700 ${isSidebarOpen ? 'px-4' : 'px-3'}`}>
          <h1 className={`text-xl font-bold tracking-tight whitespace-nowrap overflow-hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 w-0'}`}>
            Maestro
          </h1>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white" aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d={isSidebarOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
        </div>
        <nav className="flex-grow p-2 space-y-1 overflow-y-auto">
          <NavLink
            icon={<MaestroIcon />}
            text="Maestro Orchestrator"
            isActive={activeTool === ActiveTool.MAESTRO_ORCHESTRATOR}
            onClick={() => handleNavLinkClick(ActiveTool.MAESTRO_ORCHESTRATOR)}
          />
           <NavLink
            icon={<ControlPanelIcon />}
            text="Project Control Panel"
            isActive={activeTool === ActiveTool.PROJECT_CONTROL_PANEL}
            onClick={() => handleNavLinkClick(ActiveTool.PROJECT_CONTROL_PANEL)}
          />
          <NavLink
            icon={<AgentIcon />}
            text="Agent Management"
            isActive={activeTool === ActiveTool.AGENT_MANAGEMENT}
            onClick={() => handleNavLinkClick(ActiveTool.AGENT_MANAGEMENT)}
          />
          <NavLink
            icon={<AnalyticsIcon />}
            text="Agent Analytics"
            isActive={activeTool === ActiveTool.AGENT_ANALYTICS}
            onClick={() => handleNavLinkClick(ActiveTool.AGENT_ANALYTICS)}
          />
           <NavLink
            icon={<ProjectManagementIcon />}
            text="Project Management"
            isActive={activeTool === ActiveTool.PROJECT_MANAGEMENT}
            onClick={() => handleNavLinkClick(ActiveTool.PROJECT_MANAGEMENT)}
          />
          <NavLink
            icon={<SocialMediaIcon />}
            text="Social Media AI"
            isActive={activeTool === ActiveTool.SOCIAL_MEDIA_MANAGER}
            onClick={() => handleNavLinkClick(ActiveTool.SOCIAL_MEDIA_MANAGER)}
          />
          <div>
            <button
              onClick={() => setIsSeoToolsOpen(!isSeoToolsOpen)}
              className={`flex items-center justify-between w-full px-3 py-2.5 rounded-md text-sm font-medium text-left
                          text-slate-200 hover:bg-slate-700 hover:text-white group`}
              aria-expanded={isSeoToolsOpen}
            >
              <div className="flex items-center">
                <span className="mr-3 w-5 h-5"><SeoIcon /></span>
                {isSidebarOpen && <span>SEO Worker Agents</span>}
              </div>
              {isSidebarOpen && (isSeoToolsOpen ? <ChevronDownIcon /> : <ChevronRightIcon />)}
            </button>
            {isSeoToolsOpen && isSidebarOpen && (
              <div className="mt-1 space-y-1">
                {seoTools.map((tool) => (
                  <NavLink
                    key={tool.name}
                    icon={tool.icon}
                    text={tool.name}
                    isActive={activeTool === tool.name}
                    onClick={() => handleNavLinkClick(tool.name)}
                    isSubItem
                  />
                ))}
              </div>
            )}
          </div>
        </nav>
        {isSidebarOpen && (
          <div className="p-4 border-t border-slate-700">
            <p className="text-xs text-slate-400">&copy; {new Date().getFullYear()} Maestro Orchestrator.</p>
             <p className="text-xs text-slate-500 mt-1">ADK Initialized: {isAdkInitialized ? 'Yes' : 'No'}</p>
          </div>
        )}
      </aside>

      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${isSidebarOpen ? 'md:ml-64' : 'md:ml-16'}`}>
        <header className="bg-white shadow-sm sticky top-0 z-20 md:hidden">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
             <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-1 rounded-md text-slate-600 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-500" aria-label="Toggle sidebar">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
             </button>
            <h1 className="text-xl font-bold tracking-tight text-slate-800">Maestro Orchestrator</h1>
            <div></div>
          </div>
        </header>
        
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-y-auto">
          <div 
              id={`tabpanel-${activeTool.toLowerCase().replace(/\s+/g, '-')}`} 
              role="tabpanel" 
              aria-labelledby={activeTool}
          >
              {renderTool()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
