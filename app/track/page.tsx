"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface OrderStatus {
  _id: string;
  orderNumber: string;
  status: string;
  customerInfo: {
    name: string;
    email: string;
  };
  items: Array<{
    productName: string;
    quantity: number;
  }>;
  totalAmount: number;
  createdAt: string;
  estimatedDelivery: string;
  trackingNumber?: string;
}

export default function TrackOrderPage() {
  useEffect(() => {
    document.title = "Track your Order | StichKala - Handcrafted Gifts";
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        "Track your order status with StichKala. Enter your order number to see real-time updates on your handcrafted gifts."
      );
  }, []);

  const [orderNumber, setOrderNumber] = useState("");
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const trackOrder = async () => {
    if (!orderNumber.trim()) {
      setError("Please enter an order number");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // In a real app, you'd have a specific API endpoint for tracking
      const response = await fetch("/api/orders");
      const result = await response.json();

      if (result.success) {
        const foundOrder = result.orders.find(
          (o: OrderStatus) =>
            o.orderNumber.toLowerCase() === orderNumber.toLowerCase()
        );

        if (foundOrder) {
          setOrder(foundOrder);
        } else {
          setError("Order not found. Please check your order number.");
        }
      }
    } catch (error) {
      setError("Failed to track order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusSteps = (currentStatus: string) => {
    const steps = [
      { key: "pending", label: "Order Placed", icon: "📝" },
      { key: "confirmed", label: "Confirmed", icon: "✅" },
      { key: "in-progress", label: "In Progress", icon: "🎨" },
      { key: "completed", label: "Completed", icon: "✨" },
      { key: "shipped", label: "Shipped", icon: "📦" },
      { key: "delivered", label: "Delivered", icon: "🎉" },
    ];

    const currentIndex = steps.findIndex((step) => step.key === currentStatus);

    return steps.map((step, index) => ({
      ...step,
      completed: index <= currentIndex,
      active: index === currentIndex,
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blush via-lavender to-beige py-6 px-4 sm:py-12 sm:px-6 pt-12">
      <div className="max-w-4xl mx-auto pt-12 sm:pt-12 mt-4 sm:mt-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 sm:mb-12"
        >
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-text-dark mb-3 sm:mb-4">
            Track Your Order
          </h1>
          <p className="text-text-light text-sm sm:text-base md:text-lg">
            Enter your order number to see the current status
          </p>
        </motion.div>

        {/* Search Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="bg-white rounded-2xl sm:rounded-3xl shadow-lg sm:shadow-xl p-4 sm:p-6 md:p-8 mb-6 sm:mb-8"
        >
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <input
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="Enter your order number (e.g., HG000001)"
              className="flex-1 px-4 sm:px-6 py-3 sm:py-4 rounded-full sm:rounded-full border border-gray-300 sm:border-2 focus:border-rose focus:outline-none transition-colors text-sm sm:text-base"
              onKeyPress={(e) => e.key === "Enter" && trackOrder()}
            />
            <motion.button
              onClick={trackOrder}
              disabled={loading}
              className="bg-rose text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full hover:bg-opacity-90 transition-all font-medium disabled:opacity-50 text-sm sm:text-base whitespace-nowrap"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? "Tracking..." : "Track Order"}
            </motion.button>
          </div>

          {error && (
            <p className="text-red-500 text-xs sm:text-sm mt-3 text-center">
              {error}
            </p>
          )}
        </motion.div>

        {/* Order Details */}
        {order && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="bg-white rounded-2xl sm:rounded-3xl shadow-lg sm:shadow-xl overflow-hidden"
          >
            {/* Order Header */}
            <div className="bg-gradient-soft p-4 sm:p-6 md:p-8">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3 sm:gap-4 mb-4">
                <div className="flex-1">
                  <h2 className="font-serif text-xl sm:text-2xl text-text-dark mb-1 sm:mb-2">
                    Order #{order.orderNumber}
                  </h2>
                  <p className="text-text-light text-xs sm:text-sm">
                    Placed on {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-left sm:text-right w-full sm:w-auto">
                  <p className="text-xl sm:text-2xl font-bold text-rose">
                    ₹{order.totalAmount}
                  </p>
                  <p className="text-xs sm:text-sm text-text-light">
                    {order.items.reduce((sum, item) => sum + item.quantity, 0)}{" "}
                    item(s)
                  </p>
                </div>
              </div>
            </div>

            {/* Status Timeline */}
            <div className="p-4 sm:p-6 md:p-8">
              <h3 className="font-serif text-lg sm:text-xl text-text-dark mb-4 sm:mb-6">
                Order Status
              </h3>

              <div className="relative">
                {getStatusSteps(order.status).map((step, index) => (
                  <div
                    key={step.key}
                    className="flex items-start mb-4 sm:mb-6 last:mb-0"
                  >
                    <div
                      className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-base sm:text-lg md:text-xl flex-shrink-0 ${
                        step.completed
                          ? "bg-rose text-white"
                          : "bg-gray-200 text-gray-400"
                      }`}
                    >
                      {step.icon}
                    </div>

                    <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                      <h4
                        className={`font-medium text-sm sm:text-base ${
                          step.completed ? "text-text-dark" : "text-gray-400"
                        }`}
                      >
                        {step.label}
                      </h4>
                      {step.active && (
                        <p className="text-xs sm:text-sm text-rose font-medium mt-1">
                          Current Status
                        </p>
                      )}
                    </div>

                    {index < getStatusSteps(order.status).length - 1 && (
                      <div
                        className={`absolute left-4 sm:left-5 md:left-6 w-0.5 h-4 sm:h-6 mt-8 sm:mt-10 md:mt-12 ${
                          step.completed ? "bg-rose" : "bg-gray-200"
                        }`}
                        style={{
                          top: `${
                            index * (window.innerWidth < 640 ? 64 : 96) + 32
                          }px`,
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Estimated Delivery */}
              <div className="bg-blue-50 rounded-lg sm:rounded-xl p-4 sm:p-6 mt-6 sm:mt-8">
                <h4 className="font-medium text-text-dark mb-1 sm:mb-2 text-sm sm:text-base">
                  Estimated Delivery
                </h4>
                <p className="text-text-light text-xs sm:text-sm">
                  {new Date(order.estimatedDelivery).toLocaleDateString(
                    "en-IN",
                    {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }
                  )}
                </p>
                {order.trackingNumber && (
                  <p className="text-xs text-text-light mt-2">
                    Tracking Number: {order.trackingNumber}
                  </p>
                )}
              </div>

              {/* Order Items */}
              <div className="mt-6 sm:mt-8">
                <h4 className="font-medium text-text-dark mb-3 sm:mb-4 text-sm sm:text-base">
                  Order Items
                </h4>
                <div className="space-y-2 sm:space-y-3">
                  {order.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center py-2 sm:py-3 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex-1 min-w-0">
                        <h5 className="font-medium text-text-dark text-sm sm:text-base truncate">
                          {item.productName}
                        </h5>
                        <p className="text-xs sm:text-sm text-text-light">
                          Quantity: {item.quantity}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-center mt-8 sm:mt-12"
        >
          <p className="text-text-light mb-3 sm:mb-4 text-sm sm:text-base">
            Need help with your order? We&apos;re here to assist you!
          </p>
          <motion.button
            onClick={() => {
              const message = encodeURIComponent(
                `Hi! I need help tracking my order ${
                  orderNumber || "[Order Number]"
                }`
              );
              window.open(
                `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=${message}`,
                "_blank"
              );
            }}
            className="bg-green-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-full hover:bg-green-600 transition-all font-medium inline-flex items-center gap-2 text-sm sm:text-base"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>💬</span>
            Contact Support
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
