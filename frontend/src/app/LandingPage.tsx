import { Link } from "react-router-dom";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center">
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="inline-flex items-center rounded-full bg-white border border-slate-200 px-3 py-1 text-xs text-slate-600">
          Resume-grade MVP
        </div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-900">InsightfulOps</h1>
        <p className="mt-3 text-slate-700 leading-relaxed">
          An AI-powered operations assistant that answers questions from your internal docs,
          surfaces insights, and keeps scheduling visible—without leaking data across tenants.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Link
            to="/login"
            className="inline-flex items-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Log in
          </Link>
          <Link
            to="/signup"
            className="inline-flex items-center rounded-md bg-white border border-slate-200 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
