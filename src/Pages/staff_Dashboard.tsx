import { useState, useEffect } from "react";
import { Badge } from "../Components/Badge";
import { Card } from "../Components/Card";
import { Button } from "../Components/UI/Button";
import { axiosInstance } from "../config/axios.config";
import Pusher from "pusher-js";

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
  status: "waiting" | "in-progress" | "ready" | "completed";
  timestamp: string | number;
  total: number;
  phone: string;
  address: string;
  tableNumber: string;
  updatedAt: string;
  rowNumber: number;
}

type ComponentStatus = "waiting" | "in-progress" | "ready" | "completed";
type ApiStatus = "processing" | "preparing" | "ready" | "completed";
type SortOption = "newest" | "oldest" | "status" | "total";

const StaffDashboard = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pusherConnected, setPusherConnected] = useState<boolean>(false);

  // Enhanced function to safely parse items
  const parseOrderItems = (itemsString: string): string[] => {
    if (!itemsString || itemsString.trim() === "") {
      return [];
    }

    try {
      // Handle different formats that might come from the API
      const trimmed = itemsString.trim();

      // If it's already an array format like "[-]" or "[item1, item2]"
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        // Remove brackets and split by comma
        const content = trimmed.slice(1, -1);
        if (content === "-" || content === "") {
          return [];
        }
        return content
          .split(",")
          .map((item) => item.trim())
          .filter((item) => item !== "" && item !== "-");
      }

      // Try to parse as JSON first
      const parsed = JSON.parse(itemsString);
      if (Array.isArray(parsed)) {
        return parsed.filter((item) => item && item !== "-");
      }

      // If it's a single item, wrap in array
      return [parsed.toString()];
    } catch (error) {
      console.warn(
        "Failed to parse items, treating as single item:",
        itemsString
      );

      // If JSON parsing fails, treat as comma-separated string
      if (itemsString.includes(",")) {
        return itemsString
          .split(",")
          .map((item) => item.trim())
          .filter((item) => item !== "" && item !== "-");
      }

      // Single item case
      return itemsString === "-" ? [] : [itemsString];
    }
  };

  // Transform API order to component order format
  // تحديث transformApiOrder function للتعامل مع order_ID
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
      default:
        return "bg-gradient-to-r from-slate-50 to-gray-50 text-slate-700 border-slate-300 shadow-sm";
    }
  };

  const stats = {
    totalToday: orders.length,
    waiting: orders.filter((o) => o.status === "waiting").length,
    inProgress: orders.filter((o) => o.status === "in-progress").length,
    ready: orders.filter((o) => o.status === "ready").length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading orders...</p>
        </div>
      </div>
    );
  }

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
            {orders.length === 0 ? (
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
              orders.map((order, index) => (
                <div
                  key={order.id}
                  className={`p-8 hover:bg-gradient-to-r hover:from-slate-50/50 hover:to-blue-50/30 transition-all duration-300 ${
                    index % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                  }`}
                >
                  <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
                    {/* Order Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex items-center space-x-6">
                          <div className="flex-shrink-0">
                            <div className="w-16 h-16 bg-gradient-to-br from-orange-100 via-red-100 to-pink-100 rounded-2xl flex items-center justify-center shadow-lg">
                              <span className="text-orange-700 font-bold text-lg">
                                #{order.rowNumber || order.id.split("-")[1]}
                              </span>
                            </div>
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">
                              {order.customerName || "Walk-in Customer"}
                            </h3>
                            <div className="flex items-center space-x-4 mb-2">
                              <Badge
                                variant="outline"
                                className="capitalize text-sm font-semibold px-4 py-2 border-slate-300 text-slate-700 bg-white/50 backdrop-blur-sm"
                              >
                                {order.orderType}
                              </Badge>
                            </div>
                            {/* Additional order details */}
                            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                              {order.phone && (
                                <span className="bg-slate-100 px-2 py-1 rounded">
                                  📞 {order.phone}
                                </span>
                              )}
                              {order.tableNumber && (
                                <span className="bg-slate-100 px-2 py-1 rounded">
                                  🍽️ Table {order.tableNumber}
                                </span>
                              )}
                              {order.address && (
                                <span className="bg-slate-100 px-2 py-1 rounded">
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
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                        {/* Order Items */}
                        <div className=" p-6 ">
                          <div className="flex items-center space-x-3 mb-4">
                            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center shadow-md">
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
                            </div>
                            <h4 className="text-lg font-bold text-slate-800 tracking-tight">
                              Order Items
                            </h4>
                            <div className="flex-1"></div>
                          </div>

                          {order.items.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {order.items.map((item, index) => (
                                <div
                                  key={index}
                                  className="group relative bg-white/80 backdrop-blur-sm border border-slate-200/70 rounded-xl p-4 shadow-sm hover:shadow-lg hover:border-orange-200 transition-all duration-300 transform hover:-translate-y-0.5"
                                >
                                  <div className="flex items-center space-x-3">
                                    <div className="w-3 h-3 bg-gradient-to-br from-orange-400 to-red-400 rounded-full flex-shrink-0 shadow-sm"></div>
                                    <span className="text-sm font-semibold text-slate-800 group-hover:text-orange-700 transition-colors duration-200 flex-1">
                                      {item}
                                    </span>
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
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
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
                                    d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                                  />
                                </svg>
                              </div>
                              <p className="text-slate-500 font-medium">
                                No items specified
                              </p>
                              <p className="text-slate-400 text-sm mt-1">
                                Items will appear here when added to the order
                              </p>
                            </div>
                          )}
                        </div>
                        {/* Action Buttons - Now positioned before the separator line */}
                        <div className="flex flex-col sm:flex-row gap-4 mb-6">
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
                        </div>
                      </div>

                      {/* Separator line at the bottom */}
                      <div className="border-b-2 border-slate-200"></div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </main>
    </div>
  );
};

export default StaffDashboard;
