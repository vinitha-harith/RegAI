'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, MessageSquare, UploadCloud, Tags, Home, Bell } from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'AI Regulatory Review', href: '/review', icon: LayoutDashboard },
  { name: 'AI Chat Assistant', href: '/chat', icon: MessageSquare },
  { name: 'Upload Documents', href: '/upload', icon: UploadCloud },
  { name: 'Manage Metadata', href: '/manage', icon: Tags },
  { name: 'Notification Center', href: '/notifications', icon: Bell },

];

export const Sidebar = () => {
  const pathname = usePathname();

  return (
    <div className="flex flex-col w-64 bg-white border-r">
      <div className="p-4 border-b">
        <h1 className="text-2xl font-bold text-gray-800">RegAI</h1>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
              pathname.startsWith(item.href)
                ? 'bg-red-200 text-gray-900'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <item.icon className="mr-3 h-6 w-6" aria-hidden="true" />
            {item.name}
          </Link>
        ))}
      </nav>
    </div>
  );
};
