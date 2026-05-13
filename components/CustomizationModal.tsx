"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import QRCode from "qrcode";
import {
  FaTimes,
  FaInstagram,
  FaArrowLeft,
  FaArrowRight,
  FaCopy,
  FaCheck,
} from "react-icons/fa";
import { buildUpiPaymentUri, formatUpiAmount } from "@/lib/upi";
import { getInstagramDmUrl } from "@/lib/siteContact";

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
  const [copied, setCopied] = useState(false);
  const [upiQrDataUrl, setUpiQrDataUrl] = useState<string>("");

  const UPI_VPA = process.env.NEXT_PUBLIC_UPI_ID ?? "vishakha-c@ptyes";
  const UPI_PAYEE_NAME =
    process.env.NEXT_PUBLIC_UPI_PAYEE_NAME ?? "Vishakha Chaudhary";
  const bankMeta = {
    bankName: "State Bank of India",
    accountName: UPI_PAYEE_NAME,
  };

  const totalForUpi = useMemo(() => {
    let total = product.basePrice * formData.quantity;
    if (formData.giftWrap) total += 50;
    if (total < 500) total += 50;
    return total;
  }, [product.basePrice, formData.quantity, formData.giftWrap]);

  const upiPayUri = useMemo(
    () =>
      buildUpiPaymentUri({
        payeeAddress: UPI_VPA,
        payeeName: UPI_PAYEE_NAME,
        amount: formatUpiAmount(totalForUpi),
        currency: "INR",
        transactionNote: "StichKala",
      }),
    [UPI_VPA, UPI_PAYEE_NAME, totalForUpi]
  );

  const upiPayUriWithOrder = useMemo(
    () =>
      buildUpiPaymentUri({
        payeeAddress: UPI_VPA,
        payeeName: UPI_PAYEE_NAME,
        amount: formatUpiAmount(totalForUpi),
        currency: "INR",
        transactionNote: orderNumber || "StichKala",
      }),
    [UPI_VPA, UPI_PAYEE_NAME, totalForUpi, orderNumber]
  );

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(upiPayUri, {
      width: 220,
      margin: 2,
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (!cancelled) setUpiQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setUpiQrDataUrl("");
      });
    return () => {
      cancelled = true;
    };
  }, [upiPayUri]);

  // Keep API field in sync (orders still store whatsappNumber for legacy data).
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      customerInfo: {
        ...prev.customerInfo,
        whatsappNumber: prev.customerInfo.phone,
      },
    }));
  }, [formData.customerInfo.phone]);

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
    if (formData.giftWrap) total += 50;
    if (total < 500) total += 50; // Delivery charges
    return total;
  };

  const validateForm = () => {
    const { name, phone, address } = formData.customerInfo;
    if (
      !name ||
      !phone ||
      !address.street ||
      !address.city ||
      !address.state ||
      !address.pincode
    ) {
      alert("Please fill all required fields");
      return false;
    }
    return true;
  };

  const handleUPIPayment = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
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
        totalAmount: calculateTotal(),
        paymentMethod: "upi",
        paymentStatus: "pending",
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
        setOrderNumber(result.order.orderNumber);
        setOrderPlaced(true);
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const buildInstagramOrderMessage = () => {
    const customBlock = product.customizable
      ? [
          `Customization: ${formData.customization.text}`,
          `Size: ${formData.customization.size}${
            product.options.sizeUnit
              ? ` (${product.options.sizeUnit})`
              : ""
          }`,
          `Material: ${formData.customization.material}`,
          `Special Instructions: ${formData.customization.specialInstructions}`,
        ].join("\n")
      : "";
    return [
      "Hi! I'd like to order:",
      "",
      `Product: ${product.name}`,
      `Quantity: ${formData.quantity}`,
      customBlock,
      "",
      `Total: ₹${calculateTotal()}`,
      "",
      "My Details:",
      `Name: ${formData.customerInfo.name}`,
      `Phone: ${formData.customerInfo.phone}`,
      `Email: ${formData.customerInfo.email}`,
      `Address: ${formData.customerInfo.address.street}, ${formData.customerInfo.address.city}, ${formData.customerInfo.address.state} - ${formData.customerInfo.address.pincode}`,
    ].join("\n");
  };

  const openInstagramWithMessage = async (message: string) => {
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      /* clipboard may be denied */
    }
    window.open(getInstagramDmUrl(), "_blank", "noopener,noreferrer");
  };

  const handleInstagramOrder = () => {
    if (!validateForm()) return;
    void openInstagramWithMessage(buildInstagramOrderMessage());
  };

  const buildPaymentConfirmationMessage = () =>
    `Hi! I placed order ${orderNumber}. I paid ₹${calculateTotal()} via UPI. Please confirm — UPI / bank ref: [paste here]`;

  const totalSteps = product.customizable ? 3 : 2;
  const stepLabels = product.customizable
    ? ["Customize", "Address", "Payment"]
    : ["Address", "Payment"];

  return (
    orderPlaced ? (<AnimatePresence>
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
              Please complete your payment via UPI to confirm your order.
              We&apos;ll keep you updated on your order status.
            </p>
            <div className="space-y-2 mb-4">
              <a
                href={upiPayUriWithOrder}
                className="w-full bg-rose text-white px-6 py-3 rounded-full hover:bg-opacity-90 transition-all font-medium text-sm flex items-center justify-center gap-2"
              >
                Pay ₹{calculateTotal()} in UPI app
              </a>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(upiPayUriWithOrder)
                }
                className="w-full border-2 border-gray-200 text-text-dark px-6 py-3 rounded-full hover:bg-gray-50 transition-all font-medium text-sm flex items-center justify-center gap-2"
              >
                {copied ? <FaCheck size={16} /> : <FaCopy size={16} />}
                Copy UPI payment link
              </button>
              <button
                type="button"
                onClick={() =>
                  void openInstagramWithMessage(
                    buildPaymentConfirmationMessage()
                  )
                }
                className="w-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white px-6 py-3 rounded-full hover:opacity-95 transition-all font-medium text-sm flex items-center justify-center gap-2"
              >
                <FaInstagram size={18} />
                Send confirmation on Instagram
              </button>
              <p className="text-[11px] text-text-light px-1">
                Your order text is copied when you open Instagram — paste it in
                the chat if needed.
              </p>
              <button
                onClick={onClose}
                className="w-full bg-gray-100 text-text-dark px-6 py-3 rounded-full hover:bg-gray-200 transition-all font-medium text-sm"
              >
                Continue Shopping
              </button>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    ) : (<AnimatePresence>
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
                    <p className="text-xs text-text-light mt-1">
                      Used for delivery updates. Reach us on Instagram for
                      questions.
                    </p>
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
                  UPI Payment
                </h3>

                <div className="bg-gray-50 rounded-xl p-4 mb-4">
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
                      <span>Total Amount:</span>
                      <span className="text-rose">₹{calculateTotal()}</span>
                    </div>
                  </div>
                </div>

                {/* UPI Payment Section — dynamic UPI deep link + QR */}
                <div className="bg-white border-2 border-rose rounded-xl p-4">
                  <h4 className="font-medium text-text-dark mb-3 text-center">
                    Pay via UPI
                  </h4>

                  <div className="flex flex-col items-center mb-4">
                    {upiQrDataUrl ? (
                      <div className="bg-white p-3 rounded-lg border-2 border-gray-200 mb-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={upiQrDataUrl}
                          alt="UPI payment QR code"
                          className="w-48 h-48 object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-48 h-48 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-xs text-text-light mb-3">
                        Generating QR…
                      </div>
                    )}
                    <p className="text-xs text-text-light text-center mb-3">
                      Scan with GPay, PhonePe, Paytm, or any UPI app
                    </p>
                    <a
                      href={upiPayUri}
                      className="w-full max-w-xs bg-rose text-white px-4 py-3 rounded-full hover:bg-opacity-90 transition-all font-medium text-sm text-center"
                    >
                      Open in UPI app (₹{calculateTotal()})
                    </a>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(upiPayUri)}
                      className="mt-2 w-full max-w-xs border-2 border-gray-200 text-text-dark px-4 py-2.5 rounded-full text-sm hover:bg-gray-50 flex items-center justify-center gap-2"
                    >
                      {copied ? <FaCheck size={14} /> : <FaCopy size={14} />}
                      Copy payment link
                    </button>
                  </div>

                  <details className="text-xs text-text-light space-y-2 rounded-lg bg-gray-50 p-3">
                    <summary className="cursor-pointer font-medium text-text-dark text-sm">
                      Manual entry (optional)
                    </summary>
                    <p className="mt-2">
                      Payee VPA is not shown by default. If your app needs it,
                      copy the payment link above — it contains the same details
                      as the QR.
                    </p>
                    <div className="bg-yellow-50 rounded-lg p-3 mt-2">
                      <p className="font-medium text-text-dark mb-1">
                        Bank / account (reference)
                      </p>
                      <p>Bank: {bankMeta.bankName}</p>
                      <p>Account name: {bankMeta.accountName}</p>
                    </div>
                  </details>

                  <div className="bg-blue-50 rounded-lg p-3 mt-3">
                    <h5 className="font-medium text-text-dark mb-1 text-sm">
                      After you pay
                    </h5>
                    <div className="space-y-1 text-xs text-text-light">
                      <p>• Amount is prefilled when you use the button or QR</p>
                      <p>• Confirm your order on Instagram with your UPI ref</p>
                    </div>
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
                      onClick={handleUPIPayment}
                      disabled={loading}
                      className="flex-1 bg-rose text-white px-4 py-3 rounded-full hover:bg-opacity-90 transition-all font-medium text-sm disabled:opacity-50"
                    >
                      {loading ? "Creating Order..." : "Confirm Order"}
                    </button>
                    <button
                      onClick={handleInstagramOrder}
                      className="flex items-center gap-2 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white px-4 py-3 rounded-full hover:opacity-95 transition-all font-medium text-sm flex-shrink-0"
                    >
                      <FaInstagram size={14} />
                      <span className="hidden sm:inline">Instagram</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
    )
  );
}
