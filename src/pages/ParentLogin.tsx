
'use client';


import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

export default function ParentLogin() {
  const router = useRouter();
  const [isSignup, setIsSignup] = useState(false);
  const [parentName, setParentName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [studentRollNumber, setStudentRollNumber] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Example class options
  const classOptions = [
    'Nursery', 'LKG', 'UKG',
    'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5',
    'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);
    try {
      // Find parent by roll number in Firestore
      const parentQuery = query(
        collection(db, 'parents'),
        where('studentRollNumber', '==', studentRollNumber.trim().toUpperCase())
      );
      const parentSnap = await getDocs(parentQuery);
      if (parentSnap.empty) {
        setErrorMessage('No parent account found for this roll number. Please sign up first.');
        setLoading(false);
        return;
      }
      // Get parent email from Firestore
      const parentDoc = parentSnap.docs[0];
      const parentData = parentDoc.data();
      const email = parentData.parentEmail;
      // Try login with email and password
      await signInWithEmailAndPassword(auth, email, password);
      // Store parent data in sessionStorage for dashboard
      sessionStorage.setItem('parentLoggedIn', 'true');
      sessionStorage.setItem('parentData', JSON.stringify(parentData));
      setSuccessMessage('Login successful! Redirecting...');
      setTimeout(() => router.push('/parent-dashboard'), 1200);
    } catch (error: any) {
      setErrorMessage(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);
    try {
      if (!parentName || !parentEmail || !parentPhone || !studentRollNumber || !studentClass || password.length < 6) {
        setErrorMessage('Please fill all fields correctly. Password must be at least 6 characters.');
        setLoading(false);
        return;
      }
      // Check if parent already exists for this roll number
      const parentQuery = query(
        collection(db, 'parents'),
        where('studentRollNumber', '==', studentRollNumber.trim().toUpperCase())
      );
      const parentSnap = await getDocs(parentQuery);
      if (!parentSnap.empty) {
        setErrorMessage('Parent account already exists for this roll number. Please login.');
        setLoading(false);
        return;
      }
      // Create Firebase Auth account for parent
      await createUserWithEmailAndPassword(auth, parentEmail, password);
      // Add parent info to Firestore
      await addDoc(collection(db, 'parents'), {
        parentName: parentName.trim(),
        parentEmail: parentEmail.trim(),
        parentPhone: parentPhone.trim(),
        studentRollNumber: studentRollNumber.trim().toUpperCase(),
        studentClass: studentClass.trim(),
        password: password, // For reference only, do not use in production
        createdAt: new Date().toISOString()
      });
      setSuccessMessage('Account created successfully! Redirecting to login...');
      setTimeout(() => {
        setIsSignup(false);
        setParentName('');
        setParentEmail('');
        setParentPhone('');
        setStudentRollNumber('');
        setStudentClass('');
        setPassword('');
        setSuccessMessage('');
      }, 1800);
    } catch (error: any) {
      setErrorMessage(error.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-red-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{isSignup ? 'Parent Signup' : 'Parent Login'}</h1>
          <p className="text-gray-700 font-medium">
            {isSignup ? 'Create your account to access your child\'s dashboard' : 'Welcome! Login to view your child\'s progress'}
          </p>
        </div>

        {/* Error/Success Messages */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">{errorMessage}</div>
        )}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">{successMessage}</div>
        )}

        {/* Login Form */}
        {!isSignup && (
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Student Roll Number</label>
              <input
                type="text"
                value={studentRollNumber}
                onChange={e => setStudentRollNumber(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 border border-gray-400 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-600 font-medium"
                placeholder="Enter your child's roll number"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-400 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-600 font-medium"
                placeholder="Enter your password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 shadow-lg"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
            <button
              type="button"
              onClick={() => setIsSignup(true)}
              className="w-full mt-2 text-purple-700 font-semibold hover:underline"
            >
              Don't have an account? Sign up
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-full mt-2 text-gray-600 font-medium hover:underline"
            >
              Back to Home
            </button>
          </form>
        )}

        {/* Signup Form */}
        {isSignup && (
          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Parent Name</label>
              <input
                type="text"
                value={parentName}
                onChange={e => setParentName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-400 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder-gray-600 font-medium"
                placeholder="Enter your name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Parent Email</label>
              <input
                type="email"
                value={parentEmail}
                onChange={e => setParentEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-400 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder-gray-600 font-medium"
                placeholder="Enter your email"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Parent Phone</label>
              <input
                type="tel"
                value={parentPhone}
                onChange={e => setParentPhone(e.target.value)}
                className="w-full px-4 py-3 border border-gray-400 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder-gray-600 font-medium"
                placeholder="Enter your phone number"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Student Roll Number</label>
              <input
                type="text"
                value={studentRollNumber}
                onChange={e => setStudentRollNumber(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 border border-gray-400 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder-gray-600 font-medium"
                placeholder="Enter your child's roll number"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Student Class</label>
              <select
                value={studentClass}
                onChange={e => setStudentClass(e.target.value)}
                className="w-full px-4 py-3 border border-gray-400 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-white text-gray-900 font-medium"
                required
              >
                <option value="">Select class</option>
                {classOptions.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Create Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-400 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 placeholder-gray-600 font-medium"
                placeholder="Create a password (min 6 chars)"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-pink-700 hover:to-purple-700 transition-all duration-200 shadow-lg"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
            <button
              type="button"
              onClick={() => setIsSignup(false)}
              className="w-full mt-2 text-purple-700 font-semibold hover:underline"
            >
              Already have an account? Login
            </button>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="w-full mt-2 text-gray-600 font-medium hover:underline"
            >
              Back to Home
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
