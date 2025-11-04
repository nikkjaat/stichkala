import mongoose, { Model } from "mongoose";

interface IOrder {
  orderNumber: string;
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    whatsappNumber: string;
    address: {
      street?: string;
      city?: string;
      state?: string;
      pincode?: string;
      country: string;
    };
  };
  items: Array<{
    productId: mongoose.Types.ObjectId;
    productName?: string;
    quantity: number;
    price: number;
    customization?: {
      text?: string;
      color?: string;
      size?: string;
      material?: string;
      specialInstructions?: string;
      uploadedFiles?: string[];
    };
  }>;
  totalAmount: number;
  status:
    | "pending"
    | "confirmed"
    | "in-progress"
    | "completed"
    | "shipped"
    | "delivered"
    | "cancelled";
  paymentStatus: "pending" | "paid" | "failed" | "refunded";
  paymentMethod: "cod" | "online" | "upi";
  paymentDetails?: {
    razorpay_payment_id?: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
    upi_transaction_id?: string;
    payment_screenshot?: string;
  };
  estimatedDelivery?: Date;
  actualDelivery?: Date;
  trackingNumber?: string;
  notes?: string;
}

const OrderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
    },
    customerInfo: {
      name: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: false,
      },
      phone: {
        type: String,
        required: true,
      },
      whatsappNumber: {
        type: String,
      },
      address: {
        street: String,
        city: String,
        state: String,
        pincode: String,
        country: { type: String, default: "India" },
      },
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        productName: String,
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
        },
        customization: {
          text: String,
          color: String,
          size: String,
          material: String,
          specialInstructions: String,
          uploadedFiles: [String],
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "in-progress",
        "completed",
        "shipped",
        "delivered",
        "cancelled",
      ],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed", "refunded"],
      default: "pending",
    },
    paymentMethod: {
      type: String,
      enum: ["cod", "online", "upi"],
      default: "online",
    },
    paymentDetails: {
      razorpay_payment_id: String,
      razorpay_order_id: String,
      razorpay_signature: String,
      upi_transaction_id: String,
      payment_screenshot: String,
    },
    estimatedDelivery: Date,
    actualDelivery: Date,
    trackingNumber: String,
    notes: String,
  },
  {
    timestamps: true,
  }
);

// Generate order number before validation
OrderSchema.pre("validate", async function (next) {
  if (!this.orderNumber) {
    try {
      // Use the constructor to avoid circular reference
      const OrderModel = this.constructor as any;
      const count = await OrderModel.countDocuments();
      this.orderNumber = `HG${String(count + 1).padStart(6, "0")}`;
    } catch (error) {
      console.error("Error generating order number:", error);
    }
  }
  next();
});

// Delete existing model in development to avoid caching issues
if (mongoose.models.Order) {
  delete mongoose.models.Order;
}

export default mongoose.model("Order", OrderSchema) as any;
