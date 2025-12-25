import { Upload, Trash2, AlertCircle, Loader } from 'lucide-react';

interface PaymentFileUploadProps {
  files: File[];
  isDragging: boolean;
  analyzing: boolean;
  error: string;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onAnalyze: () => void;
}

export function PaymentFileUpload({
  files,
  isDragging,
  analyzing,
  error,
  onFileSelect,
  onRemoveFile,
  onDragOver,
  onDragLeave,
  onDrop,
  onAnalyze,
}: PaymentFileUploadProps) {
  return (
    <div className="space-y-4">
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50 scale-105'
            : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'
        }`}
        role="button"
        aria-label="Zone de téléchargement de fichiers"
      >
        <Upload
          className={`w-12 h-12 mx-auto mb-4 transition-colors ${isDragging ? 'text-blue-500' : 'text-slate-400'}`}
          aria-hidden="true"
        />
        <input
          type="file"
          multiple
          onChange={onFileSelect}
          className="hidden"
          id="file-upload"
          disabled={analyzing}
          accept=".pdf,.png,.jpg,.jpeg,.webp"
          aria-label="Sélectionner des fichiers de justificatif"
        />
        <label
          htmlFor="file-upload"
          className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
        >
          {isDragging ? 'Déposez vos fichiers ici' : 'Choisir des fichiers'}
        </label>
        <p className="text-sm text-slate-500 mt-2">
          {isDragging ? 'Relâchez pour téléverser' : 'ou glissez-déposez vos fichiers'}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          PDF, PNG, JPG ou WEBP (max 10MB par fichier)
        </p>
      </div>

      {files.length > 0 && (
        <div>
          <h4 className="font-medium text-slate-900 mb-2">
            Fichiers sélectionnés ({files.length}):
          </h4>
          <ul className="space-y-2" role="list">
            {files.map((file, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Upload className="w-4 h-4 text-blue-600 flex-shrink-0" aria-hidden="true" />
                  <span className="text-sm text-slate-700 truncate" title={file.name}>
                    {file.name}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">
                    {(file.size / 1024).toFixed(0)} KB
                  </span>
                  <button
                    onClick={() => onRemoveFile(idx)}
                    disabled={analyzing}
                    className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Supprimer ce fichier"
                    aria-label={`Supprimer le fichier ${file.name}`}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2" role="alert" aria-live="assertive">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <button
        onClick={onAnalyze}
        disabled={files.length === 0 || analyzing}
        className="w-full bg-finixar-teal text-white py-3 rounded-lg font-medium hover:bg-finixar-teal-hover disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        aria-busy={analyzing}
        aria-label={analyzing ? "Analyse du justificatif en cours" : "Analyser le justificatif de paiement"}
      >
        {analyzing ? (
          <>
            <Loader className="w-5 h-5 animate-spin" aria-hidden="true" />
            Analyse en cours...
          </>
        ) : (
          'Analyser le justificatif'
        )}
      </button>
    </div>
  );
}
