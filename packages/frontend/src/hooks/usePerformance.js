/**
 * Performance Monitoring React Hook
 * Provides comprehensive performance tracking for React components
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { performanceMonitor } from '../lib/performance';

/**
 * Hook for monitoring component performance
 * 
 * @param {string} componentName - Name of the component for tracking
 * @param {Object} options - Configuration options
 * @param {boolean} [options.trackMount=true] - Track component mount time
 * @param {boolean} [options.trackRender=true] - Track render time
 * @param {boolean} [options.trackUpdates=true] - Track update frequency
 * @param {number} [options.sampleRate=1.0] - Sampling rate (0.0 to 1.0)
 * @param {Object} [options.metadata] - Additional metadata to track
 * 
 * @returns {Object} Performance tracking utilities
 * 
 * @example
 * const MyComponent = ({ data }) => {
 *   const {
 *     startMeasure,
 *     endMeasure,
 *     trackOperation,
 *     getMetrics
 *   } = usePerformance('MyComponent', {
 *     metadata: { dataSize: data.length }
 *   });
 * 
 *   const handleExpensiveOperation = async () => {
 *     await trackOperation('dataProcessing', async () => {
 *       // Expensive operation here
 *       return processData(data);
 *     });
 *   };
 * 
 *   return <div>...</div>;
 * };
 */
export const usePerformance = (componentName, options = {}) => {
  const {
    trackMount = true,
    trackRender = true,
    trackUpdates = true,
    sampleRate = 1.0,
    metadata = {}
  } = options;

  const mountTimeRef = useRef(null);
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(null);
  const measurementsRef = useRef(new Map());
  const metricsRef = useRef({
    mountTime: null,
    renderCount: 0,
    averageRenderTime: 0,
    totalRenderTime: 0,
    updateFrequency: 0,
    lastUpdate: null
  });

  // Check if this render should be sampled
  const shouldSample = useCallback(() => {
    return Math.random() < sampleRate;
  }, [sampleRate]);

  // Track component mount
  useEffect(() => {
    if (!trackMount || !shouldSample()) return;

    const mountStartTime = performance.now();
    mountTimeRef.current = mountStartTime;

    // Measure mount completion in next tick
    const timeoutId = setTimeout(() => {
      const mountTime = performance.now() - mountStartTime;
      metricsRef.current.mountTime = mountTime;

      performanceMonitor.recordEntry(
        'component',
        `${componentName}-mount`,
        mountStartTime,
        mountTime,
        { ...metadata, type: 'mount' }
      );
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [componentName, trackMount, shouldSample, metadata]);

  // Track renders
  useEffect(() => {
    if (!trackRender || !shouldSample()) return;

    const renderStartTime = performance.now();
    renderCountRef.current += 1;

    // Measure render time in next tick
    const timeoutId = setTimeout(() => {
      const renderTime = performance.now() - renderStartTime;
      const currentCount = renderCountRef.current;
      
      // Update metrics
      metricsRef.current.renderCount = currentCount;
      metricsRef.current.totalRenderTime += renderTime;
      metricsRef.current.averageRenderTime = 
        metricsRef.current.totalRenderTime / currentCount;

      // Track update frequency
      if (lastRenderTimeRef.current && trackUpdates) {
        const timeSinceLastRender = renderStartTime - lastRenderTimeRef.current;
        metricsRef.current.updateFrequency = 1000 / timeSinceLastRender; // Updates per second
      }
      
      lastRenderTimeRef.current = renderStartTime;
      metricsRef.current.lastUpdate = new Date().toISOString();

      performanceMonitor.recordEntry(
        'component',
        `${componentName}-render`,
        renderStartTime,
        renderTime,
        {
          ...metadata,
          type: 'render',
          renderCount: currentCount,
          updateFrequency: metricsRef.current.updateFrequency
        }
      );
    }, 0);

    return () => clearTimeout(timeoutId);
  });

  /**
   * Start a custom performance measurement
   * 
   * @param {string} measurementName - Name of the measurement
   * @param {Object} [customMetadata] - Additional metadata for this measurement
   * @returns {string} Measurement ID
   */
  const startMeasure = useCallback((measurementName, customMetadata = {}) => {
    if (!shouldSample()) return null;

    const measurementId = `${componentName}-${measurementName}-${Date.now()}`;
    const startTime = performance.now();
    
    measurementsRef.current.set(measurementId, {
      name: measurementName,
      startTime,
      metadata: { ...metadata, ...customMetadata }
    });

    return measurementId;
  }, [componentName, shouldSample, metadata]);

  /**
   * End a custom performance measurement
   * 
   * @param {string} measurementId - ID returned from startMeasure
   * @returns {number|null} Duration in milliseconds, or null if measurement not found
   */
  const endMeasure = useCallback((measurementId) => {
    if (!measurementId || !measurementsRef.current.has(measurementId)) {
      return null;
    }

    const measurement = measurementsRef.current.get(measurementId);
    const endTime = performance.now();
    const duration = endTime - measurement.startTime;

    performanceMonitor.recordEntry(
      'component',
      `${componentName}-${measurement.name}`,
      measurement.startTime,
      duration,
      measurement.metadata
    );

    measurementsRef.current.delete(measurementId);
    return duration;
  }, [componentName]);

  /**
   * Track an asynchronous operation
   * 
   * @param {string} operationName - Name of the operation
   * @param {function} operation - Async function to track
   * @param {Object} [customMetadata] - Additional metadata
   * @returns {Promise} Result of the operation
   */
  const trackOperation = useCallback(async (operationName, operation, customMetadata = {}) => {
    const measurementId = startMeasure(operationName, {
      ...customMetadata,
      type: 'async-operation'
    });

    try {
      const result = await operation();
      endMeasure(measurementId);
      return result;
    } catch (error) {
      endMeasure(measurementId);
      
      // Track operation failure
      performanceMonitor.recordEntry(
        'component',
        `${componentName}-${operationName}-error`,
        performance.now(),
        0,
        {
          ...metadata,
          ...customMetadata,
          error: error.message,
          type: 'operation-error'
        }
      );
      
      throw error;
    }
  }, [componentName, startMeasure, endMeasure, metadata]);

  /**
   * Get current performance metrics for this component
   * 
   * @returns {Object} Current metrics
   */
  const getMetrics = useCallback(() => {
    return { ...metricsRef.current };
  }, []);

  /**
   * Track API calls with automatic timing
   * 
   * @param {string} url - API endpoint
   * @param {string} [method='GET'] - HTTP method
   * @param {function} apiCall - Function that makes the API call
   * @returns {Promise} API call result
   */
  const trackApiCall = useCallback(async (url, method = 'GET', apiCall) => {
    return trackOperation(`api-${method}-${url}`, apiCall, {
      url,
      method,
      type: 'api-call'
    });
  }, [trackOperation]);

  /**
   * Track file operations
   * 
   * @param {string} operation - Type of file operation (upload, download, etc.)
   * @param {string} fileName - Name of the file
   * @param {function} fileOperation - Function that performs the file operation
   * @returns {Promise} File operation result
   */
  const trackFileOperation = useCallback(async (operation, fileName, fileOperation) => {
    return trackOperation(`file-${operation}`, fileOperation, {
      fileName,
      operation,
      type: 'file-operation'
    });
  }, [trackOperation]);

  /**
   * Track ML training operations
   * 
   * @param {string} modelName - Name of the model being trained
   * @param {function} trainingOperation - Function that performs training
   * @param {Object} [trainingConfig] - Training configuration
   * @returns {Promise} Training result
   */
  const trackMLTraining = useCallback(async (modelName, trainingOperation, trainingConfig = {}) => {
    return trackOperation(`ml-training-${modelName}`, trainingOperation, {
      modelName,
      trainingConfig,
      type: 'ml-training'
    });
  }, [trackOperation]);

  /**
   * Get performance score for this component
   * 
   * @returns {number} Performance score (0-100)
   */
  const getPerformanceScore = useCallback(() => {
    const metrics = getMetrics();
    let score = 100;

    // Penalize slow mount times (> 100ms)
    if (metrics.mountTime > 100) {
      score -= Math.min(30, (metrics.mountTime - 100) / 10);
    }

    // Penalize slow render times (> 16ms for 60fps)
    if (metrics.averageRenderTime > 16) {
      score -= Math.min(40, (metrics.averageRenderTime - 16) / 2);
    }

    // Penalize high update frequency (> 30fps)
    if (metrics.updateFrequency > 30) {
      score -= Math.min(20, (metrics.updateFrequency - 30) / 5);
    }

    // Penalize high render count (excessive re-renders)
    if (metrics.renderCount > 100) {
      score -= Math.min(10, (metrics.renderCount - 100) / 20);
    }

    return Math.max(0, Math.round(score));
  }, [getMetrics]);

  /**
   * Generate performance report
   * 
   * @returns {Object} Detailed performance report
   */
  const generateReport = useCallback(() => {
    const metrics = getMetrics();
    const score = getPerformanceScore();
    
    return {
      componentName,
      score,
      metrics,
      metadata,
      recommendations: generateRecommendations(metrics, score),
      timestamp: new Date().toISOString()
    };
  }, [componentName, getMetrics, getPerformanceScore, metadata]);

  /**
   * Generate performance recommendations
   * 
   * @param {Object} metrics - Current metrics
   * @param {number} score - Performance score
   * @returns {Array} Array of recommendation strings
   */
  const generateRecommendations = useMemo(() => {
    return (metrics, score) => {
      const recommendations = [];

      if (metrics.mountTime > 100) {
        recommendations.push('Consider lazy loading or code splitting to improve mount time');
      }

      if (metrics.averageRenderTime > 16) {
        recommendations.push('Use React.memo or useMemo to optimize rendering performance');
      }

      if (metrics.updateFrequency > 30) {
        recommendations.push('Reduce update frequency by debouncing state changes');
      }

      if (metrics.renderCount > 100) {
        recommendations.push('Check for unnecessary re-renders and optimize dependencies');
      }

      if (score < 60) {
        recommendations.push('Consider performance profiling to identify bottlenecks');
      }

      return recommendations;
    };
  }, []);

  return {
    startMeasure,
    endMeasure,
    trackOperation,
    trackApiCall,
    trackFileOperation,
    trackMLTraining,
    getMetrics,
    getPerformanceScore,
    generateReport
  };
};

/**
 * Hook for tracking specific performance thresholds
 * 
 * @param {Object} thresholds - Performance thresholds to monitor
 * @param {function} onThresholdExceeded - Callback when threshold is exceeded
 * 
 * @example
 * usePerformanceThresholds({
 *   renderTime: 16, // 60fps
 *   mountTime: 100,
 *   updateFrequency: 30
 * }, (metric, value, threshold) => {
 *   console.warn(`Performance threshold exceeded: ${metric} (${value}ms > ${threshold}ms)`);
 * });
 */
export const usePerformanceThresholds = (thresholds, onThresholdExceeded) => {
  const thresholdsRef = useRef(thresholds);
  const callbackRef = useRef(onThresholdExceeded);

  useEffect(() => {
    thresholdsRef.current = thresholds;
    callbackRef.current = onThresholdExceeded;
  });

  const checkThreshold = useCallback((metric, value) => {
    const threshold = thresholdsRef.current[metric];
    if (threshold && value > threshold) {
      callbackRef.current?.(metric, value, threshold);
    }
  }, []);

  return { checkThreshold };
};

/**
 * Hook for performance budgets
 * 
 * @param {Object} budget - Performance budget configuration
 * @returns {Object} Budget tracking utilities
 * 
 * @example
 * const { checkBudget, getBudgetStatus } = usePerformanceBudget({
 *   totalRenderTime: 1000, // 1 second total
 *   maxRenderCount: 50,
 *   avgRenderTime: 16
 * });
 */
export const usePerformanceBudget = (budget) => {
  const budgetRef = useRef(budget);
  const spentRef = useRef({});

  useEffect(() => {
    budgetRef.current = budget;
  });

  const checkBudget = useCallback((metric, value) => {
    const currentSpent = spentRef.current[metric] || 0;
    const newSpent = currentSpent + value;
    const budgetLimit = budgetRef.current[metric];

    spentRef.current[metric] = newSpent;

    if (budgetLimit && newSpent > budgetLimit) {
      return {
        exceeded: true,
        spent: newSpent,
        budget: budgetLimit,
        overage: newSpent - budgetLimit
      };
    }

    return {
      exceeded: false,
      spent: newSpent,
      budget: budgetLimit,
      remaining: budgetLimit - newSpent
    };
  }, []);

  const getBudgetStatus = useCallback(() => {
    const status = {};
    
    Object.keys(budgetRef.current).forEach(metric => {
      const spent = spentRef.current[metric] || 0;
      const budget = budgetRef.current[metric];
      
      status[metric] = {
        spent,
        budget,
        remaining: budget - spent,
        utilization: (spent / budget) * 100,
        exceeded: spent > budget
      };
    });

    return status;
  }, []);

  const resetBudget = useCallback(() => {
    spentRef.current = {};
  }, []);

  return {
    checkBudget,
    getBudgetStatus,
    resetBudget
  };
};

export default usePerformance;