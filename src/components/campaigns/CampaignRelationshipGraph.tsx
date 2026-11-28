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
      <div className="p-6 rounded-md bg-void border border-surface-border text-center text-xs text-slate-600">
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
                  stroke={isSelected ? '#0891b2' : '#cbd5e1'}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  strokeDasharray={link.verificationStatus === 'verified' ? undefined : '4 3'}
                />
                <rect
                  x={midX - 18}
                  y={midY - 9}
                  width={36}
                  height={18}
                  rx={4}
                  fill="#ffffff"
                  stroke={isSelected ? '#0891b2' : '#e2e8f0'}
                />
                <text
                  x={midX}
                  y={midY + 3}
                  textAnchor="middle"
                  fontSize="9"
                  fontFamily="monospace"
                  fill={isSelected ? '#0e7490' : '#475569'}
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
              fill="#ffffff"
              stroke="#6d28d9"
              strokeWidth={2}
            />
            <text
              x={cx}
              y={cy - 4}
              textAnchor="middle"
              fontSize="10"
              fontWeight="600"
              fill="#0f172a"
            >
              Campaign
            </text>
            <text
              x={cx}
              y={cy + 11}
              textAnchor="middle"
              fontSize="9"
              fontFamily="monospace"
              fill="#6d28d9"
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
                  fill={isSelected ? '#ecfeff' : '#ffffff'}
                  stroke={isSelected ? '#0891b2' : '#cbd5e1'}
                  strokeWidth={isSelected ? 2 : 1.25}
                />
                <text
                  x={nx}
                  y={ny - 2}
                  textAnchor="middle"
                  fontSize="10"
                  fontFamily="monospace"
                  fill="#0f172a"
                >
                  {shortId}
                </text>
                <text
                  x={nx}
                  y={ny + 11}
                  textAnchor="middle"
                  fontSize="8.5"
                  fill={link.verificationStatus === 'verified' ? '#047857' : '#b45309'}
                >
                  {link.status}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {links.length > displayedLinks.length && (
        <p className="text-[11px] text-slate-500 font-mono">
          Showing first {displayedLinks.length} of {links.length} connected reports in graph.
          Inspect all links in the evidence list below.
        </p>
      )}
    </div>
  );
};
