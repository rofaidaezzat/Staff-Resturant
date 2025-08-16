import React from "react";
import { DashboardSkeleton, HeaderSkeleton, StatsSkeleton, OrdersListSkeleton, OrderCardSkeleton, OrderItemsSkeleton } from "./Skeleton";

interface LoadingProps {
  type?: "full" | "header" | "stats" | "orders" | "order-card" | "order-items";
  count?: number;
  className?: string;
}

const Loading: React.FC<LoadingProps> = ({ 
  type = "full", 
  count = 1, 
  className = "" 
}) => {
  const renderSkeleton = () => {
    switch (type) {
      case "full":
        return <DashboardSkeleton />;
      
      case "header":
        return <HeaderSkeleton />;
      
      case "stats":
        return <StatsSkeleton />;
      
      case "orders":
        return <OrdersListSkeleton />;
      
      case "order-card":
        return (
          <div className={className}>
            {[...Array(count)].map((_, index) => (
              <OrderCardSkeleton key={index} />
            ))}
          </div>
        );
      
      case "order-items":
        return (
          <div className={className}>
            {[...Array(count)].map((_, index) => (
              <OrderItemsSkeleton key={index} />
            ))}
          </div>
        );
      
      default:
        return <DashboardSkeleton />;
    }
  };

  return renderSkeleton();
};

export default Loading; 