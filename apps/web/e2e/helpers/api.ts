const API_URL = process.env.E2E_API_URL || 'http://localhost:3000/api/v1';
const E2E_EMAIL = process.env.E2E_EMAIL || 'admin@demo-school.dev';
const E2E_PASSWORD = process.env.E2E_PASSWORD || 'Demo1234!';

let cachedToken: string | null = null;
let cachedInstitutionId: string | null = null;

export async function getAuthToken(): Promise<string> {
  if (cachedToken) return cachedToken;

  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: E2E_EMAIL, password: E2E_PASSWORD }),
  });

  if (!res.ok) throw new Error(`E2E auth failed: ${res.status}`);
  const data = await res.json();
  cachedToken = data.accessToken as string;

  const instRes = await fetch(`${API_URL}/auth/institutions`, {
    headers: { Authorization: `Bearer ${cachedToken}` },
  });
  const instData = await instRes.json();
  if (instData.institutions?.length > 0) {
    cachedInstitutionId = instData.institutions[0].id;
  }

  return cachedToken as string;
}

export async function getInstitutionId(): Promise<string> {
  if (cachedInstitutionId) return cachedInstitutionId;
  await getAuthToken();
  return cachedInstitutionId || '';
}

export async function apiRequest<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const token = await getAuthToken();
  const instId = await getInstitutionId();

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Institution-Id': instId,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${method} ${path} failed (${res.status}): ${text}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function createE2EStudent(data: { firstName: string; lastName: string; documentNumber: string }) {
  return apiRequest('POST', '/students', data);
}

export async function createE2ECourse(data: { name: string; code: string }) {
  return apiRequest('POST', '/courses', data);
}

export async function createE2ESubject(data: { name: string; code: string }) {
  return apiRequest('POST', '/subjects', data);
}

export async function createE2ETask(data: { title: string; description: string; courseId: string; subjectId: string; dueDate?: string }) {
  return apiRequest('POST', '/tasks', data);
}

export async function publishE2ETask(taskId: string) {
  return apiRequest('PATCH', `/tasks/${taskId}/publish`);
}

export async function createE2ECommunication(data: { title: string; content: string; audience: string }) {
  return apiRequest('POST', '/communications', data);
}

export async function publishE2ECommunication(id: string) {
  return apiRequest('PATCH', `/communications/${id}/publish`);
}

export async function createE2ENotification(data: { title: string; message: string; type?: string }) {
  return apiRequest('POST', '/notifications', data);
}

export async function createE2ESignature(data: { title: string; description: string }) {
  return apiRequest('POST', '/signature-requests', {
    status: 'DRAFT',
    ...data,
  });
}

export async function publishE2ESignature(id: string) {
  return apiRequest('PATCH', `/signature-requests/${id}/publish`);
}

export async function cleanupE2EEntity(resource: string, id: string) {
  try {
    await apiRequest('PATCH', `/${resource}/${id}`, { status: 'INACTIVE' });
  } catch {
    // ignore cleanup errors
  }
}

export async function listE2ENotifications() {
  return apiRequest<{ data?: Array<{ id: string; title?: string; message?: string; type?: string; read?: boolean }> }>(
    'GET',
    '/notifications?page=1&limit=50',
  );
}
