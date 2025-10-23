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
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center'
      }}
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
            style={{
              position: 'absolute',
              zIndex: 50,
              maxWidth: '260px',
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(0, 0, 0, 0.8)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
              color: 'rgba(255, 255, 255, 0.85)',
              fontSize: '14px',
              ...(position === "top"
                ? { bottom: '100%', marginBottom: '8px' }
                : position === "bottom"
                ? { top: '100%', marginTop: '8px' }
                : position === "left"
                ? { right: '100%', marginRight: '8px' }
                : { left: '100%', marginLeft: '8px' })
            }}
          >
            <h4 style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#C1A75E',
              marginBottom: '4px',
              fontWeight: '500'
            }}>
              {label}
            </h4>
            <p style={{ margin: 0, lineHeight: '1.4' }}>{description}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
