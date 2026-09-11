import { getErrorMessage, getRequestId } from '@/api/errors';
import { Button } from '@/components/ui/Button';

interface ErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  title?: string;
}

export function ErrorState({ error, onRetry, title = 'Something went wrong' }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center" role="alert">
      <div className="text-red-500 mb-4">
        <svg
          className="h-12 w-12"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>
      <h2 className="text-lg font-medium text-gray-900 mb-1">{title}</h2>
      <p className="text-sm text-gray-500 mb-4 max-w-md">{getErrorMessage(error)}</p>
      {(() => {
        const rid = getRequestId(error);
        return rid ? <p className="text-xs text-gray-500 mb-4">Request ID: {rid}</p> : null;
      })()}
      {onRetry && <Button onClick={onRetry}>Try Again</Button>}
    </div>
  );
}
