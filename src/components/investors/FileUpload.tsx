import { useState, useRef } from 'react';
import { Upload } from 'lucide-react';

interface FileUploadProps {
  accept: string;
  multiple?: boolean;
  disabled?: boolean;
  onFileSelect: (files: FileList | null) => void;
  label: string;
  description?: string;
  className?: string;
}

export function FileUpload({
  accept,
  multiple = false,
  disabled = false,
  onFileSelect,
  label,
  description,
  className = '',
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const acceptedFiles = Array.from(files).filter(file => {
        const acceptTypes = accept.split(',').map(t => t.trim());
        return acceptTypes.some(acceptType => {
          if (acceptType.startsWith('.')) {
            return file.name.toLowerCase().endsWith(acceptType.toLowerCase());
          }
          return file.type.match(acceptType.replace('*', '.*'));
        });
      });

      if (acceptedFiles.length > 0) {
        const dataTransfer = new DataTransfer();
        acceptedFiles.forEach(file => dataTransfer.items.add(file));
        onFileSelect(dataTransfer.files);
      }
    }
  };

  const handleClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFileSelect(e.target.files);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`
        border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer
        ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-400 hover:bg-slate-50'}
        ${className}
      `}
    >
      <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-blue-500' : 'text-slate-400'}`} />
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        className="hidden"
        disabled={disabled}
      />
      <div className={`inline-block px-6 py-2 rounded-lg transition-colors ${
        disabled
          ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
          : 'bg-slate-900 text-white hover:bg-slate-800'
      }`}>
        {label}
      </div>
      {description && (
        <p className="text-sm text-slate-600 mt-2">{description}</p>
      )}
      {isDragging && (
        <p className="text-sm text-blue-600 font-medium mt-2">
          Déposez les fichiers ici
        </p>
      )}
    </div>
  );
}
