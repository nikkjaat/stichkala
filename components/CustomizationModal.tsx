"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { FaTimes, FaWhatsapp, FaArrowLeft, FaArrowRight } from "react-icons/fa";

interface Product {
  _id: string;
  name: string;
  category: string;
  description: string;
  basePrice: number;
  images: string[];
  customizable: boolean;
  options: {
    sizes: string[];
    sizeUnit?: "inch" | "cm" | "m";
    materials: string[];
  };
}

interface CustomizationModalProps {
  product: Product;
  onClose: () => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CustomizationModal({
  product,
  onClose,
}: CustomizationModalProps) {
  const [formData, setFormData] = useState({
    customerInfo: {
      name: "",
      email: "",
      phone: "",
      whatsappNumber: "",
      address: {
        street: "",
        city: "",
        state: "",
        pincode: "",
      },
    },
    customization: {
      text: "",
      size: product.options.sizes[0] || "",
      material: product.options.materials[0] || "",
      specialInstructions: "",
    },
    quantity: 1,
    giftWrap: false,
  });

  const [currentStep, setCurrentStep] = useState(product.customizable ? 1 : 1);
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  const handleInputChange = (
    section: string,
    field: string,
    value: string | number | boolean
  ) => {
    if (section === "address") {
      setFormData((prev) => ({
        ...prev,
        customerInfo: {
          ...prev.customerInfo,
          address: {
            ...prev.customerInfo.address,
            [field]: value,
          },
        },
      }));
    } else if (section === "customerInfo") {
      setFormData((prev) => ({
        ...prev,
        customerInfo: {
          ...prev.customerInfo,
          [field]: value,
        },
      }));
    } else if (section === "customization") {
      setFormData((prev) => ({
        ...prev,
        customization: {
          ...prev.customization,
          [field]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  const calculateTotal = () => {
    let total = product.basePrice * formData.quantity;

    // Add gift wrap if selected
    if (formData.giftWrap) total += 50;

    // Add delivery charges only if total is less than 500
    if (total < 500) total += 50;

    console.log("Calculation breakdown:");
    console.log("Base:", product.basePrice * formData.quantity);
    console.log("Gift wrap:", formData.giftWrap ? 50 : 0);
    console.log("Delivery:", total < 500 ? 50 : 0);
    console.log("Final total:", total);

    return total;
  };

  const validateForm = () => {
    const { name, phone, whatsappNumber, address } = formData.customerInfo;
    if (
      !name ||
      !phone ||
      !whatsappNumber ||
      !address.street ||
      !address.city ||
      !address.state ||
      !address.pincode
    ) {
      alert("Please fill all required fields including WhatsApp number");
      return false;
    }
    return true;
  };

  const handlePayment = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      // Calculate total first for debugging
      const finalTotal = calculateTotal();
      console.log("Final amount to be charged:", finalTotal);

      // Create order on backend
      const orderData = {
        customerInfo: formData.customerInfo,
        items: [
          {
            productId: product._id,
            quantity: formData.quantity,
            customization: product.customizable ? formData.customization : {},
          },
        ],
        totalAmount: finalTotal,
        paymentMethod: "online",
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      const result = await response.json();

      if (result.success) {
        // Double check the amount being sent to Razorpay
        const razorpayAmount = finalTotal * 100; // Amount in paise
        console.log("Razorpay amount (in paise):", razorpayAmount);

        // Initialize Razorpay payment
        const options = {
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: razorpayAmount, // Use the calculated amount
          currency: "INR",
          name: "Handcrafted Gifts",
          description: `Order for ${product.name}`,
          order_id: result.razorpayOrderId,
          handler: async function (response: any) {
            // Payment successful
            try {
              const verifyResponse = await fetch("/api/payment/verify", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  orderId: result.order._id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });

              const verifyResult = await verifyResponse.json();

              if (verifyResult.success) {
                setOrderNumber(verifyResult.order.orderNumber);
                setOrderPlaced(true);
              } else {
                alert(
                  "Payment verification failed. Please contact support with your order number: " +
                    result.order.orderNumber
                );
              }
            } catch (error) {
              console.error("Payment verification error:", error);
              alert("Payment verification failed. Please contact support.");
            }
          },
          prefill: {
            name: formData.customerInfo.name,
            email: formData.customerInfo.email,
            contact: formData.customerInfo.phone,
          },
          theme: {
            color: "#FFB6C1",
          },
          modal: {
            ondismiss: function () {
              setLoading(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        alert("Failed to create order. Please try again.");
      }
    } catch (error) {
      console.error("Error creating order:", error);
      alert("Failed to create order. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppOrder = () => {
    if (!validateForm()) return;

    const message = `Hi! I'd like to order:
    
Product: ${product.name}
Quantity: ${formData.quantity}
${
  product.customizable
    ? `Customization: ${formData.customization.text}

Size: ${formData.customization.size} ${
        product.options.sizeUnit ? `(${product.options.sizeUnit})` : ""
      }
Material: ${formData.customization.material}
Special Instructions: ${formData.customization.specialInstructions}`
    : ""
}

Total: ₹${calculateTotal()}

My Details:
Name: ${formData.customerInfo.name}
Phone: ${formData.customerInfo.phone}
WhatsApp: ${formData.customerInfo.whatsappNumber}
Email: ${formData.customerInfo.email}
Address: ${formData.customerInfo.address.street}, ${
      formData.customerInfo.address.city
    }, ${formData.customerInfo.address.state} - ${
      formData.customerInfo.address.pincode
    }`;

    const encodedMessage = encodeURIComponent(message);
    window.open(
      `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=${encodedMessage}`,
      "_blank"
    );
  };

  if (orderPlaced) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-3xl p-6 max-w-sm w-full mx-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">✅</span>
            </div>
            <h3 className="font-serif text-xl text-text-dark mb-3">
              Order Placed Successfully!
            </h3>
            <p className="text-text-light mb-2 text-sm">
              Your order number is:
            </p>
            <p className="font-bold text-lg text-rose mb-4">{orderNumber}</p>
            <p className="text-xs text-text-light mb-4">
              You will receive order confirmation via email and WhatsApp.
              We&apos;ll keep you updated on your order status.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-rose text-white px-6 py-3 rounded-full hover:bg-opacity-90 transition-all font-medium text-sm"
            >
              Continue Shopping
            </button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  const totalSteps = product.customizable ? 3 : 2;
  const stepLabels = product.customizable
    ? ["Customize", "Address", "Payment"]
    : ["Address", "Payment"];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 rounded-t-3xl">
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0"
              >
                <FaTimes size={14} />
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="font-serif text-lg sm:text-xl text-text-dark truncate">
                  {product.customizable
                    ? "Customize Your Order"
                    : "Place Your Order"}
                </h2>
                <p className="text-text-light text-sm truncate">
                  {product.name}
                </p>
              </div>
            </div>

            {/* Progress Steps - Mobile Optimized */}
            <div className="flex items-center justify-between mt-4">
              {Array.from({ length: totalSteps }, (_, i) => i + 1).map(
                (step) => (
                  <div key={step} className="flex flex-col items-center flex-1">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                        currentStep >= step
                          ? "bg-rose text-white"
                          : "bg-gray-200 text-gray-500"
                      }`}
                    >
                      {step}
                    </div>
                    <span className="text-xs font-medium text-gray-600 mt-1 text-center">
                      {stepLabels[step - 1]}
                    </span>
                    {step < totalSteps && (
                      <div
                        className={`w-full h-1 mt-2 ${
                          currentStep > step ? "bg-rose" : "bg-gray-200"
                        }`}
                      />
                    )}
                  </div>
                )
              )}
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {/* Step 1: Customization (only if product is customizable) */}
            {product.customizable && currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <h3 className="font-serif text-lg text-text-dark mb-3">
                  Customize Your Product
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-dark mb-2">
                      Personalization Text
                    </label>
                    <input
                      type="text"
                      value={formData.customization.text}
                      onChange={(e) =>
                        handleInputChange(
                          "customization",
                          "text",
                          e.target.value
                        )
                      }
                      placeholder="Enter name, quote, or message"
                      className="w-full px-3 py-2.5 text-sm rounded-xl border-2 border-gray-200 focus:border-rose focus:outline-none transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-text-dark mb-2">
                        Size{" "}
                        {product.options.sizeUnit &&
                          `(${product.options.sizeUnit})`}
                      </label>
                      <select
                        value={formData.customization.size}
                        onChange={(e) =>
                          handleInputChange(
                            "customization",
                            "size",
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2.5 text-sm rounded-xl border-2 border-gray-200 focus:border-rose focus:outline-none transition-colors"
                      >
                        {product.options.sizes.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-text-dark mb-2">
                        Material
                      </label>
                      <select
                        value={formData.customization.material}
                        onChange={(e) =>
                          handleInputChange(
                            "customization",
                            "material",
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2.5 text-sm rounded-xl border-2 border-gray-200 focus:border-rose focus:outline-none transition-colors"
                      >
                        {product.options.materials.map((material) => (
                          <option key={material} value={material}>
                            {material}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-dark mb-2">
                      Special Instructions
                    </label>
                    <textarea
                      value={formData.customization.specialInstructions}
                      onChange={(e) =>
                        handleInputChange(
                          "customization",
                          "specialInstructions",
                          e.target.value
                        )
                      }
                      placeholder="Any special requests or instructions..."
                      rows={2}
                      className="w-full px-3 py-2.5 text-sm rounded-xl border-2 border-gray-200 focus:border-rose focus:outline-none transition-colors resize-none"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-medium text-text-dark mb-2">
                        Quantity
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            handleInputChange(
                              "",
                              "quantity",
                              Math.max(1, formData.quantity - 1)
                            )
                          }
                          className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-medium text-sm">
                          {formData.quantity}
                        </span>
                        <button
                          onClick={() =>
                            handleInputChange(
                              "",
                              "quantity",
                              formData.quantity + 1
                            )
                          }
                          className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="giftWrap"
                        checked={formData.giftWrap}
                        onChange={(e) =>
                          handleInputChange("", "giftWrap", e.target.checked)
                        }
                        className="w-4 h-4 text-rose border-gray-300 rounded focus:ring-rose"
                      />
                      <label
                        htmlFor="giftWrap"
                        className="text-sm text-text-dark"
                      >
                        Gift wrap (+₹50)
                      </label>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Address Step */}
            {((product.customizable && currentStep === 2) ||
              (!product.customizable && currentStep === 1)) && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <h3 className="font-serif text-lg text-text-dark mb-3">
                  Delivery Information
                </h3>

                {!product.customizable && (
                  <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
                    <div>
                      <label className="block text-sm font-medium text-text-dark mb-1">
                        Quantity
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            handleInputChange(
                              "",
                              "quantity",
                              Math.max(1, formData.quantity - 1)
                            )
                          }
                          className="w-7 h-7 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors border"
                        >
                          -
                        </button>
                        <span className="w-6 text-center font-medium text-sm">
                          {formData.quantity}
                        </span>
                        <button
                          onClick={() =>
                            handleInputChange(
                              "",
                              "quantity",
                              formData.quantity + 1
                            )
                          }
                          className="w-7 h-7 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors border"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="giftWrap"
                        checked={formData.giftWrap}
                        onChange={(e) =>
                          handleInputChange("", "giftWrap", e.target.checked)
                        }
                        className="w-4 h-4 text-rose border-gray-300 rounded focus:ring-rose"
                      />
                      <label
                        htmlFor="giftWrap"
                        className="text-sm text-text-dark"
                      >
                        Gift wrap
                      </label>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-text-dark mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.customerInfo.name}
                      onChange={(e) =>
                        handleInputChange(
                          "customerInfo",
                          "name",
                          e.target.value
                        )
                      }
                      className="w-full px-3 py-2.5 text-sm rounded-xl border-2 border-gray-200 focus:border-rose focus:outline-none transition-colors"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-text-dark mb-2">
                        Phone *
                      </label>
                      <input
                        type="tel"
                        value={formData.customerInfo.phone}
                        onChange={(e) =>
                          handleInputChange(
                            "customerInfo",
                            "phone",
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2.5 text-sm rounded-xl border-2 border-gray-200 focus:border-rose focus:outline-none transition-colors"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-dark mb-2">
                        WhatsApp
                      </label>
                      <input
                        type="tel"
                        value={formData.customerInfo.whatsappNumber}
                        onChange={(e) =>
                          handleInputChange(
                            "customerInfo",
                            "whatsappNumber",
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2.5 text-sm rounded-xl border-2 border-gray-200 focus:border-rose focus:outline-none transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-dark mb-2">
                      Email{" "}
                      <span className="text-xs text-gray-500">
                        (recommended)
                      </span>
                    </label>
                    <input
                      type="email"
                      value={formData.customerInfo.email}
                      onChange={(e) =>
                        handleInputChange(
                          "customerInfo",
                          "email",
                          e.target.value
                        )
                      }
                      className="w-full px-3 py-2.5 text-sm rounded-xl border-2 border-gray-200 focus:border-rose focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-dark mb-2">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      value={formData.customerInfo.address.street}
                      onChange={(e) =>
                        handleInputChange("address", "street", e.target.value)
                      }
                      className="w-full px-3 py-2.5 text-sm rounded-xl border-2 border-gray-200 focus:border-rose focus:outline-none transition-colors"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-text-dark mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        value={formData.customerInfo.address.city}
                        onChange={(e) =>
                          handleInputChange("address", "city", e.target.value)
                        }
                        className="w-full px-3 py-2.5 text-sm rounded-xl border-2 border-gray-200 focus:border-rose focus:outline-none transition-colors"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-text-dark mb-2">
                        State *
                      </label>
                      <input
                        type="text"
                        value={formData.customerInfo.address.state}
                        onChange={(e) =>
                          handleInputChange("address", "state", e.target.value)
                        }
                        className="w-full px-3 py-2.5 text-sm rounded-xl border-2 border-gray-200 focus:border-rose focus:outline-none transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-dark mb-2">
                      Pincode *
                    </label>
                    <input
                      type="text"
                      value={formData.customerInfo.address.pincode}
                      onChange={(e) =>
                        handleInputChange("address", "pincode", e.target.value)
                      }
                      className="w-full px-3 py-2.5 text-sm rounded-xl border-2 border-gray-200 focus:border-rose focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Payment Step */}
            {((product.customizable && currentStep === 3) ||
              (!product.customizable && currentStep === 2)) && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-4"
              >
                <h3 className="font-serif text-lg text-text-dark mb-3">
                  Order Summary
                </h3>

                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-text-dark text-sm truncate">
                        {product.name}
                      </h4>
                      <p className="text-xs text-text-light">
                        Quantity: {formData.quantity}
                      </p>
                      {product.customizable && formData.customization.text && (
                        <p className="text-xs text-text-light truncate">
                          Custom: {formData.customization.text}
                        </p>
                      )}
                    </div>
                    <p className="font-medium text-text-dark text-sm">
                      ₹{product.basePrice * formData.quantity}
                    </p>
                  </div>

                  <div className="border-t pt-3 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span>Subtotal:</span>
                      <span>₹{product.basePrice * formData.quantity}</span>
                    </div>
                    {formData.giftWrap && (
                      <div className="flex justify-between text-xs">
                        <span>Gift Wrapping:</span>
                        <span>₹50</span>
                      </div>
                    )}
                    {calculateTotal() -
                      product.basePrice * formData.quantity -
                      (formData.giftWrap ? 50 : 0) >
                      0 && (
                      <div className="flex justify-between text-xs">
                        <span>Delivery:</span>
                        <span>₹50</span>
                      </div>
                    )}
                    <div className="flex justify-between font-medium text-base border-t pt-2">
                      <span>Total:</span>
                      <span className="text-rose">₹{calculateTotal()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-xl p-3">
                  <h4 className="font-medium text-text-dark mb-1 text-sm">
                    Payment & Delivery
                  </h4>
                  <div className="space-y-1 text-xs text-text-light">
                    <p>• Secure payment via Razorpay</p>
                    <p>• Estimated delivery: 5-7 days</p>
                    <p>• Free delivery on orders above ₹500</p>
                    <p>• Updates via WhatsApp & Email</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Footer Buttons - Mobile Optimized */}
            <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t">
              <div className="flex gap-3 order-2 sm:order-1">
                {((product.customizable && currentStep > 1) ||
                  (!product.customizable && currentStep > 1)) && (
                  <button
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="flex-1 sm:flex-none sm:px-6 py-3 border-2 border-gray-200 rounded-full hover:bg-gray-50 transition-colors font-medium text-sm flex items-center justify-center gap-2"
                  >
                    <FaArrowLeft size={12} />
                    Back
                  </button>
                )}
              </div>

              <div className="flex gap-3 order-1 sm:order-2">
                {(product.customizable && currentStep < 3) ||
                (!product.customizable && currentStep < 2) ? (
                  <button
                    onClick={() => setCurrentStep(currentStep + 1)}
                    className="flex-1 bg-rose text-white px-6 py-3 rounded-full hover:bg-opacity-90 transition-all font-medium text-sm flex items-center justify-center gap-2"
                  >
                    Continue
                    <FaArrowRight size={12} />
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handlePayment}
                      disabled={loading}
                      className="flex-1 bg-rose text-white px-4 py-3 rounded-full hover:bg-opacity-90 transition-all font-medium text-sm disabled:opacity-50"
                    >
                      {loading ? "Processing..." : "Pay Now"}
                    </button>
                    <button
                      onClick={handleWhatsAppOrder}
                      className="flex items-center gap-2 bg-green-500 text-white px-4 py-3 rounded-full hover:bg-green-600 transition-all font-medium text-sm flex-shrink-0"
                    >
                      <FaWhatsapp size={14} />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// "use client";

// import { motion, AnimatePresence } from "framer-motion";
// import { useState } from "react";
// import {
//   FaTimes,
//   FaWhatsapp,
//   FaArrowLeft,
//   FaArrowRight,
//   FaCopy,
//   FaCheck,
// } from "react-icons/fa";

// interface Product {
//   _id: string;
//   name: string;
//   category: string;
//   description: string;
//   basePrice: number;
//   images: string[];
//   customizable: boolean;
//   options: {
//     sizes: string[];
//     sizeUnit?: "inch" | "cm" | "m";
//     materials: string[];
//   };
// }

// interface CustomizationModalProps {
//   product: Product;
//   onClose: () => void;
// }

// export default function CustomizationModal({
//   product,
//   onClose,
// }: CustomizationModalProps) {
//   const [formData, setFormData] = useState({
//     customerInfo: {
//       name: "",
//       email: "",
//       phone: "",
//       whatsappNumber: "",
//       address: {
//         street: "",
//         city: "",
//         state: "",
//         pincode: "",
//       },
//     },
//     customization: {
//       text: "",
//       size: product.options.sizes[0] || "",
//       material: product.options.materials[0] || "",
//       specialInstructions: "",
//     },
//     quantity: 1,
//     giftWrap: false,
//   });

//   const [currentStep, setCurrentStep] = useState(product.customizable ? 1 : 1);
//   const [loading, setLoading] = useState(false);
//   const [orderPlaced, setOrderPlaced] = useState(false);
//   const [orderNumber, setOrderNumber] = useState("");
//   const [copied, setCopied] = useState(false);

//   // UPI Payment Details
//   const upiDetails = {
//     upiId: "your-upi-id@paytm", // Replace with your actual UPI ID
//     qrCode: "/qr-code.png", // Replace with your actual QR code image path
//     bankName: "Your Bank Name",
//     accountName: "Your Name",
//   };

//   const handleInputChange = (
//     section: string,
//     field: string,
//     value: string | number | boolean
//   ) => {
//     if (section === "address") {
//       setFormData((prev) => ({
//         ...prev,
//         customerInfo: {
//           ...prev.customerInfo,
//           address: {
//             ...prev.customerInfo.address,
//             [field]: value,
//           },
//         },
//       }));
//     } else if (section === "customerInfo") {
//       setFormData((prev) => ({
//         ...prev,
//         customerInfo: {
//           ...prev.customerInfo,
//           [field]: value,
//         },
//       }));
//     } else if (section === "customization") {
//       setFormData((prev) => ({
//         ...prev,
//         customization: {
//           ...prev.customization,
//           [field]: value,
//         },
//       }));
//     } else {
//       setFormData((prev) => ({
//         ...prev,
//         [field]: value,
//       }));
//     }
//   };

//   const calculateTotal = () => {
//     let total = product.basePrice * formData.quantity;
//     if (formData.giftWrap) total += 50;
//     if (total < 500) total += 50; // Delivery charges
//     return total;
//   };

//   const validateForm = () => {
//     const { name, phone, whatsappNumber, address } = formData.customerInfo;
//     if (
//       !name ||
//       !phone ||
//       !whatsappNumber ||
//       !address.street ||
//       !address.city ||
//       !address.state ||
//       !address.pincode
//     ) {
//       alert("Please fill all required fields including WhatsApp number");
//       return false;
//     }
//     return true;
//   };

//   const handleUPIPayment = async () => {
//     if (!validateForm()) return;

//     setLoading(true);
//     try {
//       // Create order on backend
//       const orderData = {
//         customerInfo: formData.customerInfo,
//         items: [
//           {
//             productId: product._id,
//             quantity: formData.quantity,
//             customization: product.customizable ? formData.customization : {},
//           },
//         ],
//         totalAmount: calculateTotal(),
//         paymentMethod: "upi",
//         paymentStatus: "pending",
//       };

//       const response = await fetch("/api/orders", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify(orderData),
//       });

//       const result = await response.json();

//       if (result.success) {
//         setOrderNumber(result.order.orderNumber);
//         setOrderPlaced(true);
//       } else {
//         alert("Failed to create order. Please try again.");
//       }
//     } catch (error) {
//       console.error("Error creating order:", error);
//       alert("Failed to create order. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const copyToClipboard = (text: string) => {
//     navigator.clipboard.writeText(text).then(() => {
//       setCopied(true);
//       setTimeout(() => setCopied(false), 2000);
//     });
//   };

//   const handleWhatsAppOrder = () => {
//     if (!validateForm()) return;

//     const message = `Hi! I'd like to order:

// Product: ${product.name}
// Quantity: ${formData.quantity}
// ${
//   product.customizable
//     ? `Customization: ${formData.customization.text}

// Size: ${formData.customization.size} ${
//         product.options.sizeUnit ? `(${product.options.sizeUnit})` : ""
//       }
// Material: ${formData.customization.material}
// Special Instructions: ${formData.customization.specialInstructions}`
//     : ""
// }

// Total: ₹${calculateTotal()}

// My Details:
// Name: ${formData.customerInfo.name}
// Phone: ${formData.customerInfo.phone}
// WhatsApp: ${formData.customerInfo.whatsappNumber}
// Email: ${formData.customerInfo.email}
// Address: ${formData.customerInfo.address.street}, ${
//       formData.customerInfo.address.city
//     }, ${formData.customerInfo.address.state} - ${
//       formData.customerInfo.address.pincode
//     }`;

//     const encodedMessage = encodeURIComponent(message);
//     window.open(
//       `https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}?text=${encodedMessage}`,
//       "_blank"
//     );
//   };

//   if (orderPlaced) {
//     return (
//       <AnimatePresence>
//         <motion.div
//           initial={{ opacity: 0 }}
//           animate={{ opacity: 1 }}
//           exit={{ opacity: 0 }}
//           className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
//           onClick={onClose}
//         >
//           <motion.div
//             initial={{ scale: 0.9, opacity: 0 }}
//             animate={{ scale: 1, opacity: 1 }}
//             exit={{ scale: 0.9, opacity: 0 }}
//             className="bg-white rounded-3xl p-6 max-w-sm w-full mx-4 text-center"
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
//               <span className="text-3xl">✅</span>
//             </div>
//             <h3 className="font-serif text-xl text-text-dark mb-3">
//               Order Placed Successfully!
//             </h3>
//             <p className="text-text-light mb-2 text-sm">
//               Your order number is:
//             </p>
//             <p className="font-bold text-lg text-rose mb-4">{orderNumber}</p>
//             <p className="text-xs text-text-light mb-4">
//               Please complete your payment via UPI to confirm your order.
//               We&apos;ll keep you updated on your order status.
//             </p>
//             <button
//               onClick={onClose}
//               className="w-full bg-rose text-white px-6 py-3 rounded-full hover:bg-opacity-90 transition-all font-medium text-sm"
//             >
//               Continue Shopping
//             </button>
//           </motion.div>
//         </motion.div>
//       </AnimatePresence>
//     );
//   }

//   const totalSteps = product.customizable ? 3 : 2;
//   const stepLabels = product.customizable
//     ? ["Customize", "Address", "Payment"]
//     : ["Address", "Payment"];

//   return (
//     <AnimatePresence>
//       <motion.div
//         initial={{ opacity: 0 }}
//         animate={{ opacity: 1 }}
//         exit={{ opacity: 0 }}
//         className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50"
//         onClick={onClose}
//       >
//         <motion.div
//           initial={{ y: 100, opacity: 0 }}
//           animate={{ y: 0, opacity: 1 }}
//           exit={{ y: 100, opacity: 0 }}
//           transition={{ type: "spring", damping: 25, stiffness: 200 }}
//           className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[85vh] sm:max-h-[90vh] overflow-y-auto"
//           onClick={(e) => e.stopPropagation()}
//         >
//           {/* Header */}
//           <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 rounded-t-3xl">
//             <div className="flex items-center gap-3">
//               <button
//                 onClick={onClose}
//                 className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0"
//               >
//                 <FaTimes size={14} />
//               </button>
//               <div className="flex-1 min-w-0">
//                 <h2 className="font-serif text-lg sm:text-xl text-text-dark truncate">
//                   {product.customizable
//                     ? "Customize Your Order"
//                     : "Place Your Order"}
//                 </h2>
//                 <p className="text-text-light text-sm truncate">
//                   {product.name}
//                 </p>
//               </div>
//             </div>

//             {/* Progress Steps - Mobile Optimized */}
//             <div className="flex items-center justify-between mt-4">
//               {Array.from({ length: totalSteps }, (_, i) => i + 1).map(
//                 (step) => (
//                   <div key={step} className="flex flex-col items-center flex-1">
//                     <div
//                       className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
//                         currentStep >= step
//                           ? "bg-rose text-white"
//                           : "bg-gray-200 text-gray-500"
//                       }`}
//                     >
//                       {step}
//                     </div>
//                     <span className="text-xs font-medium text-gray-600 mt-1 text-center">
//                       {stepLabels[step - 1]}
//                     </span>
//                     {step < totalSteps && (
//                       <div
//                         className={`w-full h-1 mt-2 ${
//                           currentStep > step ? "bg-rose" : "bg-gray-200"
//                         }`}
//                       />
//                     )}
//                   </div>
//                 )
//               )}
//             </div>
//           </div>

//           <div className="p-4 sm:p-6">
//             {/* Step 1: Customization (only if product is customizable) */}
//             {product.customizable && currentStep === 1 && (
//               <motion.div
//                 initial={{ opacity: 0, x: 20 }}
//                 animate={{ opacity: 1, x: 0 }}
//                 className="space-y-4"
//               >
//                 <h3 className="font-serif text-lg text-text-dark mb-3">
//                   Customize Your Product
//                 </h3>

//                 <div className="space-y-4">
//                   <div>
//                     <label className="block text-sm font-medium text-text-dark mb-2">
//                       Personalization Text
//                     </label>
//                     <input
//                       type="text"
//                       value={formData.customization.text}
//                       onChange={(e) =>
//                         handleInputChange(
//                           "customization",
//                           "text",
//                           e.target.value
//                         )
//                       }
//                       placeholder="Enter name, quote, or message"
//                       className="w-full px-3 py-2.5 text-sm rounded-xl border-2 border-gray-200 focus:border-rose focus:outline-none transition-colors"
//                     />
//                   </div>

//                   <div className="grid grid-cols-2 gap-3">
//                     <div>
//                       <label className="block text-sm font-medium text-text-dark mb-2">
//                         Size{" "}
//                         {product.options.sizeUnit &&
//                           `(${product.options.sizeUnit})`}
//                       </label>
//                       <select
//                         value={formData.customization.size}
//                         onChange={(e) =>
//                           handleInputChange(
//                             "customization",
//                             "size",
//                             e.target.value
//                           )
//                         }
//                         className="w-full px-3 py-2.5 text-sm rounded-xl border-2 border-gray-200 focus:border-rose focus:outline-none transition-colors"
//                       >
//                         {product.options.sizes.map((size) => (
//                           <option key={size} value={size}>
//                             {size}
//                           </option>
//                         ))}
//                       </select>
//                     </div>

//                     <div className="col-span-2">
//                       <label className="block text-sm font-medium text-text-dark mb-2">
//                         Material
//                       </label>
//                       <select
//                         value={formData.customization.material}
//                         onChange={(e) =>
//                           handleInputChange(
//                             "customization",
//                             "material",
//                             e.target.value
//                           )
//                         }
//                         className="w-full px-3 py-2.5 text-sm rounded-xl border-2 border-gray-200 focus:border-rose focus:outline-none transition-colors"
//                       >
//                         {product.options.materials.map((material) => (
//                           <option key={material} value={material}>
//                             {material}
//                           </option>
//                         ))}
//                       </select>
//                     </div>
//                   </div>

//                   <div>
//                     <label className="block text-sm font-medium text-text-dark mb-2">
//                       Special Instructions
//                     </label>
//                     <textarea
//                       value={formData.customization.specialInstructions}
//                       onChange={(e) =>
//                         handleInputChange(
//                           "customization",
//                           "specialInstructions",
//                           e.target.value
//                         )
//                       }
//                       placeholder="Any special requests or instructions..."
//                       rows={2}
//                       className="w-full px-3 py-2.5 text-sm rounded-xl border-2 border-gray-200 focus:border-rose focus:outline-none transition-colors resize-none"
//                     />
//                   </div>

//                   <div className="flex items-center justify-between">
//                     <div>
//                       <label className="block text-sm font-medium text-text-dark mb-2">
//                         Quantity
//                       </label>
//                       <div className="flex items-center gap-2">
//                         <button
//                           onClick={() =>
//                             handleInputChange(
//                               "",
//                               "quantity",
//                               Math.max(1, formData.quantity - 1)
//                             )
//                           }
//                           className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
//                         >
//                           -
//                         </button>
//                         <span className="w-8 text-center font-medium text-sm">
//                           {formData.quantity}
//                         </span>
//                         <button
//                           onClick={() =>
//                             handleInputChange(
//                               "",
//                               "quantity",
//                               formData.quantity + 1
//                             )
//                           }
//                           className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
//                         >
//                           +
//                         </button>
//                       </div>
//                     </div>

//                     <div className="flex items-center gap-2">
//                       <input
//                         type="checkbox"
//                         id="giftWrap"
//                         checked={formData.giftWrap}
//                         onChange={(e) =>
//                           handleInputChange("", "giftWrap", e.target.checked)
//                         }
//                         className="w-4 h-4 text-rose border-gray-300 rounded focus:ring-rose"
//                       />
//                       <label
//                         htmlFor="giftWrap"
//                         className="text-sm text-text-dark"
//                       >
//                         Gift wrap (+₹50)
//                       </label>
//                     </div>
//                   </div>
//                 </div>
//               </motion.div>
//             )}

//             {/* Address Step */}
//             {((product.customizable && currentStep === 2) ||
//               (!product.customizable && currentStep === 1)) && (
//               <motion.div
//                 initial={{ opacity: 0, x: 20 }}
//                 animate={{ opacity: 1, x: 0 }}
//                 className="space-y-4"
//               >
//                 <h3 className="font-serif text-lg text-text-dark mb-3">
//                   Delivery Information
//                 </h3>

//                 {!product.customizable && (
//                   <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
//                     <div>
//                       <label className="block text-sm font-medium text-text-dark mb-1">
//                         Quantity
//                       </label>
//                       <div className="flex items-center gap-2">
//                         <button
//                           onClick={() =>
//                             handleInputChange(
//                               "",
//                               "quantity",
//                               Math.max(1, formData.quantity - 1)
//                             )
//                           }
//                           className="w-7 h-7 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors border"
//                         >
//                           -
//                         </button>
//                         <span className="w-6 text-center font-medium text-sm">
//                           {formData.quantity}
//                         </span>
//                         <button
//                           onClick={() =>
//                             handleInputChange(
//                               "",
//                               "quantity",
//                               formData.quantity + 1
//                             )
//                           }
//                           className="w-7 h-7 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors border"
//                         >
//                           +
//                         </button>
//                       </div>
//                     </div>

//                     <div className="flex items-center gap-2">
//                       <input
//                         type="checkbox"
//                         id="giftWrap"
//                         checked={formData.giftWrap}
//                         onChange={(e) =>
//                           handleInputChange("", "giftWrap", e.target.checked)
//                         }
//                         className="w-4 h-4 text-rose border-gray-300 rounded focus:ring-rose"
//                       />
//                       <label
//                         htmlFor="giftWrap"
//                         className="text-sm text-text-dark"
//                       >
//                         Gift wrap
//                       </label>
//                     </div>
//                   </div>
//                 )}

//                 <div className="space-y-3">
//                   <div>
//                     <label className="block text-sm font-medium text-text-dark mb-2">
//                       Full Name *
//                     </label>
//                     <input
//                       type="text"
//                       value={formData.customerInfo.name}
//                       onChange={(e) =>
//                         handleInputChange(
//                           "customerInfo",
//                           "name",
//                           e.target.value
//                         )
//                       }
//                       className="w-full px-3 py-2.5 text-sm rounded-xl border-2 border-gray-200 focus:border-rose focus:outline-none transition-colors"
//                       required
//                     />
//                   </div>

//                   <div className="grid grid-cols-2 gap-3">
//                     <div>
//                       <label className="block text-sm font-medium text-text-dark mb-2">
//                         Phone *
//                       </label>
//                       <input
//                         type="tel"
//                         value={formData.customerInfo.phone}
//                         onChange={(e) =>
//                           handleInputChange(
//                             "customerInfo",
//                             "phone",
//                             e.target.value
//                           )
//                         }
//                         className="w-full px-3 py-2.5 text-sm rounded-xl border-2 border-gray-200 focus:border-rose focus:outline-none transition-colors"
//                         required
//                       />
//                     </div>

//                     <div>
//                       <label className="block text-sm font-medium text-text-dark mb-2">
//                         WhatsApp
//                       </label>
//                       <input
//                         type="tel"
//                         value={formData.customerInfo.whatsappNumber}
//                         onChange={(e) =>
//                           handleInputChange(
//                             "customerInfo",
//                             "whatsappNumber",
//                             e.target.value
//                           )
//                         }
//                         className="w-full px-3 py-2.5 text-sm rounded-xl border-2 border-gray-200 focus:border-rose focus:outline-none transition-colors"
//                         required
//                       />
//                     </div>
//                   </div>

//                   <div>
//                     <label className="block text-sm font-medium text-text-dark mb-2">
//                       Email{" "}
//                       <span className="text-xs text-gray-500">
//                         (recommended)
//                       </span>
//                     </label>
//                     <input
//                       type="email"
//                       value={formData.customerInfo.email}
//                       onChange={(e) =>
//                         handleInputChange(
//                           "customerInfo",
//                           "email",
//                           e.target.value
//                         )
//                       }
//                       className="w-full px-3 py-2.5 text-sm rounded-xl border-2 border-gray-200 focus:border-rose focus:outline-none transition-colors"
//                     />
//                   </div>

//                   <div>
//                     <label className="block text-sm font-medium text-text-dark mb-2">
//                       Street Address *
//                     </label>
//                     <input
//                       type="text"
//                       value={formData.customerInfo.address.street}
//                       onChange={(e) =>
//                         handleInputChange("address", "street", e.target.value)
//                       }
//                       className="w-full px-3 py-2.5 text-sm rounded-xl border-2 border-gray-200 focus:border-rose focus:outline-none transition-colors"
//                       required
//                     />
//                   </div>

//                   <div className="grid grid-cols-2 gap-3">
//                     <div>
//                       <label className="block text-sm font-medium text-text-dark mb-2">
//                         City *
//                       </label>
//                       <input
//                         type="text"
//                         value={formData.customerInfo.address.city}
//                         onChange={(e) =>
//                           handleInputChange("address", "city", e.target.value)
//                         }
//                         className="w-full px-3 py-2.5 text-sm rounded-xl border-2 border-gray-200 focus:border-rose focus:outline-none transition-colors"
//                         required
//                       />
//                     </div>

//                     <div>
//                       <label className="block text-sm font-medium text-text-dark mb-2">
//                         State *
//                       </label>
//                       <input
//                         type="text"
//                         value={formData.customerInfo.address.state}
//                         onChange={(e) =>
//                           handleInputChange("address", "state", e.target.value)
//                         }
//                         className="w-full px-3 py-2.5 text-sm rounded-xl border-2 border-gray-200 focus:border-rose focus:outline-none transition-colors"
//                         required
//                       />
//                     </div>
//                   </div>

//                   <div>
//                     <label className="block text-sm font-medium text-text-dark mb-2">
//                       Pincode *
//                     </label>
//                     <input
//                       type="text"
//                       value={formData.customerInfo.address.pincode}
//                       onChange={(e) =>
//                         handleInputChange("address", "pincode", e.target.value)
//                       }
//                       className="w-full px-3 py-2.5 text-sm rounded-xl border-2 border-gray-200 focus:border-rose focus:outline-none transition-colors"
//                       required
//                     />
//                   </div>
//                 </div>
//               </motion.div>
//             )}

//             {/* Payment Step */}
//             {((product.customizable && currentStep === 3) ||
//               (!product.customizable && currentStep === 2)) && (
//               <motion.div
//                 initial={{ opacity: 0, x: 20 }}
//                 animate={{ opacity: 1, x: 0 }}
//                 className="space-y-4"
//               >
//                 <h3 className="font-serif text-lg text-text-dark mb-3">
//                   UPI Payment
//                 </h3>

//                 <div className="bg-gray-50 rounded-xl p-4 mb-4">
//                   <div className="flex items-start gap-3 mb-3">
//                     <img
//                       src={product.images[0]}
//                       alt={product.name}
//                       className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
//                     />
//                     <div className="flex-1 min-w-0">
//                       <h4 className="font-medium text-text-dark text-sm truncate">
//                         {product.name}
//                       </h4>
//                       <p className="text-xs text-text-light">
//                         Quantity: {formData.quantity}
//                       </p>
//                       {product.customizable && formData.customization.text && (
//                         <p className="text-xs text-text-light truncate">
//                           Custom: {formData.customization.text}
//                         </p>
//                       )}
//                     </div>
//                     <p className="font-medium text-text-dark text-sm">
//                       ₹{product.basePrice * formData.quantity}
//                     </p>
//                   </div>

//                   <div className="border-t pt-3 space-y-1.5">
//                     <div className="flex justify-between text-xs">
//                       <span>Subtotal:</span>
//                       <span>₹{product.basePrice * formData.quantity}</span>
//                     </div>
//                     {formData.giftWrap && (
//                       <div className="flex justify-between text-xs">
//                         <span>Gift Wrapping:</span>
//                         <span>₹50</span>
//                       </div>
//                     )}
//                     {calculateTotal() -
//                       product.basePrice * formData.quantity -
//                       (formData.giftWrap ? 50 : 0) >
//                       0 && (
//                       <div className="flex justify-between text-xs">
//                         <span>Delivery:</span>
//                         <span>₹50</span>
//                       </div>
//                     )}
//                     <div className="flex justify-between font-medium text-base border-t pt-2">
//                       <span>Total Amount:</span>
//                       <span className="text-rose">₹{calculateTotal()}</span>
//                     </div>
//                   </div>
//                 </div>

//                 {/* UPI Payment Section */}
//                 <div className="bg-white border-2 border-rose rounded-xl p-4">
//                   <h4 className="font-medium text-text-dark mb-3 text-center">
//                     Pay via UPI
//                   </h4>

//                   {/* QR Code */}
//                   <div className="flex flex-col items-center mb-4">
//                     <div className="bg-white p-3 rounded-lg border-2 border-gray-200 mb-3">
//                       <img
//                         src={upiDetails.qrCode}
//                         alt="UPI QR Code"
//                         className="w-48 h-48 object-contain"
//                       />
//                     </div>
//                     <p className="text-xs text-text-light text-center mb-2">
//                       Scan QR code with any UPI app
//                     </p>
//                   </div>

//                   {/* UPI ID */}
//                   <div className="space-y-3">
//                     <div>
//                       <label className="block text-xs font-medium text-text-dark mb-2">
//                         Or send payment to UPI ID:
//                       </label>
//                       <div className="flex items-center gap-2">
//                         <div className="flex-1 bg-gray-100 rounded-lg px-3 py-2.5">
//                           <p className="font-mono text-sm text-text-dark">
//                             {upiDetails.upiId}
//                           </p>
//                         </div>
//                         <button
//                           onClick={() => copyToClipboard(upiDetails.upiId)}
//                           className="w-10 h-10 bg-rose text-white rounded-lg flex items-center justify-center hover:bg-opacity-90 transition-colors"
//                         >
//                           {copied ? (
//                             <FaCheck size={14} />
//                           ) : (
//                             <FaCopy size={14} />
//                           )}
//                         </button>
//                       </div>
//                     </div>

//                     <div className="bg-blue-50 rounded-lg p-3">
//                       <h5 className="font-medium text-text-dark mb-1 text-sm">
//                         Payment Instructions:
//                       </h5>
//                       <div className="space-y-1 text-xs text-text-light">
//                         <p>• Scan QR code or use UPI ID above</p>
//                         <p>• Amount: ₹{calculateTotal()}</p>
//                         <p>• Add order number in payment note</p>
//                         <p>• Send screenshot after payment</p>
//                       </div>
//                     </div>

//                     <div className="bg-yellow-50 rounded-lg p-3">
//                       <h5 className="font-medium text-text-dark mb-1 text-sm">
//                         Bank Details:
//                       </h5>
//                       <div className="text-xs text-text-light space-y-1">
//                         <p>Bank: {upiDetails.bankName}</p>
//                         <p>Account Name: {upiDetails.accountName}</p>
//                         <p>UPI ID: {upiDetails.upiId}</p>
//                       </div>
//                     </div>
//                   </div>
//                 </div>
//               </motion.div>
//             )}

//             {/* Footer Buttons - Mobile Optimized */}
//             <div className="flex flex-col sm:flex-row gap-3 mt-6 pt-4 border-t">
//               <div className="flex gap-3 order-2 sm:order-1">
//                 {((product.customizable && currentStep > 1) ||
//                   (!product.customizable && currentStep > 1)) && (
//                   <button
//                     onClick={() => setCurrentStep(currentStep - 1)}
//                     className="flex-1 sm:flex-none sm:px-6 py-3 border-2 border-gray-200 rounded-full hover:bg-gray-50 transition-colors font-medium text-sm flex items-center justify-center gap-2"
//                   >
//                     <FaArrowLeft size={12} />
//                     Back
//                   </button>
//                 )}
//               </div>

//               <div className="flex gap-3 order-1 sm:order-2">
//                 {(product.customizable && currentStep < 3) ||
//                 (!product.customizable && currentStep < 2) ? (
//                   <button
//                     onClick={() => setCurrentStep(currentStep + 1)}
//                     className="flex-1 bg-rose text-white px-6 py-3 rounded-full hover:bg-opacity-90 transition-all font-medium text-sm flex items-center justify-center gap-2"
//                   >
//                     Continue
//                     <FaArrowRight size={12} />
//                   </button>
//                 ) : (
//                   <>
//                     <button
//                       onClick={handleUPIPayment}
//                       disabled={loading}
//                       className="flex-1 bg-rose text-white px-4 py-3 rounded-full hover:bg-opacity-90 transition-all font-medium text-sm disabled:opacity-50"
//                     >
//                       {loading ? "Creating Order..." : "Confirm Order"}
//                     </button>
//                     <button
//                       onClick={handleWhatsAppOrder}
//                       className="flex items-center gap-2 bg-green-500 text-white px-4 py-3 rounded-full hover:bg-green-600 transition-all font-medium text-sm flex-shrink-0"
//                     >
//                       <FaWhatsapp size={14} />
//                       <span className="hidden sm:inline">WhatsApp</span>
//                     </button>
//                   </>
//                 )}
//               </div>
//             </div>
//           </div>
//         </motion.div>
//       </motion.div>
//     </AnimatePresence>
//   );
// }
