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
  BarChart3,
  Users,
  CalendarDays,
  Smartphone,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, Select, Skeleton } from '@/components/ui';
import { formatNumber } from '@/lib/utils';
import type { AnalyticsSummary } from '@/types/qr';

const CHART_COLORS = {
  primary: '#a3e635', // lime accent already used elsewhere in dashboard
  grid: 'rgba(255,255,255,0.06)',
  axis: '#71717a',
  pie: ['#a3e635', '#84cc16', '#65a30d', '#4d7c0f', '#3f6212'],
};

type Period = '7d' | '30d' | '90d';

interface QRAnalyticsPanelProps {
  qrId: string;
}

export function QRAnalyticsPanel({ qrId }: QRAnalyticsPanelProps) {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>('30d');

  useEffect(() => {
    let cancelled = false;

    async function fetchAnalytics() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/qr/${qrId}/analytics?period=${period}`);
        if (cancelled) return;
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          setError(body?.error ?? 'Failed to load analytics');
          setData(null);
        } else {
          setData(await res.json());
        }
      } catch {
        if (!cancelled) setError('Failed to load analytics');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAnalytics();
    return () => { cancelled = true; };
  }, [qrId, period]);

  const hasScans = useMemo(() => {
    if (!data) return false;
    return data.scans_by_day.some((d) => d.count > 0);
  }, [data]);

  if (loading && !data) return <AnalyticsSkeleton />;

  if (error) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {error}
      </p>
    );
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
      {/* Period Selector */}
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

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Updating…
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Scans" value={formatNumber(data.total_scans)} icon={<BarChart3 className="h-4 w-4" />} />
        <StatCard label="Unique Visitors" value={formatNumber(data.unique_visitors)} icon={<Users className="h-4 w-4" />} />
        <StatCard label="Today" value={formatNumber(data.scans_today)} icon={<CalendarDays className="h-4 w-4" />} />
        <StatCard label="This Week" value={formatNumber(data.scans_this_week)} icon={<CalendarDays className="h-4 w-4" />} />
      </div>

      {/* Empty state when no scans at all in window */}
      {!hasScans ? (
        <Card>
          <CardContent className="pt-6 pb-6">
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No scans in the selected period yet.</p>
              <p className="text-xs mt-1">Share the QR code to see real-time analytics here.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Time series */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="mb-4 text-sm font-medium">Scans Over Time</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={data.scans_by_day}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={formatDateTick}
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tick={{ fill: CHART_COLORS.axis }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tick={{ fill: CHART_COLORS.axis }}
                    width={32}
                    domain={[0, (max: number) => Math.max(max, 1)]}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotoneX"
                    dataKey="count"
                    stroke={CHART_COLORS.primary}
                    fill={CHART_COLORS.primary}
                    fillOpacity={0.15}
                    strokeWidth={2}
                    name="Scans"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Countries + Devices */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardContent className="pt-6">
                <h3 className="mb-4 text-sm font-medium">Top Countries</h3>
                {data.top_countries.length === 0 ? (
                  <EmptyHint>No country data yet</EmptyHint>
                ) : (
                  <BreakdownBars
                    items={data.top_countries.slice(0, 8).map((c) => ({
                      key: c.country,
                      leading: (
                        <>
                          <span className="w-8 shrink-0 text-center text-base">{countryCodeToFlag(c.country)}</span>
                          <span className="w-8 shrink-0 text-xs font-medium uppercase text-muted-foreground">
                            {c.country}
                          </span>
                        </>
                      ),
                      count: c.count,
                    }))}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h3 className="mb-4 text-sm font-medium">Devices</h3>
                {data.top_devices.length === 0 ? (
                  <EmptyHint>No device data yet</EmptyHint>
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
                            border: '1px solid rgba(255,255,255,0.1)',
                            background: '#18181b',
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

          {/* OS + Browser */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardContent className="pt-6">
                <h3 className="mb-4 text-sm font-medium">Operating Systems</h3>
                {data.top_os.length === 0 ? (
                  <EmptyHint>No OS data yet</EmptyHint>
                ) : (
                  <BreakdownBars
                    items={data.top_os.slice(0, 6).map((o) => ({
                      key: o.os,
                      leading: <span className="w-24 shrink-0 truncate text-sm">{o.os}</span>,
                      count: o.count,
                    }))}
                  />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h3 className="mb-4 text-sm font-medium">Browsers</h3>
                {data.top_browsers.length === 0 ? (
                  <EmptyHint>No browser data yet</EmptyHint>
                ) : (
                  <BreakdownBars
                    items={data.top_browsers.slice(0, 6).map((b) => ({
                      key: b.browser,
                      leading: <span className="w-24 shrink-0 truncate text-sm">{b.browser}</span>,
                      count: b.count,
                    }))}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Referrers */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="mb-4 text-sm font-medium">Top Referrers</h3>
              {data.top_referrers.length === 0 ? (
                <EmptyHint>No referrer data — most scans came from QR readers, not links</EmptyHint>
              ) : (
                <BreakdownBars
                  items={data.top_referrers.slice(0, 8).map((r) => ({
                    key: r.domain,
                    leading: <span className="min-w-0 flex-1 truncate text-sm">{r.domain}</span>,
                    count: r.count,
                    fillLeading: true,
                  }))}
                />
              )}
            </CardContent>
          </Card>

          {/* Recent Scans */}
          <Card>
            <CardContent className="pt-6">
              <h3 className="mb-4 text-sm font-medium">Recent Scans</h3>
              {data.recent_scans.length === 0 ? (
                <EmptyHint>No recent scans</EmptyHint>
              ) : (
                <div className="space-y-2">
                  {data.recent_scans.map((scan, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 py-2 border-b border-border last:border-b-0 text-sm"
                    >
                      <span className="shrink-0 w-32 text-xs text-muted-foreground tabular-nums">
                        {formatScanTime(scan.scanned_at)}
                      </span>
                      <span className="shrink-0 w-6 text-base">
                        {scan.country_code ? countryCodeToFlag(scan.country_code) : '🌍'}
                      </span>
                      <span className="shrink-0 flex items-center gap-1 text-xs text-muted-foreground capitalize">
                        <Smartphone className="h-3 w-3" />
                        {scan.device_type}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                        {[scan.os_family, scan.browser_family].filter(Boolean).join(' · ') || '—'}
                      </span>
                      {scan.referrer_domain && (
                        <span className="shrink-0 truncate max-w-[140px] text-xs text-muted-foreground">
                          from {scan.referrer_domain}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
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

function EmptyHint({ children }: { children: React.ReactNode }) {
  return <p className="py-4 text-center text-sm text-muted-foreground">{children}</p>;
}

interface BreakdownItem {
  key: string;
  leading: React.ReactNode;
  count: number;
  fillLeading?: boolean;
}

function BreakdownBars({ items }: { items: BreakdownItem[] }) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.key} className="flex items-center gap-3">
          {item.leading}
          <div className={`h-2 ${item.fillLeading ? 'w-20' : 'flex-1'} shrink-0 overflow-hidden rounded-full bg-foreground/10`}>
            <div
              className="h-full rounded-full bg-foreground transition-all"
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
          <span className="w-10 shrink-0 text-right text-sm font-medium tabular-nums">
            {formatNumber(item.count)}
          </span>
        </div>
      ))}
    </div>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string }>;
  label?: string;
}) {
  if (!active || !payload?.length || !label) return null;

  const formattedDate = new Date(label).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const scans = payload[0]?.value ?? 0;

  return (
    <div className="rounded border border-border bg-background px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-medium">{formattedDate}</p>
      <p>Scans: <span className="font-semibold">{formatNumber(scans)}</span></p>
    </div>
  );
}

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
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-[220px]" />
        <Skeleton className="h-[220px]" />
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function formatDateTick(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatScanTime(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return 'just now';
  if (diffMs < hour) return `${Math.floor(diffMs / minute)}m ago`;
  if (diffMs < day) return `${Math.floor(diffMs / hour)}h ago`;
  if (diffMs < 7 * day) return `${Math.floor(diffMs / day)}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function countryCodeToFlag(code: string): string {
  if (!code || code.length !== 2) return '🌍';
  const upper = code.toUpperCase();
  return String.fromCodePoint(
    ...Array.from(upper).map((c) => 0x1F1E6 + c.charCodeAt(0) - 65)
  );
}
