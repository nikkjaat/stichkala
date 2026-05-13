"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiX,
  FiUpload,
  FiImage,
  FiChevronDown,
  FiChevronUp,
  FiPackage,
  FiUser,
  FiDollarSign,
  
  FiCalendar,
  FiShoppingBag,
  FiMove,
  FiInfo,
} from "react-icons/fi";
import { get } from "node:http";

interface Product {
  _id: string;
  name: string;
  category: "embroidery" | "hanky" | "accessories";
  description: string;
  basePrice: number;
  images: string[];
  customizable: boolean;
  options: {
    sizes: string[];
    sizeUnit?: "inch" | "cm" | "m";
    materials: string[];
  };
  inStock: boolean;
  featured: boolean;
  createdAt: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    address: {
      street: string;
      city: string;
      state: string;
      pincode: string;
    };
  };
  items: Array<{
    productId: string;
    productName: string;
    productImage: string;
    quantity: number;
    price: number;
    customization: {
      text: string;
      color: string;
      size: string;
      material: string;
      specialInstructions: string;
    };
  }>;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  estimatedDelivery: string;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"orders" | "products">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProductDetail, setSelectedProductDetail] =
    useState<Product | null>(null);
  const [showOrderProductsPopup, setShowOrderProductsPopup] =
    useState<Order | null>(null);

  // Real-time updates using polling
  useEffect(() => {
    fetchOrders();
    fetchProducts();

    // Set up polling for real-time updates
    const interval = setInterval(() => {
      fetchOrders();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await fetch("/api/orders");
      const result = await response.json();

      if (result.success) {
        setOrders(result.orders);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products?all=true");
      const result = await response.json();
      if (result.success) {
        setProducts(result.products);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const result = await response.json();
      if (result.success) {
        setOrders(
          orders.map((order) =>
            order._id === orderId ? { ...order, status } : order
          )
        );
        if (selectedOrder && selectedOrder._id === orderId) {
          setSelectedOrder({ ...selectedOrder, status });
        }
      }
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  const deleteProduct = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      });

      const result = await response.json();
      if (result.success) {
        setProducts(products.filter((p) => p._id !== productId));
      }
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-blue-100 text-blue-800",
      "in-progress": "bg-purple-100 text-purple-800",
      completed: "bg-green-100 text-green-800",
      shipped: "bg-teal-100 text-teal-800",
      delivered: "bg-green-200 text-green-900",
      cancelled: "bg-red-100 text-red-800",
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const handleOrderClick = (order: Order) => {
    if (expandedOrder === order._id) {
      setExpandedOrder(null);
      setSelectedOrder(null);
    } else {
      setExpandedOrder(order._id);
      setSelectedOrder(order);
    }
  };

  const getProductImageForItem = (item: any) => {
    return item.productId?.images?.[0] || "/api/placeholder/120/120";
  };

  const handleOrderImageClick = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowOrderProductsPopup(order);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pt-12 mt-12">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-serif text-2xl sm:text-3xl text-text-dark mb-2">
            Admin Panel
          </h1>
          <p className="text-text-light text-sm sm:text-base">
            Manage your products and orders
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex space-x-4 sm:space-x-8">
            <button
              onClick={() => setActiveTab("orders")}
              className={`pb-3 px-1 font-medium transition-colors text-sm sm:text-base ${
                activeTab === "orders"
                  ? "border-b-2 border-rose text-rose"
                  : "text-text-light hover:text-text-dark"
              }`}
            >
              Orders ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab("products")}
              className={`pb-3 px-1 font-medium transition-colors text-sm sm:text-base ${
                activeTab === "products"
                  ? "border-b-2 border-rose text-rose"
                  : "text-text-light hover:text-text-dark"
              }`}
            >
              Products ({products.length})
            </button>
          </div>
        </div>

        {activeTab === "orders" ? (
          <div className="space-y-4">
            {/* Orders List */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-4 sm:p-6 border-b">
                <h2 className="font-serif text-lg sm:text-xl text-text-dark">
                  Recent Orders
                </h2>
                <p className="text-text-light text-sm mt-1">
                  {orders.length} orders found
                </p>
              </div>

              <div className="divide-y">
                {orders.map((order) => (
                  <div key={order._id}>
                    <motion.div
                      className={`p-4 sm:p-6 cursor-pointer hover:bg-gray-50 transition-colors ${
                        expandedOrder === order._id ? "bg-blue-50" : ""
                      }`}
                      onClick={() => handleOrderClick(order)}
                      whileHover={{ x: 2 }}
                    >
                      <div className="flex gap-4">
                        {/* Product Image */}
                        <div className="flex-shrink-0">
                          <img
                            src={getProductImage(order)}
                            alt="Product"
                            className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={(e) => handleOrderImageClick(order, e)}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "";
                            }}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium text-text-dark text-sm sm:text-base truncate">
                                  #{order.orderNumber}
                                </h3>
                                <span
                                  className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                                    order.status
                                  )}`}
                                >
                                  {order.status}
                                </span>
                              </div>
                              <p className="text-text-light text-sm truncate">
                                {order.customerInfo.name}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              {expandedOrder === order._id ? (
                                <FiChevronUp className="text-text-light" />
                              ) : (
                                <FiChevronDown className="text-text-light" />
                              )}
                            </div>
                          </div>

                          <div className="flex justify-between items-center text-xs sm:text-sm text-text-light">
                            <div className="flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <FiPackage size={12} />
                                {order.items.length} item(s)
                              </span>
                              <span className="flex items-center gap-1">
                                <FiDollarSign size={12} />₹{order.totalAmount}
                              </span>
                            </div>
                            <span className="flex items-center gap-1">
                              <FiCalendar size={12} />
                              {new Date(order.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* Order Details - Expandable */}
                    <AnimatePresence>
                      {expandedOrder === order._id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="border-t bg-white"
                        >
                          <div className="p-4 sm:p-6 space-y-6">
                            {/* Customer Information */}
                            <div>
                              <h4 className="font-medium text-text-dark mb-3 flex items-center gap-2">
                                <FiUser className="text-rose" />
                                Customer Information
                              </h4>
                              <div className="text-sm text-text-light space-y-2 bg-gray-50 rounded-lg p-3">
                                <p>
                                  <strong>Name:</strong>{" "}
                                  {order.customerInfo.name}
                                </p>
                                <p>
                                  <strong>Email:</strong>{" "}
                                  {order.customerInfo.email}
                                </p>
                                <p>
                                  <strong>Phone:</strong>{" "}
                                  {order.customerInfo.phone}
                                </p>
                                <p>
                                  <strong>Address:</strong>{" "}
                                  {order.customerInfo.address.street},{" "}
                                  {order.customerInfo.address.city},{" "}
                                  {order.customerInfo.address.state} -{" "}
                                  {order.customerInfo.address.pincode}
                                </p>
                              </div>
                            </div>

                            {/* Order Items */}
                            <div>
                              <h4 className="font-medium text-text-dark mb-3 flex items-center gap-2">
                                <FiShoppingBag className="text-rose" />
                                Order Items
                              </h4>
                              <div className="space-y-3 cursor-pointer">
                                {order.items.map((item, index) => (
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOrderImageClick(order, e);
                                    }}
                                    key={index}
                                    className="bg-gray-50 rounded-lg p-3 border"
                                  >
                                    <div className="flex gap-3">
                                      {/* Item Image */}
                                      <img
                                        src={getProductImage(order)}
                                        alt={item.productName}
                                        className="w-16 h-16 object-cover rounded-lg border  hover:opacity-80 transition-opacity"
                                        onError={(e) => {
                                          const target =
                                            e.target as HTMLImageElement;
                                          target.src = "/api/placeholder/80/80";
                                        }}
                                      />
                                      <div className="flex-1">
                                        <div className="flex justify-between items-start mb-2">
                                          <h5 className="font-medium text-text-dark text-sm">
                                            {item.productName}
                                          </h5>
                                          <span className="text-sm text-text-light">
                                            ₹{item.price}
                                          </span>
                                        </div>
                                        <p className="text-sm text-text-light mb-2">
                                          Quantity: {item.quantity}
                                        </p>

                                        {item.customization.text && (
                                          <div className="text-xs text-text-light space-y-1 bg-white rounded p-2">
                                            <p>
                                              <strong>Text:</strong>{" "}
                                              {item.customization.text}
                                            </p>
                                            <p>
                                              <strong>Color:</strong>{" "}
                                              {item.customization.color}
                                            </p>
                                            <p>
                                              <strong>Size:</strong>{" "}
                                              {item.customization.size}
                                            </p>
                                            <p>
                                              <strong>Material:</strong>{" "}
                                              {item.customization.material}
                                            </p>
                                            {item.customization
                                              .specialInstructions && (
                                              <p>
                                                <strong>Instructions:</strong>{" "}
                                                {
                                                  item.customization
                                                    .specialInstructions
                                                }
                                              </p>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Status Update */}
                            <div>
                              <h4 className="font-medium text-text-dark mb-2">
                                Update Status
                              </h4>
                              <select
                                value={order.status}
                                onChange={(e) =>
                                  updateOrderStatus(order._id, e.target.value)
                                }
                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-rose"
                              >
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="in-progress">In Progress</option>
                                <option value="completed">Completed</option>
                                <option value="shipped">Shipped</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </div>

                            {/* Order Summary */}
                            <div className="border-t pt-4">
                              <div className="flex justify-between items-center text-base font-medium">
                                <span>Total Amount:</span>
                                <span className="text-rose">
                                  ₹{order.totalAmount}
                                </span>
                              </div>
                              <p className="text-xs text-text-light mt-1">
                                Estimated Delivery:{" "}
                                {new Date(
                                  order.estimatedDelivery
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Products Header */}
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h2 className="font-serif text-lg sm:text-xl text-text-dark">
                  Products
                </h2>
                <p className="text-text-light text-sm">
                  {products.length} products
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setShowProductModal(true);
                }}
                className="flex items-center space-x-2 bg-rose text-white px-4 py-2 sm:px-6 sm:py-3 rounded-lg hover:bg-rose-dark transition-colors text-sm sm:text-base"
              >
                <FiPlus size={16} />
                <span>Add Product</span>
              </button>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {products.map((product) => (
                <motion.div
                  key={product._id}
                  className="bg-white rounded-xl shadow-lg overflow-hidden"
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.2 }}
                >
                  {product.images &&
                    product.images.length > 0 &&
                    product.images[0] && (
                      <img
                        src={product?.images[0]}
                        alt={product.name}
                        className="w-full h-40 sm:h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => setSelectedProductDetail(product)}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/api/placeholder/400/300";
                        }}
                      />
                    )}
                  {(!product.images ||
                    product.images.length === 0 ||
                    !product.images[0]) && (
                    <div className="w-full h-40 sm:h-48 bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-400 text-sm">No image</span>
                    </div>
                  )}
                  <div className="p-4 sm:p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-serif text-base sm:text-lg text-text-dark line-clamp-2 flex-1 pr-2">
                        {product.name}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs rounded flex-shrink-0 ${
                          product.inStock
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {product.inStock ? "In Stock" : "Out of Stock"}
                      </span>
                    </div>
                    <p className="text-sm text-text-light mb-2 capitalize">
                      {product.category}
                    </p>
                    <p className="text-text-light text-sm mb-3 line-clamp-2">
                      {product.description}
                    </p>
                    <p className="text-rose font-medium mb-4 text-base sm:text-lg">
                      ₹{product.basePrice}
                    </p>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditingProduct(product);
                          setShowProductModal(true);
                        }}
                        className="flex-1 flex items-center justify-center space-x-1 sm:space-x-2 border border-rose text-rose px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-rose hover:text-white transition-colors text-sm"
                      >
                        <FiEdit2 size={14} />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => deleteProduct(product._id)}
                        className="flex-1 flex items-center justify-center space-x-1 sm:space-x-2 border border-red-500 text-red-500 px-3 py-2 sm:px-4 sm:py-2 rounded-lg hover:bg-red-500 hover:text-white transition-colors text-sm"
                      >
                        <FiTrash2 size={14} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Order Products Popup */}
        {showOrderProductsPopup && (
          <OrderProductsPopup
            order={showOrderProductsPopup}
            onClose={() => setShowOrderProductsPopup(null)}
          />
        )}

        {showProductModal && (
          <ProductModal
            product={editingProduct}
            onClose={() => {
              setShowProductModal(false);
              setEditingProduct(null);
            }}
            onSave={() => {
              fetchProducts();
              setShowProductModal(false);
              setEditingProduct(null);
            }}
          />
        )}

        {selectedProductDetail && (
          <ProductDetailModal
            product={selectedProductDetail}
            onClose={() => setSelectedProductDetail(null)}
            onEdit={(product) => {
              setSelectedProductDetail(null);
              setEditingProduct(product);
              setShowProductModal(true);
            }}
          />
        )}
      </div>
    </div>
  );
}

const getProductImage = (item: any) => {
  // console.log(item.items[0].productId.images[0])
  if (
    !item.items[0].productId ||
    !Array.isArray(item.items[0].productId.images) ||
    item.items[0].productId.images.length === 0
  ) {
    return "/api/placeholder/120/120";
  }
  return item.items[0].productId.images[0];
};

// Order Products Popup Component
interface OrderProductsPopupProps {
  order: Order;
  onClose: () => void;
}

function OrderProductsPopup({ order, onClose }: OrderProductsPopupProps) {
  const getProductImageForItem = (item: any) => {
    console.log(item);
    return item.productId?.images?.[0] || "/api/placeholder/120/120";
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b p-4 sm:p-6 flex justify-between items-center z-10">
          <div>
            <h2 className="font-serif text-xl sm:text-2xl text-text-dark">
              Order Products
            </h2>
            <p className="text-text-light text-sm mt-1">
              Order #{order.orderNumber} - {order.items.length} item(s)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-text-light hover:text-text-dark transition-colors p-1"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {order.items.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-50 rounded-xl p-4 border hover:shadow-md transition-shadow"
              >
                <div className="flex gap-4">
                  {/* Product Image */}
                  <div className="flex-shrink-0">
                    <img
                      src={getProductImageForItem(item)}
                      alt={item.productName}
                      className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg border"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/api/placeholder/120/120";
                      }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-text-dark text-sm sm:text-base line-clamp-2">
                        {item.productName}
                      </h3>
                      <span className="text-rose font-medium text-sm sm:text-base whitespace-nowrap ml-2">
                        ₹{item.price}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="flex justify-between">
                        <span className="text-text-light">Quantity:</span>
                        <span className="font-medium">{item.quantity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-light">Subtotal:</span>
                        <span className="font-medium">
                          ₹{item.price * item.quantity}
                        </span>
                      </div>
                    </div>

                    {/* Customization Details */}
                    {(item.customization.text ||
                      item.customization.color ||
                      item.customization.size ||
                      item.customization.material) && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center gap-1 mb-2">
                          <FiInfo className="text-rose" size={12} />
                          <span className="text-xs font-medium text-text-dark">
                            Customization
                          </span>
                        </div>
                        <div className="space-y-1 text-xs text-text-light">
                          {item.customization.text && (
                            <p>
                              <strong>Text:</strong> {item.customization.text}
                            </p>
                          )}
                          {item.customization.color && (
                            <p>
                              <strong>Color:</strong> {item.customization.color}
                            </p>
                          )}
                          {item.customization.size && (
                            <p>
                              <strong>Size:</strong> {item.customization.size}
                            </p>
                          )}
                          {item.customization.material && (
                            <p>
                              <strong>Material:</strong>{" "}
                              {item.customization.material}
                            </p>
                          )}
                          {item.customization.specialInstructions && (
                            <p>
                              <strong>Instructions:</strong>{" "}
                              {item.customization.specialInstructions}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex justify-between items-center text-lg font-medium">
              <span>Total Amount:</span>
              <span className="text-rose text-xl">₹{order.totalAmount}</span>
            </div>
            <div className="flex justify-between items-center text-sm text-text-light mt-2">
              <span>Order Status:</span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  order.status === "pending"
                    ? "bg-yellow-100 text-yellow-800"
                    : order.status === "confirmed"
                      ? "bg-blue-100 text-blue-800"
                      : order.status === "in-progress"
                        ? "bg-purple-100 text-purple-800"
                        : order.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : order.status === "shipped"
                            ? "bg-teal-100 text-teal-800"
                            : order.status === "delivered"
                              ? "bg-green-200 text-green-900"
                              : "bg-red-100 text-red-800"
                }`}
              >
                {order.status}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm text-text-light mt-1">
              <span>Payment Status:</span>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${
                  order.paymentStatus === "paid"
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {order.paymentStatus}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onSave: () => void;
}

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
  onEdit: (product: Product) => void;
}

function ProductDetailModal({
  product,
  onClose,
  onEdit,
}: ProductDetailModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b p-4 sm:p-6 flex justify-between items-center z-10">
          <h2 className="font-serif text-xl sm:text-2xl text-text-dark">
            Product Details
          </h2>
          <button
            onClick={onClose}
            className="text-text-light hover:text-text-dark transition-colors p-1"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Image Gallery */}
            <div className="space-y-4">
              {product.images && product.images.length > 0 ? (
                <>
                  <div className="relative rounded-xl overflow-hidden bg-gray-100">
                    <img
                      src={product.images[currentImageIndex]}
                      alt={`${product.name} - Image ${currentImageIndex + 1}`}
                      className="w-full h-64 sm:h-80 object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/api/placeholder/400/300";
                      }}
                    />
                    {product.images.length > 1 && (
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-sm">
                        {currentImageIndex + 1} / {product.images.length}
                      </div>
                    )}
                  </div>
                  {product.images.length > 1 && (
                    <div className="grid grid-cols-5 gap-2">
                      {product.images.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                            idx === currentImageIndex
                              ? "border-rose"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <img
                            src={img}
                            alt={`Thumbnail ${idx + 1}`}
                            className="w-full h-16 object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/api/placeholder/100/100";
                            }}
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="w-full h-64 sm:h-80 bg-gray-100 rounded-xl flex items-center justify-center">
                  <span className="text-gray-400">No images available</span>
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`px-3 py-1 text-xs rounded-full ${
                      product.inStock
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {product.inStock ? "In Stock" : "Out of Stock"}
                  </span>
                  {product.featured && (
                    <span className="px-3 py-1 text-xs rounded-full bg-rose text-white">
                      Featured
                    </span>
                  )}
                </div>
                <h3 className="font-serif text-2xl text-text-dark mb-2">
                  {product.name}
                </h3>
                <p className="text-sm text-text-light capitalize mb-3">
                  {product.category}
                </p>
                <p className="text-2xl text-rose font-medium mb-4">
                  ₹{product.basePrice}
                </p>
              </div>

              <div>
                <h4 className="font-medium text-text-dark mb-2">Description</h4>
                <p className="text-text-light text-sm leading-relaxed">
                  {product.description}
                </p>
              </div>

              {product.options && (
                <div className="space-y-3">
                  {product.options.sizes &&
                    product.options.sizes.length > 0 && (
                      <div>
                        <h4 className="font-medium text-text-dark mb-2 text-sm">
                          Sizes{" "}
                          {product.options.sizeUnit &&
                            `(${product.options.sizeUnit})`}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {product.options.sizes.map((size, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-gray-100 rounded-full text-xs"
                            >
                              {size}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  {product.options.materials &&
                    product.options.materials.length > 0 && (
                      <div>
                        <h4 className="font-medium text-text-dark mb-2 text-sm">
                          Materials
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {product.options.materials.map((material, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-gray-100 rounded-full text-xs"
                            >
                              {material}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              )}

              <div className="pt-4 border-t">
                <h4 className="font-medium text-text-dark mb-2 text-sm">
                  Additional Info
                </h4>
                <div className="space-y-1 text-sm text-text-light">
                  <p>Customizable: {product.customizable ? "Yes" : "No"}</p>
                  <p>Product ID: {product._id}</p>
                  {product.createdAt && (
                    <p>
                      Created:{" "}
                      {new Date(product.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => onEdit(product)}
                  className="flex-1 flex items-center justify-center gap-2 bg-rose text-white px-6 py-3 rounded-lg hover:bg-opacity-90 transition-colors"
                >
                  <FiEdit2 size={16} />
                  Edit Product
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 border border-gray-300 text-text-dark rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ProductModal({ product, onClose, onSave }: ProductModalProps) {
  const [formData, setFormData] = useState({
    name: product?.name || "",
    category: product?.category || "embroidery",
    description: product?.description || "",
    basePrice: product?.basePrice || 0,
    customizable: product?.customizable ?? true,
    sizes: product?.options?.sizes?.join(", ") || "",
    sizeUnit: product?.options?.sizeUnit || "inch",
    materials: product?.options?.materials?.join(", ") || "Cotton thread",
    inStock: product?.inStock ?? true,
    featured: product?.featured ?? false,
  });

  const [saving, setSaving] = useState(false);
  const [uploadMethod, setUploadMethod] = useState<"url" | "file">("url");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>(
    product?.images || []
  );
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check if adding these files would exceed the 10 image limit
    if (uploadedImages.length + files.length > 10) {
      alert("Maximum 10 images allowed per product");
      return;
    }

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("uploadType", "file");

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();
        if (result.success) {
          return result.url;
        } else {
          throw new Error("Failed to upload image");
        }
      });

      const newImageUrls = await Promise.all(uploadPromises);
      const updatedImages = [...uploadedImages, ...newImageUrls];
      setUploadedImages(updatedImages);

      // Clear the file input
      e.target.value = "";
    } catch (error) {
      console.error("Error uploading files:", error);
      alert("Failed to upload some images");
    } finally {
      setUploading(false);
    }
  };

  const handleUrlUpload = async () => {
    if (!imageUrl.trim()) {
      alert("Please enter an image URL");
      return;
    }

    // Check if adding this URL would exceed the 10 image limit
    if (uploadedImages.length >= 10) {
      alert("Maximum 10 images allowed per product");
      return;
    }

    setUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("imageUrl", imageUrl);
      uploadFormData.append("uploadType", "url");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: uploadFormData,
      });

      const result = await response.json();
      if (result.success) {
        const newImages = [...uploadedImages, result.url];
        setUploadedImages(newImages);
        setImageUrl("");
      } else {
        alert("Failed to upload image from URL");
      }
    } catch (error) {
      console.error("Error uploading from URL:", error);
      alert("Failed to upload image from URL");
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    const newImages = uploadedImages.filter((_, i) => i !== index);
    setUploadedImages(newImages);
  };

  // Enhanced Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData("text/plain", index.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData("text/plain"));

    if (dragIndex === dropIndex) {
      setDragOverIndex(null);
      return;
    }

    const newImages = [...uploadedImages];
    const [draggedImage] = newImages.splice(dragIndex, 1);
    newImages.splice(dropIndex, 0, draggedImage);

    setUploadedImages(newImages);
    setDragOverIndex(null);
  };

  const moveImage = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;

    const newImages = [...uploadedImages];
    const [movedImage] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedImage);
    setUploadedImages(newImages);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload = {
      name: formData.name,
      category: formData.category,
      description: formData.description,
      basePrice: Number(formData.basePrice),
      images: uploadedImages,
      customizable: formData.customizable,
      options: {
        sizes: formData.sizes
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s),
        sizeUnit: formData.sizeUnit,
        materials: formData.materials
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s),
      },
      inStock: formData.inStock,
      featured: formData.featured,
    };

    try {
      const url = product ? `/api/products/${product._id}` : "/api/products";
      const method = product ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (result.success) {
        onSave();
      }
    } catch (error) {
      console.error("Error saving product:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b p-4 sm:p-6 flex justify-between items-center">
          <h2 className="font-serif text-xl sm:text-2xl text-text-dark">
            {product ? "Edit Product" : "Add New Product"}
          </h2>
          <button
            onClick={onClose}
            className="text-text-light hover:text-text-dark transition-colors p-1"
          >
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-dark mb-1">
              Product Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-rose"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-dark mb-1">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  category: e.target.value as
                    | "embroidery"
                    | "hanky"
                    | "accessories",
                })
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-rose"
              required
            >
              <option value="embroidery">Embroidery</option>
              <option value="hanky">Hanky</option>
              <option value="accessories">Accessories</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-dark mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-rose"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-dark mb-1">
              Base Price
            </label>
            <input
              type="number"
              value={formData.basePrice}
              onChange={(e) =>
                setFormData({ ...formData, basePrice: Number(e.target.value) })
              }
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-rose"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-dark mb-2">
              Product Images ({uploadedImages.length}/10)
            </label>

            <div className="mb-4 flex space-x-2 border-b border-gray-200">
              <button
                type="button"
                onClick={() => setUploadMethod("url")}
                className={`pb-2 px-3 font-medium transition-colors text-sm ${
                  uploadMethod === "url"
                    ? "border-b-2 border-rose text-rose"
                    : "text-text-light hover:text-text-dark"
                }`}
              >
                URL
              </button>
              <button
                type="button"
                onClick={() => setUploadMethod("file")}
                className={`pb-2 px-3 font-medium transition-colors text-sm ${
                  uploadMethod === "file"
                    ? "border-b-2 border-rose text-rose"
                    : "text-text-light hover:text-text-dark"
                }`}
              >
                Upload
              </button>
            </div>

            {uploadMethod === "url" ? (
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Enter image URL"
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-rose"
                />
                <button
                  type="button"
                  onClick={handleUrlUpload}
                  disabled={uploading || uploadedImages.length >= 10}
                  className="flex items-center gap-2 px-4 py-2 bg-rose text-white rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 text-sm"
                >
                  <FiImage size={14} />
                  {uploading ? "Uploading..." : "Add"}
                </button>
              </div>
            ) : (
              <div className="mb-4">
                <label className="flex flex-col items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-rose transition-colors">
                  <FiUpload className="text-rose" size={24} />
                  <span className="text-text-light text-sm text-center">
                    {uploading
                      ? "Uploading..."
                      : "Click to upload or drag and drop"}
                  </span>
                  <span className="text-xs text-text-light">
                    PNG, JPG, GIF up to 10MB (Max {10 - uploadedImages.length}{" "}
                    images)
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={uploading || uploadedImages.length >= 10}
                    multiple
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {uploadedImages.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-text-light">
                  Drag to reorder images. First image will be the main product
                  image.
                </p>

                {/* Image Grid with Drag & Drop */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {uploadedImages.map((img, index) => (
                    <div
                      key={index}
                      className={`relative group border-2 rounded-lg transition-all duration-200 ${
                        dragOverIndex === index
                          ? "border-rose border-dashed bg-rose/5"
                          : "border-gray-200"
                      }`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragLeave}
                    >
                      {/* Position Badge */}
                      <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-2 py-1 rounded z-10">
                        {index + 1}
                      </div>

                      {/* Image */}
                      <img
                        src={img}
                        alt={`Product ${index + 1}`}
                        className="w-full h-24 object-cover rounded-md"
                      />

                      {/* Drag Handle */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-200 rounded-md flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        <FiMove className="text-white" size={18} />
                        <span className="text-white text-sm font-medium">
                          Drag to reorder
                        </span>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        <FiX size={12} />
                      </button>

                      {/* Move Controls */}
                      <div className="absolute bottom-1 left-1 right-1 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() =>
                            moveImage(index, Math.max(0, index - 1))
                          }
                          disabled={index === 0}
                          className="bg-white/90 text-gray-700 p-1 rounded text-xs disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            moveImage(
                              index,
                              Math.min(uploadedImages.length - 1, index + 1)
                            )
                          }
                          disabled={index === uploadedImages.length - 1}
                          className="bg-white/90 text-gray-700 p-1 rounded text-xs disabled:opacity-30"
                        >
                          ↓
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Image Order Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-blue-800 text-sm font-medium">
                    Display Order:
                  </p>
                  <p className="text-blue-700 text-xs mt-1">
                    • Image #1 will be shown as the main product image
                    <br />
                    • Drag images to change their display order
                    <br />• Use arrow buttons for precise control
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-dark mb-1">
                Sizes
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.sizeUnit}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      sizeUnit: e.target.value as "inch" | "cm" | "m",
                    })
                  }
                  className="w-24 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-rose"
                >
                  <option value="inch">Inch</option>
                  <option value="cm">Cm</option>
                  <option value="m">M</option>
                </select>
                <input
                  type="text"
                  value={formData.sizes}
                  onChange={(e) =>
                    setFormData({ ...formData, sizes: e.target.value })
                  }
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-rose"
                  placeholder="12, 14, 16"
                />
              </div>
              <p className="text-xs text-text-light mt-1">
                Enter sizes separated by commas (numbers only)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-dark mb-1">
                Materials
              </label>
              <select
                value={formData.materials}
                onChange={(e) =>
                  setFormData({ ...formData, materials: e.target.value })
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-rose"
              >
                <option value="Cotton thread">Cotton thread</option>
                <option value="Silk thread">Silk thread</option>
                <option value="Wool thread">Wool thread</option>
                <option value="Polyester thread">Polyester thread</option>
                <option value="Metallic thread">Metallic thread</option>
              </select>
              <p className="text-xs text-text-light mt-1">
                Select material type
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.customizable}
                onChange={(e) =>
                  setFormData({ ...formData, customizable: e.target.checked })
                }
                className="w-4 h-4 text-rose border-gray-300 rounded focus:ring-rose"
              />
              <span className="text-sm text-text-dark">Customizable</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.inStock}
                onChange={(e) =>
                  setFormData({ ...formData, inStock: e.target.checked })
                }
                className="w-4 h-4 text-rose border-gray-300 rounded focus:ring-rose"
              />
              <span className="text-sm text-text-dark">In Stock</span>
            </label>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.featured}
                onChange={(e) =>
                  setFormData({ ...formData, featured: e.target.checked })
                }
                className="w-4 h-4 text-rose border-gray-300 rounded focus:ring-rose"
              />
              <span className="text-sm text-text-dark">Featured</span>
            </label>
          </div>

          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-text-dark rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-6 py-3 bg-rose text-white rounded-lg hover:bg-rose-dark transition-colors disabled:opacity-50 text-sm"
            >
              {saving
                ? "Saving..."
                : product
                  ? "Update Product"
                  : "Add Product"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
