"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import CustomizationModal from "./CustomizationModal";

interface Product {
  _id: string;
  name: string;
  category: string;
  description: string;
  basePrice: number;
  images: string[];
  customizable: boolean;
  options: {
    colors: string[];
    sizes: string[];
    materials: string[];
  };
}

export default function Shop() {
  useEffect(() => {
    document.title = "StichKala - Handcrafted Gifts";
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        "Beautiful handmade gifts including personalised embroidery hoops, hand-painted hankies, and cute hair accessories. Each piece crafted with love."
      );
  }, []);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const [categories, setCategories] = useState<
    { id: string; name: string; emoji: string }[]
  >([{ id: "all", name: "All Products", emoji: "✨" }]);

  useEffect(() => {
    void fetch("/api/product-categories")
      .then((r) => r.json())
      .then((j) => {
        if (!j.success || !Array.isArray(j.categories)) return;
        setCategories([
          { id: "all", name: "All Products", emoji: "✨" },
          ...j.categories.map(
            (c: { slug: string; label: string; emoji?: string }) => ({
              id: c.slug,
              name: c.label,
              emoji: c.emoji || "📦",
            })
          ),
        ]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedCategory === "all") return;
    if (!categories.some((c) => c.id === selectedCategory)) {
      setSelectedCategory("all");
    }
  }, [categories, selectedCategory]);

  // Sample products data (in real app, this would come from API)
  const sampleProducts: Product[] = [
    {
      _id: "1",
      name: "Custom Name Embroidery Hoop",
      category: "embroidery",
      description:
        "Beautiful personalized embroidery hoop with your chosen name and design",
      basePrice: 899,
      images: [
        "https://images.pexels.com/photos/6195125/pexels-photo-6195125.jpeg",
      ],
      customizable: true,
      options: {
        colors: ["Pink", "Blue", "Green", "Purple", "Yellow"],
        sizes: ["6 inch", "8 inch", "10 inch"],
        materials: ["Cotton", "Linen", "Canvas"],
      },
    },
    {
      _id: "2",
      name: "Floral Quote Embroidery",
      category: "embroidery",
      description: "Delicate floral design with inspirational quotes",
      basePrice: 1299,
      images: [
        "https://images.pexels.com/photos/6195125/pexels-photo-6195125.jpeg",
      ],
      customizable: true,
      options: {
        colors: ["Pastel Pink", "Lavender", "Mint Green", "Peach"],
        sizes: ["8 inch", "10 inch", "12 inch"],
        materials: ["Cotton", "Linen"],
      },
    },
    {
      _id: "3",
      name: "Watercolor Hanky Set",
      category: "hanky",
      description:
        "Set of 3 hand-painted cotton hankies with watercolor designs",
      basePrice: 699,
      images: [
        "https://images.pexels.com/photos/6195125/pexels-photo-6195125.jpeg",
      ],
      customizable: true,
      options: {
        colors: ["Floral Mix", "Ocean Blues", "Sunset Hues", "Garden Greens"],
        sizes: ["Standard"],
        materials: ["Cotton", "Muslin"],
      },
    },
    {
      _id: "4",
      name: "Personalized Initial Hanky",
      category: "hanky",
      description: "Elegant hanky with hand-painted initial and floral border",
      basePrice: 399,
      images: [
        "https://images.pexels.com/photos/6195125/pexels-photo-6195125.jpeg",
      ],
      customizable: true,
      options: {
        colors: ["Rose Gold", "Silver", "Gold", "Lavender"],
        sizes: ["Standard"],
        materials: ["Cotton", "Silk"],
      },
    },
    {
      _id: "5",
      name: "Cute Bow Hair Clips Set",
      category: "accessories",
      description: "Set of 5 adorable handmade bow clips in matching colors",
      basePrice: 299,
      images: [
        "https://images.pexels.com/photos/6195125/pexels-photo-6195125.jpeg",
      ],
      customizable: true,
      options: {
        colors: [
          "Pastel Mix",
          "Bright Colors",
          "Neutral Tones",
          "Floral Prints",
        ],
        sizes: ["Small", "Medium", "Large"],
        materials: ["Cotton", "Satin", "Velvet"],
      },
    },
    {
      _id: "6",
      name: "Scrunchie Collection",
      category: "accessories",
      description: "Set of 3 handmade scrunchies in coordinating fabrics",
      basePrice: 199,
      images: [
        "https://images.pexels.com/photos/6195125/pexels-photo-6195125.jpeg",
      ],
      customizable: true,
      options: {
        colors: [
          "Spring Florals",
          "Vintage Prints",
          "Solid Pastels",
          "Boho Patterns",
        ],
        sizes: ["Regular", "Mini"],
        materials: ["Cotton", "Silk", "Chiffon"],
      },
    },
  ];

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("/api/products");
        const data = await response.json();

        if (data.success && data.products && data.products.length > 0) {
          // Ensure images is always an array
          const productsWithImages = data.products.map((product: Product) => ({
            ...product,
            images: Array.isArray(product.images) ? product.images : [],
          }));
          setProducts(productsWithImages);
        } else {
          setProducts(sampleProducts);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        setProducts(sampleProducts);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const filteredProducts =
    selectedCategory === "all"
      ? products.slice(0, 6)
      : products
          .filter((product) => product.category === selectedCategory)
          .slice(0, 6);

  const handleCustomize = (product: Product) => {
    setSelectedProduct(product);
  };

  if (loading) {
    return (
      <section className="py-24 px-6 bg-cream">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rose mx-auto"></div>
            <p className="mt-4 text-text-light">
              Loading our beautiful collection...
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-24 px-6 bg-cream">
      <div className="container mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="font-serif text-4xl md:text-5xl lg:text-6xl text-text-dark mb-4">
            Shop Our Collection
          </h2>
          <p className="text-text-light text-lg max-w-2xl mx-auto mb-8">
            Each piece is lovingly handmade with attention to detail and care
          </p>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {categories.map((category) => (
              <motion.button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-6 py-3 rounded-full font-medium transition-all ${
                  selectedCategory === category.id
                    ? "bg-rose text-white shadow-lg"
                    : "bg-white text-text-dark hover:bg-blush"
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="mr-2">{category.emoji}</span>
                {category.name}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((product, index) => (
            <motion.div
              key={product._id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              className="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all"
            >
              <div className="relative h-64 bg-gradient-soft">
                <img
                  src={product.images?.[0] || "/placeholder.png"}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-4 right-4 bg-white bg-opacity-90 px-3 py-1 rounded-full text-sm font-medium text-text-dark">
                  ₹{product.basePrice}
                </div>
              </div>

              <div className="p-6">
                <h3 className="font-serif text-xl text-text-dark mb-2">
                  {product.name}
                </h3>
                <p className="text-text-light text-sm mb-4 line-clamp-2">
                  {product.description}
                </p>

                <div className="flex gap-2 mb-4">
                  {product.options.colors.slice(0, 3).map((color, i) => (
                    <div
                      key={i}
                      className="w-6 h-6 rounded-full border-2 border-gray-200"
                      style={{
                        backgroundColor: color.toLowerCase().replace(" ", ""),
                      }}
                      title={color}
                    />
                  ))}
                  {product.options.colors.length > 3 && (
                    <div className="w-6 h-6 rounded-full border-2 border-gray-200 bg-gray-100 flex items-center justify-center text-xs text-text-light">
                      +{product.options.colors.length - 3}
                    </div>
                  )}
                </div>

                <motion.button
                  onClick={() => handleCustomize(product)}
                  className={`w-full px-6 py-3 rounded-full hover:shadow-lg transition-all font-medium ${
                    product.customizable
                      ? "bg-gradient-soft text-text-dark"
                      : "bg-rose text-white"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {product.customizable ? "Customize & Order" : "Order Now"}
                </motion.button>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-text-light text-lg">
              No products found in this category.
            </p>
          </div>
        )}
      </div>

      {/* Customization Modal */}
      {selectedProduct && (
        <CustomizationModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </section>
  );
}
