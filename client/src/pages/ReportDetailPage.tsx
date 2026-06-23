import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Sparkle, PaperPlaneRight, ShareNetwork, Upload,
  Plus, Database, Star, X, Stop, Clock, ArrowClockwise, CaretDown, ArrowCounterClockwise,
  Desktop, DeviceMobile, ClockCounterClockwise, Trash,
} from '@phosphor-icons/react';
import {
  reportsApi, metricsApi, metricGroupsApi,
  type Report, type ReportDataSource, type MetricPool, type MetricGroup,
} from '../lib/api';
import { ErrorBanner } from '../components/ui';
import { fetchEmbedToken, getCachedEmbedToken } from '../lib/embedToken';

/// Build a report HTML/data URL with an auth token appended (for iframe loading).
/// Prefers a short-lived embed token so the long-lived session JWT never lands
/// in a URL; falls back to the session token if the embed token isn't ready.
function withToken(path: string): string {
  const token = getCachedEmbedToken() || localStorage.getItem('token') || '';
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}token=${encodeURIComponent(token)}`;
}

export default function ReportDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<Report | null>(null);
  const [datasources, setDatasources] = useState<ReportDataSource[]>([]);
  const [metrics, setMetrics] = useState<MetricPool[]>([]);
  const [metricGroups, setMetricGroups] = useState<MetricGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedStyleKey, setSelectedStyleKey] = useState<string | null>(null);
  const [showDsModal, setShowDsModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<{ id: number; version: number; prompt: string | null; style_key: string | null; created_at: string | null }[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<{ id: number; version: number; prompt: string | null; created_at: string | null }[]>([]);
  const [currentVersion, setCurrentVersion] = useState<number | null>(null);
  const [compareVersionId, setCompareVersionId] = useState<number | null>(null);
  const [deleteVersionTarget, setDeleteVersionTarget] = useState<{ id: number; version: number } | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(1); // minutes, default 1
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Mint a short-lived embed token on mount, then nudge a re-render so the
  // iframe src is rebuilt using it instead of the session JWT.
  const [, setEmbedTick] = useState(0);
  useEffect(() => {
    let active = true;
    fetchEmbedToken().then(() => {
      if (active) setEmbedTick((n) => n + 1);
    });
    return () => {
      active = false;
    };
  }, []);

  // Stop polling helper
  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
  }, []);

  // Fetch the latest version number for the title badge.
  const refreshVersion = useCallback(async (reportId: number) => {
    try {
      const res = await fetch(`/api/reports/${reportId}/versions`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
      });
      if (res.ok) {
        const vs: { version: number }[] = await res.json();
        const max = vs.reduce((m, v) => Math.max(m, v.version), 0);
        setCurrentVersion(max > 0 ? max : null);
      }
    } catch {
      /* silent */
    }
  }, []);

  // Poll generation status until done/failed
  const startPolling = useCallback((reportId: number) => {
    stopPolling();
    setAiLoading(true);
    pollTimerRef.current = setInterval(async () => {
      try {
        const st = await reportsApi.getStatus(reportId);
        if (st.status === 'done') {
          stopPolling();
          setAiLoading(false);
          // Reload the report + iframe with fresh content
          const fresh = await reportsApi.get(reportId).catch(() => null);
          if (fresh) setReport(fresh);
          refreshVersion(reportId);
          if (iframeRef.current) {
            await fetchEmbedToken();
            iframeRef.current.src = withToken(`/api/reports/${reportId}/html?t=${Date.now()}`);
          }
        } else if (st.status === 'failed') {
          stopPolling();
          setAiLoading(false);
          setToast(st.error || t('reportDetail.aiComposeFailed'));
          setTimeout(() => setToast(null), 5000);
        }
      } catch {
        // network hiccup — keep polling
      }
    }, 3000);
  }, [stopPolling, t, refreshVersion]);

  const fetchAll = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [r, ds, m, mg] = await Promise.all([
        reportsApi.get(parseInt(id)),
        reportsApi.listDatasources(parseInt(id)),
        metricsApi.list(),
        metricGroupsApi.list(),
      ]);
      setReport(r);
      setDatasources(ds);
      setMetrics(m);
      setMetricGroups(mg);
      refreshVersion(r.id);
      if (r.refresh_interval != null) setRefreshInterval(r.refresh_interval);
      if (r.style_key) setSelectedStyleKey(r.style_key);
      // Resume polling if generation is already in progress (e.g. user navigated away and back)
      if (r.generation_status === 'generating') {
        startPolling(r.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [id, startPolling, refreshVersion]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Clean up polling on unmount
  useEffect(() => () => { if (pollTimerRef.current) clearInterval(pollTimerRef.current); }, []);

  // ── Auto-refresh timer ──
  // Sends the refresh interval to the iframe page via postMessage
  // The iframe page listens for this and adjusts its own setInterval
  useEffect(() => {
    if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);

    // Tell iframe about the new interval
    const sendInterval = () => {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          { type: 'setRefreshInterval', interval: refreshInterval * 60 * 1000 },
          '*'
        );
      }
    };

    // Send after iframe loads
    const timer = setTimeout(sendInterval, 1500);

    // Also set up parent-level reload as fallback
    if (refreshInterval > 0 && id) {
      refreshTimerRef.current = setInterval(() => {
        if (iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage({ type: 'refreshNow' }, '*');
        }
      }, refreshInterval * 60 * 1000);
    }

    return () => {
      clearTimeout(timer);
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [refreshInterval, id]);

  // ── AI Send ──
  const handleAISend = async () => {
    if (!report || !aiInput.trim()) return;
    let prompt = aiInput.trim();
    // If a style is selected, prefix with style context so AI maintains it
    if (selectedStyleKey) {
      const style = DOCK_STYLES.find(s => s.key === selectedStyleKey);
      if (style) {
        prompt = `[保持当前风格: ${style.label}] ${prompt}`;
      }
    }
    setAiInput('');
    try {
      await reportsApi.renderAI(report.id, prompt);
      startPolling(report.id);
    } catch (e) {
      setToast(e instanceof Error ? e.message : t('reportDetail.aiComposeFailed'));
      setTimeout(() => setToast(null), 4000);
    }
  };

  // Toggle the "ask history" popover, loading past prompts (report versions).
  const toggleHistory = async () => {
    const next = !showHistory;
    setShowHistory(next);
    if (next && report) {
      try {
        const res = await fetch(`/api/reports/${report.id}/versions`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        });
        if (res.ok) {
          const data = await res.json();
          setHistory(data);
          const max = (data as { version: number }[]).reduce((m, v) => Math.max(m, v.version), 0);
          setCurrentVersion(max > 0 ? max : null);
        }
      } catch {
        /* silent */
      }
    }
  };

  // Send a specific prompt directly (for quick action buttons)
  const handleAISendPrompt = async (prompt: string) => {
    if (!report) return;
    try {
      await reportsApi.renderAI(report.id, prompt);
      startPolling(report.id);
    } catch (e) {
      setToast(e instanceof Error ? e.message : t('reportDetail.aiComposeFailed'));
      setTimeout(() => setToast(null), 4000);
    }
  };

  // Stop watching the generation (server task continues in background)
  const handleAIStop = () => {
    stopPolling();
    setAiLoading(false);
    setToast(t('reportDetail.generationBackground'));
    setTimeout(() => setToast(null), 4000);
  };

  // ── Add metric as datasource ──
  const handleAddMetric = async (metric: MetricPool) => {
    if (!report) return;
    await reportsApi.addDatasource(report.id, {
      metric_id: metric.id, name: metric.name,
      sql_query: metric.sql_query, datasource_id: metric.datasource_id,
    }).catch(() => null);
    const ds = await reportsApi.listDatasources(report.id);
    setDatasources(ds);
  };

  // ── Add entire group ──
  const handleAddGroup = async (groupId: number) => {
    const groupMetrics = metrics.filter((m) => m.group_id === groupId && !datasources.some((d) => d.metric_id === m.id));
    for (const m of groupMetrics) {
      await handleAddMetric(m);
    }
    setShowDsModal(false);
  };

  // ── Actions ──
  const handlePublish = async () => {
    if (!report) return;
    const updated = await reportsApi.publish(report.id, report.status === 'published' ? 'draft' : 'published').catch(() => null);
    if (updated) setReport(updated);
  };

  const handleRollback = async () => {
    if (!report) return;
    const updated = await reportsApi.rollback(report.id).catch(() => null);
    if (updated) {
      setReport(updated);
      refreshVersion(report.id);
      await fetchEmbedToken();
      if (iframeRef.current) iframeRef.current.src = withToken(`/api/reports/${report.id}/html?t=${Date.now()}`);
      setToast(t('reportDetail.rollbackSuccess'));
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleShare = async () => {
    if (!report) return;
    const info = await reportsApi.share(report.id, true).catch(() => null);
    if (info) {
      await navigator.clipboard.writeText(window.location.origin + `/api/share/${info.share_token}/html`);
      setToast(t('reportDetail.shareCopied'));
      setTimeout(() => setToast(null), 3000);
    }
  };

  // ── Loading ──
  if (loading) return <div className="h-full flex items-center justify-center"><div className="w-4 h-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" /></div>;
  if (!report) return <div className="p-6"><ErrorBanner message="Report not found" onDismiss={() => navigate('/reports')} /></div>;

  const hasHtml = !!report.html_content;
  const iframeSrc = withToken(`/api/reports/${report.id}/html?t=${report.updated_at || ''}`);

  return (
    <div className="h-full flex flex-col">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-obsidian-900 border border-obsidian-700 rounded-lg px-4 py-2.5 shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top duration-200">
          <span className="text-xs text-gray-200">{toast}</span>
        </div>
      )}

      {/* ── Top Bar ── */}
      <div className="flex items-center px-5 py-2.5 border-b border-obsidian-700 flex-shrink-0">
        <div className="flex items-center gap-3 flex-1">
          <button onClick={() => navigate('/reports')} aria-label={t('common.back')} className="text-gray-500 hover:text-gray-300 transition-premium"><ArrowLeft size={16} /></button>
          <h1 className="text-sm font-bold text-gray-100">{report.title}</h1>
          {currentVersion != null && (
            <span className="text-[8px] bg-obsidian-700 text-gray-300 px-1.5 py-0.5 rounded-full font-mono font-medium" title={t('reportDetail.currentVersion')}>
              v{currentVersion}
            </span>
          )}
          {report.status === 'published' && <span className="text-[8px] bg-data-green/10 text-data-green px-1.5 py-0.5 rounded-full font-medium">LIVE</span>}
          {report.design_score && (
            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-mono font-medium ${
              report.design_score.total >= 80 ? 'bg-data-green/10 text-data-green' :
              report.design_score.total >= 60 ? 'bg-amber-500/10 text-amber-500' :
              'bg-gray-500/10 text-gray-400'
            }`} title={`布局:${report.design_score.layout} 配色:${report.design_score.color} 字体:${report.design_score.typography} 响应:${report.design_score.responsiveness} 图表:${report.design_score.data_viz}`}>
              ★ {report.design_score.total}
            </span>
          )}
        </div>
        {/* Center: device toggle */}
        {hasHtml && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDeviceMode('desktop')}
              className={`flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-md transition-premium ${
                deviceMode === 'desktop' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30' : 'text-gray-500 hover:text-gray-300 border border-transparent'
              }`}
            >
              <Desktop size={13} /> {t('reportDetail.device.desktop')}
            </button>
            <button
              onClick={() => setDeviceMode('mobile')}
              className={`flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-md transition-premium ${
                deviceMode === 'mobile' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30' : 'text-gray-500 hover:text-gray-300 border border-transparent'
              }`}
            >
              <DeviceMobile size={13} /> {t('reportDetail.device.mobile')}
            </button>
          </div>
        )}
        <div className="flex items-center gap-1.5 flex-1 justify-end">
          <button onClick={() => setShowDsModal(true)} className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-200 border border-obsidian-700 px-2.5 py-1.5 rounded-md transition-premium">
            <Database size={11} /> {t('reportDetail.dataSources')} ({datasources.length})
          </button>
          {/* Refresh interval */}
          <RefreshIntervalPicker value={refreshInterval} onChange={(v) => { setRefreshInterval(v); if (report) reportsApi.updateRefreshInterval(report.id, v).catch(() => {}); }} t={t} />
          {/* Manual refresh */}
          <button
            onClick={() => { if (iframeRef.current && id) iframeRef.current.src = withToken(`/api/reports/${id}/html?t=${Date.now()}`); }}
            className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-200 border border-obsidian-700 px-2 py-1.5 rounded-md transition-premium"
            title={t('common.refresh')}
            aria-label={t('common.refresh')}
          >
            <ArrowClockwise size={11} />
          </button>
          <button onClick={handlePublish} className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-200 border border-obsidian-700 px-2.5 py-1.5 rounded-md transition-premium">
            <Upload size={11} /> {report.status === 'published' ? t('reportDetail.unpublish') : t('reportDetail.publish')}
          </button>
          {/* Rollback to published version */}
          {report.published_html && report.html_content !== report.published_html && (
            <button onClick={handleRollback} className="flex items-center gap-1 text-[10px] text-amber-500/80 hover:text-amber-400 border border-amber-500/20 px-2.5 py-1.5 rounded-md transition-premium" title={t('reportDetail.rollbackHint')}>
              <ArrowCounterClockwise size={11} /> {t('reportDetail.rollback')}
            </button>
          )}
          {/* Version indicator */}
          {report.html_content && report.published_html && report.html_content !== report.published_html && (
            <span className="text-[9px] text-amber-500/60 px-1.5 py-0.5 bg-amber-500/5 border border-amber-500/10 rounded">
              {t('reportDetail.unsaved')}
            </span>
          )}
          <button onClick={handleShare} className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-200 border border-obsidian-700 px-2.5 py-1.5 rounded-md transition-premium">
            <ShareNetwork size={11} /> {t('reportDetail.share')}
          </button>
          <button
            onClick={async () => {
              setShowVersions(!showVersions);
              if (!showVersions && report) {
                const res = await fetch(`/api/reports/${report.id}/versions`, { headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` } });
                if (res.ok) setVersions(await res.json());
              }
            }}
            className={`flex items-center gap-1 text-[10px] border px-2.5 py-1.5 rounded-md transition-premium ${showVersions ? 'text-amber-500 border-amber-500/30 bg-amber-500/5' : 'text-gray-400 hover:text-gray-200 border-obsidian-700'}`}
          >
            <ClockCounterClockwise size={11} /> {t('reportDetail.versions')}
          </button>
        </div>
      </div>

      {error && <div className="px-5 pt-2"><ErrorBanner message={error} onDismiss={() => setError(null)} /></div>}

      {/* ── HTML Preview (iframe) ── */}
      <div className="flex-1 overflow-hidden bg-obsidian-950 relative flex flex-row">

        {/* Version History Drawer (right side) */}
        {showVersions && (
          <div className="w-48 bg-obsidian-900 border-l border-obsidian-700 flex flex-col flex-shrink-0 order-2">
            <div className="flex items-center justify-between px-3 py-2 border-b border-obsidian-700">
              <span className="text-[10px] text-gray-300 font-medium">{t('reportDetail.versions')}</span>
              <button onClick={() => { setShowVersions(false); setCompareVersionId(null); }} aria-label={t('common.close')} className="text-gray-500 hover:text-gray-300"><X size={12} /></button>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1.5">
              {versions.length === 0 && (
                <p className="text-[9px] text-gray-600 italic text-center py-4">{t('reportDetail.noVersions')}</p>
              )}
              {versions.map((v) => (
                <div
                  key={v.id}
                  onClick={() => {
                    if (compareVersionId === v.id) {
                      setCompareVersionId(null);
                      // Revert to report's current style
                      if (report) setSelectedStyleKey(report.style_key || null);
                    } else {
                      setCompareVersionId(v.id);
                      // Show this version's style in the dock
                      setSelectedStyleKey(v.style_key || null);
                    }
                  }}
                  className={`rounded-lg p-2 border cursor-pointer transition-premium ${
                    compareVersionId === v.id
                      ? 'border-amber-500/50 bg-amber-500/10'
                      : 'border-obsidian-700 hover:border-obsidian-600 hover:bg-obsidian-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[11px] font-mono font-semibold ${compareVersionId === v.id ? 'text-amber-500' : 'text-gray-300'}`}>
                      v{v.version}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!report) return;
                          await fetch(`/api/reports/${report.id}/versions/${v.id}/restore`, {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
                          });
                          setCompareVersionId(null);
                          const fresh = await reportsApi.get(report.id);
                          setReport(fresh);
                          refreshVersion(report.id);
                          if (iframeRef.current) iframeRef.current.src = withToken(`/api/reports/${report.id}/html?t=${Date.now()}`);
                          setToast(t('reportDetail.versionRestored'));
                          setTimeout(() => setToast(null), 3000);
                        }}
                        className="text-gray-600 hover:text-amber-500 transition-premium"
                        title={t('reportDetail.restoreVersion')}
                        aria-label={t('reportDetail.restoreVersion')}
                      >
                        <ArrowCounterClockwise size={12} />
                      </button>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!report) return;
                          setDeleteVersionTarget({ id: v.id, version: v.version });
                        }}
                        className="text-gray-600 hover:text-red-400 transition-premium"
                        title={t('reportDetail.deleteVersion')}
                        aria-label={t('reportDetail.deleteVersion')}
                      >
                        <Trash size={12} />
                      </button>
                    </div>
                  </div>
                  <span className="text-[8px] text-gray-500 block mt-0.5">
                    {v.created_at ? new Date(v.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                  {v.prompt && <p className="text-[8px] text-gray-500 mt-0.5 truncate">{v.prompt}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main preview area */}
        <div className="flex-1 flex flex-col overflow-hidden order-1">
          <div className={`flex-1 overflow-auto relative ${deviceMode === 'mobile' && hasHtml ? 'flex items-start justify-center py-4' : ''}`}>

        {/* AI Loading Overlay */}
        {aiLoading && (
          <div className="absolute inset-0 z-10 bg-obsidian-950/90 flex flex-col items-center justify-center backdrop-blur-sm">
            {/* Animated dashboard skeleton */}
            <div className="w-80 mb-8">
              <div className="bg-obsidian-900 border border-obsidian-700 rounded-xl p-4 overflow-hidden">
                {/* Fake KPI row */}
                <div className="flex gap-2 mb-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="flex-1 h-10 rounded-lg bg-obsidian-800 shimmer-surface border border-obsidian-700" style={{ animationDelay: `${i * 200}ms` }} />
                  ))}
                </div>
                {/* Fake chart area */}
                <div className="h-24 rounded-lg bg-obsidian-800 shimmer-surface border border-obsidian-700 mb-3" style={{ animationDelay: '600ms' }} />
                {/* Fake bottom row */}
                <div className="flex gap-2">
                  <div className="flex-1 h-16 rounded-lg bg-obsidian-800 shimmer-surface border border-obsidian-700" style={{ animationDelay: '800ms' }} />
                  <div className="flex-1 h-16 rounded-lg bg-obsidian-800 shimmer-surface border border-obsidian-700" style={{ animationDelay: '1000ms' }} />
                </div>
              </div>
            </div>
            {/* Loading text with animation */}
            <div className="flex items-center gap-3 mb-3">
              <div className="relative w-8 h-8">
                <div className="absolute inset-0 border-2 border-amber-500/20 rounded-full" />
                <div className="absolute inset-0 border-2 border-transparent border-t-amber-500 rounded-full animate-spin" />
                <Sparkle size={14} className="absolute inset-0 m-auto text-amber-500" />
              </div>
              <span className="text-sm text-gray-300 font-medium">{t('reportDetail.aiLoading.title')}</span>
            </div>
            <LoadingMessages t={t} />
            <button
              onClick={handleAIStop}
              className="mt-4 flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-gray-200 border border-obsidian-700 hover:border-obsidian-600 px-3 py-1.5 rounded-lg transition-premium"
            >
              <Stop size={11} /> {t('reportDetail.runInBackground')}
            </button>
            <p className="text-[9px] text-gray-600 mt-2">{t('reportDetail.backgroundHint')}</p>
          </div>
        )}

        {hasHtml || compareVersionId ? (
          <div className={deviceMode === 'mobile' && !compareVersionId ? 'w-[375px] h-[667px] border border-obsidian-700 rounded-2xl overflow-hidden shadow-2xl bg-obsidian-950 flex-shrink-0' : 'w-full h-full'}>
            {compareVersionId && report && (
              <div className="absolute top-2 left-2 z-10 text-[9px] bg-obsidian-900/90 border border-amber-500/30 rounded px-2 py-0.5 text-amber-500">
                v{versions.find(v => v.id === compareVersionId)?.version} — {t('reportDetail.oldVersion')}
              </div>
            )}
            <iframe
              ref={iframeRef}
              key={compareVersionId ? `ver-${compareVersionId}` : report?.updated_at}
              src={compareVersionId && report ? withToken(`/api/reports/${report.id}/versions/${compareVersionId}/html`) : iframeSrc}
              className="w-full h-full border-0"
              sandbox="allow-scripts allow-same-origin"
              title={report?.title}
            />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center px-6">
            <Sparkle size={32} className="text-amber-500/30 mb-4" />
            <p className="text-sm text-gray-300 font-medium mb-2">{t('reportDetail.htmlEmpty.title')}</p>
            <p className="text-[11px] text-gray-500 max-w-md text-center mb-4">{t('reportDetail.htmlEmpty.description')}</p>
            {datasources.length === 0 && (
              <button onClick={() => setShowDsModal(true)} className="flex items-center gap-1.5 bg-obsidian-800 hover:bg-obsidian-700 border border-obsidian-700 text-gray-200 text-xs px-4 py-2 rounded-lg transition-premium mb-3">
                <Plus size={14} /> {t('reportDetail.htmlEmpty.addData')}
              </button>
            )}
            <p className="text-[10px] text-gray-600">{t('reportDetail.htmlEmpty.hint')}</p>
          </div>
        )}
          </div>{/* close inner scroll */}
        </div>{/* close order-1 main preview */}
      </div>

      {/* ── AI Chat Bar (bottom) with Dock-style selector ── */}
      <div className="flex-shrink-0 border-t border-obsidian-700 px-5 py-3 bg-obsidian-900 relative">
        <div className="flex items-center gap-2 max-w-4xl mx-auto">
          {/* Left: Dock style selector */}
          {!aiLoading && (
            <StyleDock
              selectedKey={selectedStyleKey}
              onSelect={(key, prompt) => {
                setSelectedStyleKey(key);
                if (report) reportsApi.updateStyle(report.id, key).catch(() => {});
                handleAISendPrompt(prompt);
              }}
            />
          )}

          {/* Input with selected style indicator */}
          <div className="relative flex-1 min-w-0">
            {selectedStyleKey ? (
              <button
                onClick={() => { setSelectedStyleKey(null); if (report) reportsApi.updateStyle(report.id, null).catch(() => {}); }}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm leading-none z-10"
                title={t('reportDetail.clearStyle')}
              >
                {DOCK_STYLES.find(s => s.key === selectedStyleKey)?.emoji || '✨'}
              </button>
            ) : (
              <Sparkle size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
            )}
            <input
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAISend(); } }}
              placeholder={hasHtml ? t('reportDetail.aiRefineHint') : t('reportDetail.aiGenerateHint')}
              disabled={aiLoading}
              className="w-full bg-obsidian-800 border border-obsidian-700 rounded-xl pl-9 pr-10 py-2.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-amber-500/50 transition-premium disabled:opacity-50"
            />
            <button
              onClick={aiLoading ? handleAIStop : handleAISend}
              disabled={!aiLoading && !aiInput.trim()}
              className={`absolute right-3 top-1/2 -translate-y-1/2 transition-premium ${aiLoading ? 'text-red-400 hover:text-red-300' : 'text-gray-500 hover:text-amber-500 disabled:text-gray-700'}`}
              title={aiLoading ? t('reportDetail.stopGenerate') : undefined}
            >
              {aiLoading ? <Stop size={16} weight="fill" /> : <PaperPlaneRight size={14} weight="fill" />}
            </button>
          </div>

          {/* Right: one-click generate */}
          {!aiLoading && (
            <button
              onClick={() => handleAISendPrompt('生成一个专业的数据驾驶舱，顶部KPI卡片，中间趋势图和对比图，底部明细')}
              disabled={aiLoading || datasources.length === 0}
              className="flex items-center gap-1.5 text-[10px] text-[#08080c] bg-amber-500 hover:bg-amber-400 font-semibold px-3 py-2 rounded-lg whitespace-nowrap transition-premium disabled:opacity-40 active:translate-y-[1px] flex-shrink-0"
            >
              <Sparkle size={11} weight="fill" />
              {t('reportDetail.quickActions.generate')}
            </button>
          )}

          {/* Right: ask history */}
          <div className="relative flex-shrink-0">
            <button
              onClick={toggleHistory}
              title={t('reportDetail.askHistory')}
              className={`flex items-center justify-center w-9 h-9 rounded-lg border transition-premium ${
                showHistory
                  ? 'text-amber-500 border-amber-500/40 bg-amber-500/10'
                  : 'text-gray-400 border-obsidian-700 hover:text-amber-500 hover:border-amber-500/30'
              }`}
            >
              <ClockCounterClockwise size={15} />
            </button>
            {showHistory && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowHistory(false)} />
                <div className="absolute bottom-full right-0 mb-2 z-40 w-80 bg-obsidian-900 border border-obsidian-700 rounded-xl shadow-2xl overflow-hidden">
                  <div className="px-3 py-2 border-b border-obsidian-700 flex items-center gap-2">
                    <ClockCounterClockwise size={13} className="text-amber-500" />
                    <span className="text-[11px] text-gray-300 font-medium">{t('reportDetail.askHistory')}</span>
                    <span className="text-[10px] text-gray-600 ml-auto">{history.filter(h => h.prompt).length}</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto scrollbar-thin py-1">
                    {history.filter(h => h.prompt).length === 0 ? (
                      <p className="text-[10px] text-gray-600 text-center py-5 italic">{t('reportDetail.noAskHistory')}</p>
                    ) : (
                      history.filter(h => h.prompt).map((h) => (
                        <button
                          key={h.id}
                          onClick={() => { setAiInput(h.prompt || ''); setShowHistory(false); }}
                          className="w-full text-left px-3 py-2 hover:bg-obsidian-800 transition-premium group border-b border-obsidian-800/60 last:border-0"
                          title={t('reportDetail.reusePrompt')}
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[8px] text-amber-500/70 font-mono">v{h.version}</span>
                            <span className="text-[8px] text-gray-600">
                              {h.created_at ? new Date(h.created_at).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-300 group-hover:text-gray-100 line-clamp-2">{h.prompt}</p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        {aiLoading && <p className="text-center text-[10px] text-amber-500/60 mt-1.5">{t('reportDetail.aiGenerating')}</p>}
      </div>

      {/* ── Datasource Modal ── */}
      {showDsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowDsModal(false)}>
          <div className="bg-obsidian-900 border border-obsidian-700 rounded-2xl w-[420px] max-h-[70vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-obsidian-700">
              <h2 className="text-sm font-semibold text-gray-200">{t('reportDetail.dataSources')}</h2>
              <button onClick={() => setShowDsModal(false)} className="text-gray-500 hover:text-gray-300"><X size={16} /></button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[50vh] scrollbar-thin space-y-3">
              {/* Current datasources */}
              {datasources.length > 0 && (
                <div>
                  <span className="text-[9px] text-gray-500 uppercase tracking-wide font-medium">{t('reportDetail.currentData')}</span>
                  <div className="mt-1.5 space-y-1">
                    {datasources.map((ds) => (
                      <div key={ds.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-obsidian-800 border border-obsidian-700 group">
                        <Database size={12} className="text-data-green" />
                        <span className="text-xs text-gray-300 flex-1 truncate">{ds.name}</span>
                        <span className="text-[9px] text-gray-600">{ds.row_count ?? 0} rows</span>
                        <button
                          onClick={async () => {
                            await reportsApi.removeDatasource(report!.id, ds.id).catch(() => {});
                            setDatasources((prev) => prev.filter((d) => d.id !== ds.id));
                          }}
                          className="text-gray-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-premium flex-shrink-0"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Add by group */}
              {metricGroups.length > 0 && (
                <div>
                  <span className="text-[9px] text-gray-500 uppercase tracking-wide font-medium">{t('reportDetail.addByGroup')}</span>
                  <div className="mt-1.5 space-y-1">
                    {metricGroups.map((g) => {
                      const gm = metrics.filter((m) => m.group_id === g.id && !datasources.some((d) => d.metric_id === m.id));
                      if (gm.length === 0) return null;
                      return (
                        <div key={g.id} onClick={() => handleAddGroup(g.id)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20 cursor-pointer transition-premium">
                          <Star size={12} className="text-amber-500" weight="fill" />
                          <span className="text-xs text-amber-500/90 font-medium flex-1 truncate">{g.name}</span>
                          <span className="text-[9px] text-amber-500/60">{gm.length} {t('reportDetail.addByGroupCount')}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {/* Individual metrics */}
              <div>
                <span className="text-[9px] text-gray-500 uppercase tracking-wide font-medium">{t('reportDetail.addFromMetrics')}</span>
                <div className="mt-1.5 space-y-1">
                  {metrics.filter((m) => !datasources.some((d) => d.metric_id === m.id)).map((m) => (
                    <div key={m.id} onClick={() => { handleAddMetric(m); }} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-obsidian-800 border border-obsidian-700/50 cursor-pointer transition-premium">
                      <Star size={11} className="text-amber-500/60" weight="fill" />
                      <span className="text-xs text-gray-400 flex-1 truncate">{m.name}</span>
                      <Plus size={11} className="text-gray-600" />
                    </div>
                  ))}
                  {metrics.length === 0 && <p className="text-[10px] text-gray-600 italic">{t('metrics.empty.sidebar')}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Version Confirmation Modal */}
      {deleteVersionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDeleteVersionTarget(null)}>
          <div className="bg-obsidian-900 border border-obsidian-700 rounded-xl p-5 w-80 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold text-gray-100 mb-2">{t('reportDetail.deleteVersionConfirm.title')}</h3>
            <p className="text-xs text-gray-400 mb-4">{t('reportDetail.deleteVersionConfirm.message', { version: deleteVersionTarget.version })}</p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteVersionTarget(null)}
                className="text-xs text-gray-400 hover:text-gray-200 px-3 py-1.5 rounded-md border border-obsidian-700 transition-premium"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={async () => {
                  if (!report) return;
                  const res = await fetch(`/api/reports/${report.id}/versions/${deleteVersionTarget.id}`, {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
                  });
                  if (!res.ok) {
                    setDeleteVersionTarget(null);
                    setToast(t('errors.deleteFailed'));
                    setTimeout(() => setToast(null), 3000);
                    return;
                  }
                  if (compareVersionId === deleteVersionTarget.id) setCompareVersionId(null);
                  setVersions(versions.filter(ver => ver.id !== deleteVersionTarget.id));
                  setDeleteVersionTarget(null);
                  setToast(t('reportDetail.versionDeleted'));
                  setTimeout(() => setToast(null), 3000);
                }}
                className="text-xs text-white bg-red-600 hover:bg-red-500 px-3 py-1.5 rounded-md transition-premium"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function LoadingMessages({ t }: { t: (k: string) => string }) {
  const [msgIndex, setMsgIndex] = useState(0);
  const messages = [
    t('reportDetail.aiLoading.msg1'),
    t('reportDetail.aiLoading.msg2'),
    t('reportDetail.aiLoading.msg3'),
    t('reportDetail.aiLoading.msg4'),
    t('reportDetail.aiLoading.msg5'),
    t('reportDetail.aiLoading.msg6'),
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % messages.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [messages.length]);

  return (
    <p className="text-[11px] text-gray-500 animate-pulse transition-all duration-500">
      {messages[msgIndex]}
    </p>
  );
}

// ── Custom Refresh Interval Picker (dark themed dropdown) ──
function RefreshIntervalPicker({ value, onChange, t }: { value: number; onChange: (v: number) => void; t: (k: string) => string }) {
  const [open, setOpen] = useState(false);
  const options = [
    { value: 0, label: t('reportDetail.refresh.off') },
    { value: 1, label: `1 ${t('reportDetail.refresh.min')}` },
    { value: 5, label: `5 ${t('reportDetail.refresh.min')}` },
    { value: 15, label: `15 ${t('reportDetail.refresh.min')}` },
    { value: 30, label: `30 ${t('reportDetail.refresh.min')}` },
    { value: 60, label: `1 ${t('reportDetail.refresh.hour')}` },
  ];
  const current = options.find((o) => o.value === value) || options[5];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-gray-200 border border-obsidian-700 px-2.5 py-1.5 rounded-md transition-premium"
      >
        <Clock size={11} />
        <span>{current.label}</span>
        <CaretDown size={9} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 bg-obsidian-900 border border-obsidian-700 rounded-lg shadow-2xl py-1 min-w-[120px]">
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-[10px] transition-premium ${
                  opt.value === value
                    ? 'text-amber-500 bg-amber-500/10'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-obsidian-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── macOS Dock-style Style Selector ──
const DOCK_STYLES = [
  // ── Dark & Tech ──
  { key: 'obsidian', emoji: '🖤', label: '黑曜石', prompt: '完全重新设计整个页面视觉风格为【黑曜石】：背景纯黑(#08080c)；主色金色(#d4a853)辅以暖灰(#a3a3a3)；字体Inter/system-ui，标题font-weight:600 letter-spacing:-0.02em；KPI数字52px+用金色，下方8px灰色标签；卡片background:#111116 border:1px solid #1f1f28 border-radius:16px padding:24px，hover时border变为rgba(212,168,83,0.3)；布局3列grid gap:16px；图表ECharts用金色(#d4a853)+青色(#22d3ee)+灰色(#6b7280)三色系；整体高端克制，像奢侈品仪表盘' },
  { key: 'neon', emoji: '💚', label: '赛博霓虹', prompt: '完全重新设计整个页面视觉风格为【赛博霓虹】：背景#000000；唯一强调色#00ff88(霓虹绿)；字体全部JetBrains Mono/monospace font-weight:400；KPI数字用text-shadow:0 0 30px #00ff88,0 0 60px #00ff8844 强烈发光；卡片border-radius:0(方角) border:1px solid #00ff8833 background:#000000；hover时border变亮+box-shadow:0 0 20px #00ff8822；布局2列主+右侧窄列(8:4)；所有线条极细(0.5px)；加扫描线伪元素(repeating-linear-gradient每3px一条1px的半透明绿线)；图表只用绿色系' },
  { key: 'midnight', emoji: '🌌', label: '深空', prompt: '完全重新设计整个页面视觉风格为【深空】：背景从#0a0a1a到#0f0f2e的微妙渐变；主色柔和薰衣草紫(#a78bfa)+星光白(#f1f5f9)；字体Inter font-weight:300(细体)标题用font-weight:500；KPI数字大(48px)用白色,副标题用紫色；卡片background:rgba(15,15,40,0.8) backdrop-filter:blur(12px) border:1px solid rgba(167,139,250,0.15) border-radius:20px；布局宽松gap:20px 2列对称；图表配色紫(#a78bfa)+蓝(#60a5fa)+粉(#f472b6)；整体像太空站控制面板' },

  // ── Business & Professional ──
  { key: 'corporate', emoji: '🔵', label: '商务蓝', prompt: '完全重新设计整个页面视觉风格为【商务蓝】：背景#0f172a(深海军蓝)；主色#3b82f6(蓝)+白色文字；字体Inter font-weight:400正文/700标题；KPI数字白色44px font-weight:700,背景用蓝色渐变卡片(linear-gradient 135deg #1e40af to #3b82f6)内白字；其他卡片background:#1e293b border:1px solid #334155 border-radius:12px；布局紧凑3列grid gap:12px；表格有斑马纹(#1e293b/#0f172a交替)表头蓝色背景白字；图表蓝色系(#3b82f6,#60a5fa,#93c5fd,#bfdbfe)；整体像企业级BI工具' },
  { key: 'executive', emoji: '👔', label: '总裁灰', prompt: '完全重新设计整个页面视觉风格为【总裁灰】：背景#18181b(锌灰)；配色只用灰度+一个强调色翡翠绿(#10b981)；字体Inter font-weight:300(极细体)标题用font-weight:600；KPI数字56px font-weight:200(超细),绿色仅用于正向指标箭头；卡片background:#27272a border:none border-radius:8px box-shadow:0 1px 3px rgba(0,0,0,0.3)；布局4列KPI行+2列图表行，留白极大padding:32px；图表只用灰(#71717a)+绿(#10b981)两色；整体像CEO专属的极简仪表盘' },

  // ── Modern & Trendy ──
  { key: 'aurora', emoji: '🟣', label: '极光', prompt: '完全重新设计整个页面视觉风格为【极光】：背景#0c0a1d；大背景有微弱的极光渐变(用一个fixed定位的div做radial-gradient:紫#7c3aed 左上+蓝#2563eb 右下+粉#ec4899 右上,各opacity:0.08)；字体Inter font-weight:400；卡片background:rgba(255,255,255,0.03) backdrop-filter:blur(20px) border:1px solid rgba(255,255,255,0.06) border-radius:24px(超大圆角)；KPI数字用background:linear-gradient(135deg,#a78bfa,#60a5fa) -webkit-background-clip:text渐变字色；布局不规则(首行1个大卡span-2+2个小卡)；图表用紫粉蓝渐变色系' },
  { key: 'glassmorphism', emoji: '💎', label: '玻璃态', prompt: '完全重新设计整个页面视觉风格为【玻璃态】：背景#0d1117(GitHub深色)上面叠加2-3个大彩色模糊圆(用absolute定位的div width:400px height:400px border-radius:50% filter:blur(100px) opacity:0.15 颜色分别用#7c3aed #0ea5e9 #f97316)；字体Inter font-weight:300；卡片background:rgba(255,255,255,0.04) backdrop-filter:blur(24px) border:1px solid rgba(255,255,255,0.08) border-radius:16px；KPI数字白色48px font-weight:200；布局2列等宽gap:16px；图表用半透明色(rgba)描边无填充；整体通透高级' },
  { key: 'brutalist', emoji: '⬛', label: '粗野主义', prompt: '完全重新设计整个页面视觉风格为【粗野主义】：背景#f5f5f4(暖白纸色)；文字纯黑#0a0a0a；字体标题用粗黑体(font-weight:900 text-transform:uppercase letter-spacing:0.05em)正文用mono；KPI数字72px font-weight:900紧凑行高(line-height:1)；卡片无背景色 border:3px solid #0a0a0a border-radius:0(纯方角) padding:20px；布局不对称(左列窄30%右列宽70%或交错)；图表只用黑+一个亮黄(#facc15)；无阴影无渐变；整体像先锋艺术展海报' },

  // ── Warm & Creative ──
  { key: 'sunset', emoji: '🌅', label: '日落暖橙', prompt: '完全重新设计整个页面视觉风格为【日落暖橙】：背景#1a1215(暗巧克力)；主色橙(#f97316)到玫红(#e11d48)渐变；字体Inter font-weight:500；KPI数字用background:linear-gradient(135deg,#f97316,#e11d48) background-clip:text渐变色44px；卡片background:#231920 border:1px solid #3d2030 border-radius:14px；hover时border用橙色glow；布局3列，KPI行每个卡片左侧有4px粗渐变条(border-left)；图表用暖色系(#f97316,#ef4444,#eab308,#f472b6)面积图+柱图；整体热烈活力' },
  { key: 'mint', emoji: '🌿', label: '薄荷清新', prompt: '完全重新设计整个页面视觉风格为【薄荷清新】：背景#f0fdf4(极浅薄荷绿)；主色翠绿(#059669)+深灰文字(#1f2937)；字体Inter font-weight:400正文/600标题；KPI数字36px font-weight:700 颜色#059669；卡片background:#ffffff border:1px solid #d1fae5 border-radius:12px box-shadow:0 2px 8px rgba(5,150,105,0.06)；布局3列等宽gap:16px整洁；表格绿色表头白字；图表用绿色系(#059669,#34d399,#6ee7b7,#a7f3d0)；整体清爽专业像医疗/环保仪表盘' },

  // ── Classic & Elegant ──
  { key: 'ivory', emoji: '📜', label: '象牙学术', prompt: '完全重新设计整个页面视觉风格为【象牙学术】：背景#faf9f7(象牙白)；文字#292524(暖黑)；字体标题用衬线体(Georgia/Playfair Display/serif) font-weight:700 font-style:italic，正文用无衬线(Inter)；KPI数字48px font-weight:300 color:#44403c 下划线用2px amber装饰线(border-bottom)；卡片background:#ffffff border:1px solid #e7e5e4 border-radius:4px(极小圆角)；布局对称2列，大量上下留白(padding:40px)；图表用大地色系(#92400e,#b45309,#78716c,#57534e)线条图为主；整体像学术论文配图' },
  { key: 'noir', emoji: '🎬', label: '黑色电影', prompt: '完全重新设计整个页面视觉风格为【黑色电影】：背景#0a0a0a；只用黑白灰+一个点缀红(#dc2626)；字体Courier New/monospace全部大写(text-transform:uppercase)标题letter-spacing:0.1em；KPI数字白色60px font-weight:100(极细hairline)；卡片background:#141414 border:1px solid #262626 border-radius:0；布局单列全宽，信息从上到下流动如电影字幕；红色只用于警告/关键数据；图表极简只有线条(1px白色/灰色)；整体像黑白电影片头的数据化' },
];

function StyleDock({ selectedKey, onSelect }: { selectedKey: string | null; onSelect: (key: string, prompt: string) => void }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mouseX, setMouseX] = useState(0);
  const dockRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dockRef.current) return;
    const rect = dockRef.current.getBoundingClientRect();
    setMouseX(e.clientX - rect.left);
  };

  const getScale = (index: number) => {
    if (hoveredIndex === null) return 1;
    if (!dockRef.current) return 1;
    const itemWidth = dockRef.current.scrollWidth / DOCK_STYLES.length;
    const itemCenter = itemWidth * index + itemWidth / 2;
    const distance = Math.abs(mouseX - itemCenter);
    const maxDistance = itemWidth * 2.5;
    if (distance > maxDistance) return 1;
    return 1 + 0.5 * Math.cos((distance / maxDistance) * Math.PI / 2);
  };

  return (
    <div
      ref={dockRef}
      className="flex items-end gap-0.5 px-2 py-1.5 bg-obsidian-800/80 backdrop-blur-md border border-obsidian-700/50 rounded-xl flex-shrink-0"
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHoveredIndex(0)}
      onMouseLeave={() => setHoveredIndex(null)}
    >
      {DOCK_STYLES.map((style, i) => {
        const scale = getScale(i);
        const isSelected = selectedKey === style.key;
        return (
          <button
            key={style.key}
            onClick={() => onSelect(style.key, style.prompt)}
            onMouseEnter={() => setHoveredIndex(i)}
            className={`relative flex flex-col items-center transition-transform duration-150 ease-out origin-bottom ${isSelected ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
            style={{ transform: `scale(${scale})` }}
            title={style.label}
          >
            <span className="text-base leading-none select-none">{style.emoji}</span>
            {isSelected && <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-amber-500" />}
            {hoveredIndex === i && (
              <span className="absolute -top-6 left-1/2 -translate-x-1/2 bg-obsidian-900 border border-obsidian-700 text-[8px] text-gray-300 px-1.5 py-0.5 rounded whitespace-nowrap shadow-lg z-10">
                {style.label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
