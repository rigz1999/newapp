// Test page for Toast notification system
import { useToast, ToastContainer } from '../components/common/Toast';

export default function TestToast() {
  const { toasts, toast, removeToast } = useToast();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Toast Notification Test</h1>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
          <h2 className="text-xl font-semibold mb-4">Test All Toast Types</h2>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => toast.success('Success!', 'This is a success message')}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Show Success Toast
            </button>

            <button
              onClick={() => toast.error('Error!', 'This is an error message')}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Show Error Toast
            </button>

            <button
              onClick={() => toast.warning('Warning!', 'This is a warning message')}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
            >
              Show Warning Toast
            </button>

            <button
              onClick={() => toast.info('Info!', 'This is an info message')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Show Info Toast
            </button>

            <button
              onClick={() => toast.success('Short duration', 'This will disappear in 2 seconds', 2000)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Show Short Duration (2s)
            </button>

            <button
              onClick={() => toast.info('Long duration', 'This will stay for 8 seconds', 8000)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Show Long Duration (8s)
            </button>

            <button
              onClick={() => {
                toast.success('Multiple Toast 1');
                setTimeout(() => toast.info('Multiple Toast 2'), 200);
                setTimeout(() => toast.warning('Multiple Toast 3'), 400);
              }}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
            >
              Show Multiple Toasts
            </button>

            <button
              onClick={() => toast.success('No message', undefined)}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Toast Without Message
            </button>
          </div>

          <div className="mt-8 p-4 bg-gray-100 rounded">
            <h3 className="font-semibold mb-2">Active Toasts Count: {toasts.length}</h3>
            <p className="text-sm text-gray-600">
              Click the buttons above to test different toast variations
            </p>
          </div>
        </div>
      </div>

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
