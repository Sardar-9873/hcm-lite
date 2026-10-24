'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Agar user setup page ya login page par hai toh navbar ko minimal rakhein
  const isAuthPage = pathname === '/login' || pathname === '/setup';

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow">
                H
              </div>
              <span className="font-extrabold text-base tracking-tight text-gray-900">
                HCM <span className="text-indigo-600 font-medium">Lite</span>
              </span>
            </Link>

            {/* Role Badge */}
            {user?.role && (
              <span
                className={`ml-2 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${
                  user.role === 'Admin'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : user.role === 'HR'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {user.role}
              </span>
            )}
          </div>

          {/* Desktop Role-Based Navigation Links */}
          {!isAuthPage && user && (
            <div className="hidden md:flex items-center space-x-1 text-sm font-medium">
              {user.role === 'Admin' && (
                <>
                  <Link
                    href="/admin"
                    className={`px-3 py-2 rounded-lg transition ${
                      pathname === '/admin' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    Company KPIs
                  </Link>
                  <Link
                    href="/admin"
                    className="px-3 py-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition"
                  >
                    Audit Logs
                  </Link>
                  <Link
                    href="/admin"
                    className="px-3 py-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition"
                  >
                    Finalize Payroll
                  </Link>
                </>
              )}

              {user.role === 'HR' && (
                <>
                  <Link
                    href="/hr"
                    className={`px-3 py-2 rounded-lg transition ${
                      pathname === '/hr' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    Attendance Board
                  </Link>
                  <Link
                    href="/hr"
                    className="px-3 py-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition"
                  >
                    Onboard Employee
                  </Link>
                  <Link
                    href="/hr"
                    className="px-3 py-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition"
                  >
                    Payroll Run
                  </Link>
                </>
              )}

              {user.role === 'Employee' && (
                <>
                  <Link
                    href="/employee"
                    className={`px-3 py-2 rounded-lg transition ${
                      pathname === '/employee' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    My Attendance
                  </Link>
                  <Link
                    href="/employee"
                    className="px-3 py-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition"
                  >
                    Smart Leave
                  </Link>
                </>
              )}
            </div>
          )}

          {/* User Profile & Actions */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="hidden sm:inline-block text-xs font-medium text-gray-600">
                  {user.email}
                </span>
                <button
                  onClick={logout}
                  className="bg-gray-100 hover:bg-rose-50 hover:text-rose-600 text-gray-700 text-xs font-semibold px-3 py-2 rounded-lg transition border border-gray-200"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              !isAuthPage && (
                <div className="flex items-center gap-2">
                  <Link
                    href="/login"
                    className="text-xs font-semibold text-gray-700 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-50 transition"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/setup"
                    className="text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg transition shadow-sm"
                  >
                    Setup System
                  </Link>
                </div>
              )
            )}

            {/* Mobile Hamburger Button */}
            {!isAuthPage && user && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && user && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 pt-2 pb-4 space-y-1 text-sm font-medium">
          {user.role === 'Admin' && (
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Admin Dashboard
            </Link>
          )}
          {user.role === 'HR' && (
            <Link
              href="/hr"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              HR Portal
            </Link>
          )}
          {user.role === 'Employee' && (
            <Link
              href="/employee"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Employee Self-Service
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}