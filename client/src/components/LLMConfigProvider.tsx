import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { llmConfigApi } from '../lib/api';
import { useLLMConfigStore } from '../stores/llmConfigStore';
import { Sparkle } from '@phosphor-icons/react';

export default function LLMConfigProvider({ children }: { children: ReactNode }) {
  const [checking, setChecking] = useState(true);
  const { setConfig, isConfigured } = useLLMConfigStore();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    llmConfigApi
      .get()
      .then((c) => {
        setConfig(c);
      })
      .catch(() => {
        // Config may not exist yet
      })
      .finally(() => setChecking(false));
  }, [setConfig]);

  // Redirect to settings when not configured — must be in useEffect, not during render
  const isSettingsPage = location.pathname.startsWith('/settings');
  useEffect(() => {
    if (!checking && !isConfigured() && !isSettingsPage) {
      navigate('/settings', { replace: true });
    }
  }, [checking, isConfigured, isSettingsPage, navigate]);

  // Always allow settings page (user might be configuring for first time)
  if (isSettingsPage) {
    return <>{children}</>;
  }

  if (checking) {
    return (
      <div className="h-dvh w-full flex items-center justify-center bg-obsidian-950">
        <div className="flex flex-col items-center gap-3">
          <Sparkle size={28} className="text-amber-500 animate-pulse" />
          <span className="text-xs text-gray-500">Checking configuration...</span>
        </div>
      </div>
    );
  }

  if (!isConfigured()) {
    return null;
  }

  return <>{children}</>;
}
