import { useState } from "react";
import { Badge } from "../Components/Badge";
import { Card } from "../Components/Card";
import { Button } from "../Components/UI/Button";

const StaffDashboard = () => {
  const [orders, setOrders] = useState([
    {
      id: "ORD-001",
      customerName: "John Doe",
      orderType: "dine-in",
      items: ["Classic Burger", "Coca Cola"],
      status: "waiting",
      timestamp: new Date(Date.now() - 300000).toISOString(),
      total: 15.98,
    },
    {
      id: "ORD-002",
      customerName: "Jane Smith",
      orderType: "delivery",
      items: ["Margherita Pizza", "Caesar Salad"],
      status: "in-progress",
      timestamp: new Date(Date.now() - 600000).toISOString(),
      total: 24.98,
    },
    {
      id: "ORD-003",
      customerName: "Bob Johnson",
      orderType: "dine-in",
      items: ["Caesar Salad"],
      status: "ready",
      timestamp: new Date(Date.now() - 900000).toISOString(),
      total: 9.99,
    },
  ]);

  const updateOrderStatus = (orderId: string, newStatus: string) => {
    setOrders(
      orders.map((order) =>
        order.id === orderId ? { ...order, status: newStatus } : order
      )
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "waiting":
        return "bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 border-amber-300 shadow-sm";
      case "in-progress":
        return "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 border-blue-300 shadow-sm";
      case "ready":
        return "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-800 border-emerald-300 shadow-sm";
      case "completed":
        return "bg-gradient-to-r from-slate-50 to-gray-50 text-slate-700 border-slate-300 shadow-sm";
      default:
        return "bg-gradient-to-r from-slate-50 to-gray-50 text-slate-700 border-slate-300 shadow-sm";
    }
  };

  const getTimeElapsed = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    return `${minutes}m ago`;
  };

  const stats = {
    totalToday: orders.length,
    waiting: orders.filter((o) => o.status === "waiting").length,
    inProgress: orders.filter((o) => o.status === "in-progress").length,
    ready: orders.filter((o) => o.status === "ready").length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl shadow-lg border-b border-slate-200/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-6">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-200">
                  <span className="text-white font-bold text-xl">BV</span>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Staff Dashboard
                </h1>
                <p className="text-sm text-slate-600 font-medium flex items-center">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
                  Bella Vista Restaurant
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <Badge
                variant="secondary"
                className="px-5 py-2.5 text-sm font-semibold bg-gradient-to-r from-slate-100 to-gray-100 text-slate-700 border border-slate-200 shadow-sm"
              >
                Kitchen Staff
              </Badge>
              <div className="hidden sm:block w-px h-8 bg-gradient-to-b from-slate-300 to-transparent"></div>
              <div className="text-sm text-slate-600 font-medium">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <Card className="p-8 bg-white/70 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                  Total Orders
                </p>
                <p className="text-4xl font-bold text-slate-900">
                  {stats.totalToday}
                </p>
                <p className="text-xs text-slate-500 mt-1">Today's count</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center shadow-lg">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="p-8 bg-white/70 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                  Waiting
                </p>
                <p className="text-4xl font-bold text-amber-600">
                  {stats.waiting}
                </p>
                <p className="text-xs text-slate-500 mt-1">Pending orders</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl flex items-center justify-center shadow-lg">
                <svg
                  className="w-8 h-8 text-amber-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="p-8 bg-white/70 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                  In Progress
                </p>
                <p className="text-4xl font-bold text-blue-600">
                  {stats.inProgress}
                </p>
                <p className="text-xs text-slate-500 mt-1">Being prepared</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-2xl flex items-center justify-center shadow-lg">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
            </div>
          </Card>

          <Card className="p-8 bg-white/70 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                  Ready
                </p>
                <p className="text-4xl font-bold text-emerald-600">
                  {stats.ready}
                </p>
                <p className="text-xs text-slate-500 mt-1">For pickup</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-green-100 rounded-2xl flex items-center justify-center shadow-lg">
                <svg
                  className="w-8 h-8 text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
          </Card>
        </div>

        {/* Orders List */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl overflow-hidden rounded-2xl">
          <div className="px-8 py-6 border-b border-slate-100/50 bg-gradient-to-r from-slate-50 to-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                Current Orders
              </h2>
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-slate-600 font-semibold">
                  Live Updates
                </span>
                <div className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                  {orders.length} Active
                </div>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100/50">
            {orders.map((order, index) => (
              <div
                key={order.id}
                className={`p-8 hover:bg-gradient-to-r hover:from-slate-50/50 hover:to-blue-50/30 transition-all duration-300${
                  index % 2 === 0 ? "bg-white" : "bg-slate-300"
                }`}
              >
                <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
                  {/* Order Info */}
                  <div className="flex-1 border-b-2 border-slate-800 pb-4">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center space-x-6">
                        <div className="flex-shrink-0">
                          <div className="w-16 h-16 bg-gradient-to-br from-orange-100 via-red-100 to-pink-100 rounded-2xl flex items-center justify-center shadow-lg">
                            <span className="text-orange-700 font-bold text-lg">
                              #{order.id.split("-")[1]}
                            </span>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-slate-900 mb-2">
                            {order.customerName}
                          </h3>
                          <div className="flex items-center space-x-4">
                            <Badge
                              variant="outline"
                              className="capitalize text-sm font-semibold px-4 py-2 border-slate-300 text-slate-700 bg-white/50 backdrop-blur-sm"
                            >
                              {order.orderType}
                            </Badge>
                            <span className="text-sm text-slate-500 font-medium flex items-center">
                              <svg
                                className="w-4 h-4 mr-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              {getTimeElapsed(order.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-bold text-slate-900 mb-2">
                          ${order.total.toFixed(2)}
                        </div>
                        <Badge
                          className={`${getStatusColor(
                            order.status
                          )} text-sm font-bold px-4 py-2 border-2`}
                        >
                          {order.status.replace("-", " ").toUpperCase()}
                        </Badge>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="  p-6 ">
                      <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">
                        Order Items
                      </h4>
                      <div className="flex flex-wrap gap-3">
                        {order.items.map((item, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-white text-slate-700 border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex-shrink-0 ">
                    <div className="flex flex-col sm:flex-row gap-4">
                      {order.status === "waiting" && (
                        <Button
                          size="sm"
                          onClick={() =>
                            updateOrderStatus(order.id, "in-progress")
                          }
                          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-8 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          <svg
                            className="w-5 h-5 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          Start Preparing
                        </Button>
                      )}
                      {order.status === "in-progress" && (
                        <Button
                          size="sm"
                          onClick={() => updateOrderStatus(order.id, "ready")}
                          className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold px-8 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          <svg
                            className="w-5 h-5 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          Mark Ready
                        </Button>
                      )}
                      {order.status === "ready" && (
                        <Button
                          size="sm"
                          onClick={() =>
                            updateOrderStatus(order.id, "completed")
                          }
                          variant="outline"
                          className="border-2 border-slate-300 text-slate-700 hover:bg-slate-50 font-bold px-8 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                        >
                          <svg
                            className="w-5 h-5 mr-2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </main>
    </div>
  );
};

export default StaffDashboard;
