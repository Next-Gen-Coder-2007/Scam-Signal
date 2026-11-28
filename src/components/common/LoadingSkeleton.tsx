import React from 'react';
import { Card } from './Card';

export const CardListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading content">
      {Array.from({ length: count }).map((_, idx) => (
        <Card key={idx} className="space-y-3 animate-pulse">
          <div className="flex items-center justify-between gap-4">
            <div className="h-4 w-48 rounded bg-surface-elevated" />
            <div className="h-6 w-24 rounded bg-surface-elevated" />
          </div>
          <div className="h-3 w-full rounded bg-surface-elevated" />
          <div className="h-3 w-3/4 rounded bg-surface-elevated" />
          <div className="flex gap-2 pt-1">
            <div className="h-5 w-20 rounded bg-surface-elevated" />
            <div className="h-5 w-24 rounded bg-surface-elevated" />
          </div>
        </Card>
      ))}
    </div>
  );
};

export const DashboardSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Card key={idx} className="p-4 space-y-2.5">
            <div className="h-3 w-24 rounded bg-surface-elevated" />
            <div className="h-7 w-14 rounded bg-surface-elevated" />
            <div className="h-2.5 w-32 rounded bg-surface-elevated" />
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <CardListSkeleton count={2} />
        </div>
        <div className="space-y-6">
          <Card className="p-5 space-y-3">
            <div className="h-4 w-36 rounded bg-surface-elevated" />
            <div className="h-3 w-full rounded bg-surface-elevated" />
            <div className="h-3 w-5/6 rounded bg-surface-elevated" />
            <div className="h-3 w-2/3 rounded bg-surface-elevated" />
          </Card>
        </div>
      </div>
    </div>
  );
};
