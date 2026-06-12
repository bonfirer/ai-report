import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

/**
 * Shared report page — simply redirects to the server-rendered HTML.
 * The server returns the full self-contained H5 page directly.
 */
export default function SharedReportPage() {
  const { token } = useParams<{ token: string }>();

  useEffect(() => {
    if (token) {
      // Redirect to the raw HTML endpoint
      window.location.href = `/api/share/${token}/html`;
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-obsidian-950 flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
    </div>
  );
}
