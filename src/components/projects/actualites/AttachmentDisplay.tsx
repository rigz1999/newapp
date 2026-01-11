import { useState } from 'react';
import {
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface Attachment {
  filename: string;
  url: string;
  size: number;
  type: 'image' | 'video' | 'document';
}

interface AttachmentDisplayProps {
  attachments: Attachment[];
}

export function AttachmentDisplay({ attachments }: AttachmentDisplayProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const images = attachments.filter(a => a.type === 'image');
  const videos = attachments.filter(a => a.type === 'video');
  const documents = attachments.filter(a => a.type === 'document');

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const nextImage = () => {
    setCurrentImageIndex((currentImageIndex + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((currentImageIndex - 1 + images.length) % images.length);
  };

  const getDocumentIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return <FileText className="w-8 h-8 text-red-600" />;
      case 'doc':
      case 'docx':
        return <FileText className="w-8 h-8 text-blue-600" />;
      case 'xls':
      case 'xlsx':
        return <FileText className="w-8 h-8 text-green-600" />;
      case 'ppt':
      case 'pptx':
        return <FileText className="w-8 h-8 text-orange-600" />;
      default:
        return <FileText className="w-8 h-8 text-slate-600" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-3 mt-3">
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {images.map((attachment, index) => (
            <div
              key={index}
              className="relative group cursor-pointer aspect-video bg-slate-100 rounded-lg overflow-hidden"
              onClick={() => openLightbox(index)}
            >
              <img
                src={attachment.url}
                alt={attachment.filename}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
        </div>
      )}

      {videos.length > 0 && (
        <div className="space-y-2">
          {videos.map((attachment, index) => (
            <div key={index} className="relative rounded-lg overflow-hidden bg-black">
              <video
                src={attachment.url}
                controls
                className="w-full max-h-96"
                preload="metadata"
              >
                Votre navigateur ne supporte pas la lecture de vidéos.
              </video>
              <a
                href={attachment.url}
                download={attachment.filename}
                className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors"
                onClick={e => e.stopPropagation()}
              >
                <Download className="w-4 h-4" />
              </a>
            </div>
          ))}
        </div>
      )}

      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((attachment, index) => (
            <a
              key={index}
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors group"
            >
              {getDocumentIcon(attachment.filename)}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{attachment.filename}</p>
                <p className="text-sm text-slate-500">{formatFileSize(attachment.size)}</p>
              </div>
              <Download className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
            </a>
          ))}
        </div>
      )}

      {lightboxOpen && images.length > 0 && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <button
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
            onClick={closeLightbox}
          >
            <X className="w-6 h-6" />
          </button>

          {images.length > 1 && (
            <>
              <button
                className="absolute left-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                onClick={e => {
                  e.stopPropagation();
                  prevImage();
                }}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                className="absolute right-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                onClick={e => {
                  e.stopPropagation();
                  nextImage();
                }}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          <div className="max-w-5xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
            <img
              src={images[currentImageIndex].url}
              alt={images[currentImageIndex].filename}
              className="w-full h-full object-contain"
            />
            <div className="text-center mt-4">
              <p className="text-white text-sm">{images[currentImageIndex].filename}</p>
              {images.length > 1 && (
                <p className="text-white/70 text-xs mt-1">
                  {currentImageIndex + 1} / {images.length}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
