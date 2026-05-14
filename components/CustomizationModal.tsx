"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useState, useEffect, useMemo, useCallback } from "react";
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
import { CHECKOUT_DRAFT_STORAGE_KEY } from "@/lib/checkoutDraft";
import { getChatClientId } from "@/lib/chatClientId";

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
  /** Chat-agreed unit price: UPI checkout only (no Razorpay). */
  negotiatedCheckout?: {
    payToken: string;
    threadId: string;
    clientId: string;
    revisedUnitPriceRupees: number;
    listPriceRupees?: number;
  };
}

export default function CustomizationModal({
  product,
  onClose,
  negotiatedCheckout,
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
  const [copied, setCopied] = useState(false);
  const [upiQrDataUrl, setUpiQrDataUrl] = useState<string>("");

  const UPI_VPA = process.env.NEXT_PUBLIC_UPI_ID ?? "vishakha-c@ptyes";
  const UPI_PAYEE_NAME =
    process.env.NEXT_PUBLIC_UPI_PAYEE_NAME ?? "Vishakha Chaudhary";
  const bankMeta = {
    bankName: "State Bank of India",
    accountName: UPI_PAYEE_NAME,
  };

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

  const calculateTotal = useCallback(() => {
    let total = negotiatedCheckout
      ? negotiatedCheckout.revisedUnitPriceRupees * formData.quantity
      : product.basePrice * formData.quantity;
    if (formData.giftWrap) total += 50;
    if (!negotiatedCheckout && total < 500) total += 50;
    return Math.round(total * 100) / 100;
  }, [
    negotiatedCheckout,
    product.basePrice,
    formData.quantity,
    formData.giftWrap,
  ]);

  const totalForUpi = calculateTotal();

  const upiPayUri = useMemo(
    () =>
      buildUpiPaymentUri({
        payeeAddress: UPI_VPA,
        payeeName: UPI_PAYEE_NAME,
        amount: formatUpiAmount(totalForUpi),
        currency: "INR",
        transactionNote: "StichKalaa",
      }),
    [UPI_VPA, UPI_PAYEE_NAME, totalForUpi]
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

  const validateForm = () => {
    const { name, phone, address } = formData.customerInfo;
    if (
      !name.trim() ||
      !phone.trim() ||
      !address.street.trim() ||
      !address.city.trim() ||
      !address.state.trim() ||
      !address.pincode.trim()
    ) {
      alert(
        "Please fill all mandatory fields marked with * before continuing."
      );
      return false;
    }
    return true;
  };

  /** Save checkout draft, open UPI (new tab), then send shopper to payment verification. */
  const handlePayNowUpi = () => {
    if (!validateForm()) return;

    const draft: Record<string, unknown> = {
      version: 1 as const,
      draftStartedAt: Date.now(),
      upiPayUri,
      productId: product._id,
      productName: product.name,
      productImage: product.images[0],
      customerInfo: formData.customerInfo,
      items: [
        {
          productId: product._id,
          quantity: formData.quantity,
          customization: product.customizable ? formData.customization : {},
        },
      ],
      totalAmount: calculateTotal(),
    };
    const cid = getChatClientId();
    if (cid) draft.chatClientId = cid;
    if (negotiatedCheckout) {
      draft.chatPayToken = negotiatedCheckout.payToken;
      draft.chatThreadId = negotiatedCheckout.threadId;
      draft.chatClientId = negotiatedCheckout.clientId;
      if (typeof negotiatedCheckout.listPriceRupees === "number") {
        draft.chatListPriceRupees = negotiatedCheckout.listPriceRupees;
      }
    }

    try {
      sessionStorage.setItem(CHECKOUT_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch {
      alert(
        "Could not save your checkout. Please allow storage and try again."
      );
      return;
    }

    window.open(upiPayUri, "_blank", "noopener,noreferrer");
    window.location.href = `${window.location.origin}/payment-pending`;
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
            product.options.sizeUnit ? ` (${product.options.sizeUnit})` : ""
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

  const totalSteps = product.customizable ? 3 : 2;
  const stepLabels = product.customizable
    ? ["Customize", "Address", "Payment"]
    : ["Address", "Payment"];

  const handleHeaderBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      onClose();
    }
  };

  const goToStepIfAllowed = (step: number) => {
    if (step <= currentStep) setCurrentStep(step);
  };

  const isOnAddressStep =
    (product.customizable && currentStep === 2) ||
    (!product.customizable && currentStep === 1);

  const handleContinue = () => {
    if (isOnAddressStep && !validateForm()) return;
    setCurrentStep((s) => s + 1);
  };

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
                type="button"
                onClick={handleHeaderBack}
                aria-label={currentStep > 1 ? "Previous step" : "Close"}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0"
              >
                <FaArrowLeft size={14} />
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="font-serif text-lg sm:text-xl text-text-dark truncate">
                  {product.customizable
                    ? "Customize Your Order"
                    : "Place Your Order"}
                </h2>
                <p className="text-text-light text-sm truncate">
                  {product.name}
                  {negotiatedCheckout && (
                    <span className="block text-[11px] text-amber-800 mt-0.5 font-normal">
                      Agreed chat price: ₹
                      {negotiatedCheckout.revisedUnitPriceRupees}
                      /unit
                      {negotiatedCheckout.listPriceRupees != null
                        ? ` (list ₹${negotiatedCheckout.listPriceRupees})`
                        : ""}{" "}
                      — pay with UPI below (no card checkout).
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0"
              >
                <FaTimes size={14} />
              </button>
            </div>

            {/* Progress Steps - Mobile Optimized */}
            <div className="flex items-center justify-between mt-4">
              {Array.from({ length: totalSteps }, (_, i) => i + 1).map(
                (step) => (
                  <div key={step} className="flex flex-col items-center flex-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        goToStepIfAllowed(step);
                      }}
                      disabled={step > currentStep}
                      className={`flex flex-col items-center w-full ${
                        step <= currentStep
                          ? "cursor-pointer"
                          : "cursor-default opacity-70"
                      }`}
                    >
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
                    </button>
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
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100">
                      <Image
                        src={product.images[0] || "/logo.png"}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
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
                      <div className="relative w-48 h-48 bg-white p-3 rounded-lg border-2 border-gray-200 mb-3">
                        <Image
                          src={upiQrDataUrl}
                          alt="UPI payment QR code"
                          fill
                          unoptimized
                          className="object-contain p-1"
                          sizes="192px"
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
                    <button
                      type="button"
                      onClick={handlePayNowUpi}
                      className="w-full max-w-xs bg-rose text-white px-4 py-3 rounded-full hover:bg-opacity-90 transition-all font-semibold text-sm text-center uppercase tracking-wide"
                    >
                      PAY NOW (₹{calculateTotal()})
                    </button>
                    {/* <button
                      type="button"
                      onClick={() => copyToClipboard(upiPayUri)}
                      className="mt-2 w-full max-w-xs border-2 border-gray-200 text-text-dark px-4 py-2.5 rounded-full text-sm hover:bg-gray-50 flex items-center justify-center gap-2"
                    >
                      {copied ? <FaCheck size={14} /> : <FaCopy size={14} />}
                      Copy payment link
                    </button> */}
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
                      <p>
                        • Tap <strong>PAY NOW</strong> above — UPI opens in a
                        new tab; you&apos;ll go straight to the payment
                        confirmation page.
                      </p>
                      <p>
                        • Enter <strong>UTR and/or a screenshot</strong> (at
                        least one) within 10 minutes.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Footer — Continue / Instagram (back is in header) */}
            <div className="flex justify-stretch mt-6 pt-4 border-t">
              <div className="flex gap-3 w-full">
                {(product.customizable && currentStep < 3) ||
                (!product.customizable && currentStep < 2) ? (
                  <button
                    type="button"
                    onClick={handleContinue}
                    className="flex-1 bg-rose text-white px-6 py-3 rounded-full hover:bg-opacity-90 transition-all font-medium text-sm flex items-center justify-center gap-2"
                  >
                    Continue
                    <FaArrowRight size={12} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleInstagramOrder}
                    className="flex w-full sm:w-auto items-center justify-center gap-2 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white px-6 py-3 rounded-full hover:opacity-95 transition-all font-medium text-sm"
                  >
                    <FaInstagram size={14} />
                    <span>Instagram</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
