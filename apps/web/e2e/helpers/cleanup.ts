import { apiRequest } from './api';

const cleanupQueue: Array<{ resource: string; id: string }> = [];

export function trackForCleanup(resource: string, id: string) {
  cleanupQueue.push({ resource, id });
}

export async function cleanupAll() {
  const errors: string[] = [];
  for (const item of cleanupQueue.reverse()) {
    try {
      await apiRequest('PATCH', `/${item.resource}/${item.id}`, { status: 'INACTIVE' });
    } catch (e) {
      errors.push(`${item.resource}/${item.id}: ${e}`);
    }
  }
  cleanupQueue.length = 0;
  return errors;
}

export function resetCleanup() {
  cleanupQueue.length = 0;
}
