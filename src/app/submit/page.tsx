'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';

export default function Submit() {
  const { data: session } = useSession();
  const router = useRouter();
  const [githubLink, setGithubLink] = useState('');
  const [promptsUsed, setPromptsUsed] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [finalTimeElapsed, setFinalTimeElapsed] = useState<number | null>(null);
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);

  useEffect(() => {
    if (!session?.user?.email) return;

    // Initialize with server time synchronization
    const initializeSubmitPage = async () => {
      try {
        // Get server time offset
        const timeResponse = await fetch('/api/time');
        const timeData = await timeResponse.json();
        const serverTime = new Date(timeData.serverTime).getTime();
        const clientTime = Date.now();
        const offset = serverTime - clientTime;
        setServerTimeOffset(offset);

        // Fetch user data to check if already submitted
        const response = await fetch('/api/candidate/profile');
        const userData = await response.json();

        if (userData.submitted_at) {
          setSubmitted(true);
          setSubmittedAt(userData.submitted_at);
          setGithubLink(userData.github_link || '');
          setPromptsUsed(userData.prompts_used || '');

          // Calculate final time for completed submissions
          if (userData.started_at) {
            const startTime = new Date(userData.started_at);
            const endTime = new Date(userData.submitted_at);
            const elapsed = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
            setFinalTimeElapsed(elapsed);
          }

          // Prevent back navigation after submission by replacing history
          // This ensures users can't go back to assignment pages after submitting
          window.history.replaceState(null, '', '/submit');

          // Add a popstate listener to prevent back navigation
          const handlePopState = (event: PopStateEvent) => {
            event.preventDefault();
            window.history.pushState(null, '', '/submit');
          };

          window.addEventListener('popstate', handlePopState);

          // Cleanup listener on unmount
          return () => {
            window.removeEventListener('popstate', handlePopState);
          };
        }

        if (userData.started_at) {
          const startTime = new Date(userData.started_at);
          setStartedAt(startTime);

          // Only calculate current elapsed time if not yet submitted
          if (!userData.submitted_at) {
            const syncedTime = clientTime + offset;
            const elapsed = Math.floor((syncedTime - startTime.getTime()) / 1000);
            const validElapsed = Math.max(0, elapsed);
            setTimeElapsed(validElapsed);
          }
        } else {
          // If user hasn't started, redirect to welcome
          router.push('/welcome');
        }
      } catch (error) {
        console.error('Error initializing submit page:', error);
      }
    };

    initializeSubmitPage();
  }, [session, router]);

  // Keep timer running until submission using server-synchronized time
  useEffect(() => {
    if (!startedAt || submitted || serverTimeOffset === 0) return;

    const interval = setInterval(() => {
      const clientTime = Date.now();
      const syncedTime = clientTime + serverTimeOffset;
      const elapsed = Math.floor((syncedTime - startedAt.getTime()) / 1000);
      const validElapsed = Math.max(0, elapsed);
      setTimeElapsed(validElapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt, submitted, serverTimeOffset]);

  const formatTime = (seconds: number) => {
    // Handle negative or invalid values
    if (seconds < 0 || !isFinite(seconds)) {
      return '00:00:00';
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!githubLink.trim() || !promptsUsed.trim()) {
      alert('Please fill in both GitHub link and prompts used.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/candidate/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          github_link: githubLink.trim(),
          prompts_used: promptsUsed.trim(),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSubmitted(true);
        setSubmittedAt(data.submitted_at);

        // Set final elapsed time and stop the running timer
        if (startedAt) {
          const endTime = new Date(data.submitted_at);
          const elapsed = Math.floor((endTime.getTime() - startedAt.getTime()) / 1000);
          setFinalTimeElapsed(elapsed);
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to submit assignment');
      }
    } catch (error) {
      console.error('Error submitting assignment:', error);
      alert('An error occurred while submitting');
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen metacto-gradient flex items-center justify-center">
        <div className="text-lg text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen metacto-gradient">
      <Header title="Submit Assignment" showSignOut={true} />
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-metacto-dark/80 backdrop-blur-sm shadow-xl rounded-lg p-8 border border-metacto-purple/20">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-4">
                Submit Your Assignment
              </h1>
              <p className="text-lg text-metacto-light-gray">
                {session.user?.email}
              </p>
              {startedAt && (
                <div className="mt-4 p-4 bg-metacto-purple/30 rounded-md border border-metacto-orange/20">
                  <div className="text-sm text-metacto-orange">
                    {submitted ? 'Total Time Taken' : 'Current Time Elapsed'}
                  </div>
                  <div className={`text-2xl font-mono font-bold ${
                    (finalTimeElapsed || timeElapsed) > 7200 ? 'text-red-400' :
                    (finalTimeElapsed || timeElapsed) > 5400 ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {formatTime(finalTimeElapsed || timeElapsed)}
                  </div>
                </div>
              )}
            </div>

            {submitted ? (
              <div className="text-center">
                <div className="bg-green-900/30 border border-green-400/30 rounded-md p-6 mb-8">
                  <div className="flex justify-center">
                    <div className="flex-shrink-0">
                      <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-white">
                        Submission Received
                      </h3>
                      <div className="mt-2 text-sm text-green-300">
                        <p>
                          Your assignment has been successfully submitted and will be reviewed. 
                          Thank you for your time and effort. The results will be considered.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-metacto-purple/30 rounded-md p-6 text-left border border-metacto-purple/20">
                  <h3 className="text-lg font-medium text-white mb-4">Submitted Details</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-metacto-light-gray">GitHub Repository</label>
                      <a
                        href={githubLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 text-metacto-orange hover:text-orange-300 break-all"
                      >
                        {githubLink}
                      </a>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-metacto-light-gray">Prompts Used</label>
                      <div className="mt-1 p-3 bg-metacto-dark/50 border border-metacto-gray/30 rounded-md">
                        <pre className="whitespace-pre-wrap text-sm text-white">{promptsUsed}</pre>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="github-link" className="block text-sm font-medium text-white mb-2">
                    GitHub Repository URL *
                  </label>
                  <input
                    type="url"
                    id="github-link"
                    value={githubLink}
                    onChange={(e) => setGithubLink(e.target.value)}
                    placeholder="https://github.com/username/repository"
                    className="w-full px-3 py-3 border border-metacto-gray/30 rounded-md shadow-sm text-white bg-metacto-dark/50 backdrop-blur-sm placeholder-metacto-gray focus:outline-none focus:ring-2 focus:ring-metacto-orange focus:border-metacto-orange"
                    required
                    disabled={loading}
                  />
                  <p className="mt-1 text-sm text-metacto-light-gray">
                    Provide the full URL to your GitHub repository containing the completed assignment.
                  </p>
                </div>

                <div>
                  <label htmlFor="prompts-used" className="block text-sm font-medium text-white mb-2">
                    Prompts Used *
                  </label>
                  <textarea
                    id="prompts-used"
                    value={promptsUsed}
                    onChange={(e) => setPromptsUsed(e.target.value)}
                    rows={10}
                    placeholder="Paste all the prompts you used with Claude Code here..."
                    className="w-full px-3 py-3 border border-metacto-gray/30 rounded-md shadow-sm text-white bg-metacto-dark/50 backdrop-blur-sm placeholder-metacto-gray focus:outline-none focus:ring-2 focus:ring-metacto-orange focus:border-metacto-orange"
                    required
                    disabled={loading}
                  />
                  <p className="mt-1 text-sm text-metacto-light-gray">
                    Include all prompts you used during the assignment for audit purposes.
                  </p>
                </div>

                <div className="bg-yellow-900/30 border border-yellow-400/30 rounded-md p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-300">
                        Important Notice
                      </h3>
                      <div className="mt-2 text-sm text-yellow-300">
                        <p>
                          Please ensure your GitHub repository is complete and accessible.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <button
                    type="submit"
                    disabled={loading || !githubLink.trim() || !promptsUsed.trim()}
                    className="btn-metacto-primary font-medium py-3 px-8 rounded-md text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Submitting...' : 'Submit Assignment'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
