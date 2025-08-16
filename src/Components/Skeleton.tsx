import React from "react";

interface SkeletonProps {
  className?: string;
  children?: React.ReactNode;
}

interface SkeletonElementProps {
  className?: string;
  width?: string;
  height?: string;
}

// Basic skeleton element
export const SkeletonElement: React.FC<SkeletonElementProps> = ({ 
  className = "", 
  width = "w-full", 
  height = "h-4" 
}) => (
  <div 
    className={`${width} ${height} bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded animate-pulse ${className}`}
  />
);

// Skeleton for header
export const HeaderSkeleton: React.FC = () => (
  <header className="bg-white/80 backdrop-blur-xl shadow-lg border-b border-slate-200/60 sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between h-20">
        <div className="flex items-center space-x-6">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded-2xl animate-pulse" />
          </div>
          <div>
            <SkeletonElement width="w-48" height="h-8" className="mb-2" />
            <SkeletonElement width="w-32" height="h-4" />
          </div>
        </div>
        <div className="flex items-center space-x-6">
          <SkeletonElement width="w-24" height="h-10" className="rounded-lg" />
          <div className="hidden sm:block w-px h-8 bg-slate-300" />
          <SkeletonElement width="w-32" height="h-4" />
        </div>
      </div>
    </div>
  </header>
);

// Skeleton for stats cards
export const StatsSkeleton: React.FC = () => (
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
    {[...Array(4)].map((_, index) => (
      <div key={index} className="p-8 bg-white/70 backdrop-blur-sm border-0 shadow-xl rounded-2xl">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <SkeletonElement width="w-24" height="h-4" className="mb-2" />
            <SkeletonElement width="w-16" height="h-12" className="mb-1" />
            <SkeletonElement width="w-20" height="h-3" />
          </div>
          <div className="w-16 h-16 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded-2xl animate-pulse" />
        </div>
      </div>
    ))}
  </div>
);

// Skeleton for order items
export const OrderItemsSkeleton: React.FC = () => (
  <div className="bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl p-6 border border-slate-200/50">
    <SkeletonElement width="w-24" height="h-4" className="mb-3" />
    <div className="space-y-2">
      {[...Array(3)].map((_, index) => (
        <div key={index} className="flex items-center justify-between bg-white rounded-lg px-4 py-3 border border-slate-200/50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded-full animate-pulse" />
            <SkeletonElement width="w-32" height="h-4" />
          </div>
          <SkeletonElement width="w-16" height="h-3" />
        </div>
      ))}
    </div>
  </div>
);

// Skeleton for individual order card
export const OrderCardSkeleton: React.FC = () => (
  <div className="p-8 hover:bg-gradient-to-r hover:from-slate-50/50 hover:to-blue-50/30 transition-all duration-300">
    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
      {/* Order Info */}
      <div className="flex-1">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center space-x-6">
            <div className="flex-shrink-0">
              <div className="w-16 h-16 bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200 rounded-2xl animate-pulse" />
            </div>
            <div>
              <SkeletonElement width="w-32" height="h-6" className="mb-2" />
              <div className="flex items-center space-x-4">
                <SkeletonElement width="w-20" height="h-8" className="rounded-full" />
                <SkeletonElement width="w-24" height="h-4" />
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <SkeletonElement width="w-20" height="h-8" className="mb-2" />
            <SkeletonElement width="w-24" height="h-8" className="rounded-full" />
          </div>
        </div>

        {/* Order Items Skeleton */}
        <OrderItemsSkeleton />
      </div>

      {/* Action Buttons Skeleton */}
      <div className="flex-shrink-0">
        <div className="flex flex-col sm:flex-row gap-4">
          <SkeletonElement width="w-40" height="h-12" className="rounded-xl" />
        </div>
      </div>
    </div>
  </div>
);

// Skeleton for orders list
export const OrdersListSkeleton: React.FC = () => (
  <div className="bg-white/80 backdrop-blur-sm border-0 shadow-xl overflow-hidden rounded-2xl">
    <div className="px-8 py-6 border-b border-slate-100/50 bg-gradient-to-r from-slate-50 to-gray-50">
      <div className="flex items-center justify-between">
        <SkeletonElement width="w-32" height="h-6" />
        <div className="flex items-center space-x-3">
          <div className="w-3 h-3 bg-slate-300 rounded-full animate-pulse" />
          <SkeletonElement width="w-24" height="h-4" />
          <SkeletonElement width="w-20" height="h-6" className="rounded-full" />
        </div>
      </div>
    </div>
    
    <div className="divide-y divide-slate-100/50">
      {[...Array(5)].map((_, index) => (
        <OrderCardSkeleton key={index} />
      ))}
    </div>
  </div>
);

// Main dashboard skeleton
export const DashboardSkeleton: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
    <HeaderSkeleton />
    
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <StatsSkeleton />
      <OrdersListSkeleton />
    </main>
  </div>
);

// Individual skeleton components for specific use cases
export const Skeleton: React.FC<SkeletonProps> = ({ className = "", children }) => (
  <div className={`animate-pulse ${className}`}>
    {children}
  </div>
);

export default DashboardSkeleton; 