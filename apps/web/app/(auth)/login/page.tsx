import { LoginForm } from "@/components/auth/login-form";

export const metadata = {
  title: "Log in",
};

export default function LoginPage() {
  return (
    <section className="border-brand-stone bg-brand-cream space-y-4 rounded-lg border p-6 shadow-sm">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">Log in</h1>
        <p className="text-brand-slate text-sm">Welcome back.</p>
      </header>
      <LoginForm />
      <p className="text-brand-slate text-sm">
        New here?{" "}
        <a href="/signup" className="text-[color:var(--brand-primary)] underline">
          Create an agency
        </a>
        .
      </p>
    </section>
  );
}
