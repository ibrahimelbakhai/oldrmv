
import React, { useState, useEffect } from 'react';
import { PlatformCredential, SocialPlatform } from '../../types';

interface PlatformCredentialsViewProps {
  credentials: PlatformCredential[];
  onSaveCredential: (credential: PlatformCredential) => void;
  onDeleteCredential: (credentialId: string) => void;
}

const PlatformCredentialsView: React.FC<PlatformCredentialsViewProps> = ({ credentials, onSaveCredential, onDeleteCredential }) => {
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | ''>('');
  const [displayName, setDisplayName] = useState('');
  const [handleOrProfileId, setHandleOrProfileId] = useState('');
  const [apiKeyPlaceholder, setApiKeyPlaceholder] = useState('');
  const [notes, setNotes] = useState('');
  const [editingCredentialId, setEditingCredentialId] = useState<string | null>(null);

  useEffect(() => {
    if (editingCredentialId) {
      const credToEdit = credentials.find(c => c.id === editingCredentialId);
      if (credToEdit) {
        setSelectedPlatform(credToEdit.platform);
        setDisplayName(credToEdit.displayName);
        setHandleOrProfileId(credToEdit.handleOrProfileId || '');
        setApiKeyPlaceholder(credToEdit.apiKeyPlaceholder || '');
        setNotes(credToEdit.notes || '');
      }
    } else {
      resetForm();
    }
  }, [editingCredentialId, credentials]);

  const resetForm = () => {
    setSelectedPlatform('');
    setDisplayName('');
    setHandleOrProfileId('');
    setApiKeyPlaceholder('');
    setNotes('');
    setEditingCredentialId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlatform || !displayName.trim()) {
      alert("Platform and Display Name are required.");
      return;
    }
    const credToSave: any = {
      platform: selectedPlatform,
      displayName: displayName.trim(),
      handleOrProfileId: handleOrProfileId.trim() || undefined,
      apiKeyPlaceholder: apiKeyPlaceholder.trim() || undefined, // Storing placeholders
      notes: notes.trim() || undefined,
    };
    if(editingCredentialId) {
        credToSave.id = editingCredentialId;
    }

    onSaveCredential(credToSave as PlatformCredential);
    resetForm();
  };

  return (
    <div className="space-y-6">
      <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-md text-yellow-700">
        <h4 className="font-bold">Important Security Notice:</h4>
        <p className="text-sm">
          This section is for conceptual credential management. <strong>DO NOT enter real API keys, access tokens, or passwords here.</strong> 
          Storing sensitive credentials directly in a client-side application is highly insecure.
          This feature is for demonstration purposes, allowing the AI to use contextual information like a social media handle or profile ID in its prompts (e.g., "Draft a tweet for @YourHandle").
          Actual social media platform interactions (posting, fetching live data) are not implemented.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-4">
        <h3 className="text-lg font-semibold text-slate-700">{editingCredentialId ? 'Edit' : 'Add New'} Conceptual Platform Setup</h3>
        <div>
          <label htmlFor="platform-select" className="block text-sm font-medium text-slate-600">Social Platform</label>
          <select
            id="platform-select"
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value as SocialPlatform | '')}
            required
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
            disabled={!!editingCredentialId}
          >
            <option value="" disabled>-- Select Platform --</option>
            {Object.values(SocialPlatform).map(platform => (
              <option key={platform} value={platform}>{platform}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="platform-display-name" className="block text-sm font-medium text-slate-600">Display Name</label>
          <input
            type="text"
            id="platform-display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            placeholder="e.g., My Personal Twitter, Company LinkedIn"
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
          />
           <p className="text-xs text-slate-400 mt-0.5">A friendly name to identify this setup (e.g., "Personal Twitter Account").</p>
        </div>
        <div>
          <label htmlFor="platform-handle" className="block text-sm font-medium text-slate-600">Handle / Profile ID (Optional)</label>
          <input
            type="text"
            id="platform-handle"
            value={handleOrProfileId}
            onChange={(e) => setHandleOrProfileId(e.target.value)}
            placeholder="e.g., @YourUsername, your-linkedin-profile"
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
          />
          <p className="text-xs text-slate-400 mt-0.5">Used by AI for context (e.g., "Draft a post for @handle...").</p>
        </div>
        <div>
          <label htmlFor="platform-apikey-placeholder" className="block text-sm font-medium text-slate-600">Conceptual API Key Placeholder (Optional)</label>
          <input
            type="text" // Changed from password for conceptual clarity, still not for real keys
            id="platform-apikey-placeholder"
            value={apiKeyPlaceholder}
            onChange={(e) => setApiKeyPlaceholder(e.target.value)}
            placeholder="DO NOT ENTER REAL KEYS"
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
          />
          <p className="text-xs text-slate-400 mt-0.5">For demonstration only. AI won't use this value for API calls.</p>
        </div>
         <div>
          <label htmlFor="platform-notes" className="block text-sm font-medium text-slate-600">Notes (Optional)</label>
          <textarea
            id="platform-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Any notes for this setup, e.g., purpose, content themes."
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
          />
        </div>
        <div className="flex space-x-3">
            <button type="submit" className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded-md shadow-sm text-sm">
            {editingCredentialId ? 'Update Setup' : 'Save Setup'}
            </button>
            {editingCredentialId && (
                <button type="button" onClick={resetForm} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-md shadow-sm text-sm">
                    Cancel Edit
                </button>
            )}
        </div>
      </form>

      <div className="mt-8">
        <h3 className="text-lg font-semibold text-slate-700 mb-3">Current Conceptual Setups</h3>
        {credentials.length === 0 ? (
          <p className="text-slate-500 italic">No conceptual platform setups configured yet.</p>
        ) : (
          <ul className="space-y-3">
            {credentials.map(cred => (
              <li key={cred.id} className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                <div className="flex justify-between items-start">
                    <div>
                        <h4 className="font-medium text-sky-700">{cred.displayName} <span className="text-xs text-slate-500">({cred.platform})</span></h4>
                        {cred.handleOrProfileId && <p className="text-sm text-slate-600">Handle/ID: {cred.handleOrProfileId}</p>}
                        {cred.apiKeyPlaceholder && <p className="text-xs text-slate-500 italic">API Key Placeholder: Set</p>}
                        {cred.notes && <p className="text-xs text-slate-500 mt-1">Notes: {cred.notes}</p>}
                         <p className="text-xs text-slate-400 mt-1">Last Updated: {new Date(cred.lastUpdated).toLocaleString()}</p>
                    </div>
                    <div className="flex space-x-2 flex-shrink-0">
                        <button onClick={() => setEditingCredentialId(cred.id)} className="text-xs px-2 py-1 border border-sky-300 text-sky-600 hover:bg-sky-50 rounded">Edit</button>
                        <button onClick={() => onDeleteCredential(cred.id)} className="text-xs px-2 py-1 border border-red-300 text-red-600 hover:bg-red-50 rounded">Delete</button>
                    </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PlatformCredentialsView;
