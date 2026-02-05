import { Link } from "react-router-dom";

export function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-xl bg-white border border-slate-200 p-6">
        <h1 className="text-xl font-semibold text-slate-900">Sign up</h1>
        <p className="mt-1 text-sm text-slate-600">
          Auth wiring is stubbed for Milestone 0. We’ll connect Supabase next.
        </p>

        <div className="mt-6 text-sm text-slate-700">
          Already have an account?{" "}
          <Link className="text-slate-900 underline" to="/login">
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
