"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";

const testimonials = [
  {
    name: "Preeti",
    text: "The embroidery hoop I ordered was absolutely stunning! The attention to detail was incredible, and it made the perfect gift for my best friend's wedding.",
    rating: 5,
  },
  {
    name: "Rohit Dhaka",
    text: "I've never seen such beautiful hand-painted hankies. They're delicate, thoughtful, and arrived perfectly packaged. Will definitely order again!",
    rating: 5,
  },
  {
    name: "Amita Choudhary",
    text: "The hair accessories are adorable! My daughter wears them every day. The quality is outstanding and they hold up beautifully.",
    rating: 5,
  },
];

const SWIPE_PX = 48;
const AUTO_MS = 3000;

export default function Testimonials() {
  const [activeIndex, setActiveIndex] = useState(0);
  const sectionRef = useRef<HTMLElement>(null);
  const touchStartX = useRef<number | null>(null);
  const pointerIdRef = useRef<number | null>(null);

  const goNext = useCallback(() => {
    setActiveIndex((i) => (i + 1) % testimonials.length);
  }, []);

  const goPrev = useCallback(() => {
    setActiveIndex((i) => (i - 1 + testimonials.length) % testimonials.length);
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    let intervalId: number | null = null;

    const start = () => {
      if (intervalId != null) return;
      intervalId = window.setInterval(goNext, AUTO_MS);
    };

    const stop = () => {
      if (intervalId != null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    };

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) start();
        else stop();
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => {
      stop();
      obs.disconnect();
    };
  }, [goNext]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    touchStartX.current = e.clientX;
    pointerIdRef.current = e.pointerId;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const endSwipeFromClientX = (clientX: number) => {
    const start = touchStartX.current;
    touchStartX.current = null;
    pointerIdRef.current = null;
    if (start == null) return;
    const dx = clientX - start;
    if (Math.abs(dx) < SWIPE_PX) return;
    if (dx < 0) goNext();
    else goPrev();
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    endSwipeFromClientX(e.clientX);
  };

  const onPointerCancel = (e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId) return;
    touchStartX.current = null;
    pointerIdRef.current = null;
  };

  return (
    <section
      ref={sectionRef}
      className="py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 bg-cream"
    >
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="text-center mb-10 sm:mb-12 md:mb-16"
        >
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-text-dark mb-3 sm:mb-4">
            Loved by Our Customers
          </h2>
          <p className="text-text-light text-base sm:text-lg">
            Hear what our community has to say
          </p>
        </motion.div>

        <div className="relative select-none">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -28 }}
              transition={{ duration: 0.35 }}
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerCancel}
              className="bg-white rounded-2xl sm:rounded-3xl shadow-xl p-6 sm:p-8 md:p-10 lg:p-12 max-w-3xl mx-auto touch-pan-y cursor-grab active:cursor-grabbing"
              style={{ touchAction: "pan-y" }}
              role="region"
              aria-roledescription="carousel"
              aria-label={`Customer review ${activeIndex + 1} of ${testimonials.length}`}
            >
              <div className="flex justify-center mb-4 sm:mb-6">
                {[...Array(testimonials[activeIndex].rating)].map((_, i) => (
                  <span key={i} className="text-rose text-xl sm:text-2xl">
                    ★
                  </span>
                ))}
              </div>

              <p className="text-text-dark text-base sm:text-lg md:text-xl text-center leading-relaxed mb-6 sm:mb-8 font-light italic">
                &quot;{testimonials[activeIndex].text}&quot;
              </p>

              <p className="text-center text-text-light font-medium text-sm sm:text-base">
                — {testimonials[activeIndex].name}
              </p>
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-center gap-2 sm:gap-3 mt-6 sm:mt-8">
            {testimonials.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all ${
                  index === activeIndex ? "bg-rose w-6 sm:w-8" : "bg-gray-300"
                }`}
                aria-label={`View testimonial ${index + 1}`}
                aria-current={index === activeIndex ? "true" : undefined}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
