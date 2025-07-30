export default function Home() {
  return (
    <section className="text-center">
      <h1 className="text-5xl font-bold mb-4">SnapDiff</h1>
      <p className="text-xl mb-8">
        Know exactly when your competitors change their website.
      </p>
      <a
        href="/dashboard"
        className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow"
      >
        Start Free Trial
      </a>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {['Visual Diff', 'Email Alerts', 'Simple Pricing'].map((f) => (
          <div key={f} className="p-6 bg-white rounded shadow">
            <h3 className="text-lg font-semibold mb-2">{f}</h3>
            <p>Short description of {f.toLowerCase()}.</p>
          </div>
        ))}
      </div>
    </section>
  );
}
