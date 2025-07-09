import React, { useState, useMemo, useEffect } from 'react';
import { TeamMember } from '../../types';
import PaginationControls from '../shared/PaginationControls';
// import * as projectDataService from '../../services/projectDataService'; 

interface MemberListProps {
  members: TeamMember[];
  onAddMember: (name: string, role?: string) => void;
}

const MemberList: React.FC<MemberListProps> = ({ members, onAddMember }) => {
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) {
      alert("Member name cannot be empty.");
      return;
    }
    onAddMember(newMemberName, newMemberRole);
    setNewMemberName('');
    setNewMemberRole('');
    setShowCreateForm(false);
  };

  const filteredAndSearchedMembers = useMemo(() => {
    let processedMembers = [...members];
    if (searchTerm.trim() !== '') {
      const lowerSearch = searchTerm.toLowerCase();
      processedMembers = processedMembers.filter(member =>
        member.name.toLowerCase().includes(lowerSearch) ||
        (member.role && member.role.toLowerCase().includes(lowerSearch))
      );
    }
    return processedMembers.sort((a,b) => a.name.localeCompare(b.name)); // Sort alphabetically
  }, [members, searchTerm]);

  const totalPages = Math.ceil(filteredAndSearchedMembers.length / itemsPerPage);
  const displayedMembers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSearchedMembers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSearchedMembers, currentPage, itemsPerPage]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
        <h3 className="text-xl font-semibold text-slate-700">Team Members</h3>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="w-full sm:w-auto px-3 py-1.5 text-sm bg-sky-500 hover:bg-sky-600 text-white font-medium rounded-md shadow-sm transition-colors"
        >
          {showCreateForm ? 'Cancel Create' : '+ Add Member'}
        </button>
      </div>

      {showCreateForm && (
        <form onSubmit={handleAddMember} className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-3">
          {/* ... Create Member Form (unchanged) ... */}
          <h4 className="text-md font-semibold text-slate-600">Add New Team Member</h4>
          <div>
            <label htmlFor="new-member-name" className="block text-xs font-medium text-slate-500">Member Name</label>
            <input
              type="text"
              id="new-member-name"
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              required
              className="mt-0.5 block w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="new-member-role" className="block text-xs font-medium text-slate-500">Role (Optional)</label>
            <input
              type="text"
              id="new-member-role"
              value={newMemberRole}
              onChange={(e) => setNewMemberRole(e.target.value)}
              className="mt-0.5 block w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
              placeholder="e.g., Developer, Designer"
            />
          </div>
          <button type="submit" className="w-full sm:w-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md shadow-sm text-sm">
            Add Member via AI
          </button>
        </form>
      )}
      
      {/* Search for Members */}
      <div className="my-4">
          <label htmlFor="member-search" className="sr-only">Search Members</label>
          <input
            type="text"
            id="member-search"
            placeholder="Search members by name or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
          />
      </div>

      {displayedMembers.length === 0 && !showCreateForm ? (
        <p className="text-slate-500 italic text-center py-4">
            {filteredAndSearchedMembers.length === 0 && searchTerm === ''
            ? 'No team members added yet. Click "+ Add Member" or use the Chat.'
            : 'No members match your search.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {displayedMembers.map(member => (
            <li key={member.id} className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm flex justify-between items-center">
              <div>
                <h5 className="font-medium text-slate-800">{member.name}</h5>
                {member.role && <p className="text-xs text-slate-500">{member.role}</p>}
                 <p className="text-xs text-slate-400 mt-0.5">Joined: {new Date(member.createdAt).toLocaleDateString()}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          totalItems={filteredAndSearchedMembers.length}
          onItemsPerPageChange={setItemsPerPage}
        />
    </div>
  );
};

export default MemberList;
