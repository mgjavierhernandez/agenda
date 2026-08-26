import { useRef, useState } from 'react';
import { useUploadFile } from '../hooks/useUploadFile';
import type { FileAsset } from '@/api/types';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

const ALLOWED_EXTENSIONS = '.pdf,.png,.jpg,.jpeg,.webp,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx';

const MAX_SIZE_MB = 10;

interface FileUploaderProps {
  onUploadComplete: (fileAsset: FileAsset) => void;
  disabled?: boolean;
}

export function FileUploader({ onUploadComplete, disabled = false }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadFile();
  const [error, setError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `El archivo excede el tamaño máximo de ${MAX_SIZE_MB} MB`;
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return `Tipo de archivo no permitido. Use: PDF, imágenes, Word, Excel, PowerPoint o texto`;
    }
    return null;
  };

  const handleFile = async (file: File) => {
    setError('');
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      const result = await uploadMutation.mutateAsync(file);
      onUploadComplete(result);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    } catch (err) {
      const message = (err as { message?: string })?.message || 'Error al subir el archivo';
      setError(message);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          isDragOver
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS}
          onChange={handleInputChange}
          disabled={disabled || uploadMutation.isPending}
          className="hidden"
        />
        {uploadMutation.isPending ? (
          <p className="text-sm text-gray-500">Subiendo archivo...</p>
        ) : (
          <>
            <p className="text-sm text-gray-600">
              Arrastra un archivo aquí o{' '}
              <span className="text-blue-600 font-medium">selecciona</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              PDF, imágenes, Word, Excel, PowerPoint, texto (máx. {MAX_SIZE_MB} MB)
            </p>
          </>
        )}
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
