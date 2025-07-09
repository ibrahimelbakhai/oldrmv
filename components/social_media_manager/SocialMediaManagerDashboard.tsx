import React, { useState, useEffect, useCallback } from 'react';
import { SocialPlatform, PlatformCredential, SocialPostDraft, AgentDefinition, ActiveTool, AgentTaskStatus } from '../../types';
import * as socialMediaDataService from '../../services/socialMediaDataService';
import { GEMINI_AGENT_DEFINITIONS_LS_KEY } from '../../constants';
import SectionCard from '../shared/SectionCard';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorDisplay from '../shared/ErrorDisplay';
import PlatformCredentialsView from './PlatformCredentialsView';
import StrategyAndPlanningView from './StrategyAndPlanningView';
import ContentCreationView from './ContentCreationView';
import DraftsAndScheduleView from './DraftsAndScheduleView';

type SocialMediaTab = 'strategy' | 'content' | 'drafts' | 'credentials';

const SocialMediaManagerDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<SocialMediaTab>('strategy');
  
  const [platformCredentials, setPlatformCredentials] = useState<PlatformCredential[]>([]);
  const [socialPostDrafts, setSocialPostDrafts] = useState<SocialPostDraft[]>([]);
  
  const [strategistAgent, setStrategistAgent] = useState<AgentDefinition | null>(null);
  const [twitterAgent, setTwitterAgent] = useState<AgentDefinition | null>(null);
  const [linkedinAgent, setLinkedinAgent] = useState<AgentDefinition | null>(null);
  const [facebookAgent, setFacebookAgent] = useState<AgentDefinition | null>(null);
  const [instagramAgent, setInstagramAgent] = useState<AgentDefinition | null>(null);
  const [threadsAgent, setThreadsAgent] = useState<AgentDefinition | null>(null);
  const [youtubeAgent, setYoutubeAgent] = useState<AgentDefinition | null>(null);
  const [tiktokAgent, setTiktokAgent] = useState<AgentDefinition | null>(null);
  const [pinterestAgent, setPinterestAgent] = useState<AgentDefinition | null>(null);


  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(() => {
    setIsLoading(true);
    setError(null);
    try {
      setPlatformCredentials(socialMediaDataService.getPlatformCredentials());
      setSocialPostDrafts(socialMediaDataService.getSocialPostDrafts());

      const storedAgentsString = localStorage.getItem(GEMINI_AGENT_DEFINITIONS_LS_KEY);
      if (storedAgentsString) {
        const allAgents: AgentDefinition[] = JSON.parse(storedAgentsString);
        setStrategistAgent(allAgents.find(a => a.id === 'predef_social_media_strategist') || null);
        setTwitterAgent(allAgents.find(a => a.id === 'predef_twitter_content_ai') || null);
        setLinkedinAgent(allAgents.find(a => a.id === 'predef_linkedin_content_ai') || null);
        setFacebookAgent(allAgents.find(a => a.id === 'predef_facebook_content_ai') || null);
        setInstagramAgent(allAgents.find(a => a.id === 'predef_instagram_content_ai') || null);
        setThreadsAgent(allAgents.find(a => a.id === 'predef_threads_content_ai') || null);
        setYoutubeAgent(allAgents.find(a => a.id === 'predef_youtube_content_ai') || null);
        setTiktokAgent(allAgents.find(a => a.id === 'predef_tiktok_content_ai') || null);
        setPinterestAgent(allAgents.find(a => a.id === 'predef_pinterest_content_ai') || null);
        
      } else {
        setError("Social Media AI Agent definitions not found. Please check Agent Management.");
      }
    } catch (e) {
      console.error("Error loading social media data or agents:", e);
      setError("Failed to load data or AI agents for Social Media Management.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCredentialSave = (credential: PlatformCredential) => {
    socialMediaDataService.savePlatformCredential(credential);
    loadData(); // Reload to reflect changes
  };

  const handleDraftSave = (draft: SocialPostDraft) => {
     if (draft.id && socialMediaDataService.getSocialPostDraftById(draft.id)) {
        socialMediaDataService.updateSocialPostDraft(draft.id, draft);
     } else {
        socialMediaDataService.addSocialPostDraft(draft);
     }
    loadData();
  };
  
  const handleDraftUpdate = (draftId: string, updates: Partial<SocialPostDraft>) => {
    socialMediaDataService.updateSocialPostDraft(draftId, updates);
    loadData();
  };

  const handleDraftDelete = (draftId: string) => {
    if (window.confirm("Are you sure you want to delete this draft?")) {
      socialMediaDataService.deleteSocialPostDraft(draftId);
      loadData();
    }
  };

  const renderTabs = () => (
    <div className="mb-6 border-b border-slate-300">
      <nav className="-mb-px flex space-x-1 sm:space-x-4 overflow-x-auto" aria-label="Social Media Tabs">
        {[
          { key: 'strategy' as SocialMediaTab, name: "Strategy & Planning" },
          { key: 'content' as SocialMediaTab, name: 'Content Creation' },
          { key: 'drafts' as SocialMediaTab, name: 'Drafts & Schedule' },
          { key: 'credentials' as SocialMediaTab, name: 'Platform Setup' }
        ].map(tabItem => (
          <button key={tabItem.key} onClick={() => setActiveTab(tabItem.key)}
            className={`whitespace-nowrap py-3 px-2 sm:px-4 border-b-2 font-medium text-xs sm:text-sm transition-colors ${activeTab === tabItem.key ? 'border-sky-500 text-sky-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}>
            {tabItem.name}
          </button>
        ))}
      </nav>
    </div>
  );

  if (isLoading) {
    return <SectionCard title="Social Media AI Manager"><LoadingSpinner /><p>Loading Social Media AI tools...</p></SectionCard>;
  }
  if (error) {
    return <SectionCard title="Social Media AI Manager"><ErrorDisplay message={error} /></SectionCard>;
  }
  // Check if all required agents are loaded
  const allCoreAgentsLoaded = strategistAgent && twitterAgent && linkedinAgent && facebookAgent && instagramAgent && threadsAgent && youtubeAgent && tiktokAgent && pinterestAgent;
  if (!allCoreAgentsLoaded) {
     return <SectionCard title="Social Media AI Manager"><ErrorDisplay message="One or more Social Media AI agents are missing or failed to load. Please check Agent Management settings and ensure all predefined social media agents exist." /></SectionCard>;
  }


  return (
    <SectionCard title="Social Media AI Manager">
      {renderTabs()}
      <div className="mt-2">
        {activeTab === 'strategy' && strategistAgent && (
          <StrategyAndPlanningView 
            strategistAgent={strategistAgent} 
            onStrategyGenerated={(planText: string) => {
              console.log("Strategy/Plan Generated:", planText);
            }}
          />
        )}
        {activeTab === 'content' && (
          <ContentCreationView 
            twitterAgent={twitterAgent}
            linkedinAgent={linkedinAgent}
            facebookAgent={facebookAgent}
            instagramAgent={instagramAgent}
            threadsAgent={threadsAgent}
            youtubeAgent={youtubeAgent}
            tiktokAgent={tiktokAgent}
            pinterestAgent={pinterestAgent}
            credentials={platformCredentials}
            onDraftCreated={handleDraftSave}
          />
        )}
        {activeTab === 'drafts' && (
          <DraftsAndScheduleView 
            drafts={socialPostDrafts}
            onUpdateDraft={handleDraftUpdate}
            onDeleteDraft={handleDraftDelete}
          />
        )}
        {activeTab === 'credentials' && (
          <PlatformCredentialsView 
            credentials={platformCredentials}
            onSaveCredential={handleCredentialSave}
            onDeleteCredential={(id) => {
                if(window.confirm("Are you sure you want to delete this conceptual credential setup?")) {
                    socialMediaDataService.deletePlatformCredential(id);
                    loadData();
                }
            }}
          />
        )}
      </div>
    </SectionCard>
  );
};

export default SocialMediaManagerDashboard;