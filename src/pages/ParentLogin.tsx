'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

export default function ParentLogin() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-red-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Parent Login</h1>
          <p className="text-gray-700 font-medium">Coming Soon</p>
        </div>
        
        <div className="text-center">
          <p className="text-gray-600 mb-6">
            Parent login functionality will be available soon. Please check back later.
          </p>
          
          <button
            onClick={() => router.push('/')}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg"
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}
