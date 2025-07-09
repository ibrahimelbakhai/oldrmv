
import { PlatformCredential, SocialPostDraft, SocialPlatform, SocialPostStatus } from '../types';
import { SOCIAL_PLATFORM_CREDENTIALS_LS_KEY, SOCIAL_POST_DRAFTS_LS_KEY } from '../constants';

const generateLocalId = (prefix: string) => `${prefix}_${new Date().getTime()}_${Math.random().toString(36).substr(2, 9)}`;

// --- Platform Credential Functions (Conceptual) ---
export const getPlatformCredentials = (): PlatformCredential[] => {
  try {
    const stored = localStorage.getItem(SOCIAL_PLATFORM_CREDENTIALS_LS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Error getting platform credentials:", e);
    return [];
  }
};

export const savePlatformCredential = (credential: Omit<PlatformCredential, 'id' | 'lastUpdated'> & { id?: string }): PlatformCredential => {
  const credentials = getPlatformCredentials();
  const now = new Date().toISOString();
  
  if (credential.id) { // Update existing
    const index = credentials.findIndex(c => c.id === credential.id);
    if (index > -1) {
      credentials[index] = { ...credentials[index], ...credential, lastUpdated: now };
      localStorage.setItem(SOCIAL_PLATFORM_CREDENTIALS_LS_KEY, JSON.stringify(credentials));
      return credentials[index];
    }
  }
  // Add new
  const newCredential: PlatformCredential = {
    ...credential,
    id: credential.id || credential.platform + "_" + generateLocalId('cred'), // Use platform as part of ID or generate new
    lastUpdated: now,
  };
  credentials.push(newCredential);
  localStorage.setItem(SOCIAL_PLATFORM_CREDENTIALS_LS_KEY, JSON.stringify(credentials));
  return newCredential;
};

export const getPlatformCredentialById = (id: string): PlatformCredential | undefined => {
  return getPlatformCredentials().find(c => c.id === id);
};
export const getPlatformCredentialByPlatform = (platform: SocialPlatform): PlatformCredential | undefined => {
  // This might need adjustment if multiple credentials per platform are allowed.
  // For now, assumes one conceptual credential set per platform type, or user manages via displayName.
  return getPlatformCredentials().find(c => c.platform === platform);
};


export const deletePlatformCredential = (id: string): boolean => {
  let credentials = getPlatformCredentials();
  const initialLength = credentials.length;
  credentials = credentials.filter(c => c.id !== id);
  if (credentials.length < initialLength) {
    localStorage.setItem(SOCIAL_PLATFORM_CREDENTIALS_LS_KEY, JSON.stringify(credentials));
    return true;
  }
  return false;
};


// --- Social Post Draft Functions ---
export const getSocialPostDrafts = (): SocialPostDraft[] => {
  try {
    const stored = localStorage.getItem(SOCIAL_POST_DRAFTS_LS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Error getting social post drafts:", e);
    return [];
  }
};

export const addSocialPostDraft = (draftData: Omit<SocialPostDraft, 'id' | 'createdAt' | 'updatedAt' | 'status'>): SocialPostDraft => {
  const drafts = getSocialPostDrafts();
  const now = new Date().toISOString();
  const newDraft: SocialPostDraft = {
    ...draftData,
    id: generateLocalId('post'),
    status: SocialPostStatus.DRAFT,
    createdAt: now,
    updatedAt: now,
  };
  drafts.push(newDraft);
  localStorage.setItem(SOCIAL_POST_DRAFTS_LS_KEY, JSON.stringify(drafts));
  return newDraft;
};

export const getSocialPostDraftById = (id: string): SocialPostDraft | undefined => {
  return getSocialPostDrafts().find(d => d.id === id);
};

export const updateSocialPostDraft = (id: string, updates: Partial<Omit<SocialPostDraft, 'id' | 'createdAt'>>): SocialPostDraft | null => {
  const drafts = getSocialPostDrafts();
  const index = drafts.findIndex(d => d.id === id);
  if (index === -1) return null;
  drafts[index] = { ...drafts[index], ...updates, updatedAt: new Date().toISOString() };
  localStorage.setItem(SOCIAL_POST_DRAFTS_LS_KEY, JSON.stringify(drafts));
  return drafts[index];
};

export const deleteSocialPostDraft = (id: string): boolean => {
  let drafts = getSocialPostDrafts();
  const initialLength = drafts.length;
  drafts = drafts.filter(d => d.id !== id);
  if (drafts.length < initialLength) {
    localStorage.setItem(SOCIAL_POST_DRAFTS_LS_KEY, JSON.stringify(drafts));
    return true;
  }
  return false;
};
