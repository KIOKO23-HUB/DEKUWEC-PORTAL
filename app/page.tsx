import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import Image from "next/image";

export default async function Home() {
  const { userId } = await auth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-8 lg:p-16 bg-white text-gray-900">
      <header className="w-full flex justify-between items-center max-w-5xl border-b pb-4">
        <div className="flex items-center space-x-2">
          <span className="text-lg font-bold text-emerald-900">DEKUWEC Portal</span>
        </div>
        <div>
          {userId ? (
            <Link 
              href="/dashboard" 
              className="px-4 py-2 bg-emerald-800 text-white text-sm font-semibold rounded-lg hover:bg-emerald-900 transition shadow"
            >
              Dashboard
            </Link>
          ) : (
            <div className="flex space-x-3">
              <Link 
                href="/login" 
                className="px-4 py-2 text-emerald-900 text-sm font-semibold hover:text-emerald-700 transition"
              >
                Sign In
              </Link>
              <Link 
                href="/signup" 
                className="px-4 py-2 bg-emerald-800 text-white text-sm font-semibold rounded-lg hover:bg-emerald-900 transition shadow"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-col items-center text-center my-auto max-w-2xl">
        <div className="w-24 h-24 relative mb-6 rounded-full border-2 border-emerald-800 overflow-hidden shadow-md flex items-center justify-center bg-white">
          <Image 
            src="https://i.postimg.cc/qB9gLwmz/Whats-App-Image-2026-09-03-at-09-49-04.jpg" 
            alt="DEKUWEC Logo" 
            fill
            sizes="96px"
            className="object-cover"
          />
        </div>
        <h1 className="text-3xl lg:text-5xl font-black tracking-tight mb-4 text-emerald-950">
          Dedan Kimathi Wildlife & Environmental Club
        </h1>
        <p className="text-base lg:text-lg text-gray-600 mb-8 leading-relaxed">
          Empowering conservation, nature exploration, and environmental action on campus. Sign in with your student email or continue with Google to access your dashboard.
        </p>
        {userId ? (
          <Link 
            href="/dashboard" 
            className="px-6 py-3 bg-emerald-800 text-white font-semibold rounded-lg shadow-md hover:bg-emerald-900 transition"
          >
            Access Dashboard
          </Link>
        ) : (
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 w-full justify-center">
            <Link 
              href="/signup" 
              className="px-6 py-3 bg-emerald-800 text-white font-semibold rounded-lg shadow-md hover:bg-emerald-900 transition text-center"
            >
              Get Started (Sign Up)
            </Link>
            <Link 
              href="/login" 
              className="px-6 py-3 bg-gray-100 text-emerald-950 font-semibold rounded-lg shadow-sm hover:bg-gray-200 transition text-center border border-gray-200"
            >
              Sign In
            </Link>
          </div>
        )}
      </div>

      <footer className="w-full text-center text-xs text-gray-400 border-t pt-4">
        Dedan Kimathi University of Technology &copy; 2026 DEKUWEC
      </footer>
    </main>
  );
}
