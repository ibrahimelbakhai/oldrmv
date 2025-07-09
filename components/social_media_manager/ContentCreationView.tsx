
import React, { useState, useCallback } from 'react';
import { AgentDefinition, SocialPlatform, PlatformCredential, SocialPostDraft, SocialPostStatus, AgentTaskStatus, AgentStep } from '../../types'; 
import { generateContentInternal, LLMServiceResponse, GenerateContentOptionsInternal } from '../../services/llmService'; 
import { saveTaskExecutionRecord, calculateApproxTokens } from '../../services/analyticsService';
import LoadingSpinner from '../shared/LoadingSpinner';
import ErrorDisplay from '../shared/ErrorDisplay';
import CopyButton from '../shared/CopyButton';

interface ContentCreationViewProps {
  twitterAgent: AgentDefinition | null;
  linkedinAgent: AgentDefinition | null;
  facebookAgent: AgentDefinition | null;
  instagramAgent: AgentDefinition | null;
  threadsAgent: AgentDefinition | null;
  youtubeAgent: AgentDefinition | null;
  tiktokAgent: AgentDefinition | null;
  pinterestAgent: AgentDefinition | null;
  credentials: PlatformCredential[];
  onDraftCreated: (draft: SocialPostDraft) => void;
}

const ContentCreationView: React.FC<ContentCreationViewProps> = ({
  twitterAgent,
  linkedinAgent,
  facebookAgent,
  instagramAgent,
  threadsAgent,
  youtubeAgent,
  tiktokAgent,
  pinterestAgent,
  credentials,
  onDraftCreated
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform | ''>('');
  const [selectedCredentialId, setSelectedCredentialId] = useState<string>('');
  const [topicOrMessage, setTopicOrMessage] = useState('');
  const [linkToInclude, setLinkToInclude] = useState('');
  const [specificInstructions, setSpecificInstructions] = useState('');

  const [draftContent, setDraftContent] = useState<string | null>(null);
  const [suggestedHashtags, setSuggestedHashtags] = useState<string[] | null>(null);
  const [visualIdea, setVisualIdea] = useState<string | null>(null);
  const [extraContent, setExtraContent] = useState<Record<string, string | string[]>>({});
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [currentExecutingStepName, setCurrentExecutingStepName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const platformAgentMap: Partial<Record<SocialPlatform, AgentDefinition | null>> = { 
    [SocialPlatform.TWITTER]: twitterAgent,
    [SocialPlatform.LINKEDIN]: linkedinAgent,
    [SocialPlatform.FACEBOOK]: facebookAgent,
    [SocialPlatform.INSTAGRAM]: instagramAgent,
    [SocialPlatform.THREADS]: threadsAgent,
    [SocialPlatform.PINTEREST]: pinterestAgent,
    [SocialPlatform.TIKTOK]: tiktokAgent,
    [SocialPlatform.YOUTUBE]: youtubeAgent,
  };

  const availableCredentialsForPlatform = selectedPlatform ? credentials.filter(c => c.platform === selectedPlatform) : [];
  const currentCredential = credentials.find(c => c.id === selectedCredentialId);

  const callPlatformAgentStep = async (agent: AgentDefinition, stepToExecute: AgentStep, inputs: Record<string, string>) => {
    let prompt = stepToExecute.instruction;
    for (const key in inputs) {
      prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), inputs[key]);
    }
    
    const handleOrContext = currentCredential?.handleOrProfileId || currentCredential?.displayName || `the user's ${selectedPlatform} account`;
    
    const contextPlaceholders = [
        'twitter_handle', 'linkedin_profile_context', 'facebook_page_context', 
        'instagram_profile_context', 'threads_profile_context', 'youtube_channel_context',
        'tiktok_profile_context', 'pinterest_profile_context'
    ];
    contextPlaceholders.forEach(ph => {
        prompt = prompt.replace(new RegExp(`{{${ph}}}`, 'g'), handleOrContext);
    });


    setIsLoading(true);
    setCurrentExecutingStepName(stepToExecute.name);
    setError(null);
    const startedAt = new Date().toISOString();

    const options: GenerateContentOptionsInternal = {
      prompt,
      model: stepToExecute.model,
      providerType: stepToExecute.providerType,
      apiEndpoint: stepToExecute.apiEndpoint,
      apiKey: stepToExecute.apiKey,
      systemInstruction: agent.globalSystemInstruction, // Pass agent's global instruction
      agentId: agent.id,
      stepId: stepToExecute.id,
      temperature: stepToExecute.temperature,
      topK: stepToExecute.topK,
      topP: stepToExecute.topP,
      isJsonOutput: stepToExecute.isJsonOutput,
      disableThinking: stepToExecute.disableThinking,
    };
    const response = await generateContentInternal(options);
    
    setIsLoading(false);
    setCurrentExecutingStepName(null);

    const approxInputTokens = calculateApproxTokens(options.prompt);
    let taskStatus = AgentTaskStatus.COMPLETED;
    let taskError: string | undefined = undefined;

    if (response.error) {
      setError(response.error);
      taskStatus = AgentTaskStatus.FAILED;
      taskError = response.error;
    } else if (!response.text) {
      setError(`${agent.name} returned no response for ${stepToExecute.name}.`);
      taskStatus = AgentTaskStatus.FAILED;
      taskError = "AI returned no text.";
    }
    
    saveTaskExecutionRecord({
      agentId: agent.id, agentName: agent.name,
      stepId: stepToExecute.id, stepName: stepToExecute.name,
      status: taskStatus, startedAt, completedAt: new Date().toISOString(),
      inputSummary: prompt.substring(0, 200) + "...",
      outputSummary: response.text ? response.text.substring(0, 200) + "..." : undefined,
      error: taskError,
      approxInputTokens, approxOutputTokens: calculateApproxTokens(response.text || ""),
    });
    
    return response.text;
  };

  const executeAgentAction = async (primaryStepName: string, platformSpecificInputs: Record<string, string>) => {
    if (!selectedPlatform) return null; // Guard clause
    const agent = platformAgentMap[selectedPlatform];
    if (!agent) { setError(`No AI agent configured for ${selectedPlatform}.`); return null; }
    const step = agent.steps.find(s => s.name === primaryStepName);
    if (!step) { setError(`Step '${primaryStepName}' not found for ${agent.name}.`); return null; }

    const baseInputs: Record<string, string> = { 
        userInput_topic_or_message: topicOrMessage, 
        userInput_topic: topicOrMessage, 
        userInput_link: linkToInclude,
        userInput_specific_instructions: specificInstructions,
    };
    
    return callPlatformAgentStep(agent, step, {...baseInputs, ...platformSpecificInputs});
  };


  const handleDraftPost = async () => {
    if (!selectedPlatform || !topicOrMessage.trim()) {
      setError("Please select a platform and provide a topic/message.");
      return;
    }
    let stepName = '';
    let inputs: Record<string, string> = {};

    switch(selectedPlatform) {
        case SocialPlatform.TWITTER: stepName = 'DraftTweet'; break;
        case SocialPlatform.LINKEDIN: stepName = 'DraftLinkedInUpdate'; break;
        case SocialPlatform.FACEBOOK: stepName = 'DraftFacebookPost'; inputs.userInput_topic_or_event = topicOrMessage; break;
        case SocialPlatform.INSTAGRAM: stepName = 'DraftInstagramCaption'; inputs.userInput_visual_theme_or_topic = topicOrMessage; break;
        case SocialPlatform.THREADS: stepName = 'DraftThreadsPost'; inputs.userInput_thought_or_topic = topicOrMessage; break;
        case SocialPlatform.PINTEREST: stepName = 'DraftPinterestPinContent'; inputs.userInput_pin_topic_or_product = topicOrMessage; break;
        case SocialPlatform.TIKTOK: stepName = 'DraftTikTokCaptionHashtags'; inputs.userInput_video_description = topicOrMessage; break; 
        case SocialPlatform.YOUTUBE: stepName = 'DraftYouTubeVideoDescription'; inputs.userInput_video_topic = topicOrMessage; inputs.userInput_video_title = `Video about ${topicOrMessage.substring(0,30)}...`; break; 
        default: setError("Drafting step not defined for this platform."); return;
    }
    
    const result = await executeAgentAction(stepName, inputs);
    if (result) setDraftContent(result);
  };
  
  const handleGenerateHashtags = async () => {
     if (!selectedPlatform || !topicOrMessage.trim()) {
      setError("Please select a platform and provide a topic/message for hashtag generation.");
      return;
    }
    let stepName = '';
    if (selectedPlatform === SocialPlatform.TWITTER) stepName = 'GenerateTwitterHashtags';
    else if (selectedPlatform === SocialPlatform.INSTAGRAM) stepName = 'GenerateInstagramHashtags';
    else if (selectedPlatform === SocialPlatform.TIKTOK && platformAgentMap[selectedPlatform]?.steps.find(s => s.name === 'DraftTikTokCaptionHashtags')) stepName = 'DraftTikTokCaptionHashtags'; 
    else { setError("Hashtag generation step not directly defined for this platform's agent or not selected."); return; }
    
    const result = await executeAgentAction(stepName, {userInput_topic: topicOrMessage});
    if (result) {
      const lines = result.split('\n');
      const hashtagLine = lines.find(line => line.toLowerCase().includes('#') || line.toLowerCase().startsWith('hashtags:'));
      const extracted = (hashtagLine || result).split(/[,;\s]+/).map(h => h.trim().replace(/^#/, '')).filter(h => h && h.length > 1);
      setSuggestedHashtags(extracted.length > 0 ? extracted : [result]); 
    }
  };
  
   const handleSuggestVisualOrConcept = async () => {
    if (!selectedPlatform || !topicOrMessage.trim()) {
      setError("Please select a platform and provide a topic/message for visual/concept suggestion.");
      return;
    }
    let stepName = '';
    let inputs: Record<string, string> = { userInput_topic_or_theme: topicOrMessage, userInput_topic_or_product: topicOrMessage };

    switch(selectedPlatform) {
        case SocialPlatform.TWITTER: stepName = 'SuggestTweetVisualIdea'; inputs.userInput_topic = topicOrMessage; break;
        case SocialPlatform.FACEBOOK: stepName = 'SuggestFacebookVisualIdea'; inputs.userInput_topic = topicOrMessage; break;
        case SocialPlatform.INSTAGRAM: stepName = 'SuggestInstagramReelIdea'; inputs.userInput_topic_or_product = topicOrMessage; break;
        case SocialPlatform.PINTEREST: stepName = 'DescribePinterestVisualConcept'; inputs.userInput_topic = topicOrMessage; break;
        case SocialPlatform.TIKTOK: stepName = 'GenerateTikTokVideoIdea'; inputs.userInput_topic_or_theme = topicOrMessage; inputs.userInput_trending_sound_or_challenge_placeholder = "[TRENDING_SOUND_OR_CHALLENGE]"; break;
        case SocialPlatform.YOUTUBE: stepName = 'SuggestYouTubeThumbnailIdea'; inputs.userInput_video_topic = topicOrMessage; break;
        default: setError("Visual/concept suggestion step not defined for this platform."); return;
    }

    const result = await executeAgentAction(stepName, inputs);
    if (result) setVisualIdea(result);
  };

  const handleSaveDraft = () => {
    if (!selectedPlatform || !draftContent) {
      alert("No content to save as draft. Please generate content first.");
      return;
    }
    const currentAgentForPlatform = platformAgentMap[selectedPlatform];
    const newDraft: Omit<SocialPostDraft, 'id' | 'createdAt' | 'updatedAt' | 'status'> = {
      platform: selectedPlatform,
      credentialId: selectedCredentialId || undefined,
      content: draftContent,
      hashtags: suggestedHashtags || [],
      mediaIdeas: visualIdea ? [visualIdea, ...Object.values(extraContent).flat()] : [...Object.values(extraContent).flat()],
      notes: `Context: Topic="${topicOrMessage.substring(0,50)}...", Link="${linkToInclude || 'N/A'}", Specifics="${specificInstructions.substring(0,50) || 'N/A'}"`,
      aiGeneratedBy: currentAgentForPlatform && currentExecutingStepName ? {
          agentId: currentAgentForPlatform.id,
          agentName: currentAgentForPlatform.name,
          stepId: currentAgentForPlatform.steps.find(s => s.name === currentExecutingStepName)?.id || currentAgentForPlatform.steps[0].id,
          stepName: currentExecutingStepName || currentAgentForPlatform.steps[0].name,
      } : undefined
    };
    onDraftCreated(newDraft as SocialPostDraft);
    
    setDraftContent(null);
    setSuggestedHashtags(null);
    setVisualIdea(null);
    setExtraContent({});
    alert("Post draft saved! You can view and manage it in the 'Drafts & Schedule' tab.");
  };
  
  const renderPlatformSpecificActions = () => {
    if (!selectedPlatform) return null;
    const agent = platformAgentMap[selectedPlatform];
    if (!agent) return <p className="text-sm text-amber-700">AI agent for {selectedPlatform} not available.</p>;

    const actions = [];
    const draftStep = agent.steps.find(s => s.name.toLowerCase().includes('draft') || s.name.toLowerCase().includes('caption') || s.name.toLowerCase().includes('description'));
    if (draftStep) {
        actions.push(
            <button key="draft" onClick={handleDraftPost} disabled={isLoading || !topicOrMessage.trim()} className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-md disabled:opacity-50">
                {isLoading && currentExecutingStepName === draftStep.name ? <LoadingSpinner /> : `Draft ${selectedPlatform} Content`}
            </button>
        );
    }

    if (agent.steps.some(s => s.name.toLowerCase().includes('hashtag'))) {
        actions.push(
            <button key="hashtag" onClick={handleGenerateHashtags} disabled={isLoading || !topicOrMessage.trim()} className="px-3 py-1.5 text-sm bg-teal-500 hover:bg-teal-600 text-white rounded-md disabled:opacity-50">
                {isLoading && currentExecutingStepName?.toLowerCase().includes('hashtag') ? <LoadingSpinner /> : 'Suggest Hashtags'}
            </button>
        );
    }
    if (agent.steps.some(s => s.name.toLowerCase().includes('visual') || s.name.toLowerCase().includes('idea') || s.name.toLowerCase().includes('concept') || s.name.toLowerCase().includes('thumbnail'))) {
        actions.push(
            <button key="visual" onClick={handleSuggestVisualOrConcept} disabled={isLoading || !topicOrMessage.trim()} className="px-3 py-1.5 text-sm bg-purple-500 hover:bg-purple-600 text-white rounded-md disabled:opacity-50">
                {isLoading && (currentExecutingStepName?.toLowerCase().includes('visual') || currentExecutingStepName?.toLowerCase().includes('idea') || currentExecutingStepName?.toLowerCase().includes('concept')) ? <LoadingSpinner /> : 'Suggest Visual/Concept'}
            </button>
        );
    }
    
    if (selectedPlatform === SocialPlatform.YOUTUBE && agent.steps.some(s => s.name === 'GenerateYouTubeVideoTitle')) {
        actions.push(<button key="yt_title" onClick={async () => {
            const result = await executeAgentAction('GenerateYouTubeVideoTitle', { userInput_video_topic: topicOrMessage });
            if(result) setExtraContent(prev => ({...prev, youtubeTitles: result.split('\n').filter(t => t.trim()) }));
        }} disabled={isLoading || !topicOrMessage.trim()} className="px-3 py-1.5 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-md disabled:opacity-50">
            {isLoading && currentExecutingStepName === 'GenerateYouTubeVideoTitle' ? <LoadingSpinner /> : 'Suggest YT Titles'}
        </button>);
    }


    return (
        <div className="flex flex-wrap gap-2 mt-3">
            {actions.length > 0 ? actions : <p className="text-sm text-slate-500">No specific AI actions configured for the primary steps of this platform beyond general drafting.</p>}
        </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="p-4 border border-slate-200 rounded-lg bg-slate-50 space-y-4">
        <h3 className="text-lg font-semibold text-slate-700">Create Social Media Content</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label htmlFor="sm-platform-select" className="block text-sm font-medium text-slate-600">Platform</label>
                <select
                    id="sm-platform-select"
                    value={selectedPlatform}
                    onChange={(e) => {
                        setSelectedPlatform(e.target.value as SocialPlatform | '');
                        setSelectedCredentialId(''); 
                        setDraftContent(null); setSuggestedHashtags(null); setVisualIdea(null); setExtraContent({});
                        setError(null); 
                    }}
                    className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
                >
                    <option value="" disabled>-- Select Platform --</option>
                    {Object.values(SocialPlatform).map(p => (
                    <option key={p} value={p} disabled={!platformAgentMap[p]}>{p} {!platformAgentMap[p] ? '(AI Not Configured)' : ''}</option>
                    ))}
                </select>
            </div>
            <div>
                <label htmlFor="sm-credential-select" className="block text-sm font-medium text-slate-600">Use Conceptual Setup (Optional)</label>
                 <select
                    id="sm-credential-select"
                    value={selectedCredentialId}
                    onChange={(e) => setSelectedCredentialId(e.target.value)}
                    disabled={!selectedPlatform || availableCredentialsForPlatform.length === 0}
                    className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm disabled:bg-slate-100"
                >
                    <option value="">-- None (General Content) --</option>
                    {availableCredentialsForPlatform.map(cred => (
                        <option key={cred.id} value={cred.id}>{cred.displayName} ({cred.handleOrProfileId || 'No Handle'})</option>
                    ))}
                </select>
                 <p className="text-xs text-slate-400 mt-0.5">Provides context (e.g., handle) to the AI.</p>
            </div>
        </div>

        <div>
          <label htmlFor="sm-topic" className="block text-sm font-medium text-slate-600">Topic / Message / Core Idea</label>
          <textarea
            id="sm-topic"
            value={topicOrMessage}
            onChange={(e) => setTopicOrMessage(e.target.value)}
            rows={3}
            placeholder="e.g., Launching our new eco-friendly product line! OR Key takeaways from the recent tech conference."
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
            disabled={!selectedPlatform}
          />
        </div>
        <div>
          <label htmlFor="sm-link" className="block text-sm font-medium text-slate-600">Link to Include (Optional)</label>
          <input
            type="url"
            id="sm-link"
            value={linkToInclude}
            onChange={(e) => setLinkToInclude(e.target.value)}
            placeholder="https://example.com/your-article"
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
            disabled={!selectedPlatform}
          />
        </div>
         <div>
          <label htmlFor="sm-specific-instructions" className="block text-sm font-medium text-slate-600">Specific Instructions / Tone (Optional)</label>
          <textarea
            id="sm-specific-instructions"
            value={specificInstructions}
            onChange={(e) => setSpecificInstructions(e.target.value)}
            rows={2}
            placeholder="e.g., Make it humorous. Focus on the benefits for small businesses. Include a question."
            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-sky-500 focus:border-sky-500 sm:text-sm"
            disabled={!selectedPlatform}
          />
        </div>

        {renderPlatformSpecificActions()}
      </div>

      <ErrorDisplay message={error} />

      {draftContent && (
        <div className="mt-6 p-4 border border-green-300 rounded-lg bg-green-50">
          <h4 className="text-md font-semibold text-green-700">Generated Post Content/Description:</h4>
          <div className="mt-2 p-3 bg-white rounded whitespace-pre-wrap text-sm">{draftContent}</div>
          <CopyButton textToCopy={draftContent}/>
        </div>
      )}
      {extraContent.youtubeTitles && Array.isArray(extraContent.youtubeTitles) && (
        <div className="mt-4 p-4 border border-orange-300 rounded-lg bg-orange-50">
            <h4 className="text-md font-semibold text-orange-700">Suggested YouTube Titles:</h4>
            <ul className="list-disc list-inside mt-2 text-sm">
                {(extraContent.youtubeTitles as string[]).map((title,i) => <li key={i}>{title}</li>)}
            </ul>
            <CopyButton textToCopy={(extraContent.youtubeTitles as string[]).join('\n')}/>
        </div>
      )}
      {suggestedHashtags && suggestedHashtags.length > 0 && (
        <div className="mt-4 p-4 border border-teal-300 rounded-lg bg-teal-50">
          <h4 className="text-md font-semibold text-teal-700">Suggested Hashtags:</h4>
          <p className="mt-2 text-sm text-teal-600">{suggestedHashtags.map(h => `#${h}`).join(' ')}</p>
          <CopyButton textToCopy={suggestedHashtags.map(h => `#${h}`).join(' ')}/>
        </div>
      )}
      {visualIdea && (
         <div className="mt-4 p-4 border border-purple-300 rounded-lg bg-purple-50">
          <h4 className="text-md font-semibold text-purple-700">Suggested Visual/Concept Idea:</h4>
          <p className="mt-2 text-sm text-purple-600 whitespace-pre-wrap">{visualIdea}</p>
          <CopyButton textToCopy={visualIdea}/>
        </div>
      )}

      {(draftContent || (suggestedHashtags && suggestedHashtags.length > 0) || visualIdea || Object.keys(extraContent).length > 0) && (
        <div className="mt-6 flex justify-end">
            <button onClick={handleSaveDraft} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-md shadow-sm">
                Save as Draft
            </button>
        </div>
      )}
    </div>
  );
};

export default ContentCreationView;
