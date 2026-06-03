import React from 'react';
import { motion } from 'framer-motion';

interface AnimatedBorderCardProps {
  children: React.ReactNode;
  className?: string;
}

const AnimatedBorderCard: React.FC<AnimatedBorderCardProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={`relative group ${className}`}>
      {/* Glow background */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-600 to-red-600 rounded-3xl blur opacity-30 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />
      
      <div className="relative glass-orange rounded-3xl p-8 overflow-hidden">
        {/* Border animation */}
        <motion.div 
          className="absolute inset-0 z-0 opacity-20"
          animate={{
            background: [
              "radial-gradient(circle at 0% 0%, #f97316 0%, transparent 50%)",
              "radial-gradient(circle at 100% 100%, #f97316 0%, transparent 50%)",
              "radial-gradient(circle at 0% 100%, #f97316 0%, transparent 50%)",
              "radial-gradient(circle at 100% 0%, #f97316 0%, transparent 50%)",
              "radial-gradient(circle at 0% 0%, #f97316 0%, transparent 50%)",
            ]
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        />
        
        <div className="relative z-10">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AnimatedBorderCard;
