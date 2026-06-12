import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChartBar, Trash, ArrowRight, Clock, ChatCircle } from '@phosphor-icons/react';
import { reportsApi } from '../lib/api';
import type { Report } from '../lib/types';
import { PageHeader, ErrorBanner, EmptyState } from '../components/ui';

export default function ReportsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reportsApi.list();
      setReports(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Poll while any report is generating, to update status live
  useEffect(() => {
    const anyGenerating = reports.some((r) => r.generation_status === 'generating');
    if (!anyGenerating) return;
    const timer = setInterval(() => {
      reportsApi.list().then(setReports).catch(() => {});
    }, 4000);
    return () => clearInterval(timer);
  }, [reports]);

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    try {
      await reportsApi.delete(id);
      await fetchReports();
      window.dispatchEvent(new Event('reports-updated'));
    } catch (e) {
      setError(e instanceof Error ? e.message : t('errors.deleteFailed'));
    }
  };

  const timeAgo = (dateStr?: string) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('time.justNow');
    if (mins < 60) return t('time.minutesAgo', { n: mins });
    const hours = Math.floor(mins / 60);
    if (hours < 24) return t('time.hoursAgo', { n: hours });
    return t('time.daysAgo', { n: Math.floor(hours / 24) });
  };

  return (
    <div className="p-6">
      <PageHeader
        title={t('reports.title')}
        description={t('reports.description')}
        action={
          <button
            onClick={() => navigate('/conversations')}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-[#08080c] font-semibold text-xs px-3 py-2 rounded-lg transition-premium active:translate-y-[1px]"
          >
            <ChatCircle size={14} weight="bold" />
            {t('reports.startConversation')}
          </button>
        }
      />

      {/* Error */}
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-obsidian-900 border border-obsidian-700 rounded-xl p-4 animate-pulse"
            >
              <div className="space-y-3">
                <div className="h-4 bg-obsidian-700 rounded w-48" />
                <div className="h-3 bg-obsidian-700 rounded w-32" />
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3].map((j) => (
                    <div key={j} className="h-16 bg-obsidian-700 rounded-lg" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && reports.length === 0 && (
        <EmptyState
          icon={ChartBar}
          title={t('reports.empty.title')}
          description={t('reports.empty.description')}
          action={
            <button
              onClick={() => navigate('/conversations')}
              className="flex items-center gap-1.5 bg-obsidian-800 hover:bg-obsidian-700 border border-obsidian-700 text-gray-200 text-xs px-4 py-2 rounded-lg transition-premium active:translate-y-[1px]"
            >
              <ChatCircle size={14} />
              {t('reports.startConversation')}
            </button>
          }
        />
      )}

      {/* Report Cards */}
      {!loading && reports.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {reports.map((report, i) => {
            const visCount = report.config?.visualizations?.length || 0;
            const visTypes = report.config?.visualizations?.map((v) => v.type) || [];
            return (
              <div
                key={report.id}
                onClick={() => navigate(`/reports/${report.id}`)}
                className="bg-obsidian-900 border border-obsidian-700 rounded-xl overflow-hidden hover:border-obsidian-600 transition-premium group stagger-item cursor-pointer"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-gray-200 truncate group-hover:text-amber-500 transition-premium flex items-center gap-2">
                        <ReportCardStatusDot report={report} />
                        {report.title}
                      </h3>
                      <p className="text-[10px] text-gray-500 mt-1">
                        {visCount > 0
                          ? t('reports.visualization', { count: visCount })
                          : report.html_content
                            ? t('reports.aiRendered')
                            : t('reports.noVisualization')}
                        {report.description && ` · ${report.description}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-600 ml-2 flex-shrink-0">
                      <Clock size={10} />
                      {timeAgo(report.created_at)}
                    </div>
                  </div>

                  {/* Visualization type badges + pool chips */}
                  <div className="flex gap-1.5 flex-wrap mb-3">
                    {visTypes.slice(0, 4).map((type, idx) => (
                      <span
                        key={idx}
                        className="bg-obsidian-800 text-gray-400 text-[9px] px-1.5 py-0.5 rounded font-mono uppercase"
                      >
                        {type}
                      </span>
                    ))}
                    {report.pool_ids?.slice(0, 3).map((pid) => (
                      <span
                        key={pid}
                        className="bg-amber-500/10 text-amber-500/80 text-[9px] px-1.5 py-0.5 rounded-full font-mono"
                      >
                        pool#{pid}
                      </span>
                    ))}
                  </div>

                  {/* Report preview based on status */}
                  <div className="rounded-lg h-[120px] relative overflow-hidden">
                    {report.generation_status === 'generating' ? (
                      // Generating — skeleton animation
                      <div className="h-full bg-obsidian-800 p-2 space-y-1.5">
                        <div className="flex gap-1.5">
                          {[1,2,3].map(i => <div key={i} className="flex-1 h-5 rounded bg-obsidian-700 shimmer-surface" />)}
                        </div>
                        <div className="h-12 rounded bg-obsidian-700 shimmer-surface" />
                        <div className="flex gap-1.5">
                          <div className="flex-1 h-6 rounded bg-obsidian-700 shimmer-surface" />
                          <div className="flex-1 h-6 rounded bg-obsidian-700 shimmer-surface" />
                        </div>
                      </div>
                    ) : report.html_content ? (
                      // Has HTML — lazy-mount a static preview (no live data fetching)
                      <LazyReportPreview report={report} />
                    ) : report.generation_status === 'failed' ? (
                      // Failed
                      <div className="h-full bg-obsidian-800 flex items-center justify-center">
                        <span className="text-[10px] text-red-400/60">⚠ 生成失败</span>
                      </div>
                    ) : (
                      // Empty — no content yet
                      <div className="h-full bg-obsidian-800 flex flex-col items-center justify-center">
                        <ChartBar size={20} className="text-gray-700 mb-1" />
                        <span className="text-[9px] text-gray-600">等待生成</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 px-4 py-2 border-t border-obsidian-700 bg-obsidian-800/50">
                  <button
                    onClick={(e) => handleDelete(e, report.id)}
                    className="flex items-center gap-1 text-[10px] text-gray-600 hover:text-red-400 px-2 py-1 rounded transition-premium"
                  >
                    <Trash size={12} /> {t('common.delete')}
                  </button>
                  <span className="ml-auto flex items-center gap-1 text-[10px] text-amber-500 group-hover:text-amber-400 px-2 py-1 rounded transition-premium font-medium">
                    {t('common.open')} <ArrowRight size={10} />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Status dot for a report card
function ReportCardStatusDot({ report }: { report: Report }) {
  const status = report.generation_status;
  if (status === 'generating') {
    return <span className="w-2 h-2 rounded-full bg-amber-500 dot-breathe flex-shrink-0" title="生成中" />;
  }
  if (status === 'failed') {
    return <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" title="生成失败" />;
  }
  if (report.html_content || status === 'done') {
    return <span className="w-2 h-2 rounded-full bg-data-green flex-shrink-0" title="已生成" />;
  }
  return <span className="w-2 h-2 rounded-full bg-gray-600 flex-shrink-0" title="未生成" />;
}

// Lazy-mounted static preview: the iframe is only created once the card scrolls
// into view, and loads in preview mode (?preview=1) so no live SQL queries run.
function LazyReportPreview({ report }: { report: Report }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full bg-obsidian-800">
      {visible ? (
        <iframe
          src={`/api/reports/${report.id}/html?preview=1&token=${encodeURIComponent(localStorage.getItem('token') || '')}&t=${report.updated_at || ''}`}
          className="w-full h-full border-0 pointer-events-none"
          style={{ transform: 'scale(0.35)', transformOrigin: 'top left', width: '286%', height: '286%' }}
          tabIndex={-1}
          loading="lazy"
        />
      ) : (
        <div className="h-full flex items-center justify-center">
          <ChartBar size={20} className="text-gray-700 animate-pulse" />
        </div>
      )}
    </div>
  );
}
