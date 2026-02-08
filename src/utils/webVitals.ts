// ============================================
// Web Vitals Performance Monitoring
// Path: src/utils/webVitals.ts
// ============================================

import { onCLS, onINP, onFCP, onLCP, onTTFB, type Metric } from 'web-vitals';
import { logger } from './logger';

/**
 * Report Web Vitals metrics to console and external monitoring
 */
function sendToAnalytics(metric: Metric): void {
  const { name, value, rating, delta } = metric;

  // Log to console in development
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.log(`[Web Vitals] ${name}:`, {
      value: Math.round(value),
      rating,
      delta: Math.round(delta),
    });
  }

  // Log to Sentry or monitoring service
  logger.info(`Web Vital: ${name}`, {
    metricName: name,
    value: Math.round(value),
    rating,
    delta: Math.round(delta),
    navigationType: metric.navigationType,
  });

  // Send to analytics service (Google Analytics, Plausible, etc.)
  if (window.gtag) {
    window.gtag('event', name, {
      value: Math.round(value),
      metric_rating: rating,
      metric_delta: Math.round(delta),
    });
  }
}

/**
 * Initialize Web Vitals monitoring
 */
export function initWebVitals(): void {
  try {
    // Cumulative Layout Shift - measures visual stability
    // Good: < 0.1, Needs Improvement: 0.1-0.25, Poor: > 0.25
    onCLS(sendToAnalytics);

    // Interaction to Next Paint - measures interactivity (replaces FID)
    // Good: < 200ms, Needs Improvement: 200-500ms, Poor: > 500ms
    onINP(sendToAnalytics);

    // First Contentful Paint - measures loading performance
    // Good: < 1.8s, Needs Improvement: 1.8-3s, Poor: > 3s
    onFCP(sendToAnalytics);

    // Largest Contentful Paint - measures perceived load speed
    // Good: < 2.5s, Needs Improvement: 2.5-4s, Poor: > 4s
    onLCP(sendToAnalytics);

    // Time to First Byte - measures server response time
    // Good: < 800ms, Needs Improvement: 800-1800ms, Poor: > 1800ms
    onTTFB(sendToAnalytics);

    logger.info('Web Vitals monitoring initialized');
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error('Failed to initialize Web Vitals'), {
      context: 'initWebVitals',
    });
  }
}

// TypeScript declarations for gtag
declare global {
  interface Window {
    gtag?: (command: string, eventName: string, params?: Record<string, unknown>) => void;
  }
}
