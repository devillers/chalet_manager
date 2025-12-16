"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { motion } from "framer-motion";

function IconMail(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path d="M4 6.5h16v11H4v-11Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path
        d="M4.5 7l7.1 6a1 1 0 0 0 1.3 0l7.1-6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconLock(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M7.5 10.5V8.8A4.5 4.5 0 0 1 12 4.5a4.5 4.5 0 0 1 4.5 4.3v1.7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M7 10.5h10a2 2 0 0 1 2 2v5.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V12.5a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M12 14.2v2.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconEye(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconEyeOff(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path
        d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6 0 9.5 7 9.5 7a18 18 0 0 1-3.2 4.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M6.1 6.1C3.9 7.9 2.5 12 2.5 12s3.5 7 9.5 7c1.3 0 2.5-.3 3.6-.7"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M9.2 9.2A3.2 3.2 0 0 0 12 15.2c.7 0 1.4-.2 1.9-.6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M3.5 3.5 20.5 20.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function LoginClient({ from }: { from?: string }) {
  const router = useRouter();
  const safeFrom = typeof from === "string" ? from : "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.error) throw new Error("Identifiants invalides");

      router.push(safeFrom ? `/redirect?from=${encodeURIComponent(safeFrom)}` : "/redirect");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erreur lors de la connexion";
      setError(message);
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950">
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <motion.div
          className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl"
          initial={{ y: -12, scale: 0.98 }}
          animate={{ y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
        <motion.div
          className="absolute -bottom-40 right-[-120px] h-[520px] w-[520px] rounded-full bg-white/5 blur-3xl"
          initial={{ y: 12, scale: 0.98 }}
          animate={{ y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut", delay: 0.05 }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.10),transparent_60%)]" />
      </motion.div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4 py-10">
        <motion.div
          className="grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl shadow-black/40 backdrop-blur-xl md:grid-cols-2"
          initial={{ opacity: 0, y: 14, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <section className="relative hidden md:block">
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),rgba(255,255,255,0.02))]" />
            <div className="relative flex h-full flex-col justify-between p-8">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/70">
                  Chalet Manager
                </p>

                <motion.h1
                  className="mt-3 text-2xl font-semibold tracking-tight text-white"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: "easeOut", delay: 0.08 }}
                >
                  Connexion sécurisée
                </motion.h1>

                <motion.p
                  className="mt-2 text-sm leading-relaxed text-white/70"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: "easeOut", delay: 0.12 }}
                >
                  Accédez à votre espace <span className="font-medium text-white">admin</span>,{" "}
                  <span className="font-medium text-white">propriétaire</span> ou{" "}
                  <span className="font-medium text-white">locataire</span>.
                </motion.p>

                <motion.div
                  className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: "easeOut", delay: 0.16 }}
                >
                  <p className="text-xs font-medium text-white">Conseils</p>
                  <ul className="mt-2 space-y-2 text-xs text-white/70">
                    <li>Utilisez votre email de référence.</li>
                    <li>Vérifiez les majuscules/minuscules du mot de passe.</li>
                    <li>En cas d’erreur, réessayez après quelques secondes.</li>
                  </ul>
                </motion.div>
              </div>

              <p className="text-[11px] leading-relaxed text-white/55">
                Admin:{" "}
                <span className="font-medium text-white/75">ADMIN_EMAIL / ADMIN_PASSWORD</span>. Propriétaires (MVP): email présent dans Sanity +{" "}
                <span className="font-medium text-white/75">OWNER_PASSWORD</span>. Locataire:{" "}
                <span className="font-medium text-white/75">TENANT_EMAIL / TENANT_PASSWORD</span>.
              </p>
            </div>
          </section>

          <section className="p-6 md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-tight text-white">Connexion</h2>
                <p className="mt-1 text-xs text-white/60 md:hidden">
                  Accédez à votre espace admin, propriétaire ou locataire.
                </p>
              </div>

              <motion.div
                className="hidden rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white/70 md:block"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: "easeOut", delay: 0.12 }}
              >
                Session privée
              </motion.div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-white/70">Email</label>
                <div className="relative">
                  <IconMail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-11 py-3 text-sm text-white placeholder:text-white/40 outline-none ring-0 focus:border-white/20 focus:bg-white/10"
                    placeholder="vous@exemple.com"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-white/70">Mot de passe</label>
                <div className="relative">
                  <IconLock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-11 py-3 pr-12 text-sm text-white placeholder:text-white/40 outline-none ring-0 focus:border-white/20 focus:bg-white/10"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl px-2 py-2 text-white/60 hover:bg-white/10 hover:text-white"
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? <IconEyeOff className="h-4 w-4" /> : <IconEye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error ? (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3 text-sm text-rose-100">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? "Connexion…" : "Se connecter"}
              </button>

              <p className="text-center text-xs text-white/50">
                Aucun commentaire/public: accès réservé aux comptes autorisés.
              </p>
            </form>
          </section>
        </motion.div>
      </div>
    </main>
  );
}

