import { useState, useEffect, useRef } from 'react';
import { getProxiedFileUrl, revokeProxiedUrl } from '../../utils/fileProxy';

interface ProxiedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  fallbackClassName?: string;
}

/**
 * Image component that loads files via blob URLs to hide Supabase Storage URLs.
 * Drop-in replacement for <img> with automatic proxy loading.
 */
export function ProxiedImage({
  src,
  alt,
  className,
  fallbackClassName,
  onError,
  onClick,
  ...props
}: ProxiedImageProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const srcRef = useRef(src);

  useEffect(() => {
    srcRef.current = src;
    setLoading(true);
    setError(false);
    setBlobUrl(null);

    let cancelled = false;

    getProxiedFileUrl(src).then(url => {
      if (!cancelled) {
        setBlobUrl(url);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setError(true);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [src]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      revokeProxiedUrl(srcRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div
        className={fallbackClassName || className || 'animate-pulse bg-slate-200 rounded'}
        style={{ minHeight: '48px', minWidth: '48px' }}
      />
    );
  }

  if (error || !blobUrl) {
    return null;
  }

  return (
    <img
      src={blobUrl}
      alt={alt}
      className={className}
      onClick={onClick}
      onError={(e) => {
        setError(true);
        onError?.(e);
      }}
      {...props}
    />
  );
}
