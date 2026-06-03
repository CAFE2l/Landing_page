import React from 'react';
import { motion } from 'framer-motion';

interface FloatingBlobProps {
  color?: string;
  size?: string;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  delay?: number;
}

const FloatingBlob: React.FC<FloatingBlobProps> = ({
  color = 'bg-orange-500',
  size = 'w-96 h-96',
  top,
  left,
  right,
  bottom,
  delay = 0
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: [0.15, 0.3, 0.15],
        scale: [1, 1.1, 1],
        x: [0, 20, 0],
        y: [0, -20, 0]
      }}
      transition={{ 
        duration: 10, 
        repeat: Infinity, 
        delay,
        ease: "linear"
      }}
      className={`fixed -z-10 rounded-full blur-[100px] pointer-events-none ${color} ${size}`}
      style={{ top, left, right, bottom }}
    />
  );
};

export default FloatingBlob;
