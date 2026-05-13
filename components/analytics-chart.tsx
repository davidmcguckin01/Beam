"use client";

import { useMemo } from "react";

interface TimeSeriesData {
  date: string;
  count: number;
}

interface AnalyticsChartProps {
  views: TimeSeriesData[];
  submissions: TimeSeriesData[];
  height?: number;
}

export function AnalyticsChart({
  views,
  submissions,
  height = 200,
}: AnalyticsChartProps) {
  // Generate date range for last 30 days
  const dateRange = useMemo(() => {
    const dates: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split("T")[0]);
    }
    return dates;
  }, []);

  // Create maps for quick lookup
  const viewsMap = new Map(views.map((v) => [v.date, v.count]));
  const submissionsMap = new Map(submissions.map((s) => [s.date, s.count]));

  // Get max value for scaling
  const maxValue = Math.max(
    ...dateRange.map(
      (date) => (viewsMap.get(date) || 0) + (submissionsMap.get(date) || 0)
    ),
    1
  );

  const padding = 40;
  const chartWidth = 600;
  const chartHeight = height;
  const innerWidth = chartWidth - padding * 2;
  const innerHeight = chartHeight - padding * 2;

  // Generate points for the line
  const getPoint = (date: string, value: number, index: number) => {
    const x = padding + (index / (dateRange.length - 1)) * innerWidth;
    const y = padding + innerHeight - (value / maxValue) * innerHeight;
    return { x, y };
  };

  // Generate path for views line
  const viewsPath = useMemo(() => {
    const points = dateRange.map((date, i) => {
      const value = viewsMap.get(date) || 0;
      return getPoint(date, value, i);
    });
    return points
      .map((point, i) =>
        i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
      )
      .join(" ");
  }, [dateRange, viewsMap, maxValue]);

  // Generate path for submissions line
  const submissionsPath = useMemo(() => {
    const points = dateRange.map((date, i) => {
      const value = submissionsMap.get(date) || 0;
      return getPoint(date, value, i);
    });
    return points
      .map((point, i) =>
        i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
      )
      .join(" ");
  }, [dateRange, submissionsMap, maxValue]);

  // Generate area path for views
  const viewsAreaPath = useMemo(() => {
    const points = dateRange.map((date, i) => {
      const value = viewsMap.get(date) || 0;
      return getPoint(date, value, i);
    });
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    const path = points
      .map((point, i) =>
        i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
      )
      .join(" ");
    return `${path} L ${lastPoint.x} ${padding + innerHeight} L ${
      firstPoint.x
    } ${padding + innerHeight} Z`;
  }, [dateRange, viewsMap, maxValue]);

  // Generate area path for submissions
  const submissionsAreaPath = useMemo(() => {
    const points = dateRange.map((date, i) => {
      const value = submissionsMap.get(date) || 0;
      return getPoint(date, value, i);
    });
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    const path = points
      .map((point, i) =>
        i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
      )
      .join(" ");
    return `${path} L ${lastPoint.x} ${padding + innerHeight} L ${
      firstPoint.x
    } ${padding + innerHeight} Z`;
  }, [dateRange, submissionsMap, maxValue]);

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Show every 5th date label
  const visibleDates = dateRange.filter(
    (_, i) => i % 5 === 0 || i === dateRange.length - 1
  );

  return (
    <div className="w-full overflow-x-auto">
      <svg width={chartWidth} height={chartHeight} className="overflow-visible">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = padding + innerHeight - ratio * innerHeight;
          const value = Math.round(ratio * maxValue);
          return (
            <g key={ratio}>
              <line
                x1={padding}
                y1={y}
                x2={padding + innerWidth}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              <text
                x={padding - 10}
                y={y + 4}
                textAnchor="end"
                className="text-xs fill-gray-500"
                fontSize="11"
              >
                {value}
              </text>
            </g>
          );
        })}

        {/* Area fills */}
        <path d={viewsAreaPath} fill="url(#viewsGradient)" opacity={0.2} />
        <path
          d={submissionsAreaPath}
          fill="url(#submissionsGradient)"
          opacity={0.2}
        />

        {/* Gradients */}
        <defs>
          <linearGradient id="viewsGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient
            id="submissionsGradient"
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Lines */}
        <path
          d={viewsPath}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={submissionsPath}
          fill="none"
          stroke="#10b981"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {dateRange.map((date, i) => {
          const viewsValue = viewsMap.get(date) || 0;
          const submissionsValue = submissionsMap.get(date) || 0;
          const viewsPoint = getPoint(date, viewsValue, i);
          const submissionsPoint = getPoint(date, submissionsValue, i);

          return (
            <g key={date}>
              {viewsValue > 0 && (
                <circle
                  cx={viewsPoint.x}
                  cy={viewsPoint.y}
                  r={3}
                  fill="#3b82f6"
                />
              )}
              {submissionsValue > 0 && (
                <circle
                  cx={submissionsPoint.x}
                  cy={submissionsPoint.y}
                  r={3}
                  fill="#10b981"
                />
              )}
            </g>
          );
        })}

        {/* X-axis labels */}
        {visibleDates.map((date, i) => {
          const index = dateRange.indexOf(date);
          const x = padding + (index / (dateRange.length - 1)) * innerWidth;
          return (
            <text
              key={date}
              x={x}
              y={chartHeight - padding + 20}
              textAnchor="middle"
              className="text-xs fill-gray-500"
              fontSize="10"
            >
              {formatDate(date)}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-xs text-gray-600">Views</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-xs text-gray-600">Submissions</span>
        </div>
      </div>
    </div>
  );
}
