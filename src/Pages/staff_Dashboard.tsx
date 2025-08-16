import { useState, useEffect } from "react";
import { Badge } from "../Components/Badge";
import { Card } from "../Components/Card";
import { Button } from "../Components/UI/Button";
import { axiosInstance } from "../config/axios.config";
import Pusher from "pusher-js";
import Pagination from "../Components/Pagination";
import Loading from "../Components/Loading";

// =================== Pusher Configuration ===================
const PUSHER_KEY = "4b8ce5bea9c546484b04";
const PUSHER_CLUSTER = "eu";
const CHANNEL_NAME = "new-orders";
const EVENT_NAME = "order-created";
const UPDATE_EVENT_NAME = "order-updated"; // Additional event for order updates
// ============================================================

// Type definitions
interface ApiOrder {
  row_number: number;
  orderId: string;
  orderType: string;
  customerName: string;
  phone: string;
  address: string;
  tableNumber: string;
  items: string; // JSON string
  status: string;
  createdAt: string;
  updatedAt: string;
  totalPrice: string;
}

interface Order {
  id: string;
  customerName: string;
  orderType: string;
  items: string[];
  status: "waiting" | "in-progress" | "ready" | "completed" | "canceled";
  timestamp: string | number;
  total: number;
  phone: string;
  address: string;
  tableNumber: string;
  updatedAt: string;
  rowNumber: number;
}

type ComponentStatus =
  | "waiting"
  | "in-progress"
  | "ready"
  | "completed"
  | "canceled";
type ApiStatus =
  | "processing"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled"; // Note: API uses "cancelled" with double 'l'
type SortOption = "newest" | "oldest" | "status" | "total";

const StaffDashboard = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pusherConnected, setPusherConnected] = useState<boolean>(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [ordersPerPage] = useState<number>(10); // Number of orders per page

  // Enhanced function to safely parse items
  const parseOrderItems = (itemsString: string): string[] => {
    if (!itemsString?.trim()) return [];

    // ✅ استبدال "\n" اللي جاي من الـ API بسطر جديد فعلي
    const cleaned = itemsString.trim().replace(/\\n/g, "\n");

    // 1. If input looks like an array: [item1, item2]
    if (cleaned.startsWith("[") && cleaned.endsWith("]")) {
      const content = cleaned.slice(1, -1).trim();
      if (!content || content === "-") return [];
      return content
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item && item !== "-");
    }

    // 2. Try JSON.parse
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => item && item !== "-");
      }
      return parsed && parsed !== "-" ? [parsed.toString()] : [];
    } catch {
      // ignore JSON error and fallback
    }

    // 3. Handle newline-separated items
    if (cleaned.includes("\n")) {
      return cleaned
        .split("\n")
        .map((item) => item.trim())
        .filter((item) => item && item !== "-");
    }

    // 4. Handle comma-separated items
    if (cleaned.includes(",")) {
      return cleaned
        .split(",")
        .map((item) => item.trim())
        .filter((item) => item && item !== "-");
    }

    // 5. Fallback: single item
    return cleaned === "-" ? [] : [cleaned];
  };

  // Transform API order to component order format
  const transformApiOrder = (apiOrder: any): Order => {
    return {
      // تأكد من استخدام order_ID أولاً، ثم orderId كبديل
      id: apiOrder.order_ID || apiOrder.orderId || apiOrder.order_id,
      customerName:
        apiOrder.customerName || apiOrder.Customer_Name || "Unknown Customer",
      orderType: apiOrder.orderType || apiOrder.order_type || "dine-in",
      items: parseOrderItems(apiOrder.items || "[]"),
      status: mapApiStatusToComponentStatus(apiOrder.status || "processing"),
      timestamp:
        apiOrder.createdAt || apiOrder.created_at || new Date().toISOString(),
      total: parseFloat(apiOrder.totalPrice || apiOrder.total_price || "0"),
      phone: apiOrder.phone || "",
      address: apiOrder.address || "",
      tableNumber: apiOrder.tableNumber || apiOrder.table_number || "",
      updatedAt:
        apiOrder.updatedAt ||
        apiOrder.updated_at ||
        apiOrder.createdAt ||
        apiOrder.created_at,
      rowNumber: apiOrder.row_number || 0,
    };
  };

  // Sort orders function
  const sortOrders = (orders: Order[], sortOption: SortOption): Order[] => {
    const sortedOrders = [...orders];

    switch (sortOption) {
      case "newest": {
        return sortedOrders.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
      }
      case "oldest": {
        return sortedOrders.sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      }
      case "status": {
        const statusOrder = {
          waiting: 1,
          "in-progress": 2,
          ready: 3,
          completed: 4,
          canceled: 5, // Add canceled to the end
        };
        return sortedOrders.sort(
          (a, b) => statusOrder[a.status] - statusOrder[b.status]
        );
      }
      case "total": {
        return sortedOrders.sort((a, b) => b.total - a.total);
      }
      default: {
        return sortedOrders;
      }
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(orders.length / ordersPerPage);
  const startIndex = (currentPage - 1) * ordersPerPage;
  const endIndex = startIndex + ordersPerPage;
  const currentOrders = orders.slice(startIndex, endIndex);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top of orders section when page changes
    const ordersSection = document.getElementById("orders-section");
    if (ordersSection) {
      ordersSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // Reset to first page when orders change significantly
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [orders.length, totalPages, currentPage]);

  // Fetch orders from API
  const fetchOrders = async (): Promise<void> => {
    try {
      const response = await axiosInstance.get<ApiOrder[]>(
        "webhook/get-orders"
      );
      console.log("Response Text >>>", response.data);

      // Transform API data to match component structure
      const transformedOrders: Order[] = response.data.map(transformApiOrder);

      // Sort orders by default (newest first)
      const sortedOrders = sortOrders(transformedOrders, sortBy);
      setOrders(sortedOrders);
      setError(null);
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError("Failed to fetch orders. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle sort change
  const handleSortChange = (newSortOption: SortOption) => {
    setSortBy(newSortOption);
    const sortedOrders = sortOrders(orders, newSortOption);
    setOrders(sortedOrders);
    setCurrentPage(1); // Reset to first page when sorting
  };

  // Map API status to component status
  const mapApiStatusToComponentStatus = (
    apiStatus: string
  ): ComponentStatus => {
    const statusMap: Record<string, ComponentStatus> = {
      processing: "waiting",
      "in-progress": "in-progress",
      preparing: "in-progress",
      ready: "ready",
      completed: "completed",
      delivered: "completed",
      cancelled: "canceled", // Map "cancelled" from API to "canceled"
      canceled: "canceled",
    };
    return statusMap[apiStatus?.toLowerCase()] || "waiting";
  };

  // Map component status back to API status
  const mapComponentStatusToApiStatus = (
    componentStatus: ComponentStatus
  ): ApiStatus => {
    const statusMap: Record<ComponentStatus, ApiStatus> = {
      waiting: "processing",
      "in-progress": "preparing",
      ready: "ready",
      completed: "completed",
      canceled: "cancelled", // Map "canceled" from component to "cancelled" for API
    };
    return statusMap[componentStatus] || "processing";
  };

  // Update order status
  const updateOrderStatus = async (
    orderId: string,
    newStatus: ComponentStatus
  ): Promise<void> => {
    try {
      // Update in backend
      await axiosInstance.post("webhook/update-order", {
        orderId: orderId,
        status: mapComponentStatusToApiStatus(newStatus),
        updatedAt: new Date().toISOString(),
      });

      // Update local state
      const updatedOrders = orders.map((order) =>
        order.id === orderId
          ? {
              ...order,
              status: newStatus,
              updatedAt: new Date().toISOString(),
            }
          : order
      );

      // Apply current sorting to updated orders
      const sortedOrders = sortOrders(updatedOrders, sortBy);
      setOrders(sortedOrders);
    } catch (err) {
      console.error("Error updating order status:", err);
      setError("Failed to update order status. Please try again.");
    }
  };

  // =================== Pusher Integration ===================
  useEffect(() => {
    // Initialize Pusher connection
    const pusher = new Pusher(PUSHER_KEY, {
      cluster: PUSHER_CLUSTER,
    });

    // Subscribe to the channel
    const channel = pusher.subscribe(CHANNEL_NAME);

    // Connection event handlers
    pusher.connection.bind("connected", () => {
      console.log("React: Connected to Pusher");
      setPusherConnected(true);
    });

    pusher.connection.bind("disconnected", () => {
      console.log("React: Disconnected from Pusher");
      setPusherConnected(false);
    });

    // Bind to new order event
    channel.bind(EVENT_NAME, (newOrderData: any) => {
      console.log("React: A new order has arrived!", newOrderData);

      // Transform the new order data
      const newOrder = transformApiOrder(newOrderData);

      // Update orders state by adding the new order at the beginning
      setOrders((prevOrders) => {
        const updatedOrders = [newOrder, ...prevOrders];
        // Apply current sorting
        return sortOrders(updatedOrders, sortBy);
      });

      // Optional: Show a notification or play a sound
      console.log(
        `New order from ${newOrder.customerName} - Total: $${newOrder.total}`
      );
    });

    // Bind to order update event (optional)
    channel.bind(UPDATE_EVENT_NAME, (updatedOrderData: any) => {
      console.log("React: Order updated!", updatedOrderData);

      const updatedOrder = transformApiOrder(updatedOrderData);

      // Update the specific order in the list
      setOrders((prevOrders) => {
        const updatedOrders = prevOrders.map((order) =>
          order.id === updatedOrder.id ? updatedOrder : order
        );
        return sortOrders(updatedOrders, sortBy);
      });
    });

    console.log(`React: Subscribed to Pusher channel "${CHANNEL_NAME}"`);

    // Cleanup function - very important to prevent memory leaks
    return () => {
      console.log("React: Unsubscribing from Pusher channel.");
      channel.unbind_all();
      pusher.unsubscribe(CHANNEL_NAME);
      pusher.disconnect();
    };
  }, [sortBy]); // Include sortBy in dependencies to re-sort when it changes

  // Initial data fetch
  useEffect(() => {
    fetchOrders();
  }, []);

  const getStatusColor = (status: ComponentStatus): string => {
    switch (status) {
      case "waiting":
        return "bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 border-amber-300 shadow-sm";
      case "in-progress":
        return "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 border-blue-300 shadow-sm";
      case "ready":
        return "bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-800 border-emerald-300 shadow-sm";
      case "completed":
        return "bg-gradient-to-r from-slate-50 to-gray-50 text-slate-700 border-slate-300 shadow-sm";
      case "canceled":
        return "bg-gradient-to-r from-red-50 to-rose-50 text-red-800 border-red-300 shadow-sm";
      default:
        return "bg-gradient-to-r from-slate-50 to-gray-50 text-slate-700 border-slate-300 shadow-sm";
    }
  };

  const stats = {
    totalToday: orders.length,
    waiting: orders.filter((o) => o.status === "waiting").length,
    inProgress: orders.filter((o) => o.status === "in-progress").length,
    ready: orders.filter((o) => o.status === "ready").length,
    canceled: orders.filter((o) => o.status === "canceled").length,
  };

  if (loading) return <Loading type="full" />;

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
                  <span
                    className={`w-2 h-2 rounded-full mr-2 ${
                      pusherConnected
                        ? "bg-emerald-500 animate-pulse"
                        : "bg-red-500"
                    }`}
                  ></span>
                  {pusherConnected ? "Live Updates Active" : "Reconnecting..."}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <Button
                onClick={fetchOrders}
                variant="outline"
                size="sm"
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </Button>
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
        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
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

          {/* New Canceled Stats Card */}
          <Card className="p-8 bg-white/70 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 rounded-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-600 mb-2 uppercase tracking-wide">
                  Canceled
                </p>
                <p className="text-4xl font-bold text-red-600">
                  {stats.canceled}
                </p>
                <p className="text-xs text-slate-500 mt-1">Canceled orders</p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-rose-100 rounded-2xl flex items-center justify-center shadow-lg">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
            </div>
          </Card>
        </div>

        {/* Orders List */}
        <Card
          id="orders-section"
          className="bg-white/80 backdrop-blur-sm border-0 shadow-xl overflow-hidden rounded-2xl"
        >
          <div className="px-8 py-6 border-b border-slate-100/50 bg-gradient-to-r from-slate-50 to-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Current Orders
                </h2>
                <p className="text-sm text-slate-600 mt-1">
                  Showing {startIndex + 1}-{Math.min(endIndex, orders.length)}{" "}
                  of {orders.length} orders
                </p>
              </div>
              <div className="flex items-center space-x-3">
                {/* Sort Dropdown */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) =>
                      handleSortChange(e.target.value as SortOption)
                    }
                    className="appearance-none bg-white border border-emerald-500 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent shadow-sm"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="status">By Status</option>
                    <option value="total">By Total ($)</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                    <svg
                      className="w-4 h-4 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                </div>
                <div
                  className={`w-3 h-3 rounded-full ${
                    pusherConnected
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-red-500"
                  }`}
                ></div>
                <span className="text-sm text-slate-600 font-semibold">
                  {pusherConnected ? "Live Updates" : "Offline"}
                </span>
                <div className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                  {orders.length} Active
                </div>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100/50">
            {currentOrders.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-slate-400"
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
                <p className="text-slate-600 font-medium">No orders found</p>
                <p className="text-slate-500 text-sm mt-1">
                  Orders will appear here when customers place them
                </p>
              </div>
            ) : (
              currentOrders.map((order, index) => (
                <div
                  key={order.id}
                  className={`relative transition-all duration-300 ${
                    order.status === "canceled"
                      ? "bg-gradient-to-r from-red-50 via-red-50/70 to-red-100 border-l-8 border-red-500 opacity-90 transform scale-[0.98]"
                      : index % 2 === 0
                      ? "bg-white hover:bg-gradient-to-r hover:from-slate-50/50 hover:to-blue-50/30"
                      : "bg-slate-50/30 hover:bg-gradient-to-r hover:from-slate-50/50 hover:to-blue-50/30"
                  }`}
                >
                  {/* Canceled Order Overlay */}
                  {order.status === "canceled" && (
                    <div className="absolute inset-0 pointer-events-none z-10">
                      {/* Diagonal Strike Lines */}
                      <div className="absolute inset-0 opacity-20">
                        <svg
                          className="w-full h-full"
                          viewBox="0 0 100 100"
                          preserveAspectRatio="none"
                        >
                          <line
                            x1="0"
                            y1="0"
                            x2="100"
                            y2="100"
                            stroke="#dc2626"
                            strokeWidth="0.5"
                          />
                          <line
                            x1="0"
                            y1="20"
                            x2="100"
                            y2="120"
                            stroke="#dc2626"
                            strokeWidth="0.3"
                          />
                          <line
                            x1="0"
                            y1="-20"
                            x2="100"
                            y2="80"
                            stroke="#dc2626"
                            strokeWidth="0.3"
                          />
                          <line
                            x1="20"
                            y1="0"
                            x2="120"
                            y2="100"
                            stroke="#dc2626"
                            strokeWidth="0.3"
                          />
                          <line
                            x1="-20"
                            y1="0"
                            x2="80"
                            y2="100"
                            stroke="#dc2626"
                            strokeWidth="0.3"
                          />
                        </svg>
                      </div>
                      {/* Corner Warning Labels */}
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse shadow-lg">
                        🚫 CANCELED
                      </div>
                    </div>
                  )}

                  <div className="p-8 relative">
                    <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
                      {/* Order Info */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center space-x-6">
                            <div className="flex-shrink-0 relative">
                              <div
                                className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg relative transition-all duration-300 ${
                                  order.status === "canceled"
                                    ? "bg-gradient-to-br from-red-200 via-red-300 to-red-400 transform rotate-12 opacity-70"
                                    : "bg-gradient-to-br from-orange-100 via-red-100 to-pink-100"
                                }`}
                              >
                                <span
                                  className={`font-bold text-lg transition-all duration-300 ${
                                    order.status === "canceled"
                                      ? "text-red-800 line-through"
                                      : "text-orange-700"
                                  }`}
                                >
                                  #{order.rowNumber || order.id.split("-")[1]}
                                </span>

                                {/* Big X overlay for canceled orders */}
                                {order.status === "canceled" && (
                                  <div className="absolute inset-0 rounded-2xl flex items-center justify-center bg-red-600/30">
                                    <svg
                                      className="w-12 h-12 text-red-700 animate-pulse"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={4}
                                        d="M6 18L18 6M6 6l12 12"
                                      />
                                    </svg>
                                  </div>
                                )}
                              </div>

                              {/* Warning Icon for canceled orders */}
                              {order.status === "canceled" && (
                                <div className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center animate-bounce">
                                  <span className="text-white text-xs font-bold">
                                    !
                                  </span>
                                </div>
                              )}
                            </div>

                            <div>
                              <div className="flex items-center space-x-3 mb-2">
                                <h3
                                  className={`text-xl font-bold mb-0 transition-all duration-300 ${
                                    order.status === "canceled"
                                      ? "text-red-800 line-through opacity-75"
                                      : "text-slate-900"
                                  }`}
                                >
                                  {order.customerName || "Walk-in Customer"}
                                </h3>

                                {/* Large Canceled Badge */}
                                {order.status === "canceled" && (
                                  <div className="flex flex-col items-center">
                                    <Badge className="bg-red-600 text-white text-sm font-black px-4 py-2 rounded-full animate-pulse shadow-xl border-2 border-red-800">
                                      ❌ ORDER CANCELED
                                    </Badge>
                                    <span className="text-xs text-red-600 mt-1 font-semibold">
                                      by customer
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center space-x-4 mb-2">
                                <Badge
                                  variant="outline"
                                  className={`capitalize text-sm font-semibold px-4 py-2 backdrop-blur-sm transition-all duration-300 ${
                                    order.status === "canceled"
                                      ? "border-red-400 text-red-800 bg-red-100/70 opacity-60 line-through"
                                      : "border-slate-300 text-slate-700 bg-white/50"
                                  }`}
                                >
                                  {order.orderType}
                                </Badge>
                              </div>

                              {/* Additional order details */}
                              <div
                                className={`flex flex-wrap gap-2 text-xs transition-all duration-300 ${
                                  order.status === "canceled"
                                    ? "text-red-600 opacity-60"
                                    : "text-slate-600"
                                }`}
                              >
                                {order.phone && (
                                  <span
                                    className={`px-2 py-1 rounded ${
                                      order.status === "canceled"
                                        ? "bg-red-100 line-through"
                                        : "bg-slate-100"
                                    }`}
                                  >
                                    📞 {order.phone}
                                  </span>
                                )}
                                {order.tableNumber && (
                                  <span
                                    className={`px-2 py-1 rounded ${
                                      order.status === "canceled"
                                        ? "bg-red-100 line-through"
                                        : "bg-slate-100"
                                    }`}
                                  >
                                    🍽️ Table {order.tableNumber}
                                  </span>
                                )}
                                {order.address && (
                                  <span
                                    className={`px-2 py-1 rounded ${
                                      order.status === "canceled"
                                        ? "bg-red-100 line-through"
                                        : "bg-slate-100"
                                    }`}
                                  >
                                    📍{" "}
                                    {(order.address || "")
                                      .toString()
                                      .substring(0, 30)}
                                    ...
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div
                              className={`text-2xl font-bold mb-2 transition-all duration-300 ${
                                order.status === "canceled"
                                  ? "text-red-700 line-through opacity-60 transform scale-95"
                                  : "text-slate-900"
                              }`}
                            >
                              ${order.total.toFixed(2)}
                            </div>
                            <Badge
                              className={`${getStatusColor(
                                order.status
                              )} text-sm font-bold px-4 py-2 border-2 transition-all duration-300 ${
                                order.status === "canceled"
                                  ? "animate-pulse shadow-xl transform scale-110"
                                  : ""
                              }`}
                            >
                              {order.status === "canceled"
                                ? "🚫 CANCELED"
                                : order.status.replace("-", " ").toUpperCase()}
                            </Badge>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                          {/* Order Items */}
                          <div
                            className={`p-6 rounded-xl transition-all duration-300 ${
                              order.status === "canceled"
                                ? "opacity-50 bg-red-50/60 border-2 border-red-300 border-dashed transform scale-[0.98]"
                                : ""
                            }`}
                          >
                            <div className="flex items-center space-x-3 mb-4">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-md transition-all duration-300 ${
                                  order.status === "canceled"
                                    ? "bg-gradient-to-br from-red-500 to-red-700 transform rotate-45"
                                    : "bg-gradient-to-br from-orange-500 to-red-500"
                                }`}
                              >
                                {order.status === "canceled" ? (
                                  <svg
                                    className="w-4 h-4 text-white transform -rotate-45"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={3}
                                      d="M6 18L18 6M6 6l12 12"
                                    />
                                  </svg>
                                ) : (
                                  <svg
                                    className="w-4 h-4 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                                    />
                                  </svg>
                                )}
                              </div>
                              <h4
                                className={`text-lg font-bold tracking-tight transition-all duration-300 ${
                                  order.status === "canceled"
                                    ? "text-red-800 line-through"
                                    : "text-slate-800"
                                }`}
                              >
                                {order.status === "canceled"
                                  ? "❌ Canceled Order Items"
                                  : "Order Items"}
                              </h4>
                              {order.status === "canceled" && (
                                <Badge className="bg-red-200 text-red-800 text-xs px-3 py-1 rounded-full border border-red-400 animate-pulse">
                                  Order canceled by customer
                                </Badge>
                              )}
                              <div className="flex-1"></div>
                            </div>

                            {order.items.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {order.items.map((item, index) => (
                                  <div
                                    key={index}
                                    className={`group relative transition-all duration-300 rounded-xl p-4 shadow-sm ${
                                      order.status === "canceled"
                                        ? "bg-red-50/80 border-2 border-red-200 border-dashed opacity-60 transform scale-95 hover:scale-95"
                                        : "bg-white/80 backdrop-blur-sm border border-slate-200/70 hover:shadow-lg hover:border-orange-200 hover:-translate-y-0.5"
                                    }`}
                                  >
                                    <div className="flex items-center space-x-3">
                                      <div
                                        className={`w-3 h-3 rounded-full flex-shrink-0 shadow-sm transition-all duration-300 ${
                                          order.status === "canceled"
                                            ? "bg-gradient-to-br from-red-400 to-red-600"
                                            : "bg-gradient-to-br from-orange-400 to-red-400"
                                        }`}
                                      ></div>
                                      <span
                                        className={`text-sm font-semibold flex-1 transition-all duration-300 ${
                                          order.status === "canceled"
                                            ? "text-red-800 line-through opacity-75"
                                            : "text-slate-800 group-hover:text-orange-700"
                                        }`}
                                      >
                                        {item}
                                      </span>
                                      {order.status === "canceled" ? (
                                        <div className="w-6 h-6 bg-red-200 rounded-full flex items-center justify-center opacity-70">
                                          <svg
                                            className="w-3 h-3 text-red-600"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={3}
                                              d="M6 18L18 6M6 6l12 12"
                                            />
                                          </svg>
                                        </div>
                                      ) : (
                                        <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                          <svg
                                            className="w-3 h-3 text-emerald-600"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={3}
                                              d="M5 13l4 4L19 7"
                                            />
                                          </svg>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8">
                                <div
                                  className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 transition-all duration-300 ${
                                    order.status === "canceled"
                                      ? "bg-red-100"
                                      : "bg-slate-100"
                                  }`}
                                >
                                  <svg
                                    className={`w-8 h-8 ${
                                      order.status === "canceled"
                                        ? "text-red-400"
                                        : "text-slate-400"
                                    }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                                    />
                                  </svg>
                                </div>
                                <p
                                  className={`font-medium ${
                                    order.status === "canceled"
                                      ? "text-red-500 line-through"
                                      : "text-slate-500"
                                  }`}
                                >
                                  No items specified
                                </p>
                                <p
                                  className={`text-sm mt-1 ${
                                    order.status === "canceled"
                                      ? "text-red-400"
                                      : "text-slate-400"
                                  }`}
                                >
                                  {order.status === "canceled"
                                    ? "Order was canceled"
                                    : "Items will appear here when added to the order"}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-col sm:flex-row gap-4 mb-6">
                            {/* Show dramatic message for canceled orders */}
                            {order.status === "canceled" ? (
                              <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-red-50 via-red-100 to-red-200 border-4 border-red-400 border-dashed rounded-2xl shadow-xl">
                                <div className="text-center">
                                  <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse shadow-lg">
                                    <svg
                                      className="w-10 h-10 text-white"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={3}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                                      />
                                    </svg>
                                  </div>
                                  <p className="text-red-900 font-black text-xl mb-2">
                                    ⚠️ ORDER CANCELED ⚠️
                                  </p>
                                  <p className="text-red-700 font-bold text-lg mb-2">
                                    Customer canceled this order
                                  </p>
                                  <p className="text-red-600 text-sm font-semibold">
                                    No preparation needed • Archive when ready
                                  </p>
                                  <div className="mt-4 px-4 py-2 bg-red-600 text-white rounded-full text-xs font-bold animate-pulse">
                                    🚫 DO NOT PREPARE 🚫
                                  </div>
                                </div>
                              </div>
                            ) : (
                              // Show normal workflow buttons for non-canceled orders
                              <>
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
                                    onClick={() =>
                                      updateOrderStatus(order.id, "ready")
                                    }
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
                              </>
                            )}
                          </div>
                        </div>

                        {/* Enhanced separator line for canceled orders */}
                        <div
                          className={`border-b-2 transition-all duration-300 ${
                            order.status === "canceled"
                              ? "border-red-300 border-dashed"
                              : "border-slate-200"
                          }`}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination Component */}
          {orders.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              className="border-t border-slate-100/50"
            />
          )}
        </Card>
      </main>
    </div>
  );
};

export default StaffDashboard;
