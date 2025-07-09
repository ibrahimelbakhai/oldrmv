import React, { useState, useEffect, useMemo } from 'react';
import { Project, ProjectTask, TeamMember, ProjectTaskStatus } from '../../types';
import PaginationControls from '../shared/PaginationControls';

interface TaskListProps {
  project: Project | null;
  tasks: ProjectTask[];
  members: TeamMember[];
  onAddTask: (title: string, description?: string, assigneeId?: string, dueDate?: string) => void;
  onUpdateTaskStatus: (taskId: string, status: ProjectTaskStatus) => void;
  onAssignTask: (taskId: string, assigneeId: string) => void;
}

const TaskList: React.FC<TaskListProps> = ({ project, tasks, members, onAddTask, onUpdateTaskStatus, onAssignTask }) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState<string>('');
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<ProjectTaskStatus | 'all'>('all');
  const [filterAssignee, setFilterAssignee] = useState<string | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  useEffect(() => {
    // Reset form and filters if project changes
    setNewTaskTitle('');
    setNewTaskDescription('');
    setNewTaskAssigneeId('');
    setNewTaskDueDate('');
    setShowCreateForm(false);
    setSearchTerm('');
    setFilterStatus('all');
    setFilterAssignee('all');
    setCurrentPage(1);
  }, [project]);

  useEffect(() => {
    setCurrentPage(1); // Reset page when filters or search term change
  }, [searchTerm, filterStatus, filterAssignee]);


  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) {
      alert("Task title cannot be empty.");
      return;
    }
    onAddTask(newTaskTitle, newTaskDescription, newTaskAssigneeId || undefined, newTaskDueDate || undefined);
    setNewTaskTitle('');
    setNewTaskDescription('');
    setNewTaskAssigneeId('');
    setNewTaskDueDate('');
    setShowCreateForm(false);
  };
  
  const getStatusColor = (status: ProjectTaskStatus): string => {
    switch(status) {
      case ProjectTaskStatus.TODO: return 'bg-slate-200 text-slate-700';
      case ProjectTaskStatus.IN_PROGRESS: return 'bg-blue-100 text-blue-700';
      case ProjectTaskStatus.REVIEW: return 'bg-purple-100 text-purple-700';
      case ProjectTaskStatus.COMPLETED: return 'bg-green-100 text-green-700';
      case ProjectTaskStatus.BLOCKED: return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const filteredAndSearchedTasks = useMemo(() => {
    let processedTasks = [...tasks];
    if (filterStatus !== 'all') {
      processedTasks = processedTasks.filter(task => task.status === filterStatus);
    }
    if (filterAssignee !== 'all') {
      processedTasks = processedTasks.filter(task => task.assigneeId === filterAssignee || (filterAssignee === 'unassigned' && !task.assigneeId));
    }
    if (searchTerm.trim() !== '') {
      const lowerSearch = searchTerm.toLowerCase();
      processedTasks = processedTasks.filter(task =>
        task.title.toLowerCase().includes(lowerSearch) ||
        (task.description && task.description.toLowerCase().includes(lowerSearch))
      );
    }
    return processedTasks.sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); // Sort by creation date asc
  }, [tasks, searchTerm, filterStatus, filterAssignee]);

  const totalPages = Math.ceil(filteredAndSearchedTasks.length / itemsPerPage);
  const displayedTasks = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSearchedTasks.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSearchedTasks, currentPage, itemsPerPage]);


  if (!project) {
    return <p className="text-slate-500 italic text-center py-4">Select a project to view its tasks, or create one in the 'Projects' tab.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h3 className="text-xl font-semibold text-slate-700">Tasks for: <span className="text-sky-600">{project.name}</span></h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-3 py-1.5 text-sm bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-md shadow-sm transition-colors"
        >
          {showCreateForm ? 'Cancel Create' : '+ New Task'}
        </button>
      </div>
      
      {showCreateForm && (
        <form onSubmit={handleAddTask} className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-3">
          {/* ... Create Task Form (unchanged) ... */}
          <h4 className="text-md font-semibold text-slate-600">Add New Task</h4>
          <div>
            <label htmlFor="new-task-title" className="block text-xs font-medium text-slate-500">Task Title</label>
            <input type="text" id="new-task-title" value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} required
                   className="mt-0.5 block w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm" />
          </div>
          <div>
            <label htmlFor="new-task-desc" className="block text-xs font-medium text-slate-500">Description (Optional)</label>
            <textarea id="new-task-desc" value={newTaskDescription} onChange={(e) => setNewTaskDescription(e.target.value)} rows={2}
                      className="mt-0.5 block w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
                <label htmlFor="new-task-assignee" className="block text-xs font-medium text-slate-500">Assignee (Optional)</label>
                <select id="new-task-assignee" value={newTaskAssigneeId} onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                        className="mt-0.5 block w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm">
                    <option value="">Unassigned</option>
                    {members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="new-task-due" className="block text-xs font-medium text-slate-500">Due Date (Optional)</label>
                <input type="date" id="new-task-due" value={newTaskDueDate} onChange={(e) => setNewTaskDueDate(e.target.value)}
                       className="mt-0.5 block w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm" />
            </div>
          </div>
          <button type="submit" className="w-full sm:w-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md shadow-sm text-sm">
            Add Task via AI
          </button>
        </form>
      )}

      {/* Search and Filter Controls */}
      <div className="my-4 p-4 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="md:col-span-1">
            <label htmlFor="task-search" className="block text-sm font-medium text-slate-600 mb-1">Search Tasks</label>
            <input
                type="text"
                id="task-search"
                placeholder="Search by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
            />
        </div>
        <div>
            <label htmlFor="task-filter-status" className="block text-sm font-medium text-slate-600 mb-1">Filter by Status</label>
            <select 
                id="task-filter-status"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as ProjectTaskStatus | 'all')}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
            >
                <option value="all">All Statuses</option>
                {Object.values(ProjectTaskStatus).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
        </div>
        <div>
            <label htmlFor="task-filter-assignee" className="block text-sm font-medium text-slate-600 mb-1">Filter by Assignee</label>
            <select 
                id="task-filter-assignee"
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
            >
                <option value="all">All Assignees</option>
                <option value="unassigned">Unassigned</option>
                {members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}
            </select>
        </div>
      </div>


      {displayedTasks.length === 0 && !showCreateForm ? (
        <p className="text-slate-500 italic text-center py-4">
          {filteredAndSearchedTasks.length === 0 && tasks.length > 0
           ? 'No tasks match your current search/filter criteria.'
           : 'No tasks for this project yet. Click "+ New Task" or use the Chat.'}
        </p>
      ) : (
        <div className="space-y-3">
          {displayedTasks.map(task => (
            <div key={task.id} className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="flex flex-wrap justify-between items-start gap-2">
                <div>
                    <h5 className="font-medium text-slate-800">{task.title}</h5>
                    {task.description && <p className="text-xs text-slate-500 mt-0.5 max-w-md">{task.description.substring(0,100)}{task.description.length > 100 && '...'}</p>}
                </div>
                <select
                    value={task.status}
                    onChange={(e) => onUpdateTaskStatus(task.id, e.target.value as ProjectTaskStatus)}
                    className={`text-xs px-2 py-1 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500 ${getStatusColor(task.status)} border-transparent`}
                    aria-label={`Status for task ${task.title}`}
                >
                    {Object.values(ProjectTaskStatus).map(status => (
                    <option key={status} value={status}>{status}</option>
                    ))}
                </select>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1 items-center">
                <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                {task.dueDate && <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>}
                <div className="flex items-center">
                    <span className="mr-1">Assignee:</span> 
                    <select 
                        value={task.assigneeId || ''}
                        onChange={(e) => onAssignTask(task.id, e.target.value)}
                        className="text-xs p-0.5 border-slate-300 rounded bg-white focus:ring-sky-500 focus:border-sky-500"
                        aria-label={`Assignee for task ${task.title}`}
                    >
                        <option value="">Unassigned</option>
                        {members.map(member => (
                            <option key={member.id} value={member.id}>{member.name}</option>
                        ))}
                    </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerPage}
        totalItems={filteredAndSearchedTasks.length}
        onItemsPerPageChange={setItemsPerPage}
      />
    </div>
  );
};

export default TaskList;
