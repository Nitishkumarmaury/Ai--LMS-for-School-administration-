'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, orderBy, addDoc, Timestamp } from 'firebase/firestore';

interface StudentInfo {
  name: string;
  rollNumber: string;
  email: string;
  class: string;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  subject: string;
  dueDate: any;
  assignmentFolderUrl: string;
  assignmentPdfUrl: string;
  maxMarks: number | null;
  status: 'active' | 'expired';
}

interface LearningMaterial {
  id: string;
  title: string;
  subject: string;
  description: string;
  fileUrl: string;
  uploadedAt: any;
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  priority: string;
  createdAt: any;
}

interface AttendanceRecord {
  date: string;
  status: 'present' | 'absent';
}

interface StudentMarks {
  id: string;
  subject: string;
  examType: 'unit-test-1' | 'unit-test-2' | 'unit-test-3' | 'half-yearly' | 'annual';
  marksObtained: number;
  totalMarks: number;
  status: 'pending' | 'verified' | 'rejected';
  submittedAt: any;
  verifiedBy?: string;
  verifiedAt?: any;
  remarks?: string;
}

interface QuizQuestion {
  type: 'mcq' | 'true-false' | 'fill-blank';
  question: string;
  options?: string[];
  correctAnswer: number | string;
  points: number;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  subject: string;
  duration: number;
  totalMarks: number;
  questions: QuizQuestion[];
  createdBy: string;
  createdAt: any;
  status: 'draft' | 'active' | 'closed'; // Students only see 'active' quizzes
}

interface QuizSubmission {
  id: string;
  quizId: string;
  quizTitle: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  class: string;
  answers: (number | string)[];
  score: number;
  totalMarks: number;
  submittedAt: any;
}

export default function StudentDashboard() {
  const router = useRouter();
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [activeTab, setActiveTab] = useState<'assignments' | 'materials' | 'announcements' | 'attendance' | 'marks' | 'quiz'>('assignments');
  
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [myMarks, setMyMarks] = useState<StudentMarks[]>([]);
  
  // Quiz States
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [mySubmissions, setMySubmissions] = useState<QuizSubmission[]>([]);
  const [takingQuiz, setTakingQuiz] = useState<Quiz | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<(number | string)[]>([]);
  const [quizTimeLeft, setQuizTimeLeft] = useState(0);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  
  // Marks Upload States
  const [uploadSubject, setUploadSubject] = useState('');
  const [uploadExamType, setUploadExamType] = useState<'unit-test-1' | 'unit-test-2' | 'unit-test-3' | 'half-yearly' | 'annual'>('unit-test-1');
  const [uploadMarksObtained, setUploadMarksObtained] = useState('');
  const [uploadTotalMarks, setUploadTotalMarks] = useState('');
  const [uploadingMarks, setUploadingMarks] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get student info from localStorage
    const storedInfo = localStorage.getItem('studentInfo');
    if (!storedInfo) {
      router.push('/student-login');
      return;
    }
    setStudentInfo(JSON.parse(storedInfo));
  }, [router]);

  useEffect(() => {
    if (studentInfo) {
      loadAssignments();
      loadMaterials();
      loadAnnouncements();
      loadAttendance();
      loadMarks();
      loadQuizzes();
      loadMySubmissions();
    }
  }, [studentInfo]);

  const loadAssignments = async () => {
    if (!studentInfo) return;
    
    try {
      const assignmentsRef = collection(db, 'assignments');
      const q = query(
        assignmentsRef,
        where('class', '==', studentInfo.class),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      const assignmentsList = querySnapshot.docs.map(doc => {
        const data = doc.data();
        const dueDate = data.dueDate?.toDate();
        const now = new Date();
        const status = dueDate < now ? 'expired' : 'active';
        
        return {
          id: doc.id,
          ...data,
          status,
        } as Assignment;
      });
      
      setAssignments(assignmentsList);
    } catch (error) {
      console.error('Error loading assignments:', error);
    }
  };

  const loadMaterials = async () => {
    if (!studentInfo) return;
    
    try {
      const materialsRef = collection(db, 'learningMaterials');
      const q = query(
        materialsRef,
        where('class', '==', studentInfo.class),
        orderBy('uploadedAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      const materialsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as LearningMaterial));
      
      setMaterials(materialsList);
    } catch (error) {
      console.error('Error loading materials:', error);
    }
  };

  const loadAnnouncements = async () => {
    if (!studentInfo) return;
    
    try {
      const announcementsRef = collection(db, 'announcements');
      const q = query(
        announcementsRef,
        where('class', '==', studentInfo.class),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      const announcementsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Announcement));
      
      setAnnouncements(announcementsList);
    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAttendance = async () => {
    if (!studentInfo) return;
    
    try {
      console.log('Loading attendance for student:', studentInfo);
      
      const attendanceRef = collection(db, 'attendance');
      
      // Try with composite query first (class + rollNumber)
      try {
        const q = query(
          attendanceRef,
          where('class', '==', studentInfo.class),
          where('rollNumber', '==', studentInfo.rollNumber),
          orderBy('date', 'desc')
        );
        
        console.log('Querying attendance with:', {
          class: studentInfo.class,
          rollNumber: studentInfo.rollNumber
        });
        
        const querySnapshot = await getDocs(q);
        console.log('Found attendance records:', querySnapshot.size);
        
        const records: AttendanceRecord[] = [];
        querySnapshot.forEach(doc => {
          const data = doc.data();
          console.log('Attendance record:', data);
          
          records.push({
            date: data.date,
            status: data.status,
          });
        });
        
        console.log('Processed attendance records:', records);
        setAttendanceRecords(records);
        return;
        
      } catch (indexError: any) {
        // If composite index doesn't exist, fall back to class-only query
        console.log('Composite index not available, using fallback query');
        
        const q = query(
          attendanceRef,
          where('class', '==', studentInfo.class)
        );
        
        const querySnapshot = await getDocs(q);
        console.log('Found total class records:', querySnapshot.size);
        
        const records: AttendanceRecord[] = [];
        querySnapshot.forEach(doc => {
          const data = doc.data();
          
          // Filter by rollNumber manually
          if (data.rollNumber === studentInfo.rollNumber) {
            console.log('Matched attendance record:', data);
            records.push({
              date: data.date,
              status: data.status,
            });
          }
        });
        
        // Sort by date descending
        records.sort((a, b) => b.date.localeCompare(a.date));
        
        console.log('Processed attendance records (fallback):', records);
        setAttendanceRecords(records);
      }
      
    } catch (error: any) {
      console.error('Error loading attendance:', error);
      alert('Failed to load attendance records. Check console for details.');
    }
  };

  const loadMarks = async () => {
    if (!studentInfo) return;

    try {
      const marksRef = collection(db, 'studentMarks');
      const q = query(
        marksRef,
        where('rollNumber', '==', studentInfo.rollNumber),
        where('class', '==', studentInfo.class),
        orderBy('submittedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const marksList: StudentMarks[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        subject: doc.data().subject,
        examType: doc.data().examType,
        marksObtained: doc.data().marksObtained,
        totalMarks: doc.data().totalMarks,
        status: doc.data().status || 'pending',
        submittedAt: doc.data().submittedAt,
        verifiedBy: doc.data().verifiedBy,
        verifiedAt: doc.data().verifiedAt,
        remarks: doc.data().remarks,
      }));
      
      setMyMarks(marksList);
    } catch (error: any) {
      console.error('Error loading marks:', error);
      
      // Fallback without orderBy if index doesn't exist
      if (error?.code === 'failed-precondition') {
        try {
          const marksRef = collection(db, 'studentMarks');
          const q = query(
            marksRef,
            where('rollNumber', '==', studentInfo.rollNumber),
            where('class', '==', studentInfo.class)
          );
          
          const querySnapshot = await getDocs(q);
          const marksList: StudentMarks[] = querySnapshot.docs.map(doc => ({
            id: doc.id,
            subject: doc.data().subject,
            examType: doc.data().examType,
            marksObtained: doc.data().marksObtained,
            totalMarks: doc.data().totalMarks,
            status: doc.data().status || 'pending',
            submittedAt: doc.data().submittedAt,
            verifiedBy: doc.data().verifiedBy,
            verifiedAt: doc.data().verifiedAt,
            remarks: doc.data().remarks,
          }));
          
          setMyMarks(marksList);
        } catch (fallbackError) {
          console.error('Fallback error loading marks:', fallbackError);
        }
      }
    }
  };

  const loadQuizzes = async () => {
    if (!studentInfo) return;

    try {
      const quizzesRef = collection(db, 'quizzes');
      const q = query(
        quizzesRef,
        where('class', '==', studentInfo.class),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const quizzesList: Quiz[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title,
        description: doc.data().description || '',
        subject: doc.data().subject,
        duration: doc.data().duration,
        totalMarks: doc.data().totalMarks,
        questions: doc.data().questions,
        createdBy: doc.data().createdBy,
        createdAt: doc.data().createdAt,
        status: doc.data().status,
      }));
      
      setQuizzes(quizzesList);
    } catch (error: any) {
      console.error('Error loading quizzes:', error);
      
      // Fallback without orderBy
      if (error?.code === 'failed-precondition') {
        try {
          const quizzesRef = collection(db, 'quizzes');
          const q = query(
            quizzesRef,
            where('class', '==', studentInfo.class),
            where('status', '==', 'active')
          );
          
          const querySnapshot = await getDocs(q);
          const quizzesList: Quiz[] = querySnapshot.docs.map(doc => ({
            id: doc.id,
            title: doc.data().title,
            description: doc.data().description || '',
            subject: doc.data().subject,
            duration: doc.data().duration,
            totalMarks: doc.data().totalMarks,
            questions: doc.data().questions,
            createdBy: doc.data().createdBy,
            createdAt: doc.data().createdAt,
            status: doc.data().status,
          }));
          
          setQuizzes(quizzesList);
        } catch (fallbackError) {
          console.error('Fallback error loading quizzes:', fallbackError);
        }
      }
    }
  };

  const loadMySubmissions = async () => {
    if (!studentInfo) return;

    try {
      const submissionsRef = collection(db, 'quizSubmissions');
      const q = query(
        submissionsRef,
        where('rollNumber', '==', studentInfo.rollNumber),
        where('class', '==', studentInfo.class)
      );
      
      const querySnapshot = await getDocs(q);
      const submissionsList: QuizSubmission[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        quizId: doc.data().quizId,
        quizTitle: doc.data().quizTitle,
        studentId: doc.data().studentId,
        studentName: doc.data().studentName,
        rollNumber: doc.data().rollNumber,
        class: doc.data().class,
        answers: doc.data().answers,
        score: doc.data().score,
        totalMarks: doc.data().totalMarks,
        submittedAt: doc.data().submittedAt,
      }));
      
      setMySubmissions(submissionsList);
    } catch (error) {
      console.error('Error loading submissions:', error);
    }
  };

  const startQuiz = (quiz: Quiz) => {
    setTakingQuiz(quiz);
    setQuizAnswers(new Array(quiz.questions.length).fill(''));
    setQuizTimeLeft(quiz.duration * 60); // Convert minutes to seconds
  };

  const submitQuiz = async () => {
    if (!takingQuiz || !studentInfo) return;

    try {
      setSubmittingQuiz(true);

      // Calculate score
      let score = 0;
      takingQuiz.questions.forEach((q, idx) => {
        const studentAnswer = quizAnswers[idx];
        
        if (q.type === 'fill-blank') {
          // Case-insensitive string comparison for fill-in-blank
          if (typeof q.correctAnswer === 'string' && typeof studentAnswer === 'string') {
            if (q.correctAnswer.toLowerCase().trim() === studentAnswer.toLowerCase().trim()) {
              score += q.points;
            }
          }
        } else {
          // Numeric comparison for MCQ and True/False
          if (studentAnswer === q.correctAnswer) {
            score += q.points;
          }
        }
      });

      // Save submission
      const submissionsRef = collection(db, 'quizSubmissions');
      await addDoc(submissionsRef, {
        quizId: takingQuiz.id,
        quizTitle: takingQuiz.title,
        studentId: studentInfo.email,
        studentName: studentInfo.name,
        rollNumber: studentInfo.rollNumber,
        class: studentInfo.class,
        answers: quizAnswers,
        score,
        totalMarks: takingQuiz.totalMarks,
        submittedAt: Timestamp.now(),
      });

      setSuccessMessage(`Quiz submitted! You scored ${score}/${takingQuiz.totalMarks}`);
      setTimeout(() => setSuccessMessage(''), 5000);
      
      setTakingQuiz(null);
      setQuizAnswers([]);
      loadMySubmissions();
    } catch (error) {
      console.error('Error submitting quiz:', error);
      setErrorMessage('Failed to submit quiz');
      setTimeout(() => setErrorMessage(''), 3000);
    } finally {
      setSubmittingQuiz(false);
    }
  };

  // Quiz timer effect
  useEffect(() => {
    if (takingQuiz && quizTimeLeft > 0) {
      const timer = setTimeout(() => {
        setQuizTimeLeft(quizTimeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (takingQuiz && quizTimeLeft === 0) {
      // Auto-submit when time runs out
      submitQuiz();
    }
  }, [takingQuiz, quizTimeLeft]);

  const uploadMarks = async () => {
    if (!studentInfo) return;

    if (!uploadSubject.trim() || !uploadMarksObtained || !uploadTotalMarks) {
      setErrorMessage('Please fill in all fields');
      return;
    }

    const marksObtained = parseInt(uploadMarksObtained);
    const totalMarks = parseInt(uploadTotalMarks);

    if (isNaN(marksObtained) || isNaN(totalMarks)) {
      setErrorMessage('Marks must be valid numbers');
      return;
    }

    if (marksObtained < 0 || totalMarks <= 0 || marksObtained > totalMarks) {
      setErrorMessage('Invalid marks values');
      return;
    }

    try {
      setUploadingMarks(true);
      setErrorMessage('');

      const marksRef = collection(db, 'studentMarks');
      await addDoc(marksRef, {
        studentId: studentInfo.rollNumber,
        studentName: studentInfo.name,
        rollNumber: studentInfo.rollNumber,
        class: studentInfo.class,
        subject: uploadSubject.trim(),
        examType: uploadExamType,
        marksObtained: marksObtained,
        totalMarks: totalMarks,
        status: 'pending',
        submittedAt: Timestamp.now(),
      });

      setSuccessMessage('Marks uploaded successfully! Waiting for teacher verification.');
      setTimeout(() => setSuccessMessage(''), 3000);

      // Reset form
      setUploadSubject('');
      setUploadExamType('unit-test-1');
      setUploadMarksObtained('');
      setUploadTotalMarks('');

      // Reload marks
      loadMarks();
    } catch (error) {
      console.error('Error uploading marks:', error);
      setErrorMessage('Failed to upload marks. Please try again.');
    } finally {
      setUploadingMarks(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('studentInfo');
      router.push('/student-login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const calculateAttendancePercentage = () => {
    if (attendanceRecords.length === 0) return 0;
    const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
    return Math.round((presentCount / attendanceRecords.length) * 100);
  };

  // Calculate total quiz score
  const calculateTotalQuizScore = () => {
    return mySubmissions.reduce((total, submission) => total + submission.score, 0);
  };

  // Calculate total quiz marks
  const calculateTotalQuizMarks = () => {
    return mySubmissions.reduce((total, submission) => total + submission.totalMarks, 0);
  };

  // Calculate total verified marks
  const calculateTotalVerifiedMarks = () => {
    const verifiedMarks = myMarks.filter(mark => mark.status === 'verified');
    return verifiedMarks.reduce((total, mark) => total + mark.marksObtained, 0);
  };

  // Calculate total marks for verified exams
  const calculateTotalVerifiedMaxMarks = () => {
    const verifiedMarks = myMarks.filter(mark => mark.status === 'verified');
    return verifiedMarks.reduce((total, mark) => total + mark.totalMarks, 0);
  };

  if (!studentInfo) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{studentInfo.name}</h1>
              <p className="text-sm text-gray-700 font-semibold">Roll No: {studentInfo.rollNumber} | Class: {studentInfo.class}</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Scoreboard Section */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-6 border-2 border-gray-200">
          <div className="flex items-center mb-6">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full p-3 mr-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">My Scoreboard</h2>
              <p className="text-gray-700 font-semibold">Your academic performance at a glance</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Quiz Scores Card */}
            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-6 border-2 border-cyan-200 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg p-3 shadow-md">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-cyan-800 text-sm font-bold uppercase tracking-wide mb-2">Quiz Score</h3>
              <div className="flex items-baseline">
                <p className="text-6xl font-extrabold text-cyan-900">{calculateTotalQuizScore()}</p>
                <p className="text-xl text-cyan-700 font-semibold ml-2">points</p>
              </div>
              <div className="mt-2">
                <p className="text-gray-700 text-sm font-medium">Out of {calculateTotalQuizMarks()} total points</p>
              </div>
              <div className="mt-3 flex items-center">
                <div className="flex-1 bg-gray-200 rounded-full h-3 mr-3">
                  <div 
                    className="bg-gradient-to-r from-cyan-400 to-blue-500 h-3 rounded-full transition-all duration-500 shadow-sm"
                    style={{ 
                      width: `${calculateTotalQuizMarks() > 0 ? (calculateTotalQuizScore() / calculateTotalQuizMarks() * 100) : 0}%` 
                    }}
                  ></div>
                </div>
                <span className="text-cyan-900 text-base font-bold">
                  {calculateTotalQuizMarks() > 0 ? ((calculateTotalQuizScore() / calculateTotalQuizMarks() * 100).toFixed(1)) : 0}%
                </span>
              </div>
              <p className="text-gray-700 text-sm font-semibold mt-3">{mySubmissions.length} quizzes completed</p>
            </div>

            {/* Verified Marks Card */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg p-3 shadow-md">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
              </div>
              <h3 className="text-green-800 text-sm font-bold uppercase tracking-wide mb-2">Verified Marks</h3>
              <div className="flex items-baseline">
                <p className="text-6xl font-extrabold text-green-900">{calculateTotalVerifiedMarks()}</p>
                <p className="text-xl text-green-700 font-semibold ml-2">marks</p>
              </div>
              <div className="mt-2">
                <p className="text-gray-700 text-sm font-medium">Out of {calculateTotalVerifiedMaxMarks()} total marks</p>
              </div>
              <div className="mt-3 flex items-center">
                <div className="flex-1 bg-gray-200 rounded-full h-3 mr-3">
                  <div 
                    className="bg-gradient-to-r from-green-400 to-emerald-500 h-3 rounded-full transition-all duration-500 shadow-sm"
                    style={{ 
                      width: `${calculateTotalVerifiedMaxMarks() > 0 ? (calculateTotalVerifiedMarks() / calculateTotalVerifiedMaxMarks() * 100) : 0}%` 
                    }}
                  ></div>
                </div>
                <span className="text-green-900 text-base font-bold">
                  {calculateTotalVerifiedMaxMarks() > 0 ? ((calculateTotalVerifiedMarks() / calculateTotalVerifiedMaxMarks() * 100).toFixed(1)) : 0}%
                </span>
              </div>
              <p className="text-gray-600 text-sm font-medium mt-3">
                {myMarks.filter(m => m.status === 'verified').length} exams verified
              </p>
            </div>

            {/* Attendance Card */}
            <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl p-6 border-2 border-amber-200 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-gradient-to-br from-amber-500 to-yellow-600 rounded-lg p-3 shadow-md">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-amber-800 text-sm font-bold uppercase tracking-wide mb-2">Attendance</h3>
              <div className="flex items-baseline">
                <p className="text-6xl font-extrabold text-amber-900">{calculateAttendancePercentage()}</p>
                <p className="text-2xl text-amber-700 font-bold ml-2">%</p>
              </div>
              <div className="mt-2">
                <p className="text-gray-700 text-sm font-medium">
                  {attendanceRecords.filter(r => r.status === 'present').length} present out of {attendanceRecords.length} days
                </p>
              </div>
              <div className="mt-3 flex items-center">
                <div className="flex-1 bg-gray-200 rounded-full h-3 mr-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-500 shadow-sm ${
                      calculateAttendancePercentage() >= 75 ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 
                      calculateAttendancePercentage() >= 60 ? 'bg-gradient-to-r from-yellow-400 to-amber-500' : 
                      'bg-gradient-to-r from-red-400 to-rose-500'
                    }`}
                    style={{ width: `${calculateAttendancePercentage()}%` }}
                  ></div>
                </div>
                <span className={`text-base font-bold ${
                  calculateAttendancePercentage() >= 75 ? 'text-green-700' : 
                  calculateAttendancePercentage() >= 60 ? 'text-amber-700' : 'text-red-700'
                }`}>
                  {calculateAttendancePercentage() >= 75 ? '✓ Good' : 
                   calculateAttendancePercentage() >= 60 ? '⚠ Fair' : '✗ Low'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex space-x-4 mb-6 overflow-x-auto">
          <button
            onClick={() => setActiveTab('assignments')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'assignments'
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            📋 Assignments
          </button>
          <button
            onClick={() => setActiveTab('materials')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'materials'
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            📚 Materials
          </button>
          <button
            onClick={() => setActiveTab('announcements')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'announcements'
                ? 'bg-gradient-to-r from-orange-400 to-amber-500 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            📢 Announcements
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'attendance'
                ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            ✓ Attendance
          </button>
          <button
            onClick={() => setActiveTab('marks')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'marks'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            📊 My Marks
          </button>
          <button
            onClick={() => setActiveTab('quiz')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'quiz'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            🎯 Quizzes
          </button>
        </div>

        {/* Assignments Tab */}
        {activeTab === 'assignments' && (
          <div className="space-y-4">
            {assignments.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">No assignments available</p>
              </div>
            ) : (
              assignments.map(assignment => (
                <div key={assignment.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{assignment.title}</h3>
                      <p className="text-sm text-gray-700 font-medium">{assignment.subject}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      assignment.status === 'active' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {assignment.status === 'active' ? '🟢 Active' : '⚪ Expired'}
                    </span>
                  </div>
                  
                  <p className="text-gray-700 mb-4">{assignment.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="text-sm text-gray-600">
                      📅 Due: {assignment.dueDate?.toDate().toLocaleDateString()}
                    </span>
                    {assignment.maxMarks && (
                      <span className="text-sm text-gray-600">
                        📊 Max Marks: {assignment.maxMarks}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex gap-3">
                    <a
                      href={assignment.assignmentFolderUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      📁 Open Folder
                    </a>
                    <a
                      href={assignment.assignmentPdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
                    >
                      📄 View PDF
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Materials Tab */}
        {activeTab === 'materials' && (
          <div className="space-y-4">
            {materials.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">No learning materials available</p>
              </div>
            ) : (
              materials.map(material => (
                <div key={material.id} className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{material.title}</h3>
                  <p className="text-sm text-gray-700 mb-2 font-medium">{material.subject}</p>
                  <p className="text-gray-700 mb-4">{material.description}</p>
                  <a
                    href={material.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors inline-block"
                  >
                    📖 View Material
                  </a>
                </div>
              ))
            )}
          </div>
        )}

        {/* Announcements Tab */}
        {activeTab === 'announcements' && (
          <div className="space-y-4">
            {announcements.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-8 text-center">
                <p className="text-gray-500">No announcements</p>
              </div>
            ) : (
              announcements.map(announcement => (
                <div key={announcement.id} className={`rounded-lg shadow-md p-6 ${
                  announcement.priority === 'high' ? 'bg-red-50 border-l-4 border-red-500' :
                  announcement.priority === 'medium' ? 'bg-yellow-50 border-l-4 border-yellow-500' :
                  'bg-white border-l-4 border-blue-500'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-gray-900">{announcement.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      announcement.priority === 'high' ? 'bg-red-100 text-red-700' :
                      announcement.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {announcement.priority.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-700">{announcement.message}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    {announcement.createdAt?.toDate().toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Attendance Tab */}
        {activeTab === 'attendance' && (
          <div>
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Overall Attendance</h3>
              <div className="flex items-center gap-4">
                <div className={`text-4xl font-bold ${
                  calculateAttendancePercentage() < 75 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {calculateAttendancePercentage()}%
                </div>
                <div className="text-gray-600">
                  <p>Present: {attendanceRecords.filter(r => r.status === 'present').length} days</p>
                  <p>Absent: {attendanceRecords.filter(r => r.status === 'absent').length} days</p>
                  <p>Total: {attendanceRecords.length} days</p>
                </div>
              </div>
              {calculateAttendancePercentage() < 75 && (
                <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                  ⚠️ Warning: Your attendance is below 75%
                </div>
              )}
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Attendance Records</h3>
              <div className="space-y-2">
                {attendanceRecords.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No attendance records</p>
                ) : (
                  attendanceRecords.map((record, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">{record.date}</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        record.status === 'present' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {record.status === 'present' ? '✓ Present' : '✗ Absent'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Marks Tab */}
        {activeTab === 'marks' && (
          <div className="space-y-6">
            {/* Upload Marks Form */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-2xl font-bold text-purple-700 mb-4 flex items-center gap-2">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Upload Marks
              </h3>

              {successMessage && (
                <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-lg font-semibold">
                  {successMessage}
                </div>
              )}

              {errorMessage && (
                <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg font-semibold">
                  {errorMessage}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Subject *</label>
                  <input
                    type="text"
                    value={uploadSubject}
                    onChange={(e) => setUploadSubject(e.target.value)}
                    placeholder="e.g., Mathematics"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-300 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Exam Type *</label>
                  <select
                    value={uploadExamType}
                    onChange={(e) => setUploadExamType(e.target.value as any)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-300 outline-none"
                  >
                    <option value="unit-test-1">Unit Test 1</option>
                    <option value="unit-test-2">Unit Test 2</option>
                    <option value="unit-test-3">Unit Test 3</option>
                    <option value="half-yearly">Half Yearly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Marks Obtained *</label>
                  <input
                    type="number"
                    value={uploadMarksObtained}
                    onChange={(e) => setUploadMarksObtained(e.target.value)}
                    placeholder="e.g., 85"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-300 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Total Marks *</label>
                  <input
                    type="number"
                    value={uploadTotalMarks}
                    onChange={(e) => setUploadTotalMarks(e.target.value)}
                    placeholder="e.g., 100"
                    min="1"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-300 outline-none"
                  />
                </div>
              </div>

              <button
                onClick={uploadMarks}
                disabled={uploadingMarks}
                className={`w-full px-6 py-3 rounded-lg font-bold text-white transition-all ${
                  uploadingMarks
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'
                }`}
              >
                {uploadingMarks ? 'Uploading...' : '📤 Upload Marks'}
              </button>
            </div>

            {/* My Marks List */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-2xl font-bold text-purple-700 mb-4">My Submitted Marks</h3>

              {myMarks.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No marks uploaded yet</p>
              ) : (
                <div className="space-y-4">
                  {myMarks.map((marks) => (
                    <div 
                      key={marks.id} 
                      className={`p-4 rounded-lg border-2 ${
                        marks.status === 'verified' 
                          ? 'bg-green-50 border-green-300'
                          : marks.status === 'rejected'
                          ? 'bg-red-50 border-red-300'
                          : 'bg-yellow-50 border-yellow-300'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="text-lg font-bold text-gray-900">{marks.subject}</h4>
                          <p className="text-sm text-gray-700 capitalize font-medium">{marks.examType.replace(/-/g, ' ')}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                          marks.status === 'verified'
                            ? 'bg-green-200 text-green-800'
                            : marks.status === 'rejected'
                            ? 'bg-red-200 text-red-800'
                            : 'bg-yellow-200 text-yellow-800'
                        }`}>
                          {marks.status === 'verified' ? '✓ Verified' : marks.status === 'rejected' ? '✗ Rejected' : '⏳ Pending'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-2">
                        <div>
                          <p className="text-sm text-gray-700 font-semibold">Marks Obtained</p>
                          <p className="text-2xl font-bold text-purple-600">{marks.marksObtained} / {marks.totalMarks}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-700 font-semibold">Percentage</p>
                          <p className="text-2xl font-bold text-purple-600">
                            {((marks.marksObtained / marks.totalMarks) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-gray-500 mb-2">
                        Submitted on: {marks.submittedAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                      </p>

                      {marks.status === 'verified' && marks.verifiedBy && (
                        <div className="bg-green-100 p-2 rounded mt-2">
                          <p className="text-sm text-green-800">
                            <strong>Verified by:</strong> {marks.verifiedBy} on {marks.verifiedAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                          </p>
                          {marks.remarks && <p className="text-sm text-green-700 mt-1"><strong>Remarks:</strong> {marks.remarks}</p>}
                        </div>
                      )}

                      {marks.status === 'rejected' && marks.remarks && (
                        <div className="bg-red-100 p-2 rounded mt-2">
                          <p className="text-sm text-red-800"><strong>Reason:</strong> {marks.remarks}</p>
                          <p className="text-xs text-red-600 mt-1">Please contact your teacher for clarification</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Quiz Tab */}
        {activeTab === 'quiz' && (
          <div className="space-y-6">
            {takingQuiz ? (
              /* Quiz Taking View */
              <div className="bg-white rounded-xl shadow-2xl p-8">
                <div className="flex items-center justify-between mb-6 pb-6 border-b-2 border-cyan-200">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">{takingQuiz.title}</h2>
                    <p className="text-gray-700 mt-1 font-semibold">{takingQuiz.subject} • {takingQuiz.questions.length} questions • {takingQuiz.totalMarks} marks</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-700 font-semibold">Time Remaining</p>
                    <p className={`text-3xl font-bold ${quizTimeLeft < 60 ? 'text-red-600' : 'text-cyan-600'}`}>
                      {Math.floor(quizTimeLeft / 60)}:{(quizTimeLeft % 60).toString().padStart(2, '0')}
                    </p>
                  </div>
                </div>

                <div className="space-y-8">
                  {takingQuiz.questions.map((question, idx) => (
                    <div key={idx} className="bg-gradient-to-br from-cyan-50 to-blue-50 p-6 rounded-xl border-2 border-cyan-200">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-xl font-bold text-gray-900">Q{idx + 1}</span>
                          <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                            question.type === 'mcq' ? 'bg-blue-100 text-blue-700' :
                            question.type === 'true-false' ? 'bg-green-100 text-green-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>
                            {question.type === 'mcq' ? 'Multiple Choice' :
                             question.type === 'true-false' ? 'True/False' :
                             'Fill in the Blank'}
                          </span>
                        </div>
                        <span className="px-3 py-1 bg-cyan-200 text-cyan-800 rounded-lg text-sm font-bold">
                          {question.points} {question.points === 1 ? 'point' : 'points'}
                        </span>
                      </div>

                      <p className="text-lg text-gray-900 font-semibold mb-4">{question.question}</p>

                      {/* MCQ Options */}
                      {question.type === 'mcq' && question.options && (
                        <div className="space-y-3">
                          {question.options.map((option, optIdx) => (
                            <label key={optIdx} className="flex items-center gap-3 cursor-pointer bg-white p-4 rounded-lg hover:bg-cyan-50 transition-colors border-2 border-gray-200 hover:border-cyan-400">
                              <input
                                type="radio"
                                name={`question-${idx}`}
                                checked={quizAnswers[idx] === optIdx}
                                onChange={() => {
                                  const newAnswers = [...quizAnswers];
                                  newAnswers[idx] = optIdx;
                                  setQuizAnswers(newAnswers);
                                }}
                                className="w-5 h-5 text-cyan-600"
                              />
                              <span className="text-gray-900 font-semibold">{String.fromCharCode(65 + optIdx)}. {option}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {/* True/False Options */}
                      {question.type === 'true-false' && (
                        <div className="flex gap-4">
                          <label className="flex-1 flex items-center justify-center gap-3 cursor-pointer bg-white p-4 rounded-lg hover:bg-green-50 transition-colors border-2 border-gray-200 hover:border-green-400">
                            <input
                              type="radio"
                              name={`question-${idx}`}
                              checked={quizAnswers[idx] === 0}
                              onChange={() => {
                                const newAnswers = [...quizAnswers];
                                newAnswers[idx] = 0;
                                setQuizAnswers(newAnswers);
                              }}
                              className="w-5 h-5 text-green-600"
                            />
                            <span className="text-lg font-bold text-green-700">✓ True</span>
                          </label>
                          <label className="flex-1 flex items-center justify-center gap-3 cursor-pointer bg-white p-4 rounded-lg hover:bg-red-50 transition-colors border-2 border-gray-200 hover:border-red-400">
                            <input
                              type="radio"
                              name={`question-${idx}`}
                              checked={quizAnswers[idx] === 1}
                              onChange={() => {
                                const newAnswers = [...quizAnswers];
                                newAnswers[idx] = 1;
                                setQuizAnswers(newAnswers);
                              }}
                              className="w-5 h-5 text-red-600"
                            />
                            <span className="text-lg font-bold text-red-700">✗ False</span>
                          </label>
                        </div>
                      )}

                      {/* Fill-in-Blank Input */}
                      {question.type === 'fill-blank' && (
                        <input
                          type="text"
                          value={quizAnswers[idx] as string || ''}
                          onChange={(e) => {
                            const newAnswers = [...quizAnswers];
                            newAnswers[idx] = e.target.value;
                            setQuizAnswers(newAnswers);
                          }}
                          placeholder="Type your answer here"
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none transition-colors text-lg"
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex gap-4">
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to cancel? Your progress will be lost.')) {
                        setTakingQuiz(null);
                        setQuizAnswers([]);
                      }
                    }}
                    className="flex-1 px-8 py-4 bg-gray-500 text-white rounded-xl font-bold text-lg hover:bg-gray-600 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submitQuiz}
                    disabled={submittingQuiz || quizAnswers.some(a => a === '' || a === null || a === undefined)}
                    className="flex-1 px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-bold text-lg hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submittingQuiz ? 'Submitting...' : 'Submit Quiz'}
                  </button>
                </div>
              </div>
            ) : (
              /* Quiz List View */
              <>
                <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-8 rounded-2xl shadow-2xl text-white">
                  <h2 className="text-3xl font-bold mb-2">📝 Available Quizzes</h2>
                  <p className="text-cyan-100">Test your knowledge and track your performance</p>
                </div>

                {quizzes.length === 0 ? (
                  <div className="bg-white rounded-xl shadow p-8 text-center">
                    <p className="text-gray-500 text-lg">No quizzes available at the moment</p>
                  </div>
                ) : (
                  <div className="grid gap-6">
                    {quizzes.map(quiz => {
                      const alreadyTaken = mySubmissions.some(s => s.quizId === quiz.id);
                      const submission = mySubmissions.find(s => s.quizId === quiz.id);

                      return (
                        <div key={quiz.id} className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl shadow-lg p-6 border-2 border-cyan-200">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <h3 className="text-2xl font-bold text-gray-900 mb-2">{quiz.title}</h3>
                              {quiz.description && <p className="text-gray-700 mb-3 font-medium">{quiz.description}</p>}
                              <div className="flex flex-wrap gap-3">
                                <span className="px-3 py-1 bg-cyan-100 text-cyan-800 rounded-lg text-sm font-semibold">
                                  {quiz.subject}
                                </span>
                                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm font-semibold">
                                  ⏱️ {quiz.duration} minutes
                                </span>
                                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-lg text-sm font-semibold">
                                  📊 {quiz.totalMarks} marks
                                </span>
                                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm font-semibold">
                                  ❓ {quiz.questions.length} questions
                                </span>
                              </div>
                            </div>
                            {alreadyTaken && (
                              <span className="px-4 py-2 bg-green-100 text-green-800 rounded-lg text-sm font-bold">
                                ✓ Completed
                              </span>
                            )}
                          </div>

                          {alreadyTaken && submission ? (
                            <div className="bg-white p-4 rounded-lg border-2 border-green-300 mb-4">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm text-gray-700 font-semibold">Your Score</p>
                                  <p className="text-3xl font-bold text-green-600">{submission.score} / {submission.totalMarks}</p>
                                  <p className="text-sm text-gray-700 mt-1 font-medium">
                                    Percentage: {((submission.score / submission.totalMarks) * 100).toFixed(1)}%
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-gray-700 font-semibold">Submitted on</p>
                                  <p className="font-bold text-gray-900">
                                    {submission.submittedAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => startQuiz(quiz)}
                              className="w-full px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg font-bold hover:shadow-xl transition-all"
                            >
                              Start Quiz
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
