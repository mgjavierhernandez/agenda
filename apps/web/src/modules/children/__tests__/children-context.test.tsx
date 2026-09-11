import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { ChildProvider, useChildContext } from '../ChildContext';
import { ChildSelector } from '../ChildSelector';
import { apiClient } from '@/api/client';

vi.mock('@/api/client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const mockUser = { id: 'user-1', email: 'parent@test.com', status: 'ACTIVE' as const };

vi.mock('@/auth/auth.store', () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    selectedInstitutionId: 'inst-1',
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

function TestConsumer() {
  const ctx = useChildContext();
  return (
    <div>
      <span data-testid="is-parent">{String(ctx.isParent)}</span>
      <span data-testid="children-count">{ctx.children.length}</span>
      <span data-testid="selected">{ctx.selectedChildId ?? 'none'}</span>
      <span data-testid="loading">{String(ctx.isLoading)}</span>
      <button onClick={() => ctx.setSelectedChildId('stu-2')}>Select child 2</button>
      <button onClick={() => ctx.setSelectedChildId(null)}>Clear</button>
    </div>
  );
}

const mockGuardianStudentsResponse = {
  data: [
    {
      id: 'gs-1',
      studentId: 'stu-1',
      relationshipType: 'FATHER',
      student: { firstName: 'Juan', lastName: 'Pérez' },
    },
    {
      id: 'gs-2',
      studentId: 'stu-2',
      relationshipType: 'MOTHER',
      student: { firstName: 'Ana', lastName: 'García' },
    },
  ],
  meta: { total: 2, page: 1, limit: 50, totalPages: 1 },
};

describe('ChildContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('provides empty children when no guardian links exist', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 50, totalPages: 0 } });

    render(
      <ChildProvider>
        <TestConsumer />
      </ChildProvider>,
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    expect(screen.getByTestId('is-parent').textContent).toBe('false');
    expect(screen.getByTestId('children-count').textContent).toBe('0');
    expect(screen.getByTestId('selected').textContent).toBe('none');
  });

  it('provides children list for parent user', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockGuardianStudentsResponse);

    render(
      <ChildProvider>
        <TestConsumer />
      </ChildProvider>,
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    expect(screen.getByTestId('is-parent').textContent).toBe('true');
    expect(screen.getByTestId('children-count').textContent).toBe('2');
  });

  it('auto-selects the first child by default', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockGuardianStudentsResponse);

    render(
      <ChildProvider>
        <TestConsumer />
      </ChildProvider>,
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(screen.getByTestId('selected').textContent).toBe('stu-1'));
  });

  it('restores a valid stored child and ignores an invalid one', async () => {
    sessionStorage.setItem('agenda_selected_child_id:inst-1', 'stu-2');
    vi.mocked(apiClient.get).mockResolvedValue(mockGuardianStudentsResponse);

    const { unmount } = render(
      <ChildProvider>
        <TestConsumer />
      </ChildProvider>,
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(screen.getByTestId('selected').textContent).toBe('stu-2'));
    unmount();

    sessionStorage.setItem('agenda_selected_child_id:inst-1', 'stranger-id');

    render(
      <ChildProvider>
        <TestConsumer />
      </ChildProvider>,
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(screen.getByTestId('selected').textContent).toBe('stu-1'));
  });

  it('allows selecting and clearing a child', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockGuardianStudentsResponse);

    render(
      <ChildProvider>
        <TestConsumer />
      </ChildProvider>,
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    await userEvent.click(screen.getByText('Select child 2'));
    expect(screen.getByTestId('selected').textContent).toBe('stu-2');

    await userEvent.click(screen.getByText('Clear'));
    expect(screen.getByTestId('selected').textContent).toBe('none');
  });

  it('rejects a foreign child id', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockGuardianStudentsResponse);

    function ForeignConsumer() {
      const ctx = useChildContext();
      return <button onClick={() => ctx.setSelectedChildId('not-my-child')}>Foreign</button>;
    }

    render(
      <ChildProvider>
        <TestConsumer />
        <ForeignConsumer />
      </ChildProvider>,
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(screen.getByTestId('selected').textContent).toBe('stu-1'));
    await userEvent.click(screen.getByText('Foreign'));
    expect(screen.getByTestId('selected').textContent).toBe('none');
  });
});

describe('ChildSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('renders nothing when loading', () => {
    vi.mocked(apiClient.get).mockReturnValue(new Promise(() => {}));

    const { container } = render(
      <ChildProvider>
        <ChildSelector />
      </ChildProvider>,
      { wrapper: createWrapper() },
    );

    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when no children exist', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 50, totalPages: 0 } });

    const { container } = render(
      <ChildProvider>
        <ChildSelector />
      </ChildProvider>,
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(screen.queryByRole('combobox')).toBeNull());
    expect(container.querySelector('select')).toBeNull();
  });

  it('renders child selector dropdown for parent with children', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockGuardianStudentsResponse);

    render(
      <ChildProvider>
        <ChildSelector />
      </ChildProvider>,
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(screen.getByLabelText('Hijo:')).toBeDefined());

    const select = screen.getByLabelText('Hijo:');
    expect(select).toBeDefined();
    expect(screen.getByText('Todos mis hijos')).toBeDefined();
    expect(screen.getByText('Juan Pérez')).toBeDefined();
    expect(screen.getByText('Ana García')).toBeDefined();
  });

  it('selects a child via dropdown', async () => {
    vi.mocked(apiClient.get).mockResolvedValue(mockGuardianStudentsResponse);

    render(
      <ChildProvider>
        <ChildSelector />
        <TestConsumer />
      </ChildProvider>,
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(screen.getByLabelText('Hijo:')).toBeDefined());

    const select = screen.getByLabelText('Hijo:');
    await userEvent.selectOptions(select, 'stu-1');

    expect(screen.getByTestId('selected').textContent).toBe('stu-1');
  });
});
