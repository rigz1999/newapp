import { useState } from 'react';
import { Upload, X, Image, Video, FileText } from 'lucide-react';

interface FileUploadProps {
  onFilesChange: (files: File[]) => void;
}

interface FileItem {
  file: File;
  preview?: string;
  type: 'image' | 'video' | 'document';
}

const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024, // 10MB
  video: 100 * 1024 * 1024, // 100MB
  document: 20 * 1024 * 1024, // 20MB
};

const ALLOWED_TYPES = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  video: ['video/mp4', 'video/quicktime', 'video/webm'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
};

export function FileUpload({ onFilesChange }: FileUploadProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = async (selectedFiles: FileList) => {
    const newFiles: FileItem[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];

      const isImage = ALLOWED_TYPES.image.includes(file.type);
      const isVideo = ALLOWED_TYPES.video.includes(file.type);
      const isDocument = ALLOWED_TYPES.document.includes(file.type);

      if (!isImage && !isVideo && !isDocument) {
        alert(`${file.name} n'est pas un format supporté`);
        continue;
      }

      const fileType = isImage ? 'image' : isVideo ? 'video' : 'document';
      const maxSize = FILE_SIZE_LIMITS[fileType];

      if (file.size > maxSize) {
        alert(`${file.name} dépasse la limite de ${maxSize / 1024 / 1024}MB`);
        continue;
      }

      let preview: string | undefined;
      if (isImage) {
        preview = URL.createObjectURL(file);
      }

      newFiles.push({
        file,
        preview,
        type: fileType,
      });
    }

    const updatedFiles = [...files, ...newFiles];
    setFiles(updatedFiles);
    onFilesChange(updatedFiles.map(f => f.file));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (index: number) => {
    const fileToRemove = files[index];
    if (fileToRemove.preview) {
      URL.revokeObjectURL(fileToRemove.preview);
    }

    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles.map(f => f.file));
  };

  const getFileIcon = (fileItem: FileItem) => {
    switch (fileItem.type) {
      case 'image':
        return <Image className="w-6 h-6 text-green-600" />;
      case 'video':
        return <Video className="w-6 h-6 text-purple-600" />;
      case 'document':
        return <FileText className="w-6 h-6 text-red-600" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-300 hover:border-slate-400 bg-slate-50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
        <p className="text-sm text-slate-600 mb-2">
          Glissez-déposez vos fichiers ici ou cliquez pour sélectionner
        </p>
        <p className="text-xs text-slate-500 mb-3">
          Images (10MB), Vidéos (100MB), Documents (20MB)
        </p>
        <input
          type="file"
          multiple
          onChange={handleChange}
          accept={[...ALLOWED_TYPES.image, ...ALLOWED_TYPES.video, ...ALLOWED_TYPES.document].join(
            ','
          )}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className="inline-block px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 cursor-pointer text-sm font-medium"
        >
          Choisir des fichiers
        </label>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((fileItem, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg"
            >
              {fileItem.preview ? (
                <img
                  src={fileItem.preview}
                  alt={fileItem.file.name}
                  className="w-12 h-12 object-cover rounded"
                />
              ) : (
                <div className="w-12 h-12 flex items-center justify-center bg-slate-100 rounded">
                  {getFileIcon(fileItem)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{fileItem.file.name}</p>
                <p className="text-xs text-slate-500">{formatFileSize(fileItem.file.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
