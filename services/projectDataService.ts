
import { Project, ProjectTask, TeamMember, ProjectTaskStatus } from '../types';
import { PROJECT_DATA_LS_KEY, TASK_DATA_LS_KEY, MEMBER_DATA_LS_KEY } from '../constants';

const generateLocalId = (prefix: string) => `${prefix}_${new Date().getTime()}_${Math.random().toString(36).substr(2, 9)}`;

// --- Project Functions ---
export const getProjects = (): Project[] => {
  try {
    const stored = localStorage.getItem(PROJECT_DATA_LS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Error getting projects:", e);
    return [];
  }
};

export const addProject = (projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project => {
  const projects = getProjects();
  const newProject: Project = {
    ...projectData,
    id: generateLocalId('proj'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  projects.push(newProject);
  localStorage.setItem(PROJECT_DATA_LS_KEY, JSON.stringify(projects));
  return newProject;
};

export const getProjectById = (id: string): Project | undefined => {
  return getProjects().find(p => p.id === id);
};

export const updateProject = (id: string, updates: Partial<Omit<Project, 'id' | 'createdAt'>>): Project | null => {
  const projects = getProjects();
  const index = projects.findIndex(p => p.id === id);
  if (index === -1) return null;
  projects[index] = { ...projects[index], ...updates, updatedAt: new Date().toISOString() };
  localStorage.setItem(PROJECT_DATA_LS_KEY, JSON.stringify(projects));
  return projects[index];
};

export const deleteProject = (id: string): boolean => {
  let projects = getProjects();
  const initialLength = projects.length;
  projects = projects.filter(p => p.id !== id);
  if (projects.length < initialLength) {
    localStorage.setItem(PROJECT_DATA_LS_KEY, JSON.stringify(projects));
    // Also delete associated tasks
    let tasks = getTasks();
    tasks = tasks.filter(t => t.projectId !== id);
    localStorage.setItem(TASK_DATA_LS_KEY, JSON.stringify(tasks));
    return true;
  }
  return false;
};

// --- Task Functions ---
export const getTasks = (): ProjectTask[] => {
  try {
    const stored = localStorage.getItem(TASK_DATA_LS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Error getting tasks:", e);
    return [];
  }
};

export const getTasksForProject = (projectId: string): ProjectTask[] => {
  return getTasks().filter(task => task.projectId === projectId);
};

export const addTask = (taskData: Omit<ProjectTask, 'id' | 'createdAt' | 'updatedAt' | 'status'>): ProjectTask => {
  const tasks = getTasks();
  const newTask: ProjectTask = {
    ...taskData,
    id: generateLocalId('task'),
    status: ProjectTaskStatus.TODO,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  tasks.push(newTask);
  localStorage.setItem(TASK_DATA_LS_KEY, JSON.stringify(tasks));
  return newTask;
};

export const getTaskById = (id: string): ProjectTask | undefined => {
  return getTasks().find(t => t.id === id);
};

export const updateTask = (id: string, updates: Partial<Omit<ProjectTask, 'id' | 'projectId' | 'createdAt'>>): ProjectTask | null => {
  const tasks = getTasks();
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) return null;
  tasks[index] = { ...tasks[index], ...updates, updatedAt: new Date().toISOString() };
  localStorage.setItem(TASK_DATA_LS_KEY, JSON.stringify(tasks));
  return tasks[index];
};

export const deleteTask = (id: string): boolean => {
  let tasks = getTasks();
  const initialLength = tasks.length;
  tasks = tasks.filter(t => t.id !== id);
  if (tasks.length < initialLength) {
    localStorage.setItem(TASK_DATA_LS_KEY, JSON.stringify(tasks));
    return true;
  }
  return false;
};


// --- Member Functions ---
export const getMembers = (): TeamMember[] => {
  try {
    const stored = localStorage.getItem(MEMBER_DATA_LS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Error getting members:", e);
    return [];
  }
};

export const addMember = (memberData: Omit<TeamMember, 'id' | 'createdAt'>): TeamMember => {
  const members = getMembers();
  const newMember: TeamMember = {
    ...memberData,
    id: generateLocalId('member'),
    createdAt: new Date().toISOString(),
  };
  members.push(newMember);
  localStorage.setItem(MEMBER_DATA_LS_KEY, JSON.stringify(members));
  return newMember;
};

export const getMemberById = (id: string): TeamMember | undefined => {
  return getMembers().find(m => m.id === id);
};

// Update and Delete for members can be added if needed following similar patterns.
export const deleteMember = (id: string): boolean => {
    let members = getMembers();
    const initialLength = members.length;
    members = members.filter(m => m.id !== id);
    if (members.length < initialLength) {
        localStorage.setItem(MEMBER_DATA_LS_KEY, JSON.stringify(members));
        // Unassign tasks from this member
        let tasks = getTasks();
        tasks = tasks.map(t => t.assigneeId === id ? { ...t, assigneeId: undefined } : t);
        localStorage.setItem(TASK_DATA_LS_KEY, JSON.stringify(tasks));
        return true;
    }
    return false;
};
