'use client';

import { useState, useEffect } from 'react';
import { BarChart3, Eye, MousePointerClick, Loader2 } from 'lucide-react';
import { formatNumber } from '@/lib/utils';

interface BioAnalyticsPanelProps {
  pageId: string;
}

interface AnalyticsData {
  total_views: number;
  views_today: number;
  views_this_week: number;
  views_this_month: number;
  links: Array<{
    id: string;
    title: string;
    total_clicks: number;
  }>;
}

export function BioAnalyticsPanel({ pageId }: BioAnalyticsPanelProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await fetch(`/api/bio/${pageId}/analytics`);
        if (res.ok) {
          setData(await res.json());
        }
      } catch {
        // Non-critical
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, [pageId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Unable to load analytics data.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* View stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Views" value={data.total_views} icon={<Eye className="h-4 w-4" />} />
        <StatCard label="Today" value={data.views_today} icon={<BarChart3 className="h-4 w-4" />} />
        <StatCard label="This Week" value={data.views_this_week} icon={<BarChart3 className="h-4 w-4" />} />
        <StatCard label="This Month" value={data.views_this_month} icon={<BarChart3 className="h-4 w-4" />} />
      </div>

      {/* Link clicks */}
      {data.links.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Link Clicks</h3>
          <div className="space-y-2">
            {data.links.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between py-2 px-3 rounded-sm bg-muted/50"
              >
                <span className="text-sm truncate flex-1 mr-4">{link.title}</span>
                <span className="text-sm font-medium flex items-center gap-1.5">
                  <MousePointerClick className="h-3.5 w-3.5 text-muted-foreground" />
                  {formatNumber(link.total_clicks)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-sm p-3 space-y-1">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-lg font-semibold">{formatNumber(value)}</p>
    </div>
  );
}
