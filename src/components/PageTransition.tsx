import React from 'react';
import { motion, Variants } from 'motion/react';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
  keyId?: string;
}

// Android Material Emphasized Zoom-In transition curve
export const zoomInVariants: Variants = {
  initial: { 
    opacity: 0, 
    scale: 0.94,
    y: 8,
  },
  animate: { 
    opacity: 1, 
    scale: 1,
    y: 0,
    transition: {
      duration: 0.22,
      ease: [0.2, 0.0, 0.0, 1.0] as const, // Material Emphasized Decelerate curve
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.96,
    transition: {
      duration: 0.15,
      ease: [0.4, 0.0, 1.0, 1.0] as const,
    }
  }
};

// Android Dialog / Modal Zoom-In transition
export const modalZoomVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.88,
    y: 12,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.24,
      ease: [0.2, 0.0, 0.0, 1.0] as const,
    }
  },
  exit: {
    opacity: 0,
    scale: 0.92,
    y: 6,
    transition: {
      duration: 0.16,
      ease: [0.4, 0.0, 1.0, 1.0] as const,
    }
  }
};

export const backdropVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.18 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

export const PageTransition: React.FC<PageTransitionProps> = ({ children, className = '', keyId }) => {
  return (
    <motion.div
      key={keyId}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={zoomInVariants}
      className={`w-full ${className}`}
    >
      {children}
    </motion.div>
  );
};
