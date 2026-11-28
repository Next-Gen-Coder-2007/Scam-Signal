import React from 'react';
import type { CategoryDistributionItem } from '../../services/firestore/dashboardService';

interface CategoryDistributionChartProps {
  items: CategoryDistributionItem[];
}

/**
 * Restrained horizontal bar chart displaying real scam category counts
 * from Firestore public reports. Never renders fabricated baselines.
 */
export const CategoryDistributionChart: React.FC<CategoryDistributionChartProps> = ({
  items,
}) => {
  if (items.length === 0) {
    return (
      <div className="py-6 text-center text-xs text-slate-500">
        No public reports recorded in this time window.
      </div>
    );
  }

  const maxCount = Math.max(...items.map((i) => i.count), 1);

  return (
    <div className="space-y-3" role="list" aria-label="Category distribution">
      {items.map((item) => {
        const barWidthPercent = Math.max(4, Math.round((item.count / maxCount) * 100));
        return (
          <div key={item.category} className="space-y-1" role="listitem">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-800 font-medium truncate pr-2">{item.label}</span>
              <span className="font-mono text-slate-600 shrink-0">
                {item.count} ({item.percentage}%)
              </span>
            </div>
            <div className="h-2 w-full rounded bg-void border border-surface-border overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-sm transition-all duration-300"
                style={{ width: `${barWidthPercent}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};
