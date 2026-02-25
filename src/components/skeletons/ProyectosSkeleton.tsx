/**
 * Skeleton loading states for Proyectos module
 *
 * These components provide visual loading placeholders that improve
 * perceived performance and user experience while data is being fetched.
 */

import React from 'react';
import { PageLoader } from '@/components/ui/PageLoader';

// ============================================================================
// BASE SKELETON COMPONENTS
// ============================================================================

/**
 * Basic skeleton box with shimmer animation
 */
type SkeletonBoxProps = {
  className?: string;
  style?: React.CSSProperties;
};

export function SkeletonBox({ className = '', style }: SkeletonBoxProps) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

/**
 * Skeleton text line
 */
export function SkeletonText({
  width = 'full',
  className = '',
}: {
  width?: 'full' | '3/4' | '1/2' | '1/3' | '1/4';
  className?: string;
}) {
  const widthClass = {
    full: 'w-full',
    '3/4': 'w-3/4',
    '1/2': 'w-1/2',
    '1/3': 'w-1/3',
    '1/4': 'w-1/4',
  }[width];

  return (
    <div
      className={`h-4 bg-gray-200 rounded animate-pulse ${widthClass} ${className}`}
      aria-hidden="true"
    />
  );
}

/**
 * Skeleton circle (for avatars/icons)
 */
export function SkeletonCircle({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  }[size];

  return (
    <div
      className={`bg-gray-200 rounded-full animate-pulse ${sizeClass}`}
      aria-hidden="true"
    />
  );
}

// ============================================================================
// CARD SKELETONS
// ============================================================================

/**
 * Skeleton for a project card in the list view
 */
export function ProyectoCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-crm-border p-6 shadow-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <SkeletonBox className="h-6 w-48 mb-2" />
          <SkeletonText width="3/4" className="mb-1" />
          <SkeletonText width="1/2" />
        </div>
        <SkeletonBox className="h-8 w-20" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
        {[...Array(4)].map((_, i) => (
          <div key={i}>
            <SkeletonText width="1/2" className="mb-2 h-3" />
            <SkeletonBox className="h-8 w-full" />
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <SkeletonBox className="h-10 flex-1" />
        <SkeletonBox className="h-10 w-24" />
      </div>
    </div>
  );
}

/**
 * Skeleton for the projects list page
 */
export function ProyectosListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <SkeletonBox className="h-8 w-48 mb-2" />
          <SkeletonText width="1/3" />
        </div>
        <SkeletonBox className="h-10 w-40" />
      </div>

      {/* Filters skeleton */}
      <div className="bg-white rounded-xl border border-crm-border p-4">
        <div className="flex flex-wrap gap-4">
          <SkeletonBox className="h-10 w-64" />
          <SkeletonBox className="h-10 w-40" />
          <SkeletonBox className="h-10 w-40" />
        </div>
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(count)].map((_, i) => (
          <ProyectoCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// LOTE SKELETONS
// ============================================================================

/**
 * Skeleton for a lote row in the table
 */
export function LoteRowSkeleton() {
  return (
    <tr className="border-b border-crm-border">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <SkeletonCircle size="sm" />
          <SkeletonBox className="h-5 w-20" />
        </div>
      </td>
      <td className="px-4 py-3">
        <SkeletonText width="1/2" />
      </td>
      <td className="px-4 py-3">
        <SkeletonBox className="h-6 w-24 rounded-full" />
      </td>
      <td className="px-4 py-3">
        <SkeletonText width="1/3" />
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <SkeletonBox className="h-8 w-8" />
          <SkeletonBox className="h-8 w-8" />
        </div>
      </td>
    </tr>
  );
}

/**
 * Skeleton for the lotes table
 */
export function LotesTableSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-xl border border-crm-border overflow-hidden">
      {/* Table header skeleton */}
      <div className="bg-gray-50 px-4 py-3 border-b border-crm-border">
        <div className="flex items-center justify-between">
          <SkeletonText width="1/4" />
          <div className="flex gap-2">
            <SkeletonBox className="h-8 w-32" />
            <SkeletonBox className="h-8 w-32" />
          </div>
        </div>
      </div>

      {/* Table body skeleton */}
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-crm-border">
          <tr>
            {[...Array(5)].map((_, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <SkeletonText width="1/2" className="h-3" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[...Array(rows)].map((_, i) => (
            <LoteRowSkeleton key={i} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// MAP SKELETON
// ============================================================================

/**
 * Skeleton for the Google Maps component
 */
export function MapSkeleton() {
  return (
    <div className="relative w-full h-full bg-gray-100 rounded-xl overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center">
        <PageLoader text="Cargando mapa..." size="sm" />
      </div>

      {/* Map controls skeleton */}
      <div className="absolute top-4 right-4 space-y-2">
        <SkeletonBox className="h-32 w-48" />
      </div>

      {/* Legend skeleton */}
      <div className="absolute bottom-4 right-4">
        <SkeletonBox className="h-32 w-40" />
      </div>
    </div>
  );
}

// ============================================================================
// STATS SKELETON
// ============================================================================

/**
 * Skeleton for statistics cards
 */
export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-crm-border p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <SkeletonText width="1/2" className="mb-2 h-3" />
          <SkeletonBox className="h-8 w-24 mb-1" />
          <SkeletonText width="1/3" className="h-3" />
        </div>
        <SkeletonCircle size="md" />
      </div>
    </div>
  );
}

/**
 * Skeleton for stats grid
 */
export function StatsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(count)].map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ============================================================================
// DETAIL PAGE SKELETON
// ============================================================================

/**
 * Skeleton for project detail page
 */
export function ProyectoDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-crm-border p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <SkeletonBox className="h-8 w-64 mb-2" />
            <SkeletonText width="1/2" className="mb-2" />
            <SkeletonText width="3/4" />
          </div>
          <div className="flex gap-2">
            <SkeletonBox className="h-10 w-32" />
            <SkeletonBox className="h-10 w-32" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <StatsGridSkeleton count={4} />

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-crm-border">
        <div className="border-b border-crm-border px-6 py-4">
          <div className="flex gap-4">
            {[...Array(4)].map((_, i) => (
              <SkeletonBox key={i} className="h-10 w-24" />
            ))}
          </div>
        </div>

        <div className="p-6">
          <LotesTableSkeleton rows={8} />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// FORM SKELETON
// ============================================================================

/**
 * Skeleton for forms
 */
export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {[...Array(fields)].map((_, i) => (
        <div key={i}>
          <SkeletonText width="1/4" className="mb-2 h-3" />
          <SkeletonBox className="h-10 w-full" />
        </div>
      ))}

      <div className="flex gap-2 justify-end mt-6">
        <SkeletonBox className="h-10 w-24" />
        <SkeletonBox className="h-10 w-32" />
      </div>
    </div>
  );
}

// ============================================================================
// CHART SKELETON
// ============================================================================

/**
 * Skeleton for charts/graphs
 */
export function ChartSkeleton({ height = 'h-64' }: { height?: string }) {
  return (
    <div className="bg-white rounded-xl border border-crm-border p-6">
      <SkeletonText width="1/3" className="mb-4" />
      <div className={`${height} flex items-end justify-around gap-2`}>
        {[...Array(8)].map((_, i) => {
          const randomHeight = Math.floor(Math.random() * 60) + 40;
          return (
            <SkeletonBox
              key={i}
              className="flex-1"
              style={{ height: `${randomHeight}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}

// ============================================================================
// TIMELINE SKELETON
// ============================================================================

/**
 * Skeleton for timeline/activity feed
 */
export function TimelineSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-4">
      {[...Array(items)].map((_, i) => (
        <div key={i} className="flex gap-4">
          <SkeletonCircle size="sm" />
          <div className="flex-1">
            <SkeletonText width="3/4" className="mb-2" />
            <SkeletonText width="1/2" className="h-3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

/**
 * All skeleton components exported as a namespace
 */
const ProyectosSkeleton = {
  Box: SkeletonBox,
  Text: SkeletonText,
  Circle: SkeletonCircle,
  ProyectoCard: ProyectoCardSkeleton,
  ProyectosList: ProyectosListSkeleton,
  LoteRow: LoteRowSkeleton,
  LotesTable: LotesTableSkeleton,
  Map: MapSkeleton,
  StatCard: StatCardSkeleton,
  StatsGrid: StatsGridSkeleton,
  ProyectoDetail: ProyectoDetailSkeleton,
  Form: FormSkeleton,
  Chart: ChartSkeleton,
  Timeline: TimelineSkeleton,
};

export default ProyectosSkeleton;
