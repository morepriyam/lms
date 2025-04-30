'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { User } from '@/types/auth';

interface NavbarProps {
  showLogout?: boolean;
  user?: User | null;
}

export default function Navbar({ showLogout = true, user }: NavbarProps) {
  const router = useRouter();

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  const isInstructor = user?.role === 'INSTRUCTOR';

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="text-xl font-semibold">
              Learning Management System
            </Link>
            
            {isInstructor && (
              <Link 
                href="/add-course" 
                className="px-4 py-2 text-sm font-medium rounded-md text-white bg-gray-800 hover:bg-black"
              >
                Add Course
              </Link>
            )}
          </div>
          
          {showLogout && (
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="ml-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-black hover:bg-gray-800"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
} 