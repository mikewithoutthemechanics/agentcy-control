import Link from 'next/link';
import { Rocket } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center max-w-md px-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 mb-4">
          <Rocket className="w-6 h-6 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Page not found</h2>
        <p className="text-sm text-slate-500 mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}
