"use client";

import React, { useEffect, useState } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8001";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  FileKey,
  Loader2,
  TrendingUp,
  TrendingDown,
} from "lucide-react";

interface CategoryStat {
  category: string;
  count: number;
  resolved: number;
  avg_resolution_hours: number;
}

interface WeeklyTrend {
  week: string;
  opened: number;
  closed: number;
}

interface Neighborhood {
  name: string;
  requests: number;
}

interface AnalyticsData {
  district: string;
  period: string;
  summary: {
    total_311_requests: number;
    resolved: number;
    pending: number;
    overdue: number;
    resolution_rate_pct: number;
  };
  requests_by_category: CategoryStat[];
  weekly_trend: WeeklyTrend[];
  permits: {
    total_issued: number;
    residential: number;
    commercial: number;
    demolition: number;
    special_events: number;
  };
  top_neighborhoods: Neighborhood[];
}

interface AnalyticsPanelProps {
  district: string;
}

export default function AnalyticsPanel({ district }: AnalyticsPanelProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/analytics?role=district_aide&district=${district}`
        );
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError("Failed to load analytics. Ensure the backend is running.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, [district]);

  if (isLoading) {
    return (
      <Card className="border border-border/60 bg-card shadow-sm">
        <CardContent className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="border border-destructive/30 bg-destructive/5 shadow-sm">
        <CardContent className="py-8 text-center text-sm text-destructive font-medium">
          {error || "No data available."}
        </CardContent>
      </Card>
    );
  }

  const maxCategoryCount = Math.max(...data.requests_by_category.map((c) => c.count));
  const maxNeighborhoodCount = Math.max(...data.top_neighborhoods.map((n) => n.requests));

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Identity Banner */}
      <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 rounded-lg px-3 py-2 text-xs font-semibold">
        <ShieldAlert className="h-4 w-4 shrink-0" />
        <span>
          District Aide View — District {data.district} • {data.period}
        </span>
        <Badge className="ml-auto bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px]">
          ROLE-SCOPED
        </Badge>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Total 311 Requests"
          value={data.summary.total_311_requests.toLocaleString()}
          icon={<BarChart3 className="h-4 w-4" />}
          color="text-primary"
          bgColor="bg-primary/10"
        />
        <KpiCard
          label="Resolved"
          value={data.summary.resolved.toLocaleString()}
          icon={<CheckCircle2 className="h-4 w-4" />}
          color="text-green-600 dark:text-green-400"
          bgColor="bg-green-500/10"
        />
        <KpiCard
          label="Pending"
          value={data.summary.pending.toLocaleString()}
          icon={<Clock className="h-4 w-4" />}
          color="text-blue-600 dark:text-blue-400"
          bgColor="bg-blue-500/10"
        />
        <KpiCard
          label="Overdue"
          value={data.summary.overdue.toLocaleString()}
          icon={<AlertTriangle className="h-4 w-4" />}
          color="text-red-600 dark:text-red-400"
          bgColor="bg-red-500/10"
        />
      </div>

      {/* Resolution Rate */}
      <Card className="border border-border/60 bg-card shadow-sm">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Resolution Rate
            </span>
            <span className="text-lg font-black text-foreground">
              {data.summary.resolution_rate_pct}%
            </span>
          </div>
          <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${data.summary.resolution_rate_pct}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* 311 Requests by Category */}
      <Card className="border border-border/60 bg-card shadow-sm">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5 text-primary" />
            311 Requests by Category
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-1 space-y-2">
          {data.requests_by_category.map((cat) => (
            <div key={cat.category} className="space-y-1 group">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground/80 group-hover:text-foreground transition-colors">
                  {cat.category}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {cat.resolved}/{cat.count}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">
                    ~{cat.avg_resolution_hours}h
                  </span>
                </div>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary/70 rounded-full transition-all duration-500"
                  style={{ width: `${(cat.count / maxCategoryCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Weekly Trend */}
      <Card className="border border-border/60 bg-card shadow-sm">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            Weekly Trend
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-1">
          <div className="grid grid-cols-4 gap-2">
            {data.weekly_trend.map((w) => {
              const netChange = w.closed - w.opened;
              const isPositive = netChange >= 0;
              return (
                <div
                  key={w.week}
                  className="bg-muted/40 rounded-lg p-2.5 text-center space-y-1 border border-border/30"
                >
                  <span className="text-[10px] font-semibold text-muted-foreground block">
                    {w.week}
                  </span>
                  <div className="flex items-center justify-center gap-1">
                    {isPositive ? (
                      <TrendingDown className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingUp className="h-3 w-3 text-red-500" />
                    )}
                    <span
                      className={`text-xs font-bold ${
                        isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {isPositive ? "+" : ""}
                      {netChange}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground/70 font-medium">
                    {w.opened}↑ {w.closed}↓
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Permits Issued + Top Neighborhoods side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Permits */}
        <Card className="border border-border/60 bg-card shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FileKey className="h-3.5 w-3.5 text-primary" />
              Permits Issued ({data.permits.total_issued})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-1.5">
            {[
              { label: "Residential", value: data.permits.residential },
              { label: "Commercial", value: data.permits.commercial },
              { label: "Special Events", value: data.permits.special_events },
              { label: "Demolition", value: data.permits.demolition },
            ].map((p) => (
              <div key={p.label} className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground/80">{p.label}</span>
                <span className="font-mono font-bold text-foreground">{p.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Neighborhoods */}
        <Card className="border border-border/60 bg-card shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              Top Neighborhoods
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-1 space-y-2">
            {data.top_neighborhoods.map((n, i) => (
              <div key={n.name} className="space-y-0.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground/80 flex items-center gap-1.5">
                    <span className="font-mono text-primary font-bold text-[10px] w-4">
                      #{i + 1}
                    </span>
                    {n.name}
                  </span>
                  <span className="font-mono font-bold text-foreground text-[11px]">
                    {n.requests}
                  </span>
                </div>
                <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/50 rounded-full transition-all duration-500"
                    style={{ width: `${(n.requests / maxNeighborhoodCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ─── Small KPI Card Sub-component ─── */
function KpiCard({
  label,
  value,
  icon,
  color,
  bgColor,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}) {
  return (
    <Card className="border border-border/60 bg-card shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-3 flex flex-col gap-1.5">
        <div className={`flex items-center gap-1.5 ${color}`}>
          <div className={`p-1.5 rounded-md ${bgColor}`}>{icon}</div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </div>
        <span className="text-xl font-black text-foreground tracking-tight">{value}</span>
      </CardContent>
    </Card>
  );
}
