"use client";

interface TimeSeriesData {
  date: string;
  count: number;
}

interface MiniAnalyticsChartProps {
  views: TimeSeriesData[];
  submissions: TimeSeriesData[];
  height?: number;
  width?: number;
}

export function MiniAnalyticsChart({
  views,
  submissions,
  height = 60,
  width = 100,
}: MiniAnalyticsChartProps) {
  // Generate date range for last 7 days
  const dateRange: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dateRange.push(date.toISOString().split("T")[0]);
  }

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

  const padding = 4;
  const chartWidth = width;
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
  const viewsPath = dateRange
    .map((date, i) => {
      const value = viewsMap.get(date) || 0;
      return getPoint(date, value, i);
    })
    .map((point, i) =>
      i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
    )
    .join(" ");

  // Generate path for submissions line
  const submissionsPath = dateRange
    .map((date, i) => {
      const value = submissionsMap.get(date) || 0;
      return getPoint(date, value, i);
    })
    .map((point, i) =>
      i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
    )
    .join(" ");

  return (
    <div className="w-full">
      <svg width={chartWidth} height={chartHeight} className="overflow-visible">
        {/* Area fills */}
        <defs>
          <linearGradient
            id="miniViewsGradient"
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient
            id="miniSubmissionsGradient"
            x1="0%"
            y1="0%"
            x2="0%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>

        {/* Views area */}
        {viewsPath && (
          <>
            <path
              d={`${viewsPath} L ${padding + innerWidth} ${
                padding + innerHeight
              } L ${padding} ${padding + innerHeight} Z`}
              fill="url(#miniViewsGradient)"
            />
            <path
              d={viewsPath}
              fill="none"
              stroke="#3b82f6"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}

        {/* Submissions area */}
        {submissionsPath && (
          <>
            <path
              d={`${submissionsPath} L ${padding + innerWidth} ${
                padding + innerHeight
              } L ${padding} ${padding + innerHeight} Z`}
              fill="url(#miniSubmissionsGradient)"
            />
            <path
              d={submissionsPath}
              fill="none"
              stroke="#10b981"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
      </svg>
    </div>
  );
}
