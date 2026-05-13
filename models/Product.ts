import mongoose, { Model, Document } from "mongoose";

interface IProduct extends Document {
  name: string;
  category: string;
  description: string;
  basePrice: number;
  images: string[];
  customizable: boolean;
  options: {
    sizes: string[];
    sizeUnit: "inch" | "cm" | "m";
    materials: string[];
  };
  inStock: boolean;
  featured: boolean;
}

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      maxlength: 80,
    },
    description: {
      type: String,
    },
    basePrice: {
      type: Number,
      required: true,
    },
    images: [
      {
        type: String,
      },
    ],
    customizable: {
      type: Boolean,
      default: true,
    },
    options: {
      sizes: [String],
      sizeUnit: {
        type: String,
        enum: ["inch", "cm", "m"],
        default: "inch",
      },
      materials: [String],
    },
    inStock: {
      type: Boolean,
      default: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const Product =
  (mongoose.models.Product as Model<IProduct>) ||
  mongoose.model<IProduct>("Product", ProductSchema);
export default Product;
