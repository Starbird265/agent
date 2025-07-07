import React from 'react';
import { motion } from 'framer-motion';

// --- at the top of the file, alongside other imports ---
import PropTypes from 'prop-types';

const ProgressBar = ({ 
  progress = 0, 
  label = '',
  color = 'blue',
  showPercentage = true,
  animated = true,
  className = ''
}) => {
  // ...existing implementation...
};

// --- after the component definition ---
ProgressBar.propTypes = {
  progress: PropTypes.number,
  label: PropTypes.string,
  color: PropTypes.oneOf(['blue', 'green', 'purple', 'orange', 'red']),
  showPercentage: PropTypes.bool,
  animated: PropTypes.bool,
  className: PropTypes.string
};

export default ProgressBar;
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-500 to-red-600'
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">{label}</span>
import React from 'react'
import { motion } from 'framer-motion'

const ProgressBar = ({ progress, showPercentage }) => {
  // Clamp progress to valid range
  const clampedProgress = Math.max(0, Math.min(100, progress))

  return (
    <div className="relative h-4 bg-gray-200 rounded overflow-hidden">
      <motion.div
        className="absolute top-0 left-0 h-full bg-blue-500"
        initial={{ width: 0 }}
        animate={{ width: `${clampedProgress}%` }}
      />
      {showPercentage && (
        <span className="text-sm font-bold text-gray-800">
          {Math.round(clampedProgress)}%
        </span>
      )}
    </div>
  )
}

export default ProgressBar
        </div>
      )}
      
      <div 
        className="w-full bg-gray-200 rounded-full h-3 overflow-hidden"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label={label || "Progress"}
      >
        <motion.div
          className={`h-full bg-gradient-to-r ${colors[color]} shadow-sm`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ 
            duration: animated ? 0.5 : 0,
            ease: "easeOut"
          }}
        />
      </div>
      
      {animated && progress > 0 && (
        <div className="flex justify-end">
          <motion.div
            className="w-2 h-2 bg-current rounded-full opacity-60"
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [0.6, 1, 0.6]
            }}
            transition={{ 
              duration: 1,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>
      )}
    </div>
  );
};

export default ProgressBar;