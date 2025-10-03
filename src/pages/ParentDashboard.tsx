'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

// Interfaces for type safety
interface QuizSubmission {
  id: string;
  quizTitle: string;
  score: number;
  totalMarks: number;
  submittedAt: any;
}

interface StudentMarks {
  id: string;
  subject: string;
  examType: string;
  marksObtained: number;
  totalMarks: number;
  status: string;
  submittedAt: any;
  verifiedBy?: string;
  verifiedAt?: any;
  remarks?: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
}

interface Assignment {
  id: string;
  title: string;
  subject: string;
  description: string;
  dueDate: any;
  assignmentFolderUrl: string;
  assignmentPdfUrl: string;
  maxMarks?: number;
}

export default function ParentDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [parentData, setParentData] = useState<any>(null);
  const [totalQuizScore, setTotalQuizScore] = useState(0);
  const [totalQuizMarks, setTotalQuizMarks] = useState(0);
  const [totalVerifiedMarks, setTotalVerifiedMarks] = useState(0);
  const [totalMaxMarks, setTotalMaxMarks] = useState(0);
  const [attendancePercentage, setAttendancePercentage] = useState(0);
  const [quizCount, setQuizCount] = useState(0);
  const [marksCount, setMarksCount] = useState(0);
  const [attendanceCount, setAttendanceCount] = useState(0);
  
  // New states for detailed lists
  const [activeTab, setActiveTab] = useState<'overview' | 'quizzes' | 'marks' | 'attendance' | 'assignments'>('overview');
  const [quizSubmissions, setQuizSubmissions] = useState<QuizSubmission[]>([]);
  const [studentMarks, setStudentMarks] = useState<StudentMarks[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  useEffect(() => {
    const checkAuth = () => {
      const parentLoggedIn = sessionStorage.getItem('parentLoggedIn');
      const parentDataStr = sessionStorage.getItem('parentData');
      if (!parentLoggedIn || !parentDataStr) {
        router.push('/parent-login');
        return;
      }
      const data = JSON.parse(parentDataStr);
      setParentData(data);
      loadAllData(data.studentRollNumber);
    };
    checkAuth();
  }, [router]);

  const loadAllData = async (rollNumber: string) => {
    setLoading(true);
    console.log('📝 Parent Dashboard - Loading data for roll number:', rollNumber);
    try {
      // ✅ FIXED: Changed from 'studentRollNumber' to 'rollNumber'
      const quizRef = collection(db, 'quizSubmissions');
      const quizQuery = query(quizRef, where('rollNumber', '==', rollNumber));
      console.log('🔍 Querying quizSubmissions with rollNumber...');
      const quizSnap = await getDocs(quizQuery);
      console.log('📊 Quiz submissions found:', quizSnap.size);
      let qScore = 0, qMarks = 0;
      const quizList: QuizSubmission[] = [];
      quizSnap.forEach(doc => {
        const data = doc.data();
        console.log('📄 Quiz doc:', data);
        qScore += Number(data.score) || 0;
        // Support both totalMarks and totalQuestions fields
        qMarks += Number(data.totalMarks || data.totalQuestions) || 0;
        quizList.push({
          id: doc.id,
          quizTitle: data.quizTitle || 'Untitled Quiz',
          score: Number(data.score) || 0,
          totalMarks: Number(data.totalMarks || data.totalQuestions) || 0,
          submittedAt: data.submittedAt,
        });
      });
      console.log('✅ Total Quiz - Score:', qScore, 'Marks:', qMarks);
      setTotalQuizScore(qScore);
      setTotalQuizMarks(qMarks);
      setQuizCount(quizSnap.size);
      setQuizSubmissions(quizList);

      const marksRef = collection(db, 'studentMarks');
      const marksQuery = query(marksRef, where('rollNumber', '==', rollNumber));
      console.log('🔍 Querying studentMarks with rollNumber...');
      const marksSnap = await getDocs(marksQuery);
      console.log('📊 Student marks found:', marksSnap.size);
      let vMarks = 0, maxMarks = 0, vCount = 0;
      const marksList: StudentMarks[] = [];
      marksSnap.forEach(doc => {
        const data = doc.data();
        console.log('📄 Marks doc:', data);
        // Support both verified field and status field
        const isVerified = data.verified === true || 
                          data.verified === 'true' || 
                          data.status === 'verified' || 
                          data.status === 'Verified';
        if (isVerified) {
          // Support both marks and marksObtained fields
          const obtained = Number(data.marks || data.marksObtained) || 0;
          vMarks += obtained;
          maxMarks += Number(data.totalMarks) || 0;
          vCount++;
          console.log('✅ Verified marks:', obtained, '/', data.totalMarks);
        }
        marksList.push({
          id: doc.id,
          subject: data.subject || 'Unknown',
          examType: data.examType || 'N/A',
          marksObtained: Number(data.marks || data.marksObtained) || 0,
          totalMarks: Number(data.totalMarks) || 0,
          status: data.status || (data.verified ? 'verified' : 'pending'),
          submittedAt: data.submittedAt,
          verifiedBy: data.verifiedBy,
          verifiedAt: data.verifiedAt,
          remarks: data.remarks,
        });
      });
      console.log('✅ Total Verified - Marks:', vMarks, 'Max:', maxMarks);
      setTotalVerifiedMarks(vMarks);
      setTotalMaxMarks(maxMarks);
      setMarksCount(vCount);
      setStudentMarks(marksList);

      const attRef = collection(db, 'attendance');
      const attQuery = query(attRef, where('rollNumber', '==', rollNumber));
      console.log('🔍 Querying attendance with rollNumber...');
      const attSnap = await getDocs(attQuery);
      console.log('📊 Attendance records found:', attSnap.size);
      let present = 0;
      const attList: AttendanceRecord[] = [];
      attSnap.forEach(doc => {
        const data = doc.data();
        console.log('📄 Attendance doc:', data);
        if (data.status?.toLowerCase() === 'present') present++;
        attList.push({
          id: doc.id,
          date: data.date || 'N/A',
          status: data.status || 'N/A',
        });
      });
      // Sort by date descending
      attList.sort((a, b) => b.date.localeCompare(a.date));
      const percent = attSnap.size > 0 ? Math.round((present / attSnap.size) * 100) : 0;
      console.log('✅ Attendance:', present, '/', attSnap.size, '=', percent, '%');
      setAttendancePercentage(percent);
      setAttendanceCount(attSnap.size);
      setAttendanceRecords(attList);

      // Load assignments for the student's class
      if (parentData?.studentClass) {
        const assignmentsRef = collection(db, 'assignments');
        const assignmentsQuery = query(assignmentsRef, where('class', '==', parentData.studentClass));
        console.log('🔍 Querying assignments for class:', parentData.studentClass);
        const assignmentsSnap = await getDocs(assignmentsQuery);
        console.log('📊 Assignments found:', assignmentsSnap.size);
        const assignmentsList: Assignment[] = [];
        assignmentsSnap.forEach(doc => {
          const data = doc.data();
          assignmentsList.push({
            id: doc.id,
            title: data.title || 'Untitled',
            subject: data.subject || 'N/A',
            description: data.description || '',
            dueDate: data.dueDate,
            assignmentFolderUrl: data.assignmentFolderUrl || '',
            assignmentPdfUrl: data.assignmentPdfUrl || '',
            maxMarks: data.maxMarks,
          });
        });
        // Sort by due date descending
        assignmentsList.sort((a, b) => {
          const dateA = a.dueDate?.toDate?.() || new Date(0);
          const dateB = b.dueDate?.toDate?.() || new Date(0);
          return dateB.getTime() - dateA.getTime();
        });
        setAssignments(assignmentsList);
      }
    } catch (error) {
      console.error('❌ Error loading data:', error);
    } finally {
      setLoading(false);
      console.log('✅ Data loading complete!');
    }
  };

  const handleLogout = () => {
    sessionStorage.clear();
    router.push('/parent-login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-900 text-lg font-semibold">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!parentData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-700 text-lg mb-4 font-semibold">Unable to load parent data</p>
          <button 
            onClick={() => router.push('/parent-login')}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 font-medium"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">Parent Dashboard</h1>
              <p className="text-gray-800 mt-1 font-semibold">Welcome, {parentData.parentName}</p>
            </div>
            <button onClick={handleLogout} className="px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-md font-semibold">Logout</button>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Student Information */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Student Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-700 font-semibold">Student Name</p>
              <p className="text-lg font-bold text-gray-900">{parentData.studentName || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-700 font-semibold">Roll Number</p>
              <p className="text-lg font-bold text-gray-900">{parentData.studentRollNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-700 font-semibold">Class</p>
              <p className="text-lg font-bold text-gray-900">{parentData.studentClass}</p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : 'bg-white text-gray-800 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            📊 Overview
          </button>
          <button
            onClick={() => setActiveTab('quizzes')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
              activeTab === 'quizzes'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                : 'bg-white text-gray-800 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            🎯 Quizzes ({quizSubmissions.length})
          </button>
          <button
            onClick={() => setActiveTab('marks')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
              activeTab === 'marks'
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                : 'bg-white text-gray-800 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            📝 Marks ({studentMarks.length})
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
              activeTab === 'attendance'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-lg'
                : 'bg-white text-gray-800 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            ✓ Attendance ({attendanceRecords.length})
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
              activeTab === 'assignments'
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg'
                : 'bg-white text-gray-800 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            📋 Assignments ({assignments.length})
          </button>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Academic Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 p-6 text-white shadow-lg">
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">Quiz Scores</h3>
                    <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <div className="text-4xl font-bold">{totalQuizScore}</div>
                    <div className="text-2xl opacity-80">/ {totalQuizMarks}</div>
                  </div>
                  <div className="text-lg font-semibold mb-2">{totalQuizMarks > 0 ? Math.round((totalQuizScore / totalQuizMarks) * 100) : 0}%</div>
                  <div className="text-xs opacity-75">{quizCount} {quizCount === 1 ? 'quiz' : 'quizzes'} attempted</div>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
              </div>
              
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-400 to-green-600 p-6 text-white shadow-lg">
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">Verified Marks</h3>
                    <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <div className="text-4xl font-bold">{totalVerifiedMarks}</div>
                    <div className="text-2xl opacity-80">/ {totalMaxMarks}</div>
                  </div>
                  <div className="text-lg font-semibold mb-2">{totalMaxMarks > 0 ? Math.round((totalVerifiedMarks / totalMaxMarks) * 100) : 0}%</div>
                  <div className="text-xs opacity-75">{marksCount} subjects verified</div>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
              </div>
              
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 p-6 text-white shadow-lg">
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">Attendance</h3>
                    <svg className="w-8 h-8 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="text-4xl font-bold mb-1">{attendancePercentage}%</div>
                  <div className="text-sm opacity-90">{Math.round(attendancePercentage * attendanceCount / 100)} / {attendanceCount} days</div>
                  <div className="text-xs opacity-75 mt-2">{attendanceCount - Math.round(attendancePercentage * attendanceCount / 100)} absences</div>
                </div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-16 -mt-16"></div>
              </div>
            </div>
          </div>
        )}

        {/* Quizzes Tab */}
        {activeTab === 'quizzes' && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="text-3xl">🎯</span>
              Quiz Submissions
            </h2>
            {quizSubmissions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-700 text-lg font-semibold">No quiz submissions yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {quizSubmissions.map((quiz) => (
                  <div key={quiz.id} className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-6 hover:shadow-lg transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{quiz.quizTitle}</h3>
                        <p className="text-sm text-gray-700 mt-1 font-medium">
                          Submitted: {quiz.submittedAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-blue-600">{quiz.score}/{quiz.totalMarks}</div>
                        <div className="text-lg font-semibold text-blue-700">
                          {quiz.totalMarks > 0 ? Math.round((quiz.score / quiz.totalMarks) * 100) : 0}%
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 h-3 rounded-full transition-all"
                        style={{ width: `${quiz.totalMarks > 0 ? (quiz.score / quiz.totalMarks * 100) : 0}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Marks Tab */}
        {activeTab === 'marks' && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="text-3xl">📝</span>
              Student Marks
            </h2>
            {studentMarks.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-700 text-lg font-semibold">No marks submitted yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {studentMarks.map((mark) => (
                  <div 
                    key={mark.id} 
                    className={`border-2 rounded-xl p-6 hover:shadow-lg transition-all ${
                      mark.status === 'verified' || mark.status === 'Verified'
                        ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300'
                        : mark.status === 'rejected'
                        ? 'bg-gradient-to-r from-red-50 to-rose-50 border-red-300'
                        : 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">{mark.subject}</h3>
                        <p className="text-sm text-gray-700 capitalize font-medium">{mark.examType.replace(/-/g, ' ')}</p>
                        <p className="text-xs text-gray-600 mt-1 font-medium">
                          Submitted: {mark.submittedAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                          mark.status === 'verified' || mark.status === 'Verified'
                            ? 'bg-green-200 text-green-800'
                            : mark.status === 'rejected'
                            ? 'bg-red-200 text-red-800'
                            : 'bg-yellow-200 text-yellow-800'
                        }`}>
                          {mark.status === 'verified' || mark.status === 'Verified' ? '✓ Verified' : 
                           mark.status === 'rejected' ? '✗ Rejected' : '⏳ Pending'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 mb-3">
                      <div>
                        <p className="text-sm text-gray-700 font-semibold">Marks Obtained</p>
                        <p className="text-3xl font-bold text-gray-900">{mark.marksObtained} / {mark.totalMarks}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-700 font-semibold">Percentage</p>
                        <p className="text-3xl font-bold text-green-600">
                          {mark.totalMarks > 0 ? ((mark.marksObtained / mark.totalMarks) * 100).toFixed(1) : 0}%
                        </p>
                      </div>
                    </div>
                    {(mark.status === 'verified' || mark.status === 'Verified') && mark.verifiedBy && (
                      <div className="bg-green-100 p-3 rounded-lg mt-3">
                        <p className="text-sm text-green-800">
                          <strong>Verified by:</strong> {mark.verifiedBy} on {mark.verifiedAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                        </p>
                        {mark.remarks && <p className="text-sm text-green-700 mt-1"><strong>Remarks:</strong> {mark.remarks}</p>}
                      </div>
                    )}
                    {mark.status === 'rejected' && mark.remarks && (
                      <div className="bg-red-100 p-3 rounded-lg mt-3">
                        <p className="text-sm text-red-800"><strong>Reason:</strong> {mark.remarks}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="text-3xl">✓</span>
              Attendance Records
            </h2>
            
            {/* Overall Stats */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-700 mb-1 font-semibold">Overall</p>
                  <p className="text-4xl font-bold text-purple-600">{attendancePercentage}%</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-700 mb-1 font-semibold">Total Days</p>
                  <p className="text-4xl font-bold text-gray-900">{attendanceCount}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-700 mb-1 font-semibold">Present</p>
                  <p className="text-4xl font-bold text-green-600">{Math.round(attendancePercentage * attendanceCount / 100)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-700 mb-1 font-semibold">Absent</p>
                  <p className="text-4xl font-bold text-red-600">{attendanceCount - Math.round(attendancePercentage * attendanceCount / 100)}</p>
                </div>
              </div>
            </div>

            {attendanceRecords.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-700 text-lg font-semibold">No attendance records yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {attendanceRecords.map((record) => (
                  <div key={record.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-all">
                    <div>
                      <p className="text-lg font-semibold text-gray-900">{record.date}</p>
                    </div>
                    <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                      record.status?.toLowerCase() === 'present'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {record.status?.toLowerCase() === 'present' ? '✓ Present' : '✗ Absent'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Assignments Tab */}
        {activeTab === 'assignments' && (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="text-3xl">📋</span>
              Assignments
            </h2>
            {assignments.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-700 text-lg font-semibold">No assignments available</p>
              </div>
            ) : (
              <div className="space-y-4">
                {assignments.map((assignment) => {
                  const dueDate = assignment.dueDate?.toDate?.();
                  const isExpired = dueDate && dueDate < new Date();
                  
                  return (
                    <div key={assignment.id} className={`border-2 rounded-xl p-6 hover:shadow-lg transition-all ${
                      isExpired 
                        ? 'bg-gray-50 border-gray-300'
                        : 'bg-gradient-to-r from-pink-50 to-rose-50 border-pink-300'
                    }`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">{assignment.title}</h3>
                          <p className="text-sm text-gray-700 mt-1 font-medium">{assignment.subject}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          isExpired
                            ? 'bg-gray-200 text-gray-700'
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {isExpired ? '⚪ Expired' : '🟢 Active'}
                        </span>
                      </div>
                      
                      <p className="text-gray-800 mb-4 font-medium">{assignment.description}</p>
                      
                      <div className="flex flex-wrap gap-4 mb-4 text-sm text-gray-700 font-medium">
                        <span>📅 Due: {dueDate?.toLocaleDateString() || 'N/A'}</span>
                        {assignment.maxMarks && <span>📊 Max Marks: {assignment.maxMarks}</span>}
                      </div>
                      
                      <div className="flex gap-3">
                        {assignment.assignmentFolderUrl && (
                          <a
                            href={assignment.assignmentFolderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            📁 Open Folder
                          </a>
                        )}
                        {assignment.assignmentPdfUrl && (
                          <a
                            href={assignment.assignmentPdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          >
                            📄 View PDF
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
