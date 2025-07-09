
import React, { useState, useMemo, useEffect } from 'react';
import { SocialPostDraft, SocialPlatform, SocialPostStatus } from '../../types';
import PaginationControls from '../shared/PaginationControls';
import { marked } from 'marked';

interface DraftsAndScheduleViewProps {
  drafts: SocialPostDraft[];
  onUpdateDraft: (draftId: string, updates: Partial<SocialPostDraft>) => void;
  onDeleteDraft: (draftId: string) => void;
  // onEditDraft: (draftId: string) => void; // If direct editing UI is complex, could repopulate ContentCreation
}

const DraftsAndScheduleView: React.FC<DraftsAndScheduleViewProps> = ({ drafts, onUpdateDraft, onDeleteDraft }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlatform, setFilterPlatform] = useState<SocialPlatform | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<SocialPostStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [editingDraft, setEditingDraft] = useState<SocialPostDraft | null>(null);
  const [editedContent, setEditedContent] = useState('');


  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterPlatform, filterStatus]);
  
  useEffect(() => {
    if (editingDraft) {
      setEditedContent(editingDraft.content);
    } else {
      setEditedContent('');
    }
  }, [editingDraft]);


  const filteredAndSearchedDrafts = useMemo(() => {
    let processedDrafts = [...drafts];
    if (filterPlatform !== 'all') {
      processedDrafts = processedDrafts.filter(d => d.platform === filterPlatform);
    }
    if (filterStatus !== 'all') {
      processedDrafts = processedDrafts.filter(d => d.status === filterStatus);
    }
    if (searchTerm.trim() !== '') {
      const lowerSearch = searchTerm.toLowerCase();
      processedDrafts = processedDrafts.filter(d =>
        d.content.toLowerCase().includes(lowerSearch) ||
        (d.notes && d.notes.toLowerCase().includes(lowerSearch)) ||
        (d.hashtags && d.hashtags.join(' ').toLowerCase().includes(lowerSearch)) ||
        d.platform.toLowerCase().includes(lowerSearch)
      );
    }
    return processedDrafts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [drafts, searchTerm, filterPlatform, filterStatus]);

  const totalPages = Math.ceil(filteredAndSearchedDrafts.length / itemsPerPage);
  const displayedDrafts = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSearchedDrafts.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSearchedDrafts, currentPage, itemsPerPage]);

  const getStatusColor = (status: SocialPostStatus) => {
    switch(status) {
      case SocialPostStatus.DRAFT: return 'bg-slate-200 text-slate-700';
      case SocialPostStatus.READY_FOR_REVIEW: return 'bg-yellow-100 text-yellow-700';
      // case SocialPostStatus.SIMULATED_SCHEDULED: return 'bg-blue-100 text-blue-700';
      // case SocialPostStatus.SIMULATED_POSTED: return 'bg-green-100 text-green-700';
      case SocialPostStatus.ARCHIVED: return 'bg-gray-100 text-gray-600';
      default: return 'bg-slate-100';
    }
  };
  
  const renderMarkdown = (markdownText: string | null) => {
    if (!markdownText) return { __html: '' };
    try { return { __html: marked.parse(markdownText, { breaks: true, gfm: true }) }; } 
    catch (e) { console.error("Markdown parsing error:", e); return { __html: `<pre>${markdownText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`}; }
  };

  const handleStartEdit = (draft: SocialPostDraft) => {
    setEditingDraft(draft);
    setEditedContent(draft.content);
  };

  const handleSaveEdit = () => {
    if (editingDraft) {
      onUpdateDraft(editingDraft.id, { content: editedContent });
      setEditingDraft(null);
    }
  };
  

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-semibold text-slate-700">Social Media Post Drafts</h3>
      
      {/* Search and Filter Controls */}
      <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="md:col-span-1">
          <label htmlFor="draft-search" className="block text-sm font-medium text-slate-600 mb-1">Search Drafts</label>
          <input
            type="text"
            id="draft-search"
            placeholder="Search content, notes, hashtags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
          />
        </div>
        <div>
          <label htmlFor="draft-filter-platform" className="block text-sm font-medium text-slate-600 mb-1">Filter by Platform</label>
          <select
            id="draft-filter-platform"
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value as SocialPlatform | 'all')}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
          >
            <option value="all">All Platforms</option>
            {Object.values(SocialPlatform).map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="draft-filter-status" className="block text-sm font-medium text-slate-600 mb-1">Filter by Status</label>
          <select
            id="draft-filter-status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as SocialPostStatus | 'all')}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
          >
            <option value="all">All Statuses</option>
            {Object.values(SocialPostStatus).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {displayedDrafts.length === 0 ? (
        <p className="text-slate-500 italic text-center py-4">
          {filteredAndSearchedDrafts.length === 0 && searchTerm === '' && filterPlatform === 'all' && filterStatus === 'all'
           ? 'No drafts found. Create some in the "Content Creation" tab.'
           : 'No drafts match your current search or filter criteria.'}
        </p>
      ) : (
        <ul className="space-y-4">
          {displayedDrafts.map(draft => (
            <li key={draft.id} className="p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-medium text-sky-700">{draft.platform} Post</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full inline-block font-medium ${getStatusColor(draft.status)}`}>
                    {draft.status}
                  </span>
                </div>
                <div className="flex space-x-2 flex-shrink-0">
                    <select
                        value={draft.status}
                        onChange={(e) => onUpdateDraft(draft.id, { status: e.target.value as SocialPostStatus })}
                        className="text-xs px-2 py-1 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-sky-500"
                        aria-label={`Update status for draft ${draft.id}`}
                    >
                        {Object.values(SocialPostStatus).map(statusValue => (
                        <option key={statusValue} value={statusValue}>{statusValue}</option>
                        ))}
                    </select>
                    <button onClick={() => handleStartEdit(draft)} className="text-xs px-2 py-1 border border-sky-300 text-sky-600 hover:bg-sky-50 rounded">Edit Text</button>
                    <button onClick={() => onDeleteDraft(draft.id)} className="text-xs px-2 py-1 border border-red-300 text-red-600 hover:bg-red-50 rounded">Delete</button>
                </div>
              </div>

              {editingDraft && editingDraft.id === draft.id ? (
                <div className="my-2">
                    <textarea 
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        rows={5}
                        className="w-full p-2 border border-slate-300 rounded-md text-sm focus:ring-sky-500 focus:border-sky-500"
                    />
                    <div className="mt-2 flex gap-2">
                        <button onClick={handleSaveEdit} className="text-xs px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600">Save</button>
                        <button onClick={() => setEditingDraft(null)} className="text-xs px-3 py-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300">Cancel</button>
                    </div>
                </div>
              ) : (
                 <div className="prose prose-sm max-w-none text-slate-700 mt-1" dangerouslySetInnerHTML={renderMarkdown(draft.content)} />
              )}

              {draft.hashtags && draft.hashtags.length > 0 && (
                <p className="text-xs text-teal-600 mt-2">Hashtags: {draft.hashtags.map(h => `#${h}`).join(' ')}</p>
              )}
              {draft.mediaIdeas && draft.mediaIdeas.length > 0 && (
                <p className="text-xs text-purple-600 mt-1">Media Ideas: {draft.mediaIdeas.join(', ')}</p>
              )}
              {draft.notes && <p className="text-xs text-slate-500 mt-1 italic">Notes: {draft.notes}</p>}
              <p className="text-xs text-slate-400 mt-2">Last Updated: {new Date(draft.updatedAt).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerPage}
        totalItems={filteredAndSearchedDrafts.length}
        onItemsPerPageChange={setItemsPerPage}
      />
    </div>
  );
};

export default DraftsAndScheduleView;
