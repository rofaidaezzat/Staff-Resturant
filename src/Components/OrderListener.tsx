import Pusher from "pusher-js";

// 1. Init connection
const pusher = new Pusher("4b8ce5bea9c546484b04", {
  cluster: "eu",
});

// 2. Subscribe to channel
const channel = pusher.subscribe("orders");

// 3. Listen for new orders
channel.bind("new-order", function (data: any) {
  console.log("🔥 New order received:", data);
  // هنا اعرض الأوردر في الصفحة مباشرة
});
