'use client'

import {useState, type FormEvent} from 'react'
import {useRouter} from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email, password}),
      })

      if (!res.ok) {
        throw new Error('Identifiants invalides')
      }

      const data: {ownerSlug?: string} = await res.json()
      const ownerSlug = data.ownerSlug || 'mon-chalet-exemple'
      router.push(`/dashboard/${ownerSlug}`)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la connexion'
      setError(message)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-sm rounded-3xl bg-white px-6 py-7 shadow-xl shadow-slate-900/15">
      <h1 className="text-lg font-semibold tracking-tight text-slate-900">
        Connexion propriétaire
      </h1>
      <p className="mt-1 text-xs text-slate-600">
        Accédez à votre dashboard pour mettre à jour le contenu de votre
        landing page.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-5 flex flex-col gap-4 text-sm"
      >
        <div className="flex flex-col gap-1">
          <label
            htmlFor="email"
            className="text-xs font-medium text-slate-700"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none ring-0 focus:border-slate-900"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="password"
            className="text-xs font-medium text-slate-700"
          >
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 outline-none ring-0 focus:border-slate-900"
          />
        </div>

        {error && (
          <p className="text-xs text-red-600" aria-live="polite">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-1 inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:bg-slate-500"
        >
          {isSubmitting ? 'Connexion…' : 'Se connecter'}
        </button>
      </form>
    </div>
  )
}
