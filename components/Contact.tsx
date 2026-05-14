"use client";

import { motion } from "framer-motion";
import { FaEnvelope, FaInstagram, FaFacebook } from "react-icons/fa";
import { useState } from "react";
import { CONTACT_EMAIL } from "@/lib/siteContact";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null;
    message: string;
  }>({ type: null, message: "" });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: "" });

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setSubmitStatus({
          type: "success",
          message: data.message || "Thank you! We will get back to you soon.",
        });
        setFormData({ name: "", email: "", subject: "", message: "" });
      } else {
        setSubmitStatus({
          type: "error",
          message: data.error || "Something went wrong. Please try again.",
        });
      }
    } catch (error) {
      setSubmitStatus({
        type: "error",
        message: "Failed to send message. Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      id="contact"
      className="py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 bg-gradient-to-br from-blush via-lavender to-rose"
    >
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h2 className="font-serif text-2xl sm:text-3xl md:text-4xl lg:text-5xl text-text-dark mb-4 sm:mb-6">
            Let&apos;s Create Something Special
          </h2>
          <p className="text-text-light text-sm sm:text-base md:text-lg mb-8 sm:mb-10 md:mb-12">
            Have a custom order in mind? We&apos;d love to bring your vision to
            life
          </p>

          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg sm:shadow-xl p-6 sm:p-8 md:p-10 lg:p-12">
            <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <input
                  type="text"
                  name="name"
                  placeholder="Your Name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 sm:px-6 py-3 sm:py-4 rounded-full sm:rounded-full border border-gray-300 sm:border-2 border-gray-200 focus:border-rose focus:outline-none transition-colors text-sm sm:text-base"
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Your Email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 sm:px-6 py-3 sm:py-4 rounded-full sm:rounded-full border border-gray-300 sm:border-2 border-gray-200 focus:border-rose focus:outline-none transition-colors text-sm sm:text-base"
                />
              </div>

              <input
                type="text"
                name="subject"
                placeholder="Subject"
                value={formData.subject}
                onChange={handleChange}
                className="w-full px-4 sm:px-6 py-3 sm:py-4 rounded-full sm:rounded-full border border-gray-300 sm:border-2 border-gray-200 focus:border-rose focus:outline-none transition-colors text-sm sm:text-base"
              />

              <textarea
                name="message"
                placeholder="Tell us about your custom order..."
                rows={4}
                value={formData.message}
                onChange={handleChange}
                required
                className="w-full px-4 sm:px-6 py-3 sm:py-4 rounded-2xl sm:rounded-3xl border border-gray-300 sm:border-2 border-gray-200 focus:border-rose focus:outline-none transition-colors resize-none text-sm sm:text-base"
              />

              {submitStatus.type && (
                <div
                  className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl text-center text-xs sm:text-sm ${
                    submitStatus.type === "success"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {submitStatus.message}
                </div>
              )}

              <motion.button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-rose text-white px-6 sm:px-8 py-3 sm:py-4 rounded-full sm:rounded-full hover:bg-opacity-90 transition-all shadow-md sm:shadow-lg hover:shadow-lg sm:hover:shadow-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
              >
                {isSubmitting ? "Sending..." : "Send Message"}
              </motion.button>
            </form>

            <div className="mt-8 sm:mt-10 md:mt-12 flex justify-center gap-4 sm:gap-6">
              <motion.a
                href={`mailto:${CONTACT_EMAIL}`}
                className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-blush rounded-full flex items-center justify-center text-text-dark hover:bg-rose hover:text-white transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FaEnvelope className="text-base sm:text-lg md:text-xl" />
              </motion.a>
              <motion.a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-blush rounded-full flex items-center justify-center text-text-dark hover:bg-rose hover:text-white transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FaInstagram className="text-base sm:text-lg md:text-xl" />
              </motion.a>
              {/* <motion.a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 bg-blush rounded-full flex items-center justify-center text-text-dark hover:bg-rose hover:text-white transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <FaFacebook className="text-base sm:text-lg md:text-xl" />
              </motion.a> */}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
