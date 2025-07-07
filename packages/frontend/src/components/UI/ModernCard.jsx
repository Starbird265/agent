import React from 'react';
import { motion } from 'framer-motion';

const ModernCard = ({ 
  children, 
  className = '', 
  hover = true, 
  gradient = false,
  glow = false,
  onClick,
  ...props 
}) => {
  const baseClasses = `
    bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20
    transition-all duration-300 ease-out
    ${hover ? 'hover:shadow-xl hover:scale-[1.02] hover:border-white/40' : ''}
    ${gradient ? 'bg-gradient-to-br from-white/90 to-white/70' : ''}
    ${glow ? 'shadow-2xl shadow-blue-500/10' : ''}
    ${onClick ? 'cursor-pointer' : ''}
    ${className}
  `;

  return (
    <motion.div
      className={baseClasses}
      whileHover={hover ? { y: -4 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default ModernCard;