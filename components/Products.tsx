"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { GiSewingNeedle, GiLipstick } from "react-icons/gi";
import { GiHairStrands } from "react-icons/gi";
import { X, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import CustomizationModal from "./CustomizationModal";
import { useRouter } from "next/navigation";

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
  featured: boolean;
}

export default function Products() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customizationProduct, setCustomizationProduct] =
    useState<Product | null>(null);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [isFullScreenImage, setIsFullScreenImage] = useState(false);
  const [fullScreenImageIndex, setFullScreenImageIndex] = useState(0);
  const [currentImageIndex, setCurrentImageIndex] = useState<{
    [key: string]: number;
  }>({});
  const [loading, setLoading] = useState(true);
  const modalScrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const scrollIntervalRef = useRef<{ [key: string]: NodeJS.Timeout }>({});
  const modalRef = useRef<HTMLDivElement>(null);
  const fullScreenRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Auto-scroll images for products with multiple images in grid
  useEffect(() => {
    featuredProducts.forEach((product) => {
      if (product.images.length > 1) {
        scrollIntervalRef.current[product._id] = setInterval(() => {
          setCurrentImageIndex((prev) => ({
            ...prev,
            [product._id]:
              ((prev[product._id] || 0) + 1) % product.images.length,
          }));
        }, 3000);
      }
    });

    return () => {
      Object.values(scrollIntervalRef.current).forEach((interval) => {
        clearInterval(interval);
      });
    };
  }, [featuredProducts]);

  const handleCustomize = (product: Product) => {
    setCustomizationProduct(product);
    handleCloseModal();
  };

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
  }, [selectedProduct, isFullScreenImage]);

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
  }, [isFullScreenImage, selectedProduct]);

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
  }, [isFullScreenImage, selectedProduct, fullScreenImageIndex]);

  const handleImageHover = (productId: string, enter: boolean) => {
    if (enter) {
      if (scrollIntervalRef.current[productId]) {
        clearInterval(scrollIntervalRef.current[productId]);
      }
    } else {
      const product = featuredProducts.find((p) => p._id === productId);
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
    setFullScreenImageIndex(0);

    // Pause auto-scroll for grid items
    if (scrollIntervalRef.current[product._id]) {
      clearInterval(scrollIntervalRef.current[product._id]);
    }
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
    setModalImageIndex(0);
    setFullScreenImageIndex(0);
    setIsFullScreenImage(false);

    if (modalScrollIntervalRef.current) {
      clearInterval(modalScrollIntervalRef.current);
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

  // Full screen image handlers
  const handleOpenFullScreen = (index: number) => {
    setFullScreenImageIndex(index);
    setIsFullScreenImage(true);

    // Stop auto-scroll when opening full screen
    if (modalScrollIntervalRef.current) {
      clearInterval(modalScrollIntervalRef.current);
    }
  };

  const handleCloseFullScreen = () => {
    setIsFullScreenImage(false);

    // Sync modal image with the current full screen image
    setModalImageIndex(fullScreenImageIndex);

    // Resume auto-scroll if there are multiple images
    if (selectedProduct && selectedProduct.images.length > 1) {
      modalScrollIntervalRef.current = setInterval(() => {
        setModalImageIndex(
          (prev) => (prev + 1) % selectedProduct.images.length
        );
      }, 3000);
    }
  };

  const handleNextFullScreenImage = () => {
    if (selectedProduct) {
      const newIndex =
        (fullScreenImageIndex + 1) % selectedProduct.images.length;
      setFullScreenImageIndex(newIndex);
    }
  };

  const handlePrevFullScreenImage = () => {
    if (selectedProduct) {
      const newIndex =
        fullScreenImageIndex === 0
          ? selectedProduct.images.length - 1
          : fullScreenImageIndex - 1;
      setFullScreenImageIndex(newIndex);
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
        const response = await fetch("/api/products");
        const data = await response.json();

        if (data.success && data.products && data.products.length > 0) {
          // Ensure images is an array for all products
          const products = data.products.map((product: Product) => ({
            ...product,
            images: Array.isArray(product.images) ? product.images : [],
          }));

          // Set all products
          setAllProducts(products);

          // Filter only featured products
          const featured = products.filter(
            (product: Product) => product.featured === true
          );
          setFeaturedProducts(featured);
        } else {
          // If no products, show empty arrays
          setFeaturedProducts([]);
          setAllProducts([]);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        setFeaturedProducts([]);
        setAllProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const handleViewAllProducts = () => {
    router.push("/products");
  };

  if (loading) {
    return (
      <section className="py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 bg-cream">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-b-2 border-rose mx-auto"></div>
            <p className="mt-3 text-text-light text-sm sm:text-base">
              Loading featured products...
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 bg-cream">
        <div className="container mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-10 sm:mb-12 md:mb-16"
          >
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-text-dark mb-3 sm:mb-4">
              Featured Products
            </h2>
            <p className="text-text-light text-base sm:text-lg max-w-2xl mx-auto px-2">
              Handpicked creations showcasing our finest craftsmanship and
              attention to detail
            </p>
          </motion.div>

          {/* Products Grid - Show featured products first, then other products */}
          {featuredProducts.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8 mb-10 sm:mb-12 md:mb-16">
                {featuredProducts.map((product, index) => {
                  const images = Array.isArray(product.images)
                    ? product.images
                    : [];
                  const currentIndex = currentImageIndex[product._id] || 0;
                  const hasMultipleImages = images.length > 1;

                  return (
                    <motion.div
                      key={product._id}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.2, duration: 0.5 }}
                      className="bg-white rounded-xl sm:rounded-2xl lg:rounded-3xl overflow-hidden shadow-sm hover:shadow-md sm:hover:shadow-lg transition-all cursor-pointer group"
                      onClick={() => handleProductClick(product)}
                    >
                      {/* Product Image */}
                      <div
                        className="relative h-32 sm:h-40 md:h-48 lg:h-56 bg-gray-100 overflow-hidden"
                        onMouseEnter={() => handleImageHover(product._id, true)}
                        onMouseLeave={() =>
                          handleImageHover(product._id, false)
                        }
                      >
                        <img
                          src={images[currentIndex] || "/placeholder.png"}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />

                        {/* Price Badge */}
                        <div className="absolute top-2 right-2 bg-white bg-opacity-90 px-2 py-1 rounded-full text-xs font-medium text-text-dark shadow-sm">
                          ₹{product.basePrice}
                        </div>

                        {/* Featured Badge - Only show if product is featured */}
                        {product.featured && (
                          <div className="absolute top-2 left-2 bg-rose text-white px-1.5 py-0.5 rounded-full text-xs font-medium">
                            Featured
                          </div>
                        )}

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
                          <div className="absolute top-2 left-10 bg-black bg-opacity-60 text-white px-1.5 py-0.5 rounded-full text-xs">
                            {images.length}
                          </div>
                        )}

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300" />
                      </div>

                      {/* Product Info */}
                      <div className="p-3 sm:p-4">
                        {/* Product Name - Maximum 2 lines */}
                        <h3 className="font-medium text-text-dark text-sm sm:text-base mb-1 sm:mb-2 line-clamp-2 leading-tight min-h-[2.5rem] sm:min-h-[3rem]">
                          {product.name}
                        </h3>

                        {/* Product Description - Maximum 1 line */}
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

              {/* View All Products Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="text-center"
              >
                <motion.button
                  onClick={handleViewAllProducts}
                  className="inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 bg-white text-text-dark rounded-xl sm:rounded-2xl font-medium hover:shadow-lg transition-all border border-gray-200 hover:border-rose group text-sm sm:text-base"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span>View All Products</span>
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 transition-transform group-hover:translate-x-1" />
                </motion.button>
              </motion.div>
            </>
          ) : (
            // No products available
            <div className="text-center py-12">
              <div className="bg-white rounded-3xl p-8 sm:p-12 max-w-2xl mx-auto shadow-sm">
                <h3 className="font-serif text-2xl sm:text-3xl text-text-dark mb-4">
                  No Products Available
                </h3>
                <p className="text-text-light text-base sm:text-lg mb-6">
                  We&apos;re currently preparing our collection. Please check back
                  soon for our latest creations.
                </p>
                <motion.button
                  onClick={() => router.refresh()}
                  className="px-6 py-3 bg-rose text-white rounded-xl font-medium hover:shadow-lg transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Refresh Page
                </motion.button>
              </div>
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
                    <div className="flex items-center gap-2 mb-2">
                      {selectedProduct.featured && (
                        <span className="bg-rose text-white px-2 py-1 rounded-full text-xs font-medium">
                          Featured
                        </span>
                      )}
                    </div>
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
                          Sizes{" "}
                          {selectedProduct.options.sizeUnit &&
                            `(${selectedProduct.options.sizeUnit})`}
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
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4">
                    <motion.button
                      onClick={() => handleCustomize(selectedProduct)}
                      className="flex-1 px-4 py-3 sm:px-6 sm:py-4 bg-rose text-white rounded-xl sm:rounded-2xl font-medium hover:shadow-lg transition-all text-sm sm:text-base"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {selectedProduct.customizable
                        ? "Customize & Order"
                        : "Order Now"}
                    </motion.button>
                    <motion.button
                      onClick={handleCloseModal}
                      className="flex-1 px-4 py-3 sm:px-6 sm:py-4 bg-gray-100 text-text-dark rounded-xl sm:rounded-2xl font-medium hover:shadow-lg transition-all text-sm sm:text-base"
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
                      className={`flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                        index === fullScreenImageIndex
                          ? "border-white border-opacity-80"
                          : "border-transparent opacity-60 hover:opacity-80"
                      }`}
                    >
                      <img
                        src={image}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {customizationProduct && (
        <CustomizationModal
          product={customizationProduct}
          onClose={() => setCustomizationProduct(null)}
        />
      )}
    </>
  );
}
