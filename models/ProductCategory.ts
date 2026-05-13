import mongoose from "mongoose";

export interface IProductCategory {
  slug: string;
  label: string;
  emoji: string;
  sortOrder: number;
}

const ProductCategorySchema = new mongoose.Schema<IProductCategory>(
  {
    slug: { type: String, required: true, unique: true, index: true },
    label: { type: String, required: true, trim: true },
    emoji: { type: String, default: "📦", maxlength: 8 },
    sortOrder: { type: Number, default: 100 },
  },
  { timestamps: true }
);

if (mongoose.models.ProductCategory) {
  delete mongoose.models.ProductCategory;
}

export default mongoose.model<IProductCategory>(
  "ProductCategory",
  ProductCategorySchema
);
