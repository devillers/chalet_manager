import LoginClient from "./LoginClient";

export const revalidate = 0;

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ from?: string }>;
}) {
  const resolved = (await searchParams) ?? {};
  const from = typeof resolved.from === "string" ? resolved.from : "";
  return <LoginClient from={from} />;
}

