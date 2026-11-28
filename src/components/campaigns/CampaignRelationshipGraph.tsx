import React from 'react';
import type { ReportCampaignLinkDocument } from '../../services/firestore/threatConverter';

interface CampaignRelationshipGraphProps {
  campaignName: string;
  links: ReportCampaignLinkDocument[];
  selectedReportId: string | null;
  onSelectReport?: (reportId: string) => void;
}

/**
 * Responsive SVG visualization of deterministic report-to-campaign links.
 * Clicking a report node selects it to inspect its supporting evidence.
 */
export const CampaignRelationshipGraph: React.FC<CampaignRelationshipGraphProps> = ({
  campaignName,
  links,
  selectedReportId,
  onSelectReport,
}) => {
  if (links.length === 0) {
    return (
      <div className="p-6 rounded-md bg-void border border-surface-border text-center text-xs text-zinc-400">
        No report-to-campaign links are stored for this campaign yet.
      </div>
    );
  }

  const displayedLinks = links.slice(0, 10);
  const cx = 320;
  const cy = 175;
  const radiusX = 215;
  const radiusY = 120;

  return (
    <div className="space-y-2">
      <div className="w-full overflow-hidden rounded-md bg-void border border-surface-border">
        <svg
          viewBox="0 0 640 350"
          className="w-full h-auto max-h-[340px]"
          role="img"
          aria-label={`Relationship graph for ${campaignName}`}
        >
          {/* Edges */}
          {displayedLinks.map((link, index) => {
            const angle = (2 * Math.PI * index) / displayedLinks.length - Math.PI / 2;
            const nx = cx + radiusX * Math.cos(angle);
            const ny = cy + radiusY * Math.sin(angle);
            const isSelected = selectedReportId === link.reportId;
            const midX = (cx + nx) / 2;
            const midY = (cy + ny) / 2;

            return (
              <g key={`edge-${link.reportId}`}>
                <line
                  x1={cx}
                  y1={cy}
                  x2={nx}
                  y2={ny}
                  stroke={isSelected ? '#22d3ee' : '#3f3f46'}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  strokeDasharray={link.verificationStatus === 'verified' ? undefined : '4 3'}
                />
                <rect
                  x={midX - 18}
                  y={midY - 9}
                  width={36}
                  height={18}
                  rx={4}
                  fill="#09090b"
                  stroke={isSelected ? '#22d3ee' : '#27272a'}
                />
                <text
                  x={midX}
                  y={midY + 3}
                  textAnchor="middle"
                  fontSize="9"
                  fontFamily="monospace"
                  fill={isSelected ? '#67e8f9' : '#a1a1aa'}
                >
                  {link.correlationScore.toFixed(2)}
                </text>
              </g>
            );
          })}

          {/* Central Campaign Node */}
          <g>
            <circle
              cx={cx}
              cy={cy}
              r={42}
              fill="#18181b"
              stroke="#8b5cf6"
              strokeWidth={2}
            />
            <text
              x={cx}
              y={cy - 4}
              textAnchor="middle"
              fontSize="10"
              fontWeight="600"
              fill="#f4f4f5"
            >
              Campaign
            </text>
            <text
              x={cx}
              y={cy + 11}
              textAnchor="middle"
              fontSize="9"
              fontFamily="monospace"
              fill="#c4b5fd"
            >
              {links.length} {links.length === 1 ? 'Report' : 'Reports'}
            </text>
          </g>

          {/* Report Nodes */}
          {displayedLinks.map((link, index) => {
            const angle = (2 * Math.PI * index) / displayedLinks.length - Math.PI / 2;
            const nx = cx + radiusX * Math.cos(angle);
            const ny = cy + radiusY * Math.sin(angle);
            const isSelected = selectedReportId === link.reportId;
            const shortId =
              link.reportId.length > 12 ? `${link.reportId.slice(0, 10)}..` : link.reportId;

            return (
              <g
                key={`node-${link.reportId}`}
                className="cursor-pointer focus:outline-none"
                role="button"
                tabIndex={0}
                aria-label={`Inspect report ${link.reportId} (${link.status}, score ${link.correlationScore.toFixed(2)})`}
                aria-pressed={isSelected}
                onClick={() => onSelectReport?.(link.reportId)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectReport?.(link.reportId);
                  }
                }}
              >
                <rect
                  x={nx - 52}
                  y={ny - 18}
                  width={104}
                  height={36}
                  rx={6}
                  fill={isSelected ? '#164e63' : '#18181b'}
                  stroke={isSelected ? '#22d3ee' : '#3f3f46'}
                  strokeWidth={isSelected ? 2 : 1.25}
                />
                <text
                  x={nx}
                  y={ny - 2}
                  textAnchor="middle"
                  fontSize="10"
                  fontFamily="monospace"
                  fill="#f4f4f5"
                >
                  {shortId}
                </text>
                <text
                  x={nx}
                  y={ny + 11}
                  textAnchor="middle"
                  fontSize="8.5"
                  fill={link.verificationStatus === 'verified' ? '#6ee7b7' : '#fcd34d'}
                >
                  {link.status}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {links.length > displayedLinks.length && (
        <p className="text-[11px] text-zinc-500 font-mono">
          Showing first {displayedLinks.length} of {links.length} connected reports in graph.
          Inspect all links in the evidence list below.
        </p>
      )}
    </div>
  );
};
