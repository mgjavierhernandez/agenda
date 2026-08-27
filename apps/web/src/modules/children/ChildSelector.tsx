import { useChildContext } from './ChildContext';

export function ChildSelector() {
  const { children, selectedChildId, setSelectedChildId, isLoading } = useChildContext();

  if (isLoading || children.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="child-selector" className="text-sm font-medium text-gray-700">
        Hijo:
      </label>
      <select
        id="child-selector"
        value={selectedChildId ?? ''}
        onChange={(e) => setSelectedChildId(e.target.value || null)}
        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        <option value="">Todos mis hijos</option>
        {children.map((child) => (
          <option key={child.studentId} value={child.studentId}>
            {child.firstName} {child.lastName}
          </option>
        ))}
      </select>
    </div>
  );
}
