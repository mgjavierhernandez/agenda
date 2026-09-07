import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import type { ImportStudentsResult } from '@/api/types';

export interface ImportStudentsInput {
  file: File;
  courseId?: string;
  academicPeriodId?: string;
}

export function useImportStudents() {
  const queryClient = useQueryClient();

  return useMutation<ImportStudentsResult, Error, ImportStudentsInput>({
    mutationFn: ({ file, courseId, academicPeriodId }) => {
      const formData = new FormData();
      formData.append('file', file);
      if (courseId) formData.append('courseId', courseId);
      if (academicPeriodId) formData.append('academicPeriodId', academicPeriodId);
      return apiClient.post<ImportStudentsResult>('/students/import', formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
}
