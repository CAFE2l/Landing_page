import React from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hoverGlow?: boolean;
}

const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className = '', 
  hoverGlow = true 
}) => {
  return (
    <motion.div
      whileHover={hoverGlow ? { 
        y: -10,
        boxShadow: "0 0 60px rgba(249, 115, 22, 0.2)"
      } : {}}
      className={`glass rounded-3xl p-8 transition-all duration-300 ${className}`}
    >
      {children}
    </motion.div>
  );
};

export default GlassCard;
