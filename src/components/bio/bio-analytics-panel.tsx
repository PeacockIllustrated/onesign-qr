'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import {
  Eye,
  MousePointerClick,
  TrendingUp,
  Users,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, Select, Skeleton, Badge } from '@/components/ui';
import { formatNumber } from '@/lib/utils';
import type { BioLinkAnalyticsSummary } from '@/types/bio';

// ─── Constants ──────────────────────────────────────────────────────

const CHART_COLORS = {
  primary: '#000000',
  secondary: '#737373',
  grid: '#e5e5e5',
  pie: ['#000000', '#404040', '#737373', '#a3a3a3', '#d4d4d4'],
};

type Period = '7d' | '30d' | '90d';

// ─── Main component ─────────────────────────────────────────────────

interface BioAnalyticsPanelProps {
  pageId: string;
}

export function BioAnalyticsPanel({ pageId }: BioAnalyticsPanelProps) {
  const [data, setData] = useState<BioLinkAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('30d');

  useEffect(() => {
    let cancelled = false;

    async function fetchAnalytics() {
      setLoading(true);
      try {
        const res = await fetch(`/api/bio/${pageId}/analytics?period=${period}`);
        if (res.ok && !cancelled) {
          setData(await res.json());
        }
      } catch {
        // Non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAnalytics();
    return () => { cancelled = true; };
  }, [pageId, period]);

  // CTR calculation
  const ctr = useMemo(() => {
    if (!data || data.total_views === 0) return '0.0';
    return ((data.total_clicks / data.total_views) * 100).toFixed(1);
  }, [data]);

  // Merge blocks + links for click performance
  const clickPerformance = useMemo(() => {
    if (!data) return [];
    const items = [
      ...data.links.map((l) => ({
        id: l.id,
        label: l.title,
        type: 'link' as const,
        clicks: l.total_clicks,
      })),
      ...data.blocks
        .filter((b) => b.block_type === 'link' || b.total_clicks > 0)
        .map((b) => ({
          id: b.id,
          label: b.label,
          type: b.block_type,
          clicks: b.total_clicks,
        })),
    ];
    return items.sort((a, b) => b.clicks - a.clicks);
  }, [data]);

  const maxClicks = clickPerformance.length > 0
    ? Math.max(...clickPerformance.map((i) => i.clicks), 1)
    : 1;

  // Check if there are any clicks in the time series
  const hasClicks = useMemo(() => {
    if (!data) return false;
    return data.clicks_by_day.some((d) => d.count > 0);
  }, [data]);

  if (loading && !data) {
    return <AnalyticsSkeleton />;
  }

  if (!data) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Unable to load analytics data.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Analytics</h2>
        <Select
          value={period}
          onChange={(e) => setPeriod(e.target.value as Period)}
          className="w-[160px]"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </Select>
      </div>

      {/* Loading overlay for period changes */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Updating…
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Views" value={formatNumber(data.total_views)} icon={<Eye className="h-4 w-4" />} />
        <StatCard label="Total Clicks" value={formatNumber(data.total_clicks)} icon={<MousePointerClick className="h-4 w-4" />} />
        <StatCard label="CTR" value={`${ctr}%`} icon={<TrendingUp className="h-4 w-4" />} />
        <StatCard label="Unique Visitors" value={formatNumber(data.unique_visitors)} icon={<Users className="h-4 w-4" />} />
      </div>

      {/* Views Over Time Chart */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="mb-4 text-sm font-medium">Views Over Time</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data.views_by_day}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDateTick}
                tickLine={false}
                axisLine={false}
                fontSize={11}
                tick={{ fill: '#737373' }}
              />
              <YAxis
                allowDecimals={false}
                tickLine={false}
                axisLine={false}
                fontSize={11}
                tick={{ fill: '#737373' }}
                width={32}
                domain={[0, (max: number) => Math.max(max, 1)]}
              />
              <Tooltip content={<ChartTooltip hasClicks={hasClicks} clicksData={data.clicks_by_day} />} />
              <Area
                type="monotoneX"
                dataKey="count"
                stroke={CHART_COLORS.primary}
                fill={CHART_COLORS.primary}
                fillOpacity={0.08}
                strokeWidth={2}
                name="Views"
                isAnimationActive={false}
              />
              {hasClicks && (
                <Area
                  type="monotoneX"
                  data={data.clicks_by_day}
                  dataKey="count"
                  stroke={CHART_COLORS.secondary}
                  fill={CHART_COLORS.secondary}
                  fillOpacity={0.04}
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  name="Clicks"
                  isAnimationActive={false}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Click Performance */}
      {clickPerformance.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-4 text-sm font-medium">Click Performance</h3>
            <div className="space-y-2">
              {clickPerformance.slice(0, 15).map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
                    {item.type.replace(/_/g, ' ')}
                  </Badge>
                  <span className="min-w-0 flex-1 truncate text-sm">{item.label}</span>
                  <span className="shrink-0 text-sm font-medium tabular-nums">
                    {formatNumber(item.clicks)}
                  </span>
                  <div className="h-2 w-16 sm:w-24 shrink-0 overflow-hidden rounded-full bg-foreground/10">
                    <div
                      className="h-full rounded-full bg-foreground transition-all"
                      style={{ width: `${(item.clicks / maxClicks) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Countries + Devices */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Countries */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-4 text-sm font-medium">Top Countries</h3>
            {data.top_countries.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No country data yet</p>
            ) : (
              <div className="space-y-2">
                {data.top_countries.slice(0, 8).map((item) => {
                  const maxCount = data.top_countries[0]?.count ?? 1;
                  return (
                    <div key={item.country} className="flex items-center gap-3">
                      <span className="w-8 shrink-0 text-center text-base">
                        {countryCodeToFlag(item.country)}
                      </span>
                      <span className="w-8 shrink-0 text-xs font-medium uppercase text-muted-foreground">
                        {item.country}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-foreground/10">
                        <div
                          className="h-full rounded-full bg-foreground transition-all"
                          style={{ width: `${(item.count / maxCount) * 100}%` }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right text-sm font-medium tabular-nums">
                        {formatNumber(item.count)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Device Breakdown */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-4 text-sm font-medium">Devices</h3>
            {data.top_devices.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No device data yet</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={data.top_devices.map((d) => ({ name: d.device, value: d.count }))}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {data.top_devices.map((_, index) => (
                        <Cell
                          key={index}
                          fill={CHART_COLORS.pie[index % CHART_COLORS.pie.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [formatNumber(Number(value) || 0), String(name ?? '')]}
                      contentStyle={{
                        borderRadius: '4px',
                        border: '1px solid #e5e5e5',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 flex flex-wrap justify-center gap-4">
                  {data.top_devices.map((d, index) => {
                    const total = data.top_devices.reduce((sum, x) => sum + x.count, 0);
                    const pct = total > 0 ? ((d.count / total) * 100).toFixed(0) : '0';
                    return (
                      <div key={d.device} className="flex items-center gap-1.5 text-xs">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: CHART_COLORS.pie[index % CHART_COLORS.pie.length] }}
                        />
                        <span className="capitalize">{d.device}</span>
                        <span className="text-muted-foreground">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Referrers + Browsers */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Referrers */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-4 text-sm font-medium">Top Referrers</h3>
            {data.top_referrers.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No referrer data yet</p>
            ) : (
              <div className="space-y-2">
                {data.top_referrers.slice(0, 8).map((item) => {
                  const maxCount = data.top_referrers[0]?.count ?? 1;
                  return (
                    <div key={item.domain} className="flex items-center gap-3">
                      <span className="min-w-0 flex-1 truncate text-sm">{item.domain}</span>
                      <div className="h-2 w-20 shrink-0 overflow-hidden rounded-full bg-foreground/10">
                        <div
                          className="h-full rounded-full bg-foreground transition-all"
                          style={{ width: `${(item.count / maxCount) * 100}%` }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right text-sm font-medium tabular-nums">
                        {formatNumber(item.count)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Browsers */}
        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-4 text-sm font-medium">Browsers</h3>
            {data.top_browsers.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No browser data yet</p>
            ) : (
              <div className="space-y-2">
                {data.top_browsers.slice(0, 6).map((item) => {
                  const maxCount = data.top_browsers[0]?.count ?? 1;
                  return (
                    <div key={item.browser} className="flex items-center gap-3">
                      <span className="w-20 shrink-0 truncate text-sm">{item.browser}</span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-foreground/10">
                        <div
                          className="h-full rounded-full bg-foreground transition-all"
                          style={{ width: `${(item.count / maxCount) * 100}%` }}
                        />
                      </div>
                      <span className="w-10 shrink-0 text-right text-sm font-medium tabular-nums">
                        {formatNumber(item.count)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="space-y-1 rounded-sm border border-border p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

// ─── Chart tooltip ───────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
  hasClicks,
  clicksData,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
  hasClicks: boolean;
  clicksData: Array<{ date: string; count: number }>;
}) {
  if (!active || !payload?.length || !label) return null;

  const formattedDate = new Date(label).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const views = payload[0]?.value ?? 0;
  const clickEntry = hasClicks ? clicksData.find((c) => c.date === label) : null;

  return (
    <div className="rounded border border-border bg-background px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-medium">{formattedDate}</p>
      <p>Views: <span className="font-semibold">{formatNumber(views)}</span></p>
      {clickEntry && (
        <p className="text-muted-foreground">
          Clicks: <span className="font-semibold">{formatNumber(clickEntry.count)}</span>
        </p>
      )}
    </div>
  );
}

// ─── Loading skeleton ────────────────────────────────────────────────

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-10 w-[160px]" />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-[72px]" />
        ))}
      </div>
      <Skeleton className="h-[300px]" />
      <Skeleton className="h-[200px]" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-[220px]" />
        <Skeleton className="h-[220px]" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-[200px]" />
        <Skeleton className="h-[200px]" />
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

/** Format a date string for chart X-axis ticks (e.g. "Jan 5") */
function formatDateTick(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/** Convert a 2-letter ISO country code to a flag emoji using regional indicator symbols. */
function countryCodeToFlag(code: string): string {
  if (!code || code.length !== 2) return '🌍';
  const upper = code.toUpperCase();
  return String.fromCodePoint(
    ...Array.from(upper).map((c) => 0x1F1E6 + c.charCodeAt(0) - 65)
  );
}
