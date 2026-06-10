'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // 检查登录状态并跳转
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      if (userData.role === 'teacher') {
        router.push('/teacher');
      } else {
        router.push('/student');
      }
    } else {
      router.push('/login');
    }
  }, [router]);

  // 加载页面
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700">
      <div className="text-center text-white">
        <div className="animate-spin w-12 h-12 border-4 border-white border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-xl">正在跳转...</p>
      </div>
    </div>
  );
}
