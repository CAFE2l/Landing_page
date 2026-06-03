import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface GlowButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  icon?: LucideIcon;
  onClick?: () => void;
  className?: string;
  href?: string;
}

const GlowButton: React.FC<GlowButtonProps> = ({
  children,
  variant = 'primary',
  icon: Icon,
  onClick,
  className = '',
  href
}) => {
  const baseStyles = "relative px-8 py-4 rounded-full font-bold flex items-center justify-center gap-2 transition-all duration-300 group overflow-hidden";
  
  const variants = {
    primary: "bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_35px_rgba(249,115,22,0.5)]",
    secondary: "bg-white/10 text-white backdrop-blur-md border border-white/20 hover:bg-white/20",
    outline: "bg-transparent border-2 border-orange-500/50 text-orange-500 hover:bg-orange-500/10"
  };

  const Component = href ? motion.a : motion.button;
  const props = href ? { href } : { onClick };

  return (
    <Component
      {...props}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      <span className="relative z-10">{children}</span>
      {Icon && (
        <Icon className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
      )}
      {variant === 'primary' && (
        <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-red-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-0" />
      )}
    </Component>
  );
};

export default GlowButton;
