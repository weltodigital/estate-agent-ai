import { SignupForm } from "@/components/auth/signup-form";

export const metadata = {
  title: "Sign up",
};

export default function SignupPage() {
  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Create your agency</h1>
        <p className="text-sm text-slate-500">Start your 7-day free trial. No card required.</p>
      </header>
      <SignupForm />
      <p className="text-sm text-slate-500">
        Already have an account?{" "}
        <a href="/login" className="text-[color:var(--brand-primary)] underline">
          Log in
        </a>
        .
      </p>
    </section>
  );
}
