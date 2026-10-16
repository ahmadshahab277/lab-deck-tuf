export function SetupNeeded() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-5">
      <h1 className="font-serif text-4xl">Supabase is not configured</h1>
      <p className="mt-3 text-muted">
        Copy <code className="rounded bg-white px-1">.env.example</code> to <code className="rounded bg-white px-1">.env</code>, add
        your project URL and anon key, then restart the app. Do not put the service-role key in the frontend.
      </p>
    </div>
  )
}
