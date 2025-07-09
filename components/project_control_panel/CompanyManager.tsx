
import React, { useState } from 'react';
import { PCPCompany } from '../../types';

interface CompanyManagerProps {
  companies: PCPCompany[];
  selectedCompanyId: string | null;
  onSelectCompany: (companyId: string | null) => void;
  onCreateCompany: (name: string) => PCPCompany;
}

const CompanyManager: React.FC<CompanyManagerProps> = ({ 
  companies, 
  selectedCompanyId, 
  onSelectCompany, 
  onCreateCompany 
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newCompanyName.trim()) {
      setCreateError("Company name cannot be empty.");
      return;
    }
    try {
      const newCompany = onCreateCompany(newCompanyName);
      onSelectCompany(newCompany.id); // Automatically select the new company
      setNewCompanyName('');
      setShowCreateForm(false);
      setCreateError(null);
    } catch (e: any) {
      setCreateError(e.message || "Failed to create company.");
    }
  };

  return (
    <div className="p-4 bg-white shadow-md rounded-lg">
      <h2 className="text-xl font-semibold text-slate-700 mb-4">1. Select or Create Company</h2>
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <div className="flex-grow">
          <label htmlFor="company-select" className="block text-sm font-medium text-slate-700 mb-1">
            Select Company:
          </label>
          <select
            id="company-select"
            value={selectedCompanyId || ''}
            onChange={(e) => onSelectCompany(e.target.value || null)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
          >
            <option value="">-- Select a Company --</option>
            {companies.map(company => (
              <option key={company.id} value={company.id}>{company.name}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => { setShowCreateForm(!showCreateForm); setCreateError(null); setNewCompanyName(''); }}
          className="flex-shrink-0 px-4 py-2 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-md shadow-sm transition-colors"
        >
          {showCreateForm ? 'Cancel Create' : 'Create New Company'}
        </button>
      </div>

      {showCreateForm && (
        <div className="mt-4 p-3 border border-slate-200 rounded-md bg-slate-50 space-y-3">
          <h3 className="text-md font-medium text-slate-600">Create New Company</h3>
          <div>
            <label htmlFor="new-company-name" className="block text-xs font-medium text-slate-500">Company Name:</label>
            <input
              type="text"
              id="new-company-name"
              value={newCompanyName}
              onChange={(e) => setNewCompanyName(e.target.value)}
              placeholder="Enter new company name"
              className="mt-1 w-full sm:w-1/2 px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
            />
          </div>
          {createError && <p className="text-xs text-red-500">{createError}</p>}
          <button
            onClick={handleCreate}
            className="px-4 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md shadow-sm"
          >
            Save Company
          </button>
        </div>
      )}
    </div>
  );
};

export default CompanyManager;
