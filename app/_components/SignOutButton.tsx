import { signOut } from "@/auth";

export function SignOutButton({ className = "" }: { className?: string }) {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
    >
      <button
        type="submit"
        className={[
          "inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-black",
          className,
        ].join(" ")}
      >
        Déconnexion
      </button>
    </form>
  );
}

