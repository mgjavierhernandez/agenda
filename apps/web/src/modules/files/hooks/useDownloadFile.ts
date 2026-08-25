import { useMutation } from '@tanstack/react-query';

function getAccessToken(): string | null {
  try {
    return sessionStorage.getItem('agenda_access_token');
  } catch {
    return null;
  }
}

export function useDownloadFile() {
  return useMutation<Blob, Error, { fileId: string; fileName: string }>({
    mutationFn: async ({ fileId }) => {
      const apiUrl = import.meta.env.VITE_API_URL || '/api/v1';
      const token = getAccessToken();

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${apiUrl}/files/${fileId}/download`, { headers });

      if (!response.ok) {
        throw new Error('Error al descargar el archivo');
      }

      return response.blob();
    },
    onSuccess: (blob, { fileName }) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
  });
}
