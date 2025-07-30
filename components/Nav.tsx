import Link from 'next/link';

export default function Nav() {
  return (
    <nav className="bg-white shadow">
      <div className="container mx-auto flex items-center justify-between p-4">
        <Link href="/" className="font-bold text-xl">
          SnapDiff
        </Link>
        <Link href="/dashboard" className="text-blue-600">
          Dashboard
        </Link>
      </div>
    </nav>
  );
}
