"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import CustomizationModal from "./CustomizationModal";
import { X, ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import { useCustomerChat } from "@/components/CustomerChat";

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

const ALL_PRODUCTS_SAMPLE_FALLBACK: Product[] = [
  {
    _id: "1",
    name: "Custom Name Embroidery Hoop",
    category: "embroidery",
    description:
      "Beautiful personalized embroidery hoop with your chosen name and design. Each piece is meticulously handcrafted with love and attention to detail, making it a perfect keepsake for special occasions.",
    basePrice: 899,
    images: [
      "https://images.pexels.com/photos/6195125/pexels-photo-6195125.jpeg",
      "https://images.pexels.com/photos/6195125/pexels-photo-6195125.jpeg",
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
    description:
      "Delicate floral design with inspirational quotes, perfect for home decor or as a thoughtful gift. Each stitch tells a story of craftsmanship and passion.",
    basePrice: 1299,
    images: [
      "https://images.pexels.com/photos/6195125/pexels-photo-6195125.jpeg",
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
      "Set of 3 hand-painted cotton hankies with beautiful watercolor designs. Each hanky is unique and painted with high-quality, non-toxic colors that last through gentle washing.",
    basePrice: 699,
    images: ["https://images.pexels.com/photos/6195125/pexels-photo-6195125.jpeg"],
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
      "https://images.pexels.com/photos/6195125/pexels-photo-6195125.jpeg",
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
    images: ["https://images.pexels.com/photos/6195125/pexels-photo-6195125.jpeg"],
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

export default function AllProducts() {
  const searchParams = useSearchParams();
  const chat = useCustomerChat();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customizationProduct, setCustomizationProduct] =
    useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState<{
    [key: string]: number;
  }>({});
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [isFullScreenImage, setIsFullScreenImage] = useState(false);
  const [fullScreenImageIndex, setFullScreenImageIndex] = useState(0);
  const scrollIntervalRef = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const modalScrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const fullScreenRef = useRef<HTMLDivElement>(null);

  const [categories, setCategories] = useState<
    { id: string; name: string; emoji: string }[]
  >([{ id: "all", name: "All Products", emoji: "✨" }]);

  const handleCloseModal = useCallback(() => {
    setSelectedProduct(null);
    setModalImageIndex(0);
    setFullScreenImageIndex(0);
    setIsFullScreenImage(false);
    if (modalScrollIntervalRef.current) {
      clearInterval(modalScrollIntervalRef.current);
    }
  }, []);

  const handleCloseFullScreen = useCallback(() => {
    setIsFullScreenImage(false);
    setModalImageIndex(fullScreenImageIndex);
    if (selectedProduct && selectedProduct.images.length > 1) {
      modalScrollIntervalRef.current = setInterval(() => {
        setModalImageIndex(
          (prev) => (prev + 1) % selectedProduct!.images.length
        );
      }, 3000);
    }
  }, [fullScreenImageIndex, selectedProduct]);

  const handleNextFullScreenImage = useCallback(() => {
    if (!selectedProduct) return;
    setFullScreenImageIndex(
      (idx) => (idx + 1) % selectedProduct.images.length
    );
  }, [selectedProduct]);

  const handlePrevFullScreenImage = useCallback(() => {
    if (!selectedProduct) return;
    setFullScreenImageIndex((idx) =>
      idx === 0 ? selectedProduct.images.length - 1 : idx - 1
    );
  }, [selectedProduct]);

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

  useEffect(() => {
    document.title = "All Products - Handcrafted Gifts";
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        "content",
        "Browse our complete collection of handmade embroidery hoops, hand-painted hankies, and hair accessories. Find the perfect personalized gift for any occasion."
      );
  }, []);

  // Auto-scroll images for products with multiple images
  useEffect(() => {
    const intervalMap = scrollIntervalRef.current;
    products.forEach((product) => {
      if (product.images.length > 1) {
        intervalMap[product._id] = setInterval(() => {
          setCurrentImageIndex((prev) => ({
            ...prev,
            [product._id]:
              ((prev[product._id] || 0) + 1) % product.images.length,
          }));
        }, 3000);
      }
    });

    return () => {
      Object.values(intervalMap).forEach((interval) => {
        clearInterval(interval);
      });
    };
  }, [products]);

  // Auto-scroll for modal images
  useEffect(() => {
    if (
      selectedProduct &&
      selectedProduct.images.length > 1 &&
      !isFullScreenImage
    ) {
      modalScrollIntervalRef.current = setInterval(() => {
        setModalImageIndex(
          (prev) => (prev + 1) % selectedProduct.images.length
        );
      }, 3000);
    }

    return () => {
      if (modalScrollIntervalRef.current) {
        clearInterval(modalScrollIntervalRef.current);
      }
    };
  }, [selectedProduct, isFullScreenImage]);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node) &&
        !isFullScreenImage
      ) {
        handleCloseModal();
      }
    };

    if (selectedProduct) {
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      if (!isFullScreenImage) {
        document.body.style.overflow = "unset";
      }
    };
  }, [selectedProduct, isFullScreenImage, handleCloseModal]);

  // Close full screen image when clicking outside or pressing Escape
  useEffect(() => {
    const handleFullScreenClickOutside = (event: MouseEvent) => {
      if (
        fullScreenRef.current &&
        !fullScreenRef.current.contains(event.target as Node) &&
        isFullScreenImage
      ) {
        handleCloseFullScreen();
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isFullScreenImage) {
        handleCloseFullScreen();
      }
    };

    if (isFullScreenImage) {
      document.addEventListener("mousedown", handleFullScreenClickOutside);
      document.addEventListener("keydown", handleEscapeKey);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("mousedown", handleFullScreenClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
      if (!selectedProduct) {
        document.body.style.overflow = "unset";
      }
    };
  }, [isFullScreenImage, selectedProduct, handleCloseFullScreen]);

  // Keyboard navigation for full screen
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isFullScreenImage || !selectedProduct) return;

      switch (event.key) {
        case "ArrowLeft":
          handlePrevFullScreenImage();
          break;
        case "ArrowRight":
          handleNextFullScreenImage();
          break;
        default:
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    isFullScreenImage,
    selectedProduct,
    handleNextFullScreenImage,
    handlePrevFullScreenImage,
  ]);

  const handleImageHover = (productId: string, enter: boolean) => {
    if (enter) {
      if (scrollIntervalRef.current[productId]) {
        clearInterval(scrollIntervalRef.current[productId]);
      }
    } else {
      const product = products.find((p) => p._id === productId);
      if (product && product.images.length > 1) {
        scrollIntervalRef.current[productId] = setInterval(() => {
          setCurrentImageIndex((prev) => ({
            ...prev,
            [productId]: ((prev[productId] || 0) + 1) % product.images.length,
          }));
        }, 3000);
      }
    }
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setModalImageIndex(0);
    setFullScreenImageIndex(0); // Reset full screen index when opening new product

    // Pause auto-scroll for grid items
    if (scrollIntervalRef.current[product._id]) {
      clearInterval(scrollIntervalRef.current[product._id]);
    }
  };

  const handleNextImage = () => {
    if (selectedProduct) {
      const newIndex = (modalImageIndex + 1) % selectedProduct.images.length;
      setModalImageIndex(newIndex);
    }
  };

  const handlePrevImage = () => {
    if (selectedProduct) {
      const newIndex =
        modalImageIndex === 0
          ? selectedProduct.images.length - 1
          : modalImageIndex - 1;
      setModalImageIndex(newIndex);
    }
  };

  const handleCustomize = (product: Product) => {
    setCustomizationProduct(product);
    handleCloseModal();
  };

  const handleChatAboutProduct = async () => {
    if (!selectedProduct) return;
    const ok = await chat?.sendProductLinkInChatSilent?.({
      _id: selectedProduct._id,
      name: selectedProduct.name,
    });
    if (ok) {
      handleCloseModal();
    } else {
      alert(
        "Could not send this product to chat. Try the floating chat button, then use Chat again."
      );
    }
  };

  const handleOpenFullScreen = (index: number) => {
    setFullScreenImageIndex(index);
    setIsFullScreenImage(true);

    // Stop auto-scroll when opening full screen
    if (modalScrollIntervalRef.current) {
      clearInterval(modalScrollIntervalRef.current);
    }
  };

  // Update full screen index when modal index changes (if full screen is closed)
  useEffect(() => {
    if (!isFullScreenImage && selectedProduct) {
      setFullScreenImageIndex(modalImageIndex);
    }
  }, [modalImageIndex, isFullScreenImage, selectedProduct]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch("/api/products?all=true");
        const data = await response.json();

        if (data.success && data.products && data.products.length > 0) {
          // Ensure images is always an array
          const productsWithImages = data.products.map((product: Product) => ({
            ...product,
            images: Array.isArray(product.images) ? product.images : [],
          }));
          setProducts(productsWithImages);
        } else {
          setProducts(ALL_PRODUCTS_SAMPLE_FALLBACK);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        setProducts(ALL_PRODUCTS_SAMPLE_FALLBACK);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const productHighlightId = searchParams.get("product");
  useEffect(() => {
    if (!productHighlightId || loading) return;
    const t = window.setTimeout(() => {
      document
        .getElementById(`product-card-${productHighlightId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 400);
    return () => window.clearTimeout(t);
  }, [productHighlightId, loading, products]);

  const filteredProducts =
    selectedCategory === "all"
      ? products
      : products.filter((product) => product.category === selectedCategory);

  if (loading) {
    return (
      <section className="py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 bg-cream min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 border-b-2 border-rose mx-auto"></div>
            <p className="mt-3 sm:mt-4 text-text-light text-sm sm:text-base">
              Loading our beautiful collection...
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="py-8 sm:py-12 md:py-16 lg:py-24 px-3 sm:px-6 bg-cream min-h-screen">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8 sm:mb-12 md:mb-16"
          >
            <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl text-text-dark mb-3 sm:mb-4">
              Our Complete Collection
            </h2>
            <p className="text-text-light text-sm sm:text-base md:text-lg max-w-2xl mx-auto mb-6 sm:mb-8">
              Browse all our handmade products and find the perfect gift
            </p>

            {/* Category Filter */}
            <div className="flex flex-wrap justify-center gap-2 sm:gap-3 md:gap-4 mb-8 sm:mb-10 md:mb-12">
              {categories.map((category) => (
                <motion.button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`px-3 sm:px-4 md:px-6 py-2 sm:py-3 rounded-full font-medium transition-all text-xs sm:text-sm md:text-base ${
                    selectedCategory === category.id
                      ? "bg-rose text-white shadow-md sm:shadow-lg"
                      : "bg-white text-text-dark hover:bg-blush"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="mr-1 sm:mr-2">{category.emoji}</span>
                  <span className="hidden xs:inline">{category.name}</span>
                  <span className="xs:hidden">
                    {category.name.split(" ")[0]}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 lg:gap-8">
            {filteredProducts.map((product, index) => {
              const images = Array.isArray(product.images)
                ? product.images
                : [];
              const currentIndex = currentImageIndex[product._id] || 0;
              const hasMultipleImages = images.length > 1;

              return (
                <motion.div
                  key={product._id}
                  id={`product-card-${product._id}`}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  className="bg-white rounded-xl sm:rounded-2xl lg:rounded-3xl overflow-hidden shadow-sm hover:shadow-md sm:hover:shadow-lg transition-all cursor-pointer group"
                  onClick={() => handleProductClick(product)}
                >
                  {/* Product Image */}
                  <div
                    className="relative h-32 sm:h-40 md:h-48 lg:h-56 bg-gray-100 overflow-hidden"
                    onMouseEnter={() => handleImageHover(product._id, true)}
                    onMouseLeave={() => handleImageHover(product._id, false)}
                  >
                    <Image
                      src={images[currentIndex] || "/placeholder.png"}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />

                    {/* Price Badge */}
                    <div className="absolute top-2 right-2 bg-white bg-opacity-90 px-2 py-1 rounded-full text-xs font-medium text-text-dark shadow-sm">
                      ₹{product.basePrice}
                    </div>

                    {/* Image Indicators */}
                    {hasMultipleImages && (
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
                        {images.map((_, idx) => (
                          <div
                            key={idx}
                            className={`w-1.5 h-1.5 rounded-full transition-all ${
                              idx === currentIndex
                                ? "bg-white shadow-sm"
                                : "bg-white bg-opacity-50"
                            }`}
                          />
                        ))}
                      </div>
                    )}

                    {/* Multiple Images Badge */}
                    {hasMultipleImages && (
                      <div className="absolute top-2 left-2 bg-black bg-opacity-60 text-white px-1.5 py-0.5 rounded-full text-xs">
                        {images.length}
                      </div>
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300" />

                    <button
                      type="button"
                      aria-label={`Chat about ${product.name}`}
                      className="absolute bottom-2 right-2 z-[5] w-9 h-9 rounded-full bg-white/95 text-rose shadow-md flex items-center justify-center hover:bg-rose hover:text-white transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        chat?.offerProductChat({
                          _id: product._id,
                          name: product.name,
                        });
                      }}
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Product Info */}
                  <div className="p-3 sm:p-4">
                    <h3 className="font-medium text-text-dark text-sm sm:text-base mb-1 sm:mb-2 line-clamp-2 leading-tight min-h-[2.5rem] sm:min-h-[3rem]">
                      {product.name}
                    </h3>
                    <p className="text-text-light text-xs sm:text-sm mb-2 sm:mb-3 line-clamp-1 leading-relaxed">
                      {product.description}
                    </p>

                    {/* View Details Button */}
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProductClick(product);
                      }}
                      className="w-full px-3 py-2 bg-gradient-soft text-text-dark rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium hover:shadow-md transition-all group-hover:bg-rose group-hover:text-white"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      View Details
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12 sm:py-16">
              <div className="text-6xl mb-4">😔</div>
              <p className="text-text-light text-base sm:text-lg md:text-xl">
                No products found in this category.
              </p>
              <button
                onClick={() => setSelectedCategory("all")}
                className="mt-4 px-6 py-3 bg-rose text-white rounded-full font-medium hover:shadow-lg transition-all"
              >
                View All Products
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black bg-opacity-50 backdrop-blur-sm"
          >
            <motion.div
              ref={modalRef}
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25 }}
              className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-2xl md:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col lg:flex-row"
            >
              {/* Close Button */}
              <button
                onClick={handleCloseModal}
                className="absolute top-3 right-3 z-10 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-text-dark" />
              </button>

              {/* Image Gallery - SIMPLIFIED VERSION */}
              <div className="relative w-full lg:w-1/2 h-48 sm:h-64 md:h-80 lg:h-auto bg-gray-100">
                <motion.img
                  key={`modal-${modalImageIndex}`}
                  src={
                    selectedProduct.images?.[modalImageIndex] ||
                    "/placeholder.png"
                  }
                  alt={selectedProduct.name}
                  className="w-full h-full object-cover cursor-zoom-in"
                  onClick={() => handleOpenFullScreen(modalImageIndex)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />

                {/* Navigation Arrows - Only show for multiple images */}
                {selectedProduct.images.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrevImage();
                      }}
                      className="hidden sm:flex absolute left-2 top-1/2 transform -translate-y-1/2 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all z-10"
                    >
                      <ChevronLeft className="w-4 h-4 text-text-dark" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNextImage();
                      }}
                      className="hidden sm:flex absolute right-2 top-1/2 transform -translate-y-1/2 bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all z-10"
                    >
                      <ChevronRight className="w-4 h-4 text-text-dark" />
                    </button>
                  </>
                )}

                {/* Image Indicators - Only show for multiple images */}
                {selectedProduct.images.length > 1 && (
                  <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1.5 z-10">
                    {selectedProduct.images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          setModalImageIndex(idx);
                        }}
                        className={`w-2 h-2 rounded-full transition-all ${
                          idx === modalImageIndex
                            ? "bg-white shadow-sm"
                            : "bg-white bg-opacity-50"
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* Image Counter Badge */}
                <div className="absolute top-2 left-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded-full text-xs z-10">
                  {modalImageIndex + 1} / {selectedProduct.images.length}
                </div>

                {/* Mobile Navigation Buttons - Only show on mobile for multiple images */}
                {selectedProduct.images.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrevImage();
                      }}
                      className="sm:hidden absolute left-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 rounded-full p-2 shadow-lg z-10"
                    >
                      <ChevronLeft className="w-4 h-4 text-text-dark" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNextImage();
                      }}
                      className="sm:hidden absolute right-2 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 rounded-full p-2 shadow-lg z-10"
                    >
                      <ChevronRight className="w-4 h-4 text-text-dark" />
                    </button>
                  </>
                )}
              </div>

              {/* Product Details */}
              <div className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
                <div className="space-y-3 sm:space-y-4 md:space-y-6">
                  {/* Header */}
                  <div>
                    <h2 className="font-serif text-xl sm:text-2xl md:text-3xl lg:text-4xl text-text-dark mb-2">
                      {selectedProduct.name}
                    </h2>
                    <p className="text-xl sm:text-2xl md:text-3xl text-rose font-medium">
                      ₹{selectedProduct.basePrice}
                    </p>
                  </div>

                  {/* Description */}
                  <div>
                    <h3 className="font-medium text-text-dark mb-2 text-base sm:text-lg">
                      Description
                    </h3>
                    <p className="text-text-light text-sm sm:text-base leading-relaxed">
                      {selectedProduct.description}
                    </p>
                  </div>

                  {/* Options */}
                  <div className="space-y-3 sm:space-y-4">
                    {/* Sizes */}
                    {selectedProduct.options.sizes.length > 0 && (
                      <div>
                        <h3 className="font-medium text-text-dark mb-2 text-base sm:text-lg">
                          Sizes
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedProduct.options.sizes.map((size, index) => (
                            <span
                              key={index}
                              className="px-2 py-1.5 bg-gray-100 rounded-full text-xs sm:text-sm text-text-dark"
                            >
                              {size}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Materials */}
                    {selectedProduct.options.materials.length > 0 && (
                      <div>
                        <h3 className="font-medium text-text-dark mb-2 text-base sm:text-lg">
                          Materials
                        </h3>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedProduct.options.materials.map(
                            (material, index) => (
                              <span
                                key={index}
                                className="px-2 py-1.5 bg-gray-100 rounded-full text-xs sm:text-sm text-text-dark"
                              >
                                {material}
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 pt-3 sm:pt-4">
                    <motion.button
                      type="button"
                      onClick={() => handleCustomize(selectedProduct)}
                      className="w-full px-4 py-3 sm:px-6 sm:py-4 bg-rose text-white rounded-xl sm:rounded-2xl font-medium hover:shadow-lg transition-all text-sm sm:text-base"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {selectedProduct.customizable
                        ? "Customize & Order"
                        : "Order Now"}
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => void handleChatAboutProduct()}
                      className="w-full px-4 py-3 sm:px-6 sm:py-4 border-2 border-rose text-rose bg-white rounded-xl sm:rounded-2xl font-medium hover:bg-rose/5 transition-all text-sm sm:text-base inline-flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <MessageCircle className="w-5 h-5 shrink-0" />
                      Chat
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={handleCloseModal}
                      className="w-full px-4 py-3 sm:px-6 sm:py-4 bg-gray-100 text-text-dark rounded-xl sm:rounded-2xl font-medium hover:shadow-lg transition-all text-sm sm:text-base"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Continue Shopping
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Screen Image Viewer */}
      <AnimatePresence>
        {isFullScreenImage && selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black bg-opacity-95 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div
              ref={fullScreenRef}
              className="relative w-full h-full flex items-center justify-center"
            >
              {/* Close Button */}
              <button
                onClick={handleCloseFullScreen}
                className="absolute top-4 right-4 z-10 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-3 transition-all"
              >
                <X className="w-6 h-6 text-white" />
              </button>

              {/* Navigation Arrows */}
              {selectedProduct.images.length > 1 && (
                <>
                  <button
                    onClick={handlePrevFullScreenImage}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-3 transition-all z-10"
                  >
                    <ChevronLeft className="w-6 h-6 text-white" />
                  </button>
                  <button
                    onClick={handleNextFullScreenImage}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full p-3 transition-all z-10"
                  >
                    <ChevronRight className="w-6 h-6 text-white" />
                  </button>
                </>
              )}

              {/* Main Image */}
              <div className="max-w-4xl max-h-full w-full h-full flex items-center justify-center">
                <motion.img
                  key={`fullscreen-${fullScreenImageIndex}`}
                  src={
                    selectedProduct.images?.[fullScreenImageIndex] ||
                    "/placeholder.png"
                  }
                  alt={`${selectedProduct.name} - Image ${
                    fullScreenImageIndex + 1
                  }`}
                  className="max-w-full max-h-full object-contain"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* Image Counter */}
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-50 text-white px-4 py-2 rounded-full text-sm font-medium">
                {fullScreenImageIndex + 1} / {selectedProduct.images.length}
              </div>

              {/* Thumbnail Strip */}
              {selectedProduct.images.length > 1 && (
                <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 flex gap-2 max-w-full overflow-x-auto px-4 py-2">
                  {selectedProduct.images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setFullScreenImageIndex(index)}
                      type="button"
                      className={`relative flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                        index === fullScreenImageIndex
                          ? "border-white border-opacity-80"
                          : "border-transparent opacity-60 hover:opacity-80"
                      }`}
                    >
                      <Image
                        src={image}
                        alt={`Thumbnail ${index + 1}`}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Customization Modal */}
      {customizationProduct && (
        <CustomizationModal
          product={customizationProduct}
          onClose={() => setCustomizationProduct(null)}
        />
      )}
    </>
  );
}
