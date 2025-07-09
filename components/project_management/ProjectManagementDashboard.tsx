
import React, { useState, useEffect, useCallback } from 'react';
import { Project, ProjectTask, TeamMember, AgentDefinition, ProjectTaskStatus, AgentTaskStatus, AgentStep } from '../../types';
import { generateContentInternal, LLMServiceResponse, GenerateContentOptionsInternal } from '../../services/llmService';
import * as projectDataService from '../../services/projectDataService';
import { saveTaskExecutionRecord, calculateApproxTokens } from '../../services/analyticsService';
import { GEMINI_AGENT_DEFINITIONS_LS_KEY } from '../../constants';

import SectionCard from '../shared/SectionCard';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorDisplay from '../shared/ErrorDisplay';
import ProjectList from './ProjectList';
import TaskList from './TaskList';
import MemberList from './MemberList';

const PM_AGENT_ID = 'predef_project_manager_ai';

type ActivePMView = 'projects' | 'tasks' | 'members' | 'chat';

const ProjectManagementDashboard: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<ProjectTask[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  
  const [pmAgent, setPmAgent] = useState<AgentDefinition | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true); 
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false); 
  const [error, setError] = useState<string | null>(null);
  
  const [chatInput, setChatInput] = useState<string>('');
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'ai', text: string }[]>([]);
  const [activeView, setActiveView] = useState<ActivePMView>('projects');


  const loadData = useCallback(() => {
    setIsLoading(true);
    try {
      setProjects(projectDataService.getProjects());
      setTasks(projectDataService.getTasks());
      setMembers(projectDataService.getMembers());
      
      const storedAgentsString = localStorage.getItem(GEMINI_AGENT_DEFINITIONS_LS_KEY);
      if (storedAgentsString) {
        const allAgents: AgentDefinition[] = JSON.parse(storedAgentsString);
        const agent = allAgents.find(a => a.id === PM_AGENT_ID);
        if (agent) {
          setPmAgent(agent);
        } else {
          setError(`Project Manager AI Agent (ID: ${PM_AGENT_ID}) not found. Please check Agent Management.`);
        }
      } else {
        setError("Agent definitions not found. Please visit Agent Management.");
      }
    } catch (e) {
      console.error("Error loading project data or PM Agent:", e);
      setError("Failed to load project data or Project Manager AI Agent.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const findAgentStepByName = (stepName: string): AgentStep | undefined => { 
    return pmAgent?.steps.find(s => s.name.toLowerCase() === stepName.toLowerCase());
  };

  const handleAiInteraction = async (userInput: string, explicitStepName?: string): Promise<string | null> => {
    if (!pmAgent) {
      setError("Project Manager AI Agent is not available.");
      return null;
    }
    setIsAiLoading(true);
    setError(null);
    setChatMessages(prev => [...prev, { sender: 'user', text: userInput }]);

    let targetStep = explicitStepName ? findAgentStepByName(explicitStepName) : undefined;
    if (!targetStep) {
        if (userInput.toLowerCase().includes("create project")) targetStep = findAgentStepByName("CreateProject");
        else if (userInput.toLowerCase().includes("add task")) targetStep = findAgentStepByName("AddTaskToProject");
        else if (userInput.toLowerCase().includes("update task") || userInput.toLowerCase().includes("set status")) targetStep = findAgentStepByName("UpdateTaskStatus");
        else if (userInput.toLowerCase().includes("add member") || userInput.toLowerCase().includes("add team member")) targetStep = findAgentStepByName("AddTeamMember");
        else if (userInput.toLowerCase().includes("list projects")) targetStep = findAgentStepByName("ListProjects");
        else if (userInput.toLowerCase().includes("list tasks")) targetStep = findAgentStepByName("ListTasksForProject");
        else if (userInput.toLowerCase().includes("list members") || userInput.toLowerCase().includes("list team")) targetStep = findAgentStepByName("ListTeamMembers");
        else targetStep = pmAgent.steps.find(s => s.name === 'CreateProject') || pmAgent.steps[0]; // Fallback
    }
    
    if (!targetStep) {
        setError("Could not determine the appropriate action for the Project Manager AI Agent.");
        setIsAiLoading(false);
        setChatMessages(prev => [...prev, {sender: 'ai', text: "Sorry, I couldn't understand that action."}]);
        return null;
    }

    const promptForAI = targetStep.instruction.replace("{{userInput}}", userInput);
    const startedAt = new Date().toISOString();

    const options: GenerateContentOptionsInternal = {
        prompt: promptForAI,
        model: targetStep.model,
        providerType: targetStep.providerType,
        apiEndpoint: targetStep.apiEndpoint,
        apiKey: targetStep.apiKey,
        systemInstruction: pmAgent.globalSystemInstruction, // Use agent's global system instruction
        agentId: pmAgent.id,
        stepId: targetStep.id,
        temperature: targetStep.temperature,
        topK: targetStep.topK,
        topP: targetStep.topP,
        isJsonOutput: targetStep.isJsonOutput,
        disableThinking: targetStep.disableThinking,
    };

    const response: LLMServiceResponse = await generateContentInternal(options);

    setIsAiLoading(false);
    const approxInputTokens = calculateApproxTokens(response.requestOptions?.prompt || promptForAI);
    let taskStatus = AgentTaskStatus.COMPLETED;
    let taskError: string | undefined = undefined;

    if (response.error) {
      setError(response.error);
      setChatMessages(prev => [...prev, { sender: 'ai', text: `Error: ${response.error}` }]);
      taskStatus = AgentTaskStatus.FAILED;
      taskError = response.error;
    } else if (response.text) {
      setChatMessages(prev => [...prev, { sender: 'ai', text: response.text! }]);
      parseAndProcessAiResponse(response.text!, userInput, targetStep.name);
    } else {
      setError("AI returned no response.");
      setChatMessages(prev => [...prev, { sender: 'ai', text: "Sorry, I didn't get a response." }]);
      taskStatus = AgentTaskStatus.FAILED;
      taskError = "AI returned no response.";
    }
    
    saveTaskExecutionRecord({
      agentId: pmAgent.id, agentName: pmAgent.name,
      stepId: targetStep.id, stepName: targetStep.name,
      status: taskStatus, startedAt, completedAt: new Date().toISOString(),
      inputSummary: `Cmd: ${userInput.substring(0, 100)}...`,
      outputSummary: response.text ? response.text.substring(0, 150) + "..." : undefined,
      error: taskError,
      approxInputTokens, approxOutputTokens: calculateApproxTokens(response.text || ""),
    });
    return response.text;
  };

  const parseAndProcessAiResponse = (aiResponse: string, originalUserInput: string, stepName: string) => {
    const lowerResponse = aiResponse.toLowerCase();
    let refreshNeeded = false;

    try {
        if (stepName === 'CreateProject' && lowerResponse.includes('project') && (lowerResponse.includes('created') || lowerResponse.includes('create'))) {
            const nameMatch = originalUserInput.match(/project named ['"](.*?)['"]/i) || 
                              originalUserInput.match(/project ['"](.*?)['"]/i) ||
                              aiResponse.match(/project ['"](.*?)['"]/i);
            if (nameMatch && nameMatch[1]) {
                const descMatch = originalUserInput.match(/description ['"](.*?)['"]/i);
                projectDataService.addProject({ name: nameMatch[1], description: descMatch ? descMatch[1] : "Created by AI" });
                refreshNeeded = true;
            }
        } else if (stepName === 'AddTaskToProject' && lowerResponse.includes('task') && (lowerResponse.includes('added') || lowerResponse.includes('add'))) {
            const taskTitleMatch = originalUserInput.match(/task ['"](.*?)['"]/i) || aiResponse.match(/task ['"](.*?)['"]/i);
            const projectNameMatch = originalUserInput.match(/to project ['"](.*?)['"]/i) || aiResponse.match(/to project ['"](.*?)['"]/i);
            let currentProjectId = selectedProjectId;

            if(projectNameMatch && projectNameMatch[1]){
                const foundProject = projects.find(p => p.name.toLowerCase() === projectNameMatch[1].toLowerCase().trim());
                if(foundProject) currentProjectId = foundProject.id;
                else { 
                    if(!currentProjectId) {
                        console.warn(`Project "${projectNameMatch[1]}" not found for adding task. Task might be added to currently selected or not at all.`);
                    }
                }
            }
            if (taskTitleMatch && taskTitleMatch[1] && currentProjectId) {
                const descMatch = originalUserInput.match(/description ['"](.*?)['"]/i);
                projectDataService.addTask({ projectId: currentProjectId, title: taskTitleMatch[1], description: descMatch ? descMatch[1] : "Added by AI" });
                refreshNeeded = true;
            }
        } else if (stepName === 'UpdateTaskStatus' && lowerResponse.includes('task') && lowerResponse.includes('status') && lowerResponse.includes('updated')) {
            const taskTitleMatch = originalUserInput.match(/task ['"](.*?)['"]/i) || aiResponse.match(/task ['"](.*?)['"]/i);
            const statusMatch = originalUserInput.match(/to status ['"](.*?)['"]/i) || aiResponse.match(/status to ['"](.*?)['"]/i) || aiResponse.match(/updated to ['"](.*?)['"]/i);
            
            if (taskTitleMatch && taskTitleMatch[1] && statusMatch && statusMatch[1]) {
                const taskToUpdate = tasks.find(t => t.title.toLowerCase() === taskTitleMatch[1].toLowerCase().trim() && t.projectId === selectedProjectId);
                const newStatusKey = Object.keys(ProjectTaskStatus).find(key => 
                    ProjectTaskStatus[key as keyof typeof ProjectTaskStatus].toLowerCase() === statusMatch[1].toLowerCase().trim() ||
                    key.toLowerCase() === statusMatch[1].toLowerCase().trim()
                );
                const newStatus = newStatusKey ? ProjectTaskStatus[newStatusKey as keyof typeof ProjectTaskStatus] : undefined;

                if (taskToUpdate && newStatus) {
                    projectDataService.updateTask(taskToUpdate.id, { status: newStatus });
                    refreshNeeded = true;
                } else {
                    console.warn("Could not update task: Task or new status not clearly identified.", {taskTitleMatch, statusMatch, taskToUpdate, newStatus});
                }
            }
        } else if (stepName === 'AddTeamMember' && lowerResponse.includes('member') && (lowerResponse.includes('added') || lowerResponse.includes('add'))) {
            const nameMatch = originalUserInput.match(/member ['"](.*?)['"]/i) || aiResponse.match(/member ['"](.*?)['"]/i);
            if (nameMatch && nameMatch[1]) {
                const roleMatch = originalUserInput.match(/role ['"](.*?)['"]/i);
                projectDataService.addMember({ name: nameMatch[1], role: roleMatch ? roleMatch[1] : "Team Member" });
                refreshNeeded = true;
            }
        }
    } catch (e) {
        console.error("Error processing AI response for data update:", e);
    }

    if (refreshNeeded) {
      loadData(); 
    }
  };
  
  const handleChatSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim()) return;
    handleAiInteraction(chatInput);
    setChatInput('');
  };

  const tasksForSelectedProject = selectedProjectId ? tasks.filter(t => t.projectId === selectedProjectId) : [];

  const renderCurrentView = () => {
    switch (activeView) {
      case 'projects':
        return <ProjectList 
                    projects={projects} 
                    onSelectProject={(id) => { setSelectedProjectId(id); setActiveView('tasks');}} 
                    onCreateProject={async (name, description) => {
                        await handleAiInteraction(`Create a new project named "${name}" with description "${description||''}".`, 'CreateProject');
                    }}
                />;
      case 'tasks':
        const project = projects.find(p => p.id === selectedProjectId);
        return <TaskList 
                    project={project || null}
                    tasks={tasksForSelectedProject}
                    members={members}
                    onAddTask={async (title, description, assigneeId, dueDate) => {
                         if(!selectedProjectId) return;
                         const proj = projects.find(p=>p.id === selectedProjectId);
                         const memberName = assigneeId ? members.find(m=>m.id === assigneeId)?.name : '';
                         await handleAiInteraction(`Add task "${title}" to project "${proj?.name}". Description: "${description||''}". ${memberName ? `Assign to ${memberName}.` : ''} ${dueDate ? `Due date: ${dueDate}.` : ''}`, 'AddTaskToProject');
                    }}
                    onUpdateTaskStatus={async (taskId, status) => {
                        const task = tasks.find(t=>t.id === taskId);
                        await handleAiInteraction(`Update task "${task?.title}" to status "${status}".`, 'UpdateTaskStatus');
                    }}
                    onAssignTask={async (taskId, assigneeId) => {
                        const task = tasks.find(t => t.id === taskId);
                        const member = members.find(m => m.id === assigneeId);
                        if (task && member) {
                            await handleAiInteraction(`Assign task "${task.title}" to member "${member.name}".`, 'AssignTaskToMember');
                        } else if (task && !assigneeId) { 
                            await handleAiInteraction(`Unassign task "${task.title}".`, 'AssignTaskToMember'); 
                        }
                    }}
                 />;
      case 'members':
        return <MemberList 
                    members={members}
                    onAddMember={async (name, role) => {
                        await handleAiInteraction(`Add team member "${name}" with role "${role||''}".`, 'AddTeamMember');
                    }}
                />;
      case 'chat':
         return (
            <div className="mt-4">
                <h3 className="text-lg font-semibold text-slate-700 mb-2">Chat with Project Manager AI</h3>
                <div className="h-64 overflow-y-auto border border-slate-300 p-3 rounded-md bg-slate-50 mb-3 space-y-2">
                    {chatMessages.map((msg, index) => (
                        <div key={index} className={`p-2 rounded-lg max-w-[85%] ${msg.sender === 'user' ? 'bg-sky-100 text-sky-800 self-end ml-auto' : 'bg-slate-200 text-slate-800 self-start mr-auto'}`}>
                            <span className="font-medium">{msg.sender === 'user' ? 'You' : 'PM AI'}: </span>{msg.text}
                        </div>
                    ))}
                    {isAiLoading && <div className="text-center"><LoadingSpinner/></div>}
                </div>
                <form onSubmit={handleChatSubmit} className="flex space-x-2">
                    <input 
                        type="text" 
                        value={chatInput} 
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="e.g., Create project 'New Initiative'"
                        className="flex-grow px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                    />
                    <button type="submit" disabled={isAiLoading || !chatInput.trim()} className="bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm disabled:opacity-50">
                        Send
                    </button>
                </form>
            </div>
         );
      default: return <ProjectList projects={projects} onSelectProject={setSelectedProjectId} onCreateProject={async (name) => await handleAiInteraction(`Create project ${name}`, 'CreateProject')} />;
    }
  }

  if (isLoading && !pmAgent) {
    return <SectionCard title="Project Management"><LoadingSpinner /><p>Loading Project Management AI and data...</p></SectionCard>;
  }
  if (error && !pmAgent) {
    return <SectionCard title="Project Management"><ErrorDisplay message={error} /></SectionCard>;
  }

  return (
    <SectionCard title="AI Project Management">
        <div className="mb-4 border-b border-slate-200">
            <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto">
                {(['projects', 'tasks', 'members', 'chat'] as ActivePMView[]).map(view => (
                    <button 
                        key={view}
                        onClick={() => setActiveView(view)}
                        disabled={view === 'tasks' && !selectedProjectId}
                        className={`px-3 py-2 font-medium text-sm rounded-t-md capitalize transition-colors whitespace-nowrap
                            ${activeView === view 
                                ? 'bg-sky-100 text-sky-700 border-sky-300 border-t border-x' 
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}
                            ${view === 'tasks' && !selectedProjectId ? 'opacity-50 cursor-not-allowed' : ''}
                        `}
                    >
                        {view}
                    </button>
                ))}
            </nav>
        </div>
        
        {error && <ErrorDisplay message={error} />}
        {isAiLoading && activeView !== 'chat' && <div className="my-4"><LoadingSpinner /> <p className="text-center text-sm text-slate-500">AI Processing...</p></div>}
        
        {renderCurrentView()}

        <div className="mt-6 p-3 bg-slate-50 rounded-md text-xs text-slate-500">
            <p><strong>Tip:</strong> Use the 'Chat' tab to interact directly with the Project Manager AI. For example, type "Create a project named 'My New Project'", or "List all tasks for 'My New Project' that are 'To Do'". The AI will attempt to perform the action and update the data shown in other tabs.</p>
        </div>
    </SectionCard>
  );
};

export default ProjectManagementDashboard;
