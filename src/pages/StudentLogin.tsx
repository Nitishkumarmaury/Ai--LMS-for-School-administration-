'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

export default function StudentLogin() {
  const router = useRouter();
  const [isSignup, setIsSignup] = useState(false);
  
  // Login states
  const [loginName, setLoginName] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Signup states
  const [signupName, setSignupName] = useState('');
  const [signupRollNumber, setSignupRollNumber] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupClass, setSignupClass] = useState('');
  
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Classes with sections
  const classes = [
    'Class 10A', 'Class 10B', 'Class 10C',
    'Class 9A', 'Class 9B', 'Class 9C',
    'Class 8A', 'Class 8B', 'Class 8C',
    'Class 7A', 'Class 7B', 'Class 7C',
    'Class 6A', 'Class 6B', 'Class 6C',
    'Class 5A', 'Class 5B', 'Class 5C',
    'Class 4A', 'Class 4B', 'Class 4C',
    'Class 3A', 'Class 3B', 'Class 3C',
    'Class 2A', 'Class 2B', 'Class 2C',
    'Class 1A', 'Class 1B', 'Class 1C',
    'UKG A', 'UKG B',
    'LKG A', 'LKG B',
    'Nursery A', 'Nursery B'
  ];

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      // Find student by name in Firestore
      const studentsRef = collection(db, 'students');
      const q = query(studentsRef, where('name', '==', loginName));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setErrorMessage('Student not found. Please check your name or sign up.');
        setLoading(false);
        return;
      }

      // Get student email
      const studentDoc = querySnapshot.docs[0];
      const studentEmail = studentDoc.data().email;

      // Sign in with email and password
      await signInWithEmailAndPassword(auth, studentEmail, loginPassword);
      
      // Store student info in localStorage
      localStorage.setItem('studentInfo', JSON.stringify(studentDoc.data()));
      
      router.push('/student-dashboard');
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.code === 'auth/wrong-password') {
        setErrorMessage('Incorrect password. Please try again.');
      } else if (error.code === 'auth/user-not-found') {
        setErrorMessage('Student not found. Please sign up first.');
      } else {
        setErrorMessage('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle Signup
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    if (!signupName || !signupRollNumber || !signupEmail || !signupPassword || !signupClass) {
      setErrorMessage('Please fill in all fields.');
      setLoading(false);
      return;
    }

    try {
      // STEP 1: Check if this roll number exists and is available for this class
      const rollNumbersRef = collection(db, 'studentRollNumbers');
      const rollNumberQuery = query(
        rollNumbersRef,
        where('class', '==', signupClass),
        where('rollNumber', '==', signupRollNumber)
      );
      const rollNumberSnapshot = await getDocs(rollNumberQuery);

      if (rollNumberSnapshot.empty) {
        setErrorMessage(`Roll number ${signupRollNumber} is not assigned for ${signupClass}. Please contact your teacher.`);
        setLoading(false);
        return;
      }

      const rollNumberDoc = rollNumberSnapshot.docs[0];
      const rollNumberData = rollNumberDoc.data();

      // Check if this roll number is already registered
      if (rollNumberData.isRegistered) {
        setErrorMessage('This roll number is already registered by another student.');
        setLoading(false);
        return;
      }

      // STEP 2: Check if email already used by another student
      const studentsRef = collection(db, 'students');
      const emailQuery = query(studentsRef, where('email', '==', signupEmail));
      const emailSnapshot = await getDocs(emailQuery);

      if (!emailSnapshot.empty) {
        setErrorMessage('Email already in use. Please use a different email.');
        setLoading(false);
        return;
      }

      // STEP 3: Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(auth, signupEmail, signupPassword);
      
      // STEP 4: Save student data to Firestore
      const studentDocRef = await addDoc(collection(db, 'students'), {
        uid: userCredential.user.uid,
        name: signupName,
        rollNumber: signupRollNumber,
        email: signupEmail,
        class: signupClass,
        createdAt: new Date().toISOString(),
      });

      // STEP 5: Mark the roll number as registered
      const { doc, updateDoc } = await import('firebase/firestore');
      await updateDoc(doc(db, 'studentRollNumbers', rollNumberDoc.id), {
        isRegistered: true,
        registeredStudentId: studentDocRef.id,
      });

      setSuccessMessage('Account created successfully! Please login.');
      setSignupName('');
      setSignupRollNumber('');
      setSignupEmail('');
      setSignupPassword('');
      setSignupClass('');
      
      setTimeout(() => {
        setIsSignup(false);
        setSuccessMessage('');
      }, 2000);
    } catch (error: any) {
      console.error('Signup error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setErrorMessage('Email already in use. Please use a different email or login.');
      } else if (error.code === 'auth/weak-password') {
        setErrorMessage('Password should be at least 6 characters.');
      } else {
        setErrorMessage(`Signup failed: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Back Button */}
        <button
          onClick={() => router.push('/main')}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-800 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Main
        </button>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isSignup ? 'Student Signup' : 'Student Login'}
            </h1>
            <p className="text-gray-800 font-medium">
              {isSignup ? 'Create your account' : 'Welcome back!'}
            </p>
          </div>

          {/* Error/Success Messages */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
              {successMessage}
            </div>
          )}

          {/* Login Form */}
          {!isSignup && (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-600 font-medium"
                  placeholder="Enter your name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-600 font-medium"
                  placeholder="Enter your password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
          )}

          {/* Signup Form */}
          {isSignup && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-600 font-medium"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Roll Number
                </label>
                <input
                  type="text"
                  value={signupRollNumber}
                  onChange={(e) => setSignupRollNumber(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-600 font-medium"
                  placeholder="Enter roll number assigned by teacher"
                  required
                />
                <p className="mt-1 text-xs text-gray-700 font-medium">
                  ⓘ Use the roll number assigned to you by your teacher for your class
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class with Section
                </label>
                <select
                  value={signupClass}
                  onChange={(e) => setSignupClass(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  required
                >
                  <option value="">Select your class and section</option>
                  {classes.map((cls) => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  ⓘ Select the class and section you belong to (e.g., Class 10A)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Create a password (min 6 characters)"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50"
              >
                {loading ? 'Creating account...' : 'Sign Up'}
              </button>
            </form>
          )}

          {/* Toggle Button */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignup(!isSignup);
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              {isSignup ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
