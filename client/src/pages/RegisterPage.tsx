import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../api/auth";
import { useSeo } from "../hooks/useSeo";
import { getErrorMessage } from "../utils/httpError";
import { User, Mail, Lock, UserPlus, Eye,EyeOff } from "lucide-react";

export default function RegisterPage() {
  useSeo({
    title: 'Register',
    description: 'Create a SchoolDekho account as a parent or school admin to explore schools, post reviews, and manage school information.',
  });
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"parent" | "school-admin">("parent");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    setLoading(true);
    try {
      const response = await registerUser({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      });

      localStorage.setItem("accessToken", response.accessToken);
      localStorage.setItem("user", JSON.stringify(response.user));
      if (response.user.role === "school-admin") {
        navigate(
          response.user.schoolId
            ? `/admin/dashboard/${response.user.schoolId}`
            : "/admin/dashboard",
        );
      } else {
        navigate("/dashboard");
      }
    } catch (error) {
      setErrorMessage(
        getErrorMessage(error, "Unable to create account right now."),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 py-10 sm:py-14">
      <div className="rounded-2xl border border-slate-700/70 bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-6 sm:p-8 shadow-[0_16px_50px_rgba(2,6,23,0.35)]">
        <h1 className="text-2xl font-bold text-white text-center mb-2">
          Create account
        </h1>
        <p className="text-sm text-slate-300 text-center mb-6">
          For parents and admins
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Your full name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 border border-slate-600 rounded-lg bg-slate-900/70 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 border border-slate-600 rounded-lg bg-slate-900/70 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1.5">
              Role
            </label>
            <select
              value={role}
              onChange={(event) =>
                setRole(event.target.value as "parent" | "school-admin")
              }
              className="w-full px-4 py-2.5 border border-slate-600 rounded-lg bg-slate-900/70 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              aria-label="Select account role"
            >
              <option value="parent">Parent</option>
              <option value="school-admin">School Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 border border-slate-600 rounded-lg bg-slate-900/70 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200"
                aria-label="Toggle password visibility"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-sky-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-800"
          >
            <UserPlus className="w-4 h-4" />
            {loading ? "Creating Account..." : "Register"}
          </button>
        </form>

        {errorMessage ? (
          <p className="mt-4 text-sm text-rose-300">{errorMessage}</p>
        ) : null}

        <p className="mt-4 text-center text-sm text-slate-300">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-sky-300 font-semibold hover:text-sky-200"
          >
            Log In
          </Link>
        </p>
      </div>
    </div>
  );
}
