import mongoose from "mongoose";

const PushKeysSchema = new mongoose.Schema(
  {
    p256dh: { type: String, required: true },
    auth: { type: String, required: true },
  },
  { _id: false }
);

const PushSubscriptionSchema = new mongoose.Schema(
  {
    endpoint: { type: String, required: true },
    keys: { type: PushKeysSchema, required: true },
  },
  { _id: false }
);

const ProductSubscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      maxlength: 320,
      unique: true,
      index: true,
    },
    active: { type: Boolean, default: true, index: true },
    unsubscribeToken: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    pushSubscription: { type: PushSubscriptionSchema, default: undefined },
  },
  { timestamps: true }
);

if (mongoose.models.ProductSubscriber) {
  delete mongoose.models.ProductSubscriber;
}

export default mongoose.model("ProductSubscriber", ProductSubscriberSchema);
