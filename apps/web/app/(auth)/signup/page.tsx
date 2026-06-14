import { SignupForm } from "@/components/auth/signup-form";

export const metadata = {
  title: "Sign up",
};

export default function SignupPage() {
  return (
    <section className="border-brand-stone bg-brand-cream space-y-4 rounded-lg border p-6 shadow-sm">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Create your agency</h1>
        <p className="text-brand-slate text-sm">Start your 7-day free trial. No card required.</p>
      </header>
      <SignupForm />
      <p className="text-brand-slate text-sm">
        Already have an account?{" "}
        <a href="/login" className="text-[color:var(--brand-primary)] underline">
          Log in
        </a>
        .
      </p>
    </section>
  );
}
