import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] items-center justify-center bg-zinc-50 dark:bg-black font-sans">
      <main className="max-w-4xl px-6 py-20 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-white sm:text-6xl mb-6">
          Empowering Communities through <span className="text-blue-600">Transparent</span> Reporting
        </h1>
        <p className="text-xl text-zinc-600 dark:text-zinc-400 mb-10 max-w-2xl mx-auto leading-relaxed">
          CivicConnect bridges the gap between citizens and local authorities. Report issues, track resolutions in real-time, and hold your local ward accountable.
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-12">
          <Link href="/report" className="flex flex-col items-center p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-full flex items-center justify-center mb-4 text-2xl font-bold text-center leading-[3rem]">1</div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2 text-center">Report Issue</h3>
            <p className="text-sm text-zinc-500 text-center">Pinpoint issues in your neighborhood with photo and location.</p>
          </Link>

          <Link href="/dashboard" className="flex flex-col items-center p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mb-4 text-2xl font-bold text-center leading-[3rem]">2</div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2 text-center">Track Progress</h3>
            <p className="text-sm text-zinc-500 text-center">Monitor the status of your reports and see real-time updates.</p>
          </Link>

          <Link href="/admin" className="flex flex-col items-center p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-full flex items-center justify-center mb-4 text-2xl font-bold text-center leading-[3rem]">3</div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2 text-center">Admin Portal</h3>
            <p className="text-sm text-zinc-500 text-center">Municipal tool for managing and resolving reported issues.</p>
          </Link>
        </div>
      </main>
    </div>
  );
}
