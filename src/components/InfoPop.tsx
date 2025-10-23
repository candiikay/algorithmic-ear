import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export default function InfoPop({
  label,
  description,
  children,
  position = "top",
}: {
  label: string;
  description: string;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`absolute z-50 max-w-xs p-3 rounded-xl border border-white/10 bg-black/80 backdrop-blur-lg shadow-lg text-white/85 text-sm ${
              position === "top"
                ? "bottom-full mb-2"
                : position === "bottom"
                ? "top-full mt-2"
                : position === "left"
                ? "right-full mr-2"
                : "left-full ml-2"
            }`}
          >
            <h4 className="text-xs uppercase tracking-wider text-[#C1A75E] mb-1">
              {label}
            </h4>
            <p>{description}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
