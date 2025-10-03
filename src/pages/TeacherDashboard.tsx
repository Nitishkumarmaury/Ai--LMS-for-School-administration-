"use client";
import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, addDoc, query, where, getDocs, orderBy, Timestamp, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import TeacherAIAssistant from '../components/TeacherAIAssistant';

interface Student {
  id: string;
  name: string;
  rollNumber: string;
  class: string;
  parentEmail: string;
}

interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  class: string;
  status: 'present' | 'absent';
  date: string;
  markedBy: string;
  timestamp: Date;
}

interface StudentAttendanceStats {
  studentId: string;
  studentName: string;
  rollNumber: string;
  totalDays: number;
  presentDays: number;
  absentDays: number;
  percentage: number;
  dailyRecords: { date: string; status: 'present' | 'absent' }[];
}

interface LearningMaterial {
  id: string;
  title: string;
  description: string;
  type: 'lecture' | 'pdf' | 'ppt' | 'notes' | 'other';
  fileName: string;
  fileUrl: string;
  fileSize: number;
  class: string;
  subject: string;
  uploadedBy: string;
  uploadedByEmail: string;
  uploadedAt: Date;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  subject: string;
  class: string;
  dueDate: Date;
  assignmentFolderUrl: string; // Google Drive folder link
  assignmentPdfUrl: string; // Google Drive PDF link
  createdBy: string;
  createdByEmail: string;
  createdAt: Date;
  maxMarks?: number;
  status: 'active' | 'expired';
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  class: string;
  createdBy: string;
  createdByEmail: string;
  createdAt: Date;
  priority: 'normal' | 'important' | 'urgent';
}

interface StudentRollNumber {
  id: string;
  rollNumber: string;
  studentName: string;
  class: string;
  isRegistered: boolean; // true if a student has signed up with this roll number
  registeredStudentId?: string;
  createdBy: string;
  createdAt: Date;
}

interface StudentMarks {
  id: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  class: string;
  subject: string;
  examType: 'unit-test-1' | 'unit-test-2' | 'unit-test-3' | 'half-yearly' | 'annual';
  marksObtained: number;
  totalMarks: number;
  submittedAt: Date;
  verifiedBy?: string;
  verifiedAt?: Date;
  status: 'pending' | 'verified' | 'rejected';
  remarks?: string;
}

interface QuizQuestion {
  type: 'mcq' | 'true-false' | 'fill-blank'; // question type
  question: string;
  options?: string[]; // for MCQ and True/False
  correctAnswer: number | string; // index for MCQ/True-False, text for fill-blank
  points: number; // marks for this question
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  subject: string;
  class: string;
  duration: number; // in minutes
  totalMarks: number;
  questions: QuizQuestion[];
  createdBy: string;
  createdAt: Date;
  status: 'draft' | 'active' | 'closed'; // draft = not published, active = published and available, closed = no longer accepting submissions
}

interface QuizSubmission {
  id: string;
  quizId: string;
  quizTitle: string;
  studentId: string;
  studentName: string;
  rollNumber: string;
  class: string;
  answers: (number | string)[]; // array of selected option indices (number) or text answers (string)
  score: number;
  totalMarks: number;
  submittedAt: Date;
}

export default function TeacherDashboard() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'mark' | 'history' | 'lms' | 'assignments' | 'announcements' | 'manage-students' | 'marks' | 'quiz'>('mark');
  
  // Student Roll Number Management States
  const [rollNumbers, setRollNumbers] = useState<StudentRollNumber[]>([]);
  const [newRollNumber, setNewRollNumber] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  
  // Marks Management States
  const [studentMarks, setStudentMarks] = useState<StudentMarks[]>([]);
  
  // Quiz Management States
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [quizSubmissions, setQuizSubmissions] = useState<QuizSubmission[]>([]);
  const [creatingQuiz, setCreatingQuiz] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [quizSubject, setQuizSubject] = useState('');
  const [quizDuration, setQuizDuration] = useState('30');
  const [quizTotalMarks, setQuizTotalMarks] = useState('10');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([
    { type: 'mcq', question: '', options: ['', '', '', ''], correctAnswer: 0, points: 1 }
  ]);
  const [pendingMarks, setPendingMarks] = useState<StudentMarks[]>([]);
  const [verifiedMarks, setVerifiedMarks] = useState<StudentMarks[]>([]);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [selectedExamTypeFilter, setSelectedExamTypeFilter] = useState<string>('all');
  const [addingRollNumber, setAddingRollNumber] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [assignedClasses, setAssignedClasses] = useState<string[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<{ [key: string]: 'present' | 'absent' }>({});
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [editingEmail, setEditingEmail] = useState<string | null>(null);
  const [tempEmail, setTempEmail] = useState('');
  
  // Attendance Analytics States
  const [attendanceStats, setAttendanceStats] = useState<StudentAttendanceStats[]>([]);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  
  // LMS States
  const [learningMaterials, setLearningMaterials] = useState<LearningMaterial[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialDescription, setMaterialDescription] = useState('');
  const [materialType, setMaterialType] = useState<'lecture' | 'pdf' | 'ppt' | 'notes' | 'other'>('pdf');
  const [materialSubject, setMaterialSubject] = useState('');
  const [driveLink, setDriveLink] = useState(''); // Google Drive link

  // Assignment States
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentDescription, setAssignmentDescription] = useState('');
  const [assignmentSubject, setAssignmentSubject] = useState('');
  const [assignmentDueDate, setAssignmentDueDate] = useState('');
  const [assignmentMaxMarks, setAssignmentMaxMarks] = useState('');
  const [assignmentFolderLink, setAssignmentFolderLink] = useState('');
  const [assignmentPdfLink, setAssignmentPdfLink] = useState('');
  const [creatingAssignment, setCreatingAssignment] = useState(false);

  // Announcement States
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementTitle, setAnnouncementTitle] = useState('');
  const [announcementMessage, setAnnouncementMessage] = useState('');
  const [announcementPriority, setAnnouncementPriority] = useState<'normal' | 'important' | 'urgent'>('normal');
  const [creatingAnnouncement, setCreatingAnnouncement] = useState(false);

  // Classes with sections - must match StudentLogin.tsx
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        
        // Fetch teacher's assigned classes from Firestore
        try {
          const teacherDoc = await getDoc(doc(db, 'teachers', currentUser.uid));
          if (teacherDoc.exists()) {
            const teacherData = teacherDoc.data();
            const classes = teacherData.assignedClasses || [];
            setAssignedClasses(classes);
            if (classes.length > 0) {
              setSelectedClass(classes[0]); // Set first class as default
            }
          } else {
            setErrorMessage('Teacher data not found. Please contact administrator.');
          }
        } catch (error) {
          console.error('Error fetching teacher data:', error);
          setErrorMessage('Failed to load teacher information.');
        }
      } else {
        window.location.href = '/teacher-login';
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedClass) return;
    
    const loadStudentsFromRollNumbers = async () => {
      try {
        // Load roll numbers for this class from Firestore
        const rollNumbersRef = collection(db, 'studentRollNumbers');
        const q = query(
          rollNumbersRef,
          where('class', '==', selectedClass),
          orderBy('rollNumber', 'asc')
        );
        
        const querySnapshot = await getDocs(q);
        const studentsList: Student[] = [];
        
        // Load registered students from 'students' collection
        const studentsRef = collection(db, 'students');
        const studentsSnapshot = await getDocs(studentsRef);
        const registeredStudentsMap: { [key: string]: any } = {};
        
        studentsSnapshot.forEach((docSnap) => {
          const studentData = docSnap.data();
          registeredStudentsMap[docSnap.id] = {
            ...studentData,
            id: docSnap.id
          };
        });
        
        // Create student list from roll numbers
        querySnapshot.forEach((docSnap) => {
          const rollNumberData = docSnap.data();
          
          // If registered, get full details from students collection
          if (rollNumberData.isRegistered && rollNumberData.registeredStudentId) {
            const registeredStudent = registeredStudentsMap[rollNumberData.registeredStudentId];
            if (registeredStudent) {
              studentsList.push({
                id: rollNumberData.registeredStudentId,
                name: registeredStudent.name,
                rollNumber: rollNumberData.rollNumber,
                class: rollNumberData.class,
                parentEmail: registeredStudent.email || 'mauryanitish367@gmail.com' // Default email
              });
            }
          } else {
            // If not registered yet, create placeholder with teacher-assigned name
            studentsList.push({
              id: docSnap.id,
              name: rollNumberData.studentName,
              rollNumber: rollNumberData.rollNumber,
              class: rollNumberData.class,
              parentEmail: 'mauryanitish367@gmail.com' // Default email until registered
            });
          }
        });
        
        // Load saved parent emails from studentEmails collection
        const emailsRef = collection(db, 'studentEmails');
        const emailsSnapshot = await getDocs(emailsRef);
        const savedEmails: { [key: string]: string } = {};
        
        emailsSnapshot.forEach((docSnap) => {
          const data = docSnap.data();
          savedEmails[data.studentId] = data.parentEmail;
        });
        
        // Merge saved emails with student data
        const studentsWithEmails = studentsList.map(student => ({
          ...student,
          parentEmail: savedEmails[student.id] || student.parentEmail
        }));
        
        setStudents(studentsWithEmails);
        
        // Initialize attendance as all present
        const initialAttendance: { [key: string]: 'present' | 'absent' } = {};
        studentsWithEmails.forEach(student => {
          initialAttendance[student.id] = 'present';
        });
        setAttendance(initialAttendance);
      } catch (error: any) {
        console.error('Error loading students from roll numbers:', error);
        
        // If index error, show alert
        if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
          const errorMessage = error?.message || '';
          const indexUrlMatch = errorMessage.match(/(https:\/\/console\.firebase\.google\.com[^\s]+)/);
          const indexUrl = indexUrlMatch ? indexUrlMatch[1] : '';
          
          if (indexUrl) {
            console.error('\n\n🔥🔥🔥 CLICK THIS LINK TO CREATE THE INDEX 🔥🔥🔥');
            console.error(indexUrl);
            alert('🔥 INDEX REQUIRED!\n\nClick the link in console to create index for studentRollNumbers.');
          }
        }
        
        setErrorMessage(`Failed to load students: ${error?.message || 'Unknown error'}`);
        setStudents([]);
      }
    };
    
    loadStudentsFromRollNumbers();
  }, [selectedClass]);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchAttendanceHistory();
    }
  }, [activeTab, filterDate, selectedClass]);

  const fetchAttendanceHistory = async () => {
    try {
      const attendanceRef = collection(db, 'attendance');
      const q = query(
        attendanceRef,
        where('class', '==', selectedClass),
        where('date', '==', filterDate)
      );
      
      const querySnapshot = await getDocs(q);
      const records: AttendanceRecord[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        records.push({
          id: doc.id,
          studentId: data.studentId,
          studentName: data.studentName,
          rollNumber: data.rollNumber,
          class: data.class,
          status: data.status,
          date: data.date,
          markedBy: data.markedBy,
          timestamp: data.timestamp.toDate(),
        });
      });
      // Sort by roll number after fetching
      records.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber));
      setAttendanceHistory(records);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    }
  };

  const toggleAttendance = (studentId: string) => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'present' ? 'absent' : 'present'
    }));
  };

  const markAllPresent = () => {
    const allPresent: { [key: string]: 'present' | 'absent' } = {};
    students.forEach(student => {
      allPresent[student.id] = 'present';
    });
    setAttendance(allPresent);
  };

  const markAllAbsent = () => {
    const allAbsent: { [key: string]: 'present' | 'absent' } = {};
    students.forEach(student => {
      allAbsent[student.id] = 'absent';
    });
    setAttendance(allAbsent);
  };

  const submitAttendance = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      setSuccessMessage('');

      if (!selectedClass) {
        setErrorMessage('Please select a class first.');
        setLoading(false);
        return;
      }

      if (students.length === 0) {
        setErrorMessage('No students found in this class.');
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const attendanceRef = collection(db, 'attendance');

      // Check if attendance is already marked for today
      const checkQuery = query(
        attendanceRef,
        where('class', '==', selectedClass),
        where('date', '==', today)
      );
      
      const existingAttendance = await getDocs(checkQuery);
      
      if (!existingAttendance.empty) {
        setErrorMessage(`Attendance for ${selectedClass} has already been marked today (${today}). You can only mark attendance once per day.`);
        setLoading(false);
        return;
      }

      // Collect absent students for email notification
      const absentStudents: Student[] = [];

      // Save each student's attendance
      const promises = students.map(student => {
        if (attendance[student.id] === 'absent') {
          absentStudents.push(student);
        }
        
        return addDoc(attendanceRef, {
          studentId: student.id,
          studentName: student.name,
          rollNumber: student.rollNumber,
          class: selectedClass,
          status: attendance[student.id],
          date: today,
          markedBy: user.email,
          parentEmail: student.parentEmail,
          timestamp: Timestamp.now(),
        });
      });

      await Promise.all(promises);

      // Send email notifications to parents of absent students
      if (absentStudents.length > 0) {
        await sendAbsentNotifications(absentStudents, today);
        setSuccessMessage(`Attendance marked successfully for ${selectedClass} on ${today}! Total students: ${students.length}. Email notifications sent to ${absentStudents.length} parent(s) of absent students.`);
      } else {
        setSuccessMessage(`Attendance marked successfully for ${selectedClass} on ${today}! Total students: ${students.length}. All students present!`);
      }
      
      setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error) {
      console.error('Error submitting attendance:', error);
      setErrorMessage(`Failed to submit attendance. Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const sendAbsentNotifications = async (absentStudents: Student[], date: string) => {
    try {
      const notificationsRef = collection(db, 'emailNotifications');
      
      const emailPromises = absentStudents.map(async student => {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #d32f2f; margin-bottom: 20px;">Absence Notification</h2>
              <p style="font-size: 16px; color: #333; line-height: 1.6;">
                Dear Parent/Guardian,
              </p>
              <p style="font-size: 16px; color: #333; line-height: 1.6;">
                This is to inform you that your child, <strong>${student.name}</strong> (Roll No: ${student.rollNumber}), 
                was marked <strong style="color: #d32f2f;">ABSENT</strong> from <strong>${selectedClass}</strong> on <strong>${date}</strong>.
              </p>
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #856404;">
                  <strong>Note:</strong> If you believe this is an error, please contact the school administration immediately.
                </p>
              </div>
              <p style="font-size: 14px; color: #666; margin-top: 30px;">
                Best regards,<br>
                <strong>School Administration</strong><br>
                Marked by: ${user.email}
              </p>
            </div>
          </div>
        `;

        // Send email via Resend API
        try {
          const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: student.parentEmail,
              subject: `Absence Notification - ${student.name}`,
              html: emailHtml,
            }),
          });

          const result = await response.json();
          
          // Store in Firestore for tracking
          await addDoc(notificationsRef, {
            to: student.parentEmail,
            subject: `Absence Notification - ${student.name}`,
            studentName: student.name,
            studentId: student.id,
            rollNumber: student.rollNumber,
            class: selectedClass,
            date: date,
            sentBy: user.email,
            status: response.ok ? 'sent' : 'failed',
            emailId: result.data?.id || null,
            error: result.error || null,
            createdAt: Timestamp.now(),
          });

          return result;
        } catch (emailError) {
          console.error(`Failed to send email to ${student.parentEmail}:`, emailError);
          // Store failed attempt in Firestore
          await addDoc(notificationsRef, {
            to: student.parentEmail,
            subject: `Absence Notification - ${student.name}`,
            studentName: student.name,
            studentId: student.id,
            rollNumber: student.rollNumber,
            class: selectedClass,
            date: date,
            sentBy: user.email,
            status: 'failed',
            error: emailError instanceof Error ? emailError.message : 'Unknown error',
            createdAt: Timestamp.now(),
          });
          return null;
        }
      });

      const results = await Promise.all(emailPromises);
      const successCount = results.filter(r => r && r.success).length;
      console.log(`Email notifications sent: ${successCount}/${absentStudents.length}`);
    } catch (error) {
      console.error('Error sending notifications:', error);
      // Don't throw error - attendance is already saved
    }
  };

  const updateParentEmail = async (studentId: string, newEmail: string) => {
    try {
      console.log('Updating email for student:', studentId, 'to:', newEmail);
      
      // Find the student to get their details
      const student = students.find(s => s.id === studentId);
      if (!student) {
        throw new Error('Student not found');
      }
      
      // Update the current students state with new email
      const updatedStudents = students.map(s => 
        s.id === studentId 
          ? { ...s, parentEmail: newEmail }
          : s
      );
      setStudents(updatedStudents);
      
      // Save to Firestore for persistence across all classes
      const studentRef = doc(db, 'studentEmails', studentId);
      await setDoc(studentRef, {
        studentId: studentId,
        studentName: student.name,
        class: student.class,
        rollNumber: student.rollNumber,
        parentEmail: newEmail,
        updatedAt: Timestamp.now(),
        updatedBy: user?.email || 'unknown',
      }, { merge: true });
      
      console.log('✅ Email saved to Firestore successfully!');
      setSuccessMessage('Parent email updated and saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('❌ Error updating parent email:', error);
      setErrorMessage(`Failed to update parent email: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  // LMS Functions
  const loadLearningMaterials = async () => {
    if (!selectedClass) return;
    
    try {
      const materialsRef = collection(db, 'learningMaterials');
      const q = query(
        materialsRef,
        where('class', '==', selectedClass),
        orderBy('uploadedAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const materials: LearningMaterial[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        materials.push({
          id: doc.id,
          title: data.title,
          description: data.description,
          type: data.type,
          fileName: data.fileName,
          fileUrl: data.fileUrl,
          fileSize: data.fileSize,
          class: data.class,
          subject: data.subject,
          uploadedBy: data.uploadedBy,
          uploadedByEmail: data.uploadedByEmail,
          uploadedAt: data.uploadedAt.toDate(),
        });
      });
      
      setLearningMaterials(materials);
    } catch (error: any) {
      console.error('Error loading learning materials:', error);
      console.error('Error code:', error?.code);
      console.error('Error message:', error?.message);
      
      if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
        const errorMessage = error?.message || '';
        const indexUrlMatch = errorMessage.match(/(https:\/\/console\.firebase\.google\.com[^\s]+)/);
        const indexUrl = indexUrlMatch ? indexUrlMatch[1] : '';
        
        if (indexUrl) {
          console.error('\n\n🔥🔥🔥 CLICK THIS LINK TO CREATE THE INDEX 🔥🔥🔥');
          console.error(indexUrl);
          console.error('After clicking, wait 1-2 minutes for the index to build, then refresh this page.\n\n');
          
          // Create a clickable link in console
          console.log('%cCLICK HERE TO CREATE INDEX ↓', 'color: red; font-size: 20px; font-weight: bold;');
          console.log(indexUrl);
        }
        
        alert('🔥 FIRESTORE INDEX REQUIRED!\n\n1. Check the browser console\n2. Click the link to create the index\n3. Wait 1-2 minutes\n4. Refresh this page\n\nOr copy this link:\n' + indexUrl);
      } else if (error?.code === 'permission-denied') {
        alert('🔒 PERMISSION DENIED!\n\nYour Firestore security rules are blocking this action.\n\nPlease update your Firebase rules using FIRESTORE_RULES_COMPLETE.txt');
      }
      
      setErrorMessage(`Failed to load materials: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        setErrorMessage('File size must be less than 50MB');
        return;
      }
      
      setUploadFile(file);
      
      // Auto-detect material type from file extension
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (extension === 'pdf') setMaterialType('pdf');
      else if (extension === 'ppt' || extension === 'pptx') setMaterialType('ppt');
      else if (extension === 'mp4' || extension === 'avi' || extension === 'mov') setMaterialType('lecture');
      else if (extension === 'doc' || extension === 'docx' || extension === 'txt') setMaterialType('notes');
    }
  };

  // Validate and format Google Drive link
  const validateDriveLink = (link: string): string | null => {
    console.log('=== VALIDATE DRIVE LINK ===');
    console.log('Input link:', link);
    
    if (!link.trim()) {
      console.log('Link is empty');
      return null;
    }
    
    // Check if it's a Google Drive link
    if (!link.includes('drive.google.com') && !link.includes('docs.google.com')) {
      console.log('Not a Google Drive link');
      setErrorMessage('Please enter a valid Google Drive link');
      return null;
    }
    
    // Check if it's a folder link - these should be returned as-is
    if (link.includes('/folders/')) {
      console.log('This is a folder link - returning as-is');
      // Extract folder ID and return clean link
      const folderId = link.split('/folders/')[1]?.split('?')[0]?.split('/')[0];
      if (folderId) {
        const formattedLink = `https://drive.google.com/drive/folders/${folderId}`;
        console.log('Formatted folder link:', formattedLink);
        return formattedLink;
      }
    }
    
    // Extract file ID from various Google Drive URL formats
    let fileId = '';
    
    // Format: https://drive.google.com/file/d/FILE_ID/view
    if (link.includes('/file/d/')) {
      fileId = link.split('/file/d/')[1]?.split('/')[0];
      console.log('Extracted fileId from /file/d/ format:', fileId);
    }
    // Format: https://drive.google.com/open?id=FILE_ID
    else if (link.includes('open?id=')) {
      fileId = link.split('open?id=')[1]?.split('&')[0];
      console.log('Extracted fileId from open?id= format:', fileId);
    }
    // Format: https://docs.google.com/document/d/FILE_ID/
    else if (link.includes('/document/d/') || link.includes('/spreadsheets/d/') || link.includes('/presentation/d/')) {
      const parts = link.split('/d/');
      fileId = parts[1]?.split('/')[0];
      console.log('Extracted fileId from docs format:', fileId);
    }
    
    if (!fileId) {
      console.log('Could not extract file ID');
      setErrorMessage('Could not extract file ID from Google Drive link');
      return null;
    }
    
    // Return direct download/preview link
    const formattedLink = `https://drive.google.com/file/d/${fileId}/view`;
    console.log('Formatted link:', formattedLink);
    return formattedLink;
  };

  const uploadLearningMaterial = async () => {
    console.log('=== UPLOAD MATERIAL CALLED ===');
    console.log('materialTitle:', materialTitle);
    console.log('materialSubject:', materialSubject);
    console.log('selectedClass:', selectedClass);
    console.log('driveLink:', driveLink);
    console.log('materialType:', materialType);
    console.log('user:', user);
    
    // Show alert to confirm function is called
    alert('Upload function called! Check console for details.');
    
    if (!materialTitle.trim() || !materialSubject.trim() || !selectedClass) {
      console.log('Validation failed: missing required fields');
      setErrorMessage('Please fill in title and subject fields.');
      alert('❌ Validation Failed: Please fill in title and subject fields.');
      return;
    }

    if (!driveLink.trim()) {
      console.log('Validation failed: missing drive link');
      setErrorMessage('Please enter a Google Drive link.');
      return;
    }

    try {
      setUploading(true);
      setErrorMessage('');
      console.log('Starting upload process...');

      // Validate Google Drive link
      const formattedLink = validateDriveLink(driveLink);
      console.log('formattedLink:', formattedLink);
      if (!formattedLink) {
        console.log('Drive link validation failed');
        setErrorMessage('Invalid Google Drive link format. Please use a valid shareable link.');
        setUploading(false);
        return;
      }

      // Extract filename from link or use title
      const fileName = materialTitle.trim() + '.' + materialType;
      console.log('fileName:', fileName);

      // Save metadata to Firestore (without file upload)
      const materialsRef = collection(db, 'learningMaterials');
      console.log('Attempting to save to Firestore...');
      
      const docData = {
        title: materialTitle.trim(),
        description: materialDescription.trim(),
        type: materialType,
        fileName: fileName,
        fileUrl: formattedLink, // Google Drive link
        fileSize: 0, // Unknown size for external links
        class: selectedClass,
        subject: materialSubject.trim(),
        uploadedBy: user?.displayName || 'Teacher',
        uploadedByEmail: user?.email || '',
        uploadedAt: Timestamp.now(),
        source: 'google-drive', // Mark as external link
      };
      console.log('Document data:', docData);
      
      await addDoc(materialsRef, docData);
      console.log('Successfully saved to Firestore!');

      setSuccessMessage('Material link added successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);

      // Reset form
      setUploadFile(null);
      setMaterialTitle('');
      setMaterialDescription('');
      setMaterialSubject('');
      setDriveLink('');
      setUploading(false);

      // Reload materials
      loadLearningMaterials();
    } catch (error) {
      console.error('=== ERROR ADDING MATERIAL ===');
      console.error('Error details:', error);
      console.error('Error type:', error instanceof Error ? 'Error object' : typeof error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      // Show alert for critical errors (like permission denied)
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      const errorCode = (error as any)?.code || '';
      
      console.error('Error code:', errorCode);
      
      if (errorCode === 'permission-denied' || errorMsg.includes('permission') || errorMsg.includes('denied') || errorMsg.includes('Missing or insufficient permissions')) {
        alert('❌ PERMISSION DENIED!\n\nYour Firestore security rules are blocking this action.\n\nPlease:\n1. Open FIRESTORE_RULES_COMPLETE.txt\n2. Copy all content\n3. Go to Firebase Console → Firestore → Rules\n4. Paste and Publish');
      } else if (errorCode === 'failed-precondition' || errorMsg.includes('index')) {
        alert('🔥 FIRESTORE INDEX REQUIRED!\n\nClick the link in the browser console to create it.');
      } else {
        alert(`❌ Upload Failed!\n\nError: ${errorMsg}\n\nCheck browser console for details.`);
      }
      
      setErrorMessage(`Failed to add material: ${errorMsg}`);
      setUploading(false);
    }
  };

  // Calculate attendance statistics for all students
  const calculateAttendanceStats = () => {
    if (!selectedClass) return;

    const classStudents = students.filter(s => s.class === selectedClass);
    const stats: StudentAttendanceStats[] = [];

    // Filter history by date range if provided
    let filteredHistory = attendanceHistory.filter(record => record.class === selectedClass);
    
    if (dateRange.start && dateRange.end) {
      filteredHistory = filteredHistory.filter(record => {
        return record.date >= dateRange.start && record.date <= dateRange.end;
      });
    }

    // Get unique dates where ANY attendance was marked (actual teaching days)
    const uniqueDates = Array.from(new Set(filteredHistory.map(r => r.date))).sort();
    const totalDays = uniqueDates.length; // Total teaching days for the class

    console.log('📊 Attendance Analytics Debug:');
    console.log('Unique dates found:', uniqueDates);
    console.log('Total teaching days:', totalDays);

    classStudents.forEach(student => {
      const studentRecords = filteredHistory.filter(r => r.studentId === student.id);
      const presentDays = studentRecords.filter(r => r.status === 'present').length;
      const absentDays = studentRecords.filter(r => r.status === 'absent').length;
      
      // Calculate percentage based on total teaching days, not just marked days
      const percentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;

      console.log(`Student ${student.name}:`, {
        totalDays,
        presentDays,
        absentDays,
        percentage: percentage.toFixed(1) + '%'
      });

      // Build daily records for visualization
      const dailyRecords = uniqueDates.map(date => {
        const record = studentRecords.find(r => r.date === date);
        // If this student has no record for this date, mark as absent
        // (Holiday detection is handled by only including teaching days in uniqueDates)
        return {
          date,
          status: (record?.status || 'absent') as 'present' | 'absent'
        };
      });

      stats.push({
        studentId: student.id,
        studentName: student.name,
        rollNumber: student.rollNumber,
        totalDays,
        presentDays,
        absentDays,
        percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal
        dailyRecords
      });
    });

    // Sort by percentage (lowest first to highlight low attendance)
    stats.sort((a, b) => a.percentage - b.percentage);
    setAttendanceStats(stats);
  };

  const deleteLearningMaterial = async (material: LearningMaterial) => {
    if (!confirm(`Are you sure you want to delete "${material.title}"?`)) {
      return;
    }

    try {
      // Delete metadata from Firestore (no file to delete from Storage)
      await deleteDoc(doc(db, 'learningMaterials', material.id));

      setSuccessMessage('Material deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);

      // Reload materials
      loadLearningMaterials();
    } catch (error) {
      console.error('Error deleting material:', error);
      setErrorMessage(`Failed to delete: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setErrorMessage(''), 5000);
    }
  };

  // Assignment Functions
  const loadAssignments = async () => {
    if (!selectedClass) return;
    
    try {
      const assignmentsRef = collection(db, 'assignments');
      const q = query(
        assignmentsRef,
        where('class', '==', selectedClass),
        orderBy('createdAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const assignmentsList: Assignment[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const dueDate = data.dueDate.toDate();
        const now = new Date();
        const status = dueDate < now ? 'expired' : 'active';
        
        assignmentsList.push({
          id: doc.id,
          title: data.title,
          description: data.description,
          subject: data.subject,
          class: data.class,
          dueDate: dueDate,
          assignmentFolderUrl: data.assignmentFolderUrl,
          assignmentPdfUrl: data.assignmentPdfUrl,
          createdBy: data.createdBy,
          createdByEmail: data.createdByEmail,
          createdAt: data.createdAt.toDate(),
          maxMarks: data.maxMarks,
          status: status,
        });
      });
      
      setAssignments(assignmentsList);
    } catch (error: any) {
      console.error('Error loading assignments:', error);
      
      if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
        const errorMessage = error?.message || '';
        const indexUrlMatch = errorMessage.match(/(https:\/\/console\.firebase\.google\.com[^\s]+)/);
        const indexUrl = indexUrlMatch ? indexUrlMatch[1] : '';
        
        if (indexUrl) {
          console.error('\n\n🔥🔥🔥 CLICK THIS LINK TO CREATE THE INDEX 🔥🔥🔥');
          console.error(indexUrl);
          alert('🔥 INDEX REQUIRED!\n\nClick the link in console to create index.');
        }
      }
      
      setErrorMessage(`Failed to load assignments: ${error?.message || 'Unknown error'}`);
    }
  };

  const createAssignment = async () => {
    if (!assignmentTitle.trim() || !assignmentSubject.trim() || !selectedClass) {
      setErrorMessage('Please fill in title and subject fields.');
      return;
    }

    if (!assignmentDueDate) {
      setErrorMessage('Please select a due date.');
      return;
    }

    if (!assignmentFolderLink.trim()) {
      setErrorMessage('Please enter a Google Drive folder link.');
      return;
    }

    if (!assignmentPdfLink.trim()) {
      setErrorMessage('Please enter a Google Drive PDF link.');
      return;
    }

    try {
      setCreatingAssignment(true);
      setErrorMessage('');

      const formattedFolderLink = validateDriveLink(assignmentFolderLink);
      if (!formattedFolderLink) {
        setErrorMessage('Invalid Google Drive folder link format.');
        setCreatingAssignment(false);
        return;
      }

      const formattedPdfLink = validateDriveLink(assignmentPdfLink);
      if (!formattedPdfLink) {
        setErrorMessage('Invalid Google Drive PDF link format.');
        setCreatingAssignment(false);
        return;
      }

      const assignmentsRef = collection(db, 'assignments');
      await addDoc(assignmentsRef, {
        title: assignmentTitle.trim(),
        description: assignmentDescription.trim(),
        subject: assignmentSubject.trim(),
        class: selectedClass,
        dueDate: Timestamp.fromDate(new Date(assignmentDueDate)),
        assignmentFolderUrl: formattedFolderLink,
        assignmentPdfUrl: formattedPdfLink,
        createdBy: user?.displayName || 'Teacher',
        createdByEmail: user?.email || '',
        createdAt: Timestamp.now(),
        maxMarks: assignmentMaxMarks ? parseInt(assignmentMaxMarks) : null,
      });

      setSuccessMessage('Assignment created successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);

      setAssignmentTitle('');
      setAssignmentDescription('');
      setAssignmentSubject('');
      setAssignmentDueDate('');
      setAssignmentMaxMarks('');
      setAssignmentFolderLink('');
      setAssignmentPdfLink('');
      setCreatingAssignment(false);

      loadAssignments();
    } catch (error: any) {
      console.error('Error creating assignment:', error);
      setErrorMessage(`Failed to create assignment: ${error?.message || 'Unknown error'}`);
      setCreatingAssignment(false);
    }
  };

  const deleteAssignment = async (assignment: Assignment) => {
    if (!confirm(`Are you sure you want to delete "${assignment.title}"?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'assignments', assignment.id));
      setSuccessMessage('Assignment deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      loadAssignments();
    } catch (error) {
      console.error('Error deleting assignment:', error);
      setErrorMessage('Failed to delete assignment.');
    }
  };

  // ============= ANNOUNCEMENT FUNCTIONS =============
  const loadAnnouncements = async () => {
    if (!selectedClass) return;

    try {
      const announcementsRef = collection(db, 'announcements');
      const q = query(
        announcementsRef,
        where('class', '==', selectedClass),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const announcementsList: Announcement[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        announcementsList.push({
          id: doc.id,
          title: data.title,
          message: data.message,
          class: data.class,
          createdBy: data.createdBy,
          createdByEmail: data.createdByEmail,
          createdAt: data.createdAt.toDate(),
          priority: data.priority,
        });
      });
      
      setAnnouncements(announcementsList);
    } catch (error: any) {
      console.error('Error loading announcements:', error);
      
      if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
        const errorMessage = error?.message || '';
        const indexUrlMatch = errorMessage.match(/(https:\/\/console\.firebase\.google\.com[^\s]+)/);
        const indexUrl = indexUrlMatch ? indexUrlMatch[1] : '';
        
        if (indexUrl) {
          console.error('\n\n🔥🔥🔥 CLICK THIS LINK TO CREATE THE INDEX 🔥🔥🔥');
          console.error(indexUrl);
          alert('🔥 INDEX REQUIRED!\n\nClick the link in console to create index.');
        }
      }
      
      setErrorMessage(`Failed to load announcements: ${error?.message || 'Unknown error'}`);
    }
  };

  const createAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementMessage.trim() || !selectedClass) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    try {
      setCreatingAnnouncement(true);
      setErrorMessage('');

      const announcementsRef = collection(db, 'announcements');
      await addDoc(announcementsRef, {
        title: announcementTitle.trim(),
        message: announcementMessage.trim(),
        class: selectedClass,
        createdBy: user?.displayName || 'Teacher',
        createdByEmail: user?.email || '',
        createdAt: Timestamp.now(),
        priority: announcementPriority,
      });

      setSuccessMessage('Announcement created successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);

      setAnnouncementTitle('');
      setAnnouncementMessage('');
      setAnnouncementPriority('normal');
      loadAnnouncements();
    } catch (error) {
      console.error('Error creating announcement:', error);
      setErrorMessage('Failed to create announcement. Please try again.');
    } finally {
      setCreatingAnnouncement(false);
    }
  };

  const deleteAnnouncement = async (announcement: Announcement) => {
    if (!confirm(`Are you sure you want to delete the announcement "${announcement.title}"?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'announcements', announcement.id));
      setSuccessMessage('Announcement deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      loadAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      setErrorMessage('Failed to delete announcement.');
    }
  };

  // Roll Number Management Functions
  const loadRollNumbers = async () => {
    if (!selectedClass) return;

    try {
      const rollNumbersRef = collection(db, 'studentRollNumbers');
      const q = query(
        rollNumbersRef,
        where('class', '==', selectedClass),
        orderBy('rollNumber', 'asc')
      );
      
      const querySnapshot = await getDocs(q);
      const fetchedRollNumbers: StudentRollNumber[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedRollNumbers.push({
          id: doc.id,
          rollNumber: data.rollNumber,
          studentName: data.studentName,
          class: data.class,
          isRegistered: data.isRegistered || false,
          registeredStudentId: data.registeredStudentId,
          createdBy: data.createdBy,
          createdAt: data.createdAt?.toDate(),
        });
      });
      
      setRollNumbers(fetchedRollNumbers);
    } catch (error: any) {
      console.error('Error loading roll numbers:', error);
      
      if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
        const errorMessage = error?.message || '';
        const indexUrlMatch = errorMessage.match(/(https:\/\/console\.firebase\.google\.com[^\s]+)/);
        const indexUrl = indexUrlMatch ? indexUrlMatch[1] : '';
        
        if (indexUrl) {
          console.error('\n\n🔥🔥🔥 CLICK THIS LINK TO CREATE THE INDEX 🔥🔥🔥');
          console.error(indexUrl);
          alert('🔥 INDEX REQUIRED!\n\nClick the link in console to create index for studentRollNumbers.');
        }
      }
      
      setErrorMessage(`Failed to load roll numbers: ${error?.message || 'Unknown error'}`);
    }
  };

  const addRollNumber = async () => {
    if (!newRollNumber.trim() || !newStudentName.trim() || !selectedClass) {
      setErrorMessage('Please fill in roll number and student name.');
      return;
    }

    // Check if roll number already exists in this class
    const existingRollNumber = rollNumbers.find(
      rn => rn.rollNumber === newRollNumber.trim() && rn.class === selectedClass
    );

    if (existingRollNumber) {
      setErrorMessage('This roll number already exists in this class.');
      return;
    }

    try {
      setAddingRollNumber(true);
      setErrorMessage('');

      const rollNumbersRef = collection(db, 'studentRollNumbers');
      await addDoc(rollNumbersRef, {
        rollNumber: newRollNumber.trim(),
        studentName: newStudentName.trim(),
        class: selectedClass,
        isRegistered: false,
        createdBy: user?.displayName || 'Teacher',
        createdAt: Timestamp.now(),
      });

      setSuccessMessage('Roll number added successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);

      setNewRollNumber('');
      setNewStudentName('');
      loadRollNumbers();
    } catch (error) {
      console.error('Error adding roll number:', error);
      setErrorMessage('Failed to add roll number.');
    } finally {
      setAddingRollNumber(false);
    }
  };

  const deleteRollNumber = async (rollNumberDoc: StudentRollNumber) => {
    if (rollNumberDoc.isRegistered) {
      setErrorMessage('Cannot delete roll number that is already registered by a student.');
      return;
    }

    if (!confirm(`Are you sure you want to delete roll number ${rollNumberDoc.rollNumber} (${rollNumberDoc.studentName})?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'studentRollNumbers', rollNumberDoc.id));
      setSuccessMessage('Roll number deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      loadRollNumbers();
    } catch (error) {
      console.error('Error deleting roll number:', error);
      setErrorMessage('Failed to delete roll number.');
    }
  };

  // Marks Management Functions
  const loadStudentMarks = async () => {
    if (!selectedClass) return;

    try {
      const marksRef = collection(db, 'studentMarks');
      const q = query(
        marksRef,
        where('class', '==', selectedClass),
        orderBy('submittedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const allMarks: StudentMarks[] = [];
      const pending: StudentMarks[] = [];
      const verified: StudentMarks[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const markEntry: StudentMarks = {
          id: doc.id,
          studentId: data.studentId,
          studentName: data.studentName,
          rollNumber: data.rollNumber,
          class: data.class,
          subject: data.subject,
          examType: data.examType,
          marksObtained: data.marksObtained,
          totalMarks: data.totalMarks,
          submittedAt: data.submittedAt?.toDate(),
          verifiedBy: data.verifiedBy,
          verifiedAt: data.verifiedAt?.toDate(),
          status: data.status || 'pending',
          remarks: data.remarks,
        };
        
        allMarks.push(markEntry);
        
        if (markEntry.status === 'pending') {
          pending.push(markEntry);
        } else if (markEntry.status === 'verified') {
          verified.push(markEntry);
        }
      });
      
      setStudentMarks(allMarks);
      setPendingMarks(pending);
      setVerifiedMarks(verified);
    } catch (error: any) {
      console.error('Error loading student marks:', error);
      
      if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
        const errorMessage = error?.message || '';
        const indexUrlMatch = errorMessage.match(/(https:\/\/console\.firebase\.google\.com[^\s]+)/);
        const indexUrl = indexUrlMatch ? indexUrlMatch[1] : '';
        
        if (indexUrl) {
          console.error('\n\n🔥🔥🔥 CLICK THIS LINK TO CREATE THE INDEX 🔥🔥🔥');
          console.error(indexUrl);
          alert('🔥 INDEX REQUIRED!\n\nClick the link in console to create index for studentMarks.');
        }
      }
      
      setErrorMessage(`Failed to load student marks: ${error?.message || 'Unknown error'}`);
    }
  };

  const verifyMarks = async (marksEntry: StudentMarks, remarks?: string) => {
    try {
      const marksRef = doc(db, 'studentMarks', marksEntry.id);
      await setDoc(marksRef, {
        ...marksEntry,
        status: 'verified',
        verifiedBy: user?.displayName || 'Teacher',
        verifiedAt: Timestamp.now(),
        remarks: remarks || '',
      }, { merge: true });

      setSuccessMessage('Marks verified successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      loadStudentMarks();
    } catch (error) {
      console.error('Error verifying marks:', error);
      setErrorMessage('Failed to verify marks.');
    }
  };

  const rejectMarks = async (marksEntry: StudentMarks, reason: string) => {
    if (!reason.trim()) {
      setErrorMessage('Please provide a reason for rejection.');
      return;
    }

    try {
      const marksRef = doc(db, 'studentMarks', marksEntry.id);
      await setDoc(marksRef, {
        ...marksEntry,
        status: 'rejected',
        verifiedBy: user?.displayName || 'Teacher',
        verifiedAt: Timestamp.now(),
        remarks: reason,
      }, { merge: true });

      setSuccessMessage('Marks rejected successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      loadStudentMarks();
    } catch (error) {
      console.error('Error rejecting marks:', error);
      setErrorMessage('Failed to reject marks.');
    }
  };

  const deleteMarks = async (marksEntry: StudentMarks) => {
    if (!confirm(`Are you sure you want to delete marks for ${marksEntry.studentName} (${marksEntry.subject} - ${marksEntry.examType})?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'studentMarks', marksEntry.id));
      setSuccessMessage('Marks deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      loadStudentMarks();
    } catch (error) {
      console.error('Error deleting marks:', error);
      setErrorMessage('Failed to delete marks.');
    }
  };

  // Quiz Management Functions
  const loadQuizzes = async () => {
    if (!selectedClass) return;

    try {
      const quizzesRef = collection(db, 'quizzes');
      const q = query(
        quizzesRef,
        where('class', '==', selectedClass),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const quizzesList: Quiz[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        quizzesList.push({
          id: doc.id,
          title: data.title,
          description: data.description,
          subject: data.subject,
          class: data.class,
          duration: data.duration,
          totalMarks: data.totalMarks,
          questions: data.questions,
          createdBy: data.createdBy,
          createdAt: data.createdAt?.toDate(),
          status: data.status || 'active',
        });
      });
      
      setQuizzes(quizzesList);
      
      // Load submissions for these quizzes
      loadQuizSubmissions();
    } catch (error: any) {
      console.error('Error loading quizzes:', error);
      
      if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
        const errorMessage = error?.message || '';
        const indexUrlMatch = errorMessage.match(/(https:\/\/console\.firebase\.google\.com[^\s]+)/);
        const indexUrl = indexUrlMatch ? indexUrlMatch[1] : '';
        
        if (indexUrl) {
          console.error('\n\n🔥🔥🔥 CLICK THIS LINK TO CREATE THE INDEX 🔥🔥🔥');
          console.error(indexUrl);
          alert('🔥 INDEX REQUIRED!\n\nClick the link in console to create index for quizzes.');
        }
      }
      
      setErrorMessage(`Failed to load quizzes: ${error?.message || 'Unknown error'}`);
    }
  };

  const loadQuizSubmissions = async () => {
    if (!selectedClass) return;

    try {
      console.log('Loading quiz submissions for class:', selectedClass);
      const submissionsRef = collection(db, 'quizSubmissions');
      const q = query(
        submissionsRef,
        where('class', '==', selectedClass),
        orderBy('submittedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const submissionsList: QuizSubmission[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Submission found:', {
          id: doc.id,
          quizId: data.quizId,
          studentName: data.studentName,
          rollNumber: data.rollNumber,
          class: data.class
        });
        submissionsList.push({
          id: doc.id,
          quizId: data.quizId,
          quizTitle: data.quizTitle,
          studentId: data.studentId,
          studentName: data.studentName,
          rollNumber: data.rollNumber,
          class: data.class,
          answers: data.answers,
          score: data.score,
          totalMarks: data.totalMarks,
          submittedAt: data.submittedAt?.toDate(),
        });
      });
      
      console.log('Total quiz submissions loaded:', submissionsList.length);
      setQuizSubmissions(submissionsList);
    } catch (error: any) {
      console.error('Error loading quiz submissions:', error);
      
      // Fallback without orderBy if index doesn't exist
      if (error?.code === 'failed-precondition' || error?.message?.includes('index')) {
        console.log('Trying fallback query without orderBy...');
        try {
          const submissionsRef = collection(db, 'quizSubmissions');
          const q = query(
            submissionsRef,
            where('class', '==', selectedClass)
          );
          
          const querySnapshot = await getDocs(q);
          const submissionsList: QuizSubmission[] = [];
          
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            console.log('Submission found (fallback):', {
              id: doc.id,
              quizId: data.quizId,
              studentName: data.studentName
            });
            submissionsList.push({
              id: doc.id,
              quizId: data.quizId,
              quizTitle: data.quizTitle,
              studentId: data.studentId,
              studentName: data.studentName,
              rollNumber: data.rollNumber,
              class: data.class,
              answers: data.answers,
              score: data.score,
              totalMarks: data.totalMarks,
              submittedAt: data.submittedAt?.toDate(),
            });
          });
          
          // Sort by submittedAt manually
          submissionsList.sort((a, b) => {
            const dateA = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
            const dateB = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
            return dateB - dateA; // Descending order
          });
          
          setQuizSubmissions(submissionsList);
          
          console.log('Quiz submissions loaded without orderBy (fallback):', submissionsList.length);
        } catch (fallbackError) {
          console.error('Fallback error loading quiz submissions:', fallbackError);
        }
      }
    }
  };

  const addQuestion = (type: 'mcq' | 'true-false' | 'fill-blank' = 'mcq') => {
    const newQuestion: QuizQuestion = {
      type,
      question: '',
      correctAnswer: type === 'fill-blank' ? '' : 0,
      points: 1,
    };
    
    // Add options for MCQ and True/False
    if (type === 'mcq') {
      newQuestion.options = ['', '', '', ''];
    } else if (type === 'true-false') {
      newQuestion.options = ['True', 'False'];
    }
    
    setQuizQuestions([...quizQuestions, newQuestion]);
  };

  const removeQuestion = (index: number) => {
    if (quizQuestions.length === 1) {
      setErrorMessage('Quiz must have at least one question');
      return;
    }
    setQuizQuestions(quizQuestions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, field: 'question' | 'correctAnswer' | 'points' | 'type', value: string | number) => {
    const updated = [...quizQuestions];
    if (field === 'question') {
      updated[index].question = value as string;
    } else if (field === 'correctAnswer') {
      updated[index].correctAnswer = value;
    } else if (field === 'points') {
      updated[index].points = value as number;
    } else if (field === 'type') {
      const newType = value as 'mcq' | 'true-false' | 'fill-blank';
      updated[index].type = newType;
      
      // Reset options and correctAnswer based on new type
      if (newType === 'mcq') {
        updated[index].options = ['', '', '', ''];
        updated[index].correctAnswer = 0;
      } else if (newType === 'true-false') {
        updated[index].options = ['True', 'False'];
        updated[index].correctAnswer = 0;
      } else {
        updated[index].options = undefined;
        updated[index].correctAnswer = '';
      }
    }
    setQuizQuestions(updated);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...quizQuestions];
    if (updated[questionIndex].options) {
      updated[questionIndex].options![optionIndex] = value;
      setQuizQuestions(updated);
    }
  };

  const createQuiz = async () => {
    if (!quizTitle.trim() || !quizSubject.trim() || !selectedClass) {
      setErrorMessage('Please fill in title and subject');
      return;
    }

    // Validate questions
    for (let i = 0; i < quizQuestions.length; i++) {
      const q = quizQuestions[i];
      if (!q.question.trim()) {
        setErrorMessage(`Question ${i + 1} is empty`);
        return;
      }
      
      // Validate based on question type
      if (q.type === 'mcq' || q.type === 'true-false') {
        if (q.options && q.options.some(opt => !opt.trim())) {
          setErrorMessage(`Question ${i + 1} has empty options`);
          return;
        }
      } else if (q.type === 'fill-blank') {
        if (typeof q.correctAnswer === 'string' && !q.correctAnswer.trim()) {
          setErrorMessage(`Question ${i + 1} has no correct answer`);
          return;
        }
      }
    }

    try {
      setCreatingQuiz(true);
      setErrorMessage('');

      const quizzesRef = collection(db, 'quizzes');
      const now = Timestamp.now();
      const newQuizData = {
        title: quizTitle.trim(),
        description: quizDescription.trim(),
        subject: quizSubject.trim(),
        class: selectedClass,
        duration: parseInt(quizDuration),
        totalMarks: parseInt(quizTotalMarks),
        questions: quizQuestions,
        createdBy: user?.displayName || 'Teacher',
        createdAt: now,
        status: 'draft', // Create as draft - teacher must manually publish
      };
      
      const docRef = await addDoc(quizzesRef, newQuizData);

      // Instantly update state without reloading from database
      const newQuiz: Quiz = {
        id: docRef.id,
        ...newQuizData,
        createdAt: now.toDate(),
        status: 'draft' as 'draft' | 'active' | 'closed',
      };
      setQuizzes([newQuiz, ...quizzes]);

      setSuccessMessage('Quiz created as draft! Review and click "Publish" to make it available to students.');
      setTimeout(() => setSuccessMessage(''), 5000);

      // Reset form
      setQuizTitle('');
      setQuizDescription('');
      setQuizSubject('');
      setQuizDuration('30');
      setQuizTotalMarks('10');
      setQuizQuestions([{ type: 'mcq', question: '', options: ['', '', '', ''], correctAnswer: 0, points: 1 }]);

      // No need to call loadQuizzes() - state is already updated!
    } catch (error) {
      console.error('Error creating quiz:', error);
      setErrorMessage('Failed to create quiz');
    } finally {
      setCreatingQuiz(false);
    }
  };

  const toggleQuizStatus = async (quiz: Quiz) => {
    try {
      const quizRef = doc(db, 'quizzes', quiz.id);
      let newStatus: 'draft' | 'active' | 'closed';
      let statusMessage: string;
      
      // Handle status transitions
      if (quiz.status === 'draft') {
        // Draft → Active (Publish)
        newStatus = 'active';
        statusMessage = 'Quiz published successfully! Students can now take this quiz.';
      } else if (quiz.status === 'active') {
        // Active → Closed (Close)
        newStatus = 'closed';
        statusMessage = 'Quiz closed! Students can no longer submit responses.';
      } else {
        // Closed → Active (Reopen)
        newStatus = 'active';
        statusMessage = 'Quiz reopened! Students can now take this quiz again.';
      }
      
      await setDoc(quizRef, {
        ...quiz,
        status: newStatus,
      }, { merge: true });

      setSuccessMessage(statusMessage);
      setTimeout(() => setSuccessMessage(''), 5000);
      loadQuizzes();
    } catch (error) {
      console.error('Error toggling quiz status:', error);
      setErrorMessage('Failed to update quiz status');
    }
  };

  const deleteQuiz = async (quiz: Quiz) => {
    if (!confirm(`Are you sure you want to delete quiz "${quiz.title}"?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'quizzes', quiz.id));
      setSuccessMessage('Quiz deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      loadQuizzes();
    } catch (error) {
      console.error('Error deleting quiz:', error);
      setErrorMessage('Failed to delete quiz');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return (
          <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
          </svg>
        );
      case 'ppt':
        return (
          <svg className="w-8 h-8 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V6.414A2 2 0 0016.414 5L13 1.586A2 2 0 0011.586 1H9z" />
          </svg>
        );
      case 'lecture':
        return (
          <svg className="w-8 h-8 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
          </svg>
        );
      case 'notes':
        return (
          <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
          </svg>
        );
      default:
        return (
          <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  // Load LMS materials when class changes
  useEffect(() => {
    if (selectedClass && activeTab === 'lms') {
      loadLearningMaterials();
    }
  }, [selectedClass, activeTab]);

  // Load assignments when class changes
  useEffect(() => {
    if (selectedClass && activeTab === 'assignments') {
      loadAssignments();
    }
  }, [selectedClass, activeTab]);

  // Load announcements when class changes
  useEffect(() => {
    if (selectedClass && activeTab === 'announcements') {
      loadAnnouncements();
    }
  }, [selectedClass, activeTab]);

  // Load roll numbers when class changes
  useEffect(() => {
    if (selectedClass && activeTab === 'manage-students') {
      loadRollNumbers();
    }
  }, [selectedClass, activeTab]);

  // Load student marks when class changes
  useEffect(() => {
    if (selectedClass && activeTab === 'marks') {
      loadStudentMarks();
    }
  }, [selectedClass, activeTab]);

  // Load quizzes when class changes
  useEffect(() => {
    if (selectedClass && activeTab === 'quiz') {
      loadQuizzes();
    }
  }, [selectedClass, activeTab]);

  // Calculate attendance stats when history or date range changes
  useEffect(() => {
    if (selectedClass && attendanceHistory.length > 0) {
      calculateAttendanceStats();
    }
  }, [selectedClass, attendanceHistory, dateRange, students]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      window.location.href = '/teacher-login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-xl font-semibold text-gray-700">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Enhanced Header with Gradient */}
      <header className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white shadow-2xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold tracking-tight">Teacher Dashboard</h1>
                <p className="text-xs md:text-sm text-white/80 mt-1">Attendance Management System</p>
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <div className="text-right hidden lg:block">
                <p className="text-sm text-white/80">Welcome back,</p>
                <p className="font-semibold text-sm">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-white/20 backdrop-blur-sm hover:bg-white/30 px-3 md:px-5 py-2 md:py-2.5 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 border border-white/30 text-sm md:text-base"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Elegant Tabs - Improved Grid Layout */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 md:gap-3 mb-8">
          <button
            onClick={() => setActiveTab('mark')}
            className={`col-span-1 px-3 py-3 rounded-xl font-semibold text-sm md:text-base transition-all duration-300 shadow-lg min-h-[80px] flex flex-col items-center justify-center gap-2 ${
              activeTab === 'mark'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white scale-105 shadow-indigo-500/50'
                : 'bg-white text-gray-800 hover:shadow-xl hover:scale-102 border border-gray-200'
            }`}
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span className="text-center leading-tight">Mark<br className="md:hidden" /> Attendance</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`col-span-1 px-3 py-3 rounded-xl font-semibold text-sm md:text-base transition-all duration-300 shadow-lg min-h-[80px] flex flex-col items-center justify-center gap-2 ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white scale-105 shadow-indigo-500/50'
                : 'bg-white text-gray-800 hover:shadow-xl hover:scale-102 border border-gray-200'
            }`}
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-center leading-tight">Attendance<br className="md:hidden" /> History</span>
          </button>
          <button
            onClick={() => setActiveTab('lms')}
            className={`col-span-1 px-3 py-3 rounded-xl font-semibold text-sm md:text-base transition-all duration-300 shadow-lg min-h-[80px] flex flex-col items-center justify-center gap-2 ${
              activeTab === 'lms'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white scale-105 shadow-indigo-500/50'
                : 'bg-white text-gray-800 hover:shadow-xl hover:scale-102 border border-gray-200'
            }`}
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-center leading-tight">Learning<br className="md:hidden" /> Materials</span>
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`col-span-1 px-3 py-3 rounded-xl font-semibold text-sm md:text-base transition-all duration-300 shadow-lg min-h-[80px] flex flex-col items-center justify-center gap-2 ${
              activeTab === 'assignments'
                ? 'bg-gradient-to-r from-pink-600 to-rose-600 text-white scale-105 shadow-pink-500/50'
                : 'bg-white text-gray-800 hover:shadow-xl hover:scale-102 border border-gray-200'
            }`}
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            <span className="text-center leading-tight">Assignments</span>
          </button>
          <button
            onClick={() => setActiveTab('announcements')}
            className={`col-span-1 px-3 py-3 rounded-xl font-semibold text-sm md:text-base transition-all duration-300 shadow-lg min-h-[80px] flex flex-col items-center justify-center gap-2 ${
              activeTab === 'announcements'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white scale-105 shadow-amber-500/50'
                : 'bg-white text-gray-800 hover:shadow-xl hover:scale-102 border border-gray-200'
            }`}
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
            <span className="text-center leading-tight">Announcements</span>
          </button>
          <button
            onClick={() => setActiveTab('manage-students')}
            className={`col-span-1 px-3 py-3 rounded-xl font-semibold text-sm md:text-base transition-all duration-300 shadow-lg min-h-[80px] flex flex-col items-center justify-center gap-2 ${
              activeTab === 'manage-students'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white scale-105 shadow-blue-500/50'
                : 'bg-white text-gray-700 hover:shadow-xl hover:scale-102'
            }`}
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="text-center leading-tight">Manage<br className="md:hidden" /> Students</span>
          </button>
          <button
            onClick={() => setActiveTab('marks')}
            className={`col-span-1 px-3 py-3 rounded-xl font-semibold text-sm md:text-base transition-all duration-300 shadow-lg min-h-[80px] flex flex-col items-center justify-center gap-2 ${
              activeTab === 'marks'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white scale-105 shadow-purple-500/50'
                : 'bg-white text-gray-700 hover:shadow-xl hover:scale-102'
            }`}
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span className="text-center leading-tight">Marks<br className="md:hidden" /> Verification</span>
          </button>
          <button
            onClick={() => setActiveTab('quiz')}
            className={`col-span-1 px-3 py-3 rounded-xl font-semibold text-sm md:text-base transition-all duration-300 shadow-lg min-h-[80px] flex flex-col items-center justify-center gap-2 ${
              activeTab === 'quiz'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white scale-105 shadow-cyan-500/50'
                : 'bg-white text-gray-700 hover:shadow-xl hover:scale-102'
            }`}
          >
            <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-center leading-tight">Quiz</span>
          </button>
        </div>

        {/* Class Selection Card */}
        <div className="bg-white p-4 md:p-6 rounded-2xl shadow-xl mb-6 border border-indigo-100">
          <label className="block text-base md:text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Select Class
          </label>
          {assignedClasses.length > 0 ? (
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full md:w-96 p-4 border-2 border-indigo-200 rounded-xl focus:ring-4 focus:ring-indigo-300 focus:border-indigo-500 outline-none transition-all text-lg font-semibold bg-gradient-to-r from-white to-indigo-50 text-gray-900"
            >
              {assignedClasses.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          ) : (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
              <p className="text-red-600 font-semibold flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                No classes assigned. Please contact administrator.
              </p>
            </div>
          )}
        </div>

        {/* Enhanced Messages */}
        {successMessage && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 text-green-800 px-6 py-4 rounded-2xl mb-6 shadow-lg animate-pulse">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-semibold">{successMessage}</span>
            </div>
          </div>
        )}
        {errorMessage && (
          <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-300 text-red-800 px-6 py-4 rounded-2xl mb-6 shadow-lg">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-semibold">{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Mark Attendance Tab */}
        {activeTab === 'mark' && (
          <div className="bg-white p-4 md:p-6 lg:p-8 rounded-2xl shadow-2xl border border-indigo-100">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-3">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-3 rounded-xl text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                Mark Attendance - {selectedClass}
              </h2>
              <div className="flex gap-3">
                <button
                  onClick={markAllPresent}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Mark All Present
                </button>
                <button
                  onClick={markAllAbsent}
                  className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Mark All Absent
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border-2 border-indigo-100">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                  <tr>
                    <th className="p-4 text-left font-bold">Roll No.</th>
                    <th className="p-4 text-left font-bold">Student Name</th>
                    <th className="p-4 text-left font-bold">Parent Email</th>
                    <th className="p-4 text-center font-bold">Status</th>
                    <th className="p-4 text-center font-bold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {students.map((student, index) => (
                    <tr key={student.id} className={`hover:bg-indigo-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="p-4">
                        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-indigo-800 font-bold">
                          {student.rollNumber}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold shadow-md">
                            {student.name.charAt(0)}
                          </div>
                          <span className="font-semibold text-gray-900">{student.name}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        {editingEmail === student.id ? (
                          <div className="flex gap-2">
                            <input
                              type="email"
                              value={tempEmail}
                              onChange={(e) => setTempEmail(e.target.value)}
                              className="border-2 border-indigo-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-indigo-500 outline-none"
                              placeholder="parent@example.com"
                            />
                            <button
                              onClick={() => {
                                updateParentEmail(student.id, tempEmail);
                                setEditingEmail(null);
                              }}
                              className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:shadow-lg transition-all"
                            >
                              ✓ Save
                            </button>
                            <button
                              onClick={() => setEditingEmail(null)}
                              className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:shadow-lg transition-all"
                            >
                              × Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-700 flex items-center gap-2">
                              <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              {student.parentEmail}
                            </span>
                            <button
                              onClick={() => {
                                setEditingEmail(student.id);
                                setTempEmail(student.parentEmail);
                              }}
                              className="text-blue-600 hover:text-blue-800 text-sm font-semibold bg-blue-50 px-3 py-1 rounded-lg hover:bg-blue-100 transition-all"
                            >
                              ✎ Edit
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-5 py-2 rounded-xl text-sm font-bold shadow-md ${
                            attendance[student.id] === 'present'
                              ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white'
                              : 'bg-gradient-to-r from-red-400 to-pink-500 text-white'
                          }`}
                        >
                          {attendance[student.id] === 'present' ? '✓ Present' : '✗ Absent'}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => setAttendance({ ...attendance, [student.id]: 'present' })}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                              attendance[student.id] === 'present'
                                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg scale-105'
                                : 'bg-gray-200 text-gray-600 hover:bg-green-100 hover:text-green-700'
                            }`}
                          >
                            Present
                          </button>
                          <button
                            onClick={() => setAttendance({ ...attendance, [student.id]: 'absent' })}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
                              attendance[student.id] === 'absent'
                                ? 'bg-gradient-to-r from-red-500 to-pink-600 text-white shadow-lg scale-105'
                                : 'bg-gray-200 text-gray-600 hover:bg-red-100 hover:text-red-700'
                            }`}
                          >
                            Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-8 flex justify-end gap-4">
              <button
                onClick={submitAttendance}
                disabled={loading}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-10 py-4 rounded-xl font-bold text-lg shadow-2xl hover:shadow-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center gap-3"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Submit Attendance
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Attendance History Tab */}
        {activeTab === 'history' && (
          <div className="bg-white p-4 md:p-6 lg:p-8 rounded-2xl shadow-2xl border border-indigo-100">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
              <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-3">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-3 rounded-xl text-white">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                {showAnalytics ? 'Attendance Analytics' : 'Attendance History'} - {selectedClass}
              </h2>
              <div className="flex items-center gap-4">
                {/* View Toggle Button */}
                <button
                  onClick={() => setShowAnalytics(!showAnalytics)}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg font-bold flex items-center gap-2"
                >
                  {showAnalytics ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Daily View
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      Analytics View
                    </>
                  )}
                </button>
                
                {!showAnalytics && (
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-semibold text-gray-700">Select Date:</label>
                    <input
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="p-3 border-2 border-indigo-200 rounded-xl focus:ring-4 focus:ring-indigo-300 focus:border-indigo-500 outline-none transition-all font-semibold"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Analytics View */}
            {showAnalytics && (
              <div>
                {/* Date Range Filter */}
                <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-200">
                  <div className="flex items-center gap-6">
                    <label className="text-sm font-bold text-gray-700">Date Range (Optional):</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                        className="p-3 border-2 border-blue-200 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 outline-none transition-all text-gray-900 font-medium"
                        placeholder="Start Date"
                      />
                      <span className="text-gray-800 font-bold">to</span>
                      <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                        className="p-3 border-2 border-blue-200 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 outline-none transition-all text-gray-900 font-medium"
                        placeholder="End Date"
                      />
                      {(dateRange.start || dateRange.end) && (
                        <button
                          onClick={() => setDateRange({ start: '', end: '' })}
                          className="px-4 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-all font-bold"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {attendanceStats.length === 0 ? (
                  <div className="text-center py-16">
                    <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p className="text-xl text-gray-500 font-semibold">No attendance data available</p>
                    <p className="text-sm text-gray-400 mt-2">Mark attendance to see analytics</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border-2 border-green-200">
                        <div className="flex items-center gap-3 mb-2">
                          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm font-bold text-gray-700">High Attendance (≥75%)</span>
                        </div>
                        <p className="text-3xl font-bold text-green-600">
                          {attendanceStats.filter(s => s.percentage >= 75).length}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-red-50 to-pink-50 p-6 rounded-xl border-2 border-red-200">
                        <div className="flex items-center gap-3 mb-2">
                          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-sm font-bold text-gray-600">Low Attendance (&lt;75%)</span>
                        </div>
                        <p className="text-3xl font-bold text-red-600">
                          {attendanceStats.filter(s => s.percentage < 75).length}
                        </p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-200">
                        <div className="flex items-center gap-3 mb-2">
                          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span className="text-sm font-bold text-gray-700">Total Students</span>
                        </div>
                        <p className="text-3xl font-bold text-blue-600">{attendanceStats.length}</p>
                      </div>
                    </div>

                    {/* Student Attendance Cards with Graph */}
                    <div className="space-y-4">
                      {attendanceStats.map((stat) => {
                        const student = students.find(s => s.id === stat.studentId);
                        const isExpanded = expandedStudentId === stat.studentId;
                        
                        return (
                          <div
                            key={stat.studentId}
                            className={`rounded-xl border-2 p-6 transition-all ${
                              stat.percentage < 75
                                ? 'bg-gradient-to-r from-red-50 to-pink-50 border-red-300 shadow-lg'
                                : 'bg-white border-gray-200 hover:border-indigo-300'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-md ${
                                  stat.percentage < 75 ? 'bg-gradient-to-br from-red-400 to-pink-500' : 'bg-gradient-to-br from-purple-400 to-pink-400'
                                }`}>
                                  {stat.studentName.charAt(0)}
                                </div>
                                <div>
                                  <h3 className="text-lg font-bold text-gray-900">{stat.studentName}</h3>
                                  <p className="text-sm text-gray-700 font-medium">Roll No: {stat.rollNumber}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <div className={`text-3xl font-bold mb-1 ${
                                    stat.percentage < 75 ? 'text-red-600' : 'text-green-600'
                                  }`}>
                                    {stat.percentage}%
                                  </div>
                                  <div className="text-sm text-gray-700 font-semibold">
                                    {stat.presentDays}/{stat.totalDays} days present
                                  </div>
                                </div>
                                {/* View Details Button */}
                                <button
                                  onClick={() => setExpandedStudentId(isExpanded ? null : stat.studentId)}
                                  className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md font-bold text-sm flex items-center gap-2"
                                >
                                  {isExpanded ? (
                                    <>
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                      </svg>
                                      Hide Details
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                      </svg>
                                      View Details
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* Percentage Bar */}
                            <div className="mb-4">
                              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    stat.percentage < 75
                                      ? 'bg-gradient-to-r from-red-500 to-pink-500'
                                      : 'bg-gradient-to-r from-green-500 to-emerald-500'
                                  }`}
                                  style={{ width: `${Math.min(stat.percentage, 100)}%` }}
                                />
                              </div>
                            </div>

                            {/* Expanded Daily Attendance Details */}
                            {isExpanded && (
                              <div className="mt-6 bg-white rounded-lg border-2 border-indigo-200 p-6">
                                <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                  </svg>
                                  Individual Attendance Record
                                </h4>
                                
                                {/* Daily Records Table */}
                                <div className="overflow-x-auto">
                                  <table className="w-full">
                                    <thead className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white">
                                      <tr>
                                        <th className="p-3 text-left font-bold rounded-tl-lg">Date</th>
                                        <th className="p-3 text-center font-bold">Day</th>
                                        <th className="p-3 text-center font-bold rounded-tr-lg">Status</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                      {stat.dailyRecords.map((record, idx) => {
                                        const date = new Date(record.date);
                                        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                                        
                                        return (
                                          <tr key={idx} className={`${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'} hover:bg-indigo-50 transition-colors`}>
                                            <td className="p-3 text-gray-900 font-semibold">{record.date}</td>
                                            <td className="p-3 text-center text-gray-700 font-medium">{dayName}</td>
                                            <td className="p-3 text-center">
                                              <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                                record.status === 'present'
                                                  ? 'bg-green-100 text-green-700'
                                                  : 'bg-red-100 text-red-700'
                                              }`}>
                                                {record.status === 'present' ? '✓ Present' : '✗ Absent'}
                                              </span>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>

                                {/* Summary Stats */}
                                <div className="mt-4 grid grid-cols-3 gap-4">
                                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                    <p className="text-sm text-gray-600 font-semibold">Total Days</p>
                                    <p className="text-2xl font-bold text-blue-600">{stat.totalDays}</p>
                                  </div>
                                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                                    <p className="text-sm text-gray-600 font-semibold">Present</p>
                                    <p className="text-2xl font-bold text-green-600">{stat.presentDays}</p>
                                  </div>
                                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                    <p className="text-sm text-gray-600 font-semibold">Absent</p>
                                    <p className="text-2xl font-bold text-red-600">{stat.absentDays}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Daily Attendance Graph (Collapsed View) */}
                            {!isExpanded && (
                              <div>
                                <h4 className="text-sm font-bold text-gray-700 mb-3">Daily Attendance Preview:</h4>
                                <div className="flex gap-1 flex-wrap">
                                  {stat.dailyRecords.slice(0, 30).map((record, idx) => (
                                    <div key={idx} className="group relative">
                                      <div
                                        className={`w-8 h-8 rounded ${
                                          record.status === 'present'
                                            ? 'bg-green-500 hover:bg-green-600'
                                            : 'bg-red-500 hover:bg-red-600'
                                        } transition-all cursor-pointer`}
                                        title={`${record.date}: ${record.status}`}
                                      />
                                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                                        <div className="font-bold">{record.date}</div>
                                        <div>{record.status === 'present' ? '✓ Present' : '✗ Absent'}</div>
                                      </div>
                                    </div>
                                  ))}
                                  {stat.dailyRecords.length > 30 && (
                                    <div className="flex items-center justify-center w-8 h-8 rounded bg-gray-300 text-gray-600 text-xs font-bold">
                                      +{stat.dailyRecords.length - 30}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 mt-3 text-xs">
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                                    <span className="text-gray-600 font-semibold">Present</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 bg-red-500 rounded"></div>
                                    <span className="text-gray-600 font-semibold">Absent</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Warning Badge for Low Attendance */}
                            {stat.percentage < 75 && (
                              <div className="mt-4 bg-red-100 border-2 border-red-300 rounded-lg p-3 flex items-center gap-3">
                                <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <div>
                                  <p className="text-red-800 font-bold">⚠️ Low Attendance Alert</p>
                                  <p className="text-red-700 text-sm">Attendance below 75% - Immediate action required</p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Daily History View */}
            {!showAnalytics && (
              <>
                {attendanceHistory.length === 0 ? (
                  <div className="text-center py-16">
                    <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-xl text-gray-500 font-semibold">No attendance records found for the selected date</p>
                    <p className="text-sm text-gray-400 mt-2">Try selecting a different date</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border-2 border-indigo-100">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                        <tr>
                          <th className="p-4 text-left font-bold">Roll No.</th>
                          <th className="p-4 text-left font-bold">Student Name</th>
                          <th className="p-4 text-center font-bold">Status</th>
                          <th className="p-4 text-left font-bold">Date</th>
                          <th className="p-4 text-left font-bold">Marked By</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {attendanceHistory.map((record, index) => (
                          <tr key={record.id} className={`hover:bg-indigo-50 transition-colors duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                            <td className="p-4">
                              <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 text-indigo-800 font-bold">
                                {record.rollNumber}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold shadow-md">
                                  {record.studentName.charAt(0)}
                                </div>
                                <span className="font-semibold text-gray-800">{record.studentName}</span>
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <span
                                className={`px-5 py-2 rounded-xl text-sm font-bold shadow-md ${
                                  record.status === 'present'
                                    ? 'bg-gradient-to-r from-green-400 to-emerald-500 text-white'
                                    : 'bg-gradient-to-r from-red-400 to-pink-500 text-white'
                                }`}
                              >
                                {record.status === 'present' ? '✓ Present' : '✗ Absent'}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-2 text-gray-700">
                                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="font-semibold">{record.date}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span className="text-sm text-gray-700 font-medium">{record.markedBy}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
          </div>
        )}

        {/* LMS Tab */}
        {activeTab === 'lms' && (
          <div className="bg-white rounded-3xl shadow-2xl p-8 border border-purple-100">
            <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-3">
              <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Share Learning Materials via Google Drive
            </h2>

            {/* Upload Form */}
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 mb-8 border-2 border-dashed border-indigo-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Title Input */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Material Title *</label>
                  <input
                    type="text"
                    value={materialTitle}
                    onChange={(e) => setMaterialTitle(e.target.value)}
                    placeholder="e.g., Chapter 5 - Physics"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none text-gray-900 placeholder-gray-500 font-medium"
                    disabled={uploading}
                  />
                </div>

                {/* Subject Input */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Subject *</label>
                  <input
                    type="text"
                    value={materialSubject}
                    onChange={(e) => setMaterialSubject(e.target.value)}
                    placeholder="e.g., Physics, Mathematics"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none text-gray-900 placeholder-gray-500 font-medium"
                    disabled={uploading}
                  />
                </div>
              </div>

              {/* Description Input */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                <textarea
                  value={materialDescription}
                  onChange={(e) => setMaterialDescription(e.target.value)}
                  placeholder="Brief description of the material..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none resize-none text-gray-900 placeholder-gray-500 font-medium"
                  disabled={uploading}
                />
              </div>

              {/* Material Type */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-3">Material Type</label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {(['pdf', 'ppt', 'lecture', 'notes', 'other'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setMaterialType(type)}
                      disabled={uploading}
                      className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                        materialType === type
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg scale-105'
                          : 'bg-white text-gray-700 hover:shadow-md hover:scale-102'
                      }`}
                    >
                      {type.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Google Drive Link Input */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Google Drive Link * 
                  <span className="text-xs font-normal text-gray-500 ml-2">(Share link to your file)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z"/>
                    </svg>
                  </div>
                  <input
                    type="url"
                    value={driveLink}
                    onChange={(e) => setDriveLink(e.target.value)}
                    placeholder="https://drive.google.com/file/d/..."
                    disabled={uploading}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all outline-none text-gray-900 placeholder-gray-500 font-medium"
                  />
                </div>
                <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800 font-semibold mb-1">📌 How to get Google Drive link:</p>
                  <ol className="text-xs text-blue-700 space-y-1 ml-4 list-decimal">
                    <li>Upload file to Google Drive</li>
                    <li>Right-click → "Share" → "Anyone with the link"</li>
                    <li>Copy the link and paste it here</li>
                  </ol>
                </div>
              </div>

              {/* Upload Button */}
              <div className="space-y-3">
                {/* Debug Info */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs">
                  <p className="font-bold text-yellow-800 mb-2">🔍 Debug Info:</p>
                  <div className="space-y-1 text-yellow-700">
                    <p>✓ Title filled: {materialTitle.trim() ? '✅ Yes' : '❌ No'}</p>
                    <p>✓ Subject filled: {materialSubject.trim() ? '✅ Yes' : '❌ No'}</p>
                    <p>✓ Drive link filled: {driveLink.trim() ? '✅ Yes' : '❌ No'}</p>
                    <p>✓ Class selected: {selectedClass ? `✅ ${selectedClass}` : '❌ No'}</p>
                    <p>✓ Uploading: {uploading ? '⏳ Yes' : '✅ No'}</p>
                    <p className="font-bold mt-2">Button Status: {(uploading || !driveLink.trim() || !materialTitle.trim() || !materialSubject.trim()) ? '🔒 DISABLED' : '✅ ENABLED'}</p>
                  </div>
                </div>
                
                <button
                  onClick={uploadLearningMaterial}
                  disabled={uploading || !driveLink.trim() || !materialTitle.trim() || !materialSubject.trim()}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                {uploading ? (
                  <>
                    <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adding Material...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Add Material Link
                  </>
                )}
              </button>
            </div>
            
            {/* Close Upload Form Div */}
            </div>

            {/* Materials List */}
            <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Uploaded Materials ({learningMaterials.length})
            </h3>

            {learningMaterials.length === 0 ? (
              <div className="text-center py-16">
                <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <p className="text-gray-500 text-lg">No materials uploaded yet</p>
                <p className="text-gray-400 text-sm mt-2">Upload your first learning material above</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {learningMaterials.map((material) => (
                  <div
                    key={material.id}
                    className="bg-white border-2 border-gray-200 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 hover:border-indigo-300"
                  >
                    {/* File Icon */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-3 rounded-xl">
                        {getFileIcon(material.type)}
                      </div>
                      <span className="px-3 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold rounded-full">
                        {material.type.toUpperCase()}
                      </span>
                    </div>

                    {/* Material Info */}
                    <h4 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2">{material.title}</h4>
                    <p className="text-sm text-gray-700 mb-3 line-clamp-2 font-medium">{material.description || 'No description'}</p>

                    {/* Meta Info */}
                    <div className="space-y-2 mb-4 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <span className="font-semibold">{material.subject}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <span>{material.fileName}</span>
                      </div>
                      {material.fileSize > 0 && (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                          </svg>
                          <span>{formatFileSize(material.fileSize)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z"/>
                        </svg>
                        <span className="text-xs">Google Drive</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>{material.uploadedAt.toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <a
                        href={material.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-2 px-4 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all font-semibold text-sm text-center flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View
                      </a>
                      <button
                        onClick={() => deleteLearningMaterial(material)}
                        className="bg-gradient-to-r from-red-500 to-pink-600 text-white py-2 px-4 rounded-xl hover:from-red-600 hover:to-pink-700 transition-all font-semibold text-sm flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Assignments Tab */}
        {activeTab === 'assignments' && (
          <div className="bg-white rounded-3xl shadow-2xl p-8 border border-pink-100">
            <h2 className="text-3xl font-bold mb-8 bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent flex items-center gap-3">
              <svg className="w-8 h-8 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Create & Manage Assignments
            </h2>

            {/* Create Assignment Form */}
            <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-8 mb-8 border-2 border-dashed border-pink-300">
              <h3 className="text-xl font-bold text-gray-900 mb-6">Create New Assignment</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Title */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Assignment Title *</label>
                  <input
                    type="text"
                    value={assignmentTitle}
                    onChange={(e) => setAssignmentTitle(e.target.value)}
                    placeholder="e.g., Math Assignment - Chapter 5"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:ring-4 focus:ring-pink-100 transition-all outline-none text-gray-900 placeholder-gray-500 font-medium"
                    disabled={creatingAssignment}
                  />
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Subject *</label>
                  <input
                    type="text"
                    value={assignmentSubject}
                    onChange={(e) => setAssignmentSubject(e.target.value)}
                    placeholder="e.g., Mathematics"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:ring-4 focus:ring-pink-100 transition-all outline-none text-gray-900 placeholder-gray-500 font-medium"
                    disabled={creatingAssignment}
                  />
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Due Date *</label>
                  <input
                    type="datetime-local"
                    value={assignmentDueDate}
                    onChange={(e) => setAssignmentDueDate(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:ring-4 focus:ring-pink-100 transition-all outline-none text-gray-900 font-medium"
                    disabled={creatingAssignment}
                  />
                </div>

                {/* Max Marks */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Maximum Marks (Optional)</label>
                  <input
                    type="number"
                    value={assignmentMaxMarks}
                    onChange={(e) => setAssignmentMaxMarks(e.target.value)}
                    placeholder="e.g., 100"
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:ring-4 focus:ring-pink-100 transition-all outline-none text-gray-900 placeholder-gray-500 font-medium"
                    disabled={creatingAssignment}
                  />
                </div>
              </div>

              {/* Description */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
                <textarea
                  value={assignmentDescription}
                  onChange={(e) => setAssignmentDescription(e.target.value)}
                  placeholder="Describe the assignment, instructions, etc..."
                  rows={4}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:ring-4 focus:ring-pink-100 transition-all outline-none text-gray-900 placeholder-gray-500 font-medium"
                  disabled={creatingAssignment}
                />
              </div>

              {/* Google Drive Folder Link */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  📁 Drive Folder Link *
                  <span className="text-xs font-normal text-gray-500 ml-2">(Folder for assignment materials)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z"/>
                    </svg>
                  </div>
                  <input
                    type="url"
                    value={assignmentFolderLink}
                    onChange={(e) => setAssignmentFolderLink(e.target.value)}
                    placeholder="https://drive.google.com/drive/folders/..."
                    disabled={creatingAssignment}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:ring-4 focus:ring-pink-100 transition-all outline-none"
                  />
                </div>
              </div>

              {/* Google Drive PDF Link */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  📄 Assignment PDF Link *
                  <span className="text-xs font-normal text-gray-500 ml-2">(Direct link to assignment PDF)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z"/>
                    </svg>
                  </div>
                  <input
                    type="url"
                    value={assignmentPdfLink}
                    onChange={(e) => setAssignmentPdfLink(e.target.value)}
                    placeholder="https://drive.google.com/file/d/..."
                    disabled={creatingAssignment}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:ring-4 focus:ring-pink-100 transition-all outline-none"
                  />
                </div>
                <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800 font-semibold mb-1">📌 How to share assignment:</p>
                  <ol className="text-xs text-blue-700 space-y-1 ml-4 list-decimal">
                    <li>Upload assignment PDF to Google Drive</li>
                    <li>Right-click → "Share" → "Anyone with the link"</li>
                    <li>Copy the link and paste it here</li>
                  </ol>
                </div>
              </div>

              {/* Create Button */}
              <button
                onClick={createAssignment}
                disabled={creatingAssignment || !assignmentFolderLink.trim() || !assignmentPdfLink.trim() || !assignmentTitle.trim() || !assignmentSubject.trim() || !assignmentDueDate}
                className="w-full bg-gradient-to-r from-pink-600 to-rose-600 text-white py-4 rounded-xl hover:from-pink-700 hover:to-rose-700 transition-all duration-200 font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {creatingAssignment ? (
                  <>
                    <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Assignment...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Assignment
                  </>
                )}
              </button>
            </div>

            {/* Assignments List */}
            <h3 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
              <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Assignments ({assignments.length})
            </h3>

            {assignments.length === 0 ? (
              <div className="text-center py-16">
                <svg className="w-24 h-24 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-500 text-lg">No assignments created yet</p>
                <p className="text-gray-400 text-sm mt-2">Create your first assignment above</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className={`border-2 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 ${
                      assignment.status === 'expired'
                        ? 'bg-gray-50 border-gray-300'
                        : 'bg-white border-pink-200 hover:border-pink-400'
                    }`}
                  >
                    {/* Status Badge */}
                    <div className="flex items-start justify-between mb-4">
                      <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                        assignment.status === 'expired'
                          ? 'bg-gray-200 text-gray-700'
                          : 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                      }`}>
                        {assignment.status === 'expired' ? '⏰ EXPIRED' : '✅ ACTIVE'}
                      </span>
                      <span className="px-3 py-1 bg-pink-100 text-pink-700 text-xs font-bold rounded-full">
                        {assignment.subject}
                      </span>
                    </div>

                    {/* Assignment Info */}
                    <h4 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2">{assignment.title}</h4>
                    <p className="text-sm text-gray-700 mb-4 line-clamp-2 font-medium">{assignment.description || 'No description'}</p>

                    {/* Meta Info */}
                    <div className="space-y-2 mb-4 text-xs text-gray-600">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="font-semibold">Due: {assignment.dueDate.toLocaleString()}</span>
                      </div>
                      {assignment.maxMarks && (
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                          <span>Max Marks: {assignment.maxMarks}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12.545 10.239v3.821h5.445c-.712 2.315-2.647 3.972-5.445 3.972a6.033 6.033 0 110-12.064c1.498 0 2.866.549 3.921 1.453l2.814-2.814A9.969 9.969 0 0012.545 2C7.021 2 2.543 6.477 2.543 12s4.478 10 10.002 10c8.396 0 10.249-7.85 9.426-11.748l-9.426-.013z"/>
                        </svg>
                        <span className="text-xs">Google Drive</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      {/* Folder Link Button */}
                      <a
                        href={assignment.assignmentFolderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-2 px-4 rounded-xl hover:from-purple-600 hover:to-indigo-700 transition-all font-semibold text-sm text-center flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        📁 Open Folder
                      </a>
                      {/* PDF Link Button */}
                      <a
                        href={assignment.assignmentPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 text-white py-2 px-4 rounded-xl hover:from-blue-600 hover:to-cyan-700 transition-all font-semibold text-sm text-center flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        📄 View PDF
                      </a>
                      {/* Delete Button */}
                      <button
                        onClick={() => deleteAssignment(assignment)}
                        className="w-full bg-gradient-to-r from-red-500 to-pink-600 text-white py-2 px-4 rounded-xl hover:from-red-600 hover:to-pink-700 transition-all font-semibold text-sm flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Announcements Tab */}
        {activeTab === 'announcements' && (
          <div className="bg-white p-8 rounded-2xl shadow-xl border border-amber-100">
            <div className="flex items-center gap-3 mb-8">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                Class Announcements
              </h2>
            </div>

            {!selectedClass ? (
              <div className="text-center py-12 text-gray-500">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-xl">Please select a class to manage announcements</p>
              </div>
            ) : (
              <div>
                {/* Create Announcement Form */}
                <div className="mb-8 p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-200">
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create New Announcement
                  </h3>

                  <div className="space-y-4">
                    {/* Title */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Title *</label>
                      <input
                        type="text"
                        value={announcementTitle}
                        onChange={(e) => setAnnouncementTitle(e.target.value)}
                        placeholder="e.g., Important Notice, Exam Schedule Updated"
                        className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-4 focus:ring-amber-300 focus:border-amber-500 outline-none transition-all text-gray-900 placeholder-gray-500 font-medium"
                      />
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Priority *</label>
                      <select
                        value={announcementPriority}
                        onChange={(e) => setAnnouncementPriority(e.target.value as 'normal' | 'important' | 'urgent')}
                        className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-4 focus:ring-amber-300 focus:border-amber-500 outline-none transition-all text-gray-900 font-medium"
                      >
                        <option value="normal">Normal</option>
                        <option value="important">Important</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    {/* Message */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Message *</label>
                      <textarea
                        value={announcementMessage}
                        onChange={(e) => setAnnouncementMessage(e.target.value)}
                        placeholder="Write your announcement message here..."
                        rows={5}
                        className="w-full px-4 py-3 border-2 border-amber-200 rounded-xl focus:ring-4 focus:ring-amber-300 focus:border-amber-500 outline-none transition-all resize-none text-gray-900 placeholder-gray-500 font-medium"
                      />
                    </div>

                    {/* Create Button */}
                    <button
                      onClick={createAnnouncement}
                      disabled={creatingAnnouncement || !announcementTitle.trim() || !announcementMessage.trim()}
                      className="w-full bg-gradient-to-r from-amber-600 to-orange-600 text-white py-4 rounded-xl font-bold text-lg hover:from-amber-700 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                    >
                      {creatingAnnouncement ? (
                        <>
                          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Creating...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                          </svg>
                          Post Announcement
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Announcements List */}
                <div>
                  <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    All Announcements ({announcements.length})
                  </h3>

                  {announcements.length === 0 ? (
                    <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl">
                      <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p className="text-gray-500 text-lg">No announcements yet</p>
                      <p className="text-gray-400 text-sm mt-2">Create your first announcement using the form above</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {announcements.map((announcement) => (
                        <div
                          key={announcement.id}
                          className={`p-6 rounded-2xl border-2 shadow-lg transition-all hover:shadow-xl ${
                            announcement.priority === 'urgent'
                              ? 'bg-gradient-to-br from-red-50 to-orange-50 border-red-300'
                              : announcement.priority === 'important'
                              ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-300'
                              : 'bg-white border-gray-200'
                          }`}
                        >
                          {/* Header */}
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="text-xl font-bold text-gray-800">{announcement.title}</h4>
                                {announcement.priority === 'urgent' && (
                                  <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    URGENT
                                  </span>
                                )}
                                {announcement.priority === 'important' && (
                                  <span className="px-3 py-1 bg-amber-600 text-white text-xs font-bold rounded-full flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    IMPORTANT
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                  {announcement.createdBy}
                                </span>
                                <span className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  {announcement.createdAt.toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => deleteAnnouncement(announcement)}
                              className="ml-4 text-red-600 hover:text-red-800 hover:bg-red-100 p-2 rounded-lg transition-all"
                              title="Delete announcement"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>

                          {/* Message */}
                          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{announcement.message}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Manage Students Tab */}
        {activeTab === 'manage-students' && (
          <div className="space-y-6 animate-fadeIn">
            {!selectedClass ? (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-12 rounded-2xl text-center border-2 border-dashed border-blue-300">
                <svg className="w-20 h-20 mx-auto mb-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Select a Class</h3>
                <p className="text-gray-700 font-semibold">Please select a class to manage student roll numbers</p>
              </div>
            ) : (
              <div>
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 rounded-2xl shadow-2xl mb-8 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-3xl font-bold mb-2">Manage Student Roll Numbers</h2>
                      <p className="text-blue-100">Create unique roll numbers that students must use to register for {selectedClass}</p>
                    </div>
                    <svg className="w-16 h-16 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>

                {/* Add Roll Number Form */}
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-blue-100 mb-8">
                  <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                    <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add New Roll Number
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Roll Number *</label>
                      <input
                        type="text"
                        value={newRollNumber}
                        onChange={(e) => setNewRollNumber(e.target.value)}
                        placeholder="e.g., 001, 042"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                      />
                    </div>
                    
                    <div className="md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Student Name *</label>
                      <input
                        type="text"
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                        placeholder="e.g., Rahul Sharma"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>

                  <button
                    onClick={addRollNumber}
                    disabled={addingRollNumber || !newRollNumber.trim() || !newStudentName.trim()}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  >
                    {addingRollNumber ? (
                      <>
                        <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Adding...
                      </>
                    ) : (
                      <>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Roll Number
                      </>
                    )}
                  </button>
                </div>

                {/* Roll Numbers List */}
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-blue-100">
                  <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center justify-between">
                    <span className="flex items-center gap-3">
                      <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Roll Numbers for {selectedClass}
                    </span>
                    <span className="text-lg text-blue-600 bg-blue-50 px-4 py-2 rounded-lg">
                      Total: {rollNumbers.length}
                    </span>
                  </h3>

                  {rollNumbers.length === 0 ? (
                    <div className="text-center py-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border-2 border-dashed border-blue-200">
                      <svg className="w-20 h-20 mx-auto mb-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-gray-600 text-lg font-medium">No roll numbers created yet</p>
                      <p className="text-gray-500 text-sm mt-2">Add roll numbers above to get started</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-200">
                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Roll Number</th>
                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Student Name</th>
                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Status</th>
                            <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Created By</th>
                            <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rollNumbers.map((rollNumber, index) => (
                            <tr
                              key={rollNumber.id}
                              className={`border-b border-gray-200 hover:bg-blue-50 transition-colors ${
                                index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                              }`}
                            >
                              <td className="px-6 py-4">
                                <span className="font-mono font-bold text-blue-600 text-lg">
                                  {rollNumber.rollNumber}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className="font-medium text-gray-800">{rollNumber.studentName}</span>
                              </td>
                              <td className="px-6 py-4">
                                {rollNumber.isRegistered ? (
                                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    Registered
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-semibold">
                                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    Available
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-gray-600 text-sm">{rollNumber.createdBy}</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                {!rollNumber.isRegistered && (
                                  <button
                                    onClick={() => deleteRollNumber(rollNumber)}
                                    className="text-red-600 hover:text-red-800 hover:bg-red-100 p-2 rounded-lg transition-all"
                                    title="Delete roll number"
                                  >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Marks Verification Tab */}
        {activeTab === 'marks' && (
          <div className="space-y-8">
            {!selectedClass ? (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-12 rounded-3xl text-center border-2 border-purple-200">
                <svg className="w-20 h-20 text-purple-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <p className="text-2xl font-bold text-purple-700 mb-2">Select a Class</p>
                <p className="text-purple-600">Choose a class to view and verify student marks</p>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-3xl border-2 border-purple-200">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-bold text-purple-800 flex items-center gap-3">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Marks Verification - {selectedClass}
                  </h2>
                  <div className="flex gap-4">
                    <div className="bg-yellow-100 px-6 py-3 rounded-xl border-2 border-yellow-300">
                      <span className="text-yellow-800 font-bold text-lg">Pending: {pendingMarks.length}</span>
                    </div>
                    <div className="bg-green-100 px-6 py-3 rounded-xl border-2 border-green-300">
                      <span className="text-green-800 font-bold text-lg">Verified: {verifiedMarks.length}</span>
                    </div>
                  </div>
                </div>

                {/* Filters */}
                <div className="flex gap-4 mb-6">
                  <select
                    value={selectedSubjectFilter}
                    onChange={(e) => setSelectedSubjectFilter(e.target.value)}
                    className="px-4 py-2 border-2 border-purple-300 rounded-xl focus:ring-4 focus:ring-purple-200 outline-none"
                  >
                    <option value="all">All Subjects</option>
                    <option value="Mathematics">Mathematics</option>
                    <option value="Science">Science</option>
                    <option value="English">English</option>
                    <option value="Social Studies">Social Studies</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Computer Science">Computer Science</option>
                  </select>
                  <select
                    value={selectedExamTypeFilter}
                    onChange={(e) => setSelectedExamTypeFilter(e.target.value)}
                    className="px-4 py-2 border-2 border-purple-300 rounded-xl focus:ring-4 focus:ring-purple-200 outline-none"
                  >
                    <option value="all">All Exams</option>
                    <option value="unit-test-1">Unit Test 1</option>
                    <option value="unit-test-2">Unit Test 2</option>
                    <option value="unit-test-3">Unit Test 3</option>
                    <option value="half-yearly">Half Yearly</option>
                    <option value="annual">Annual</option>
                  </select>
                </div>

                {/* Pending Marks Section */}
                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-yellow-700 mb-4 flex items-center gap-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Pending Verification ({pendingMarks.filter(m => 
                      (selectedSubjectFilter === 'all' || m.subject === selectedSubjectFilter) &&
                      (selectedExamTypeFilter === 'all' || m.examType === selectedExamTypeFilter)
                    ).length})
                  </h3>
                  
                  {pendingMarks.filter(m => 
                    (selectedSubjectFilter === 'all' || m.subject === selectedSubjectFilter) &&
                    (selectedExamTypeFilter === 'all' || m.examType === selectedExamTypeFilter)
                  ).length === 0 ? (
                    <div className="bg-white p-8 rounded-xl text-center border-2 border-yellow-200">
                      <p className="text-gray-600 text-lg">No pending marks to verify</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {pendingMarks.filter(m => 
                        (selectedSubjectFilter === 'all' || m.subject === selectedSubjectFilter) &&
                        (selectedExamTypeFilter === 'all' || m.examType === selectedExamTypeFilter)
                      ).map((marks) => (
                        <div key={marks.id} className="bg-white p-6 rounded-xl shadow-lg border-2 border-yellow-300 hover:shadow-xl transition-all">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-4 mb-3">
                                <h4 className="text-xl font-bold text-gray-800">{marks.studentName}</h4>
                                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold">
                                  Roll No: {marks.rollNumber}
                                </span>
                                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-lg text-sm font-bold">
                                  PENDING
                                </span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                <div>
                                  <p className="text-sm text-gray-600">Subject</p>
                                  <p className="font-bold text-gray-800">{marks.subject}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">Exam Type</p>
                                  <p className="font-bold text-gray-800 capitalize">{marks.examType.replace(/-/g, ' ')}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">Marks</p>
                                  <p className="font-bold text-purple-600 text-xl">{marks.marksObtained} / {marks.totalMarks}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">Percentage</p>
                                  <p className="font-bold text-purple-600 text-xl">
                                    {((marks.marksObtained / marks.totalMarks) * 100).toFixed(1)}%
                                  </p>
                                </div>
                              </div>
                              <p className="text-sm text-gray-500">
                                Submitted on: {marks.submittedAt.toLocaleDateString()} at {marks.submittedAt.toLocaleTimeString()}
                              </p>
                            </div>
                            <div className="flex flex-col gap-2 ml-4">
                              <button
                                onClick={() => {
                                  const remarks = prompt('Add remarks (optional):');
                                  verifyMarks(marks, remarks || undefined);
                                }}
                                className="px-6 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-bold hover:from-green-600 hover:to-green-700 transition-all"
                              >
                                ✓ Verify
                              </button>
                              <button
                                onClick={() => {
                                  const reason = prompt('Enter reason for rejection:');
                                  if (reason) rejectMarks(marks, reason);
                                }}
                                className="px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-bold hover:from-red-600 hover:to-red-700 transition-all"
                              >
                                ✗ Reject
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Verified Marks Section */}
                <div>
                  <h3 className="text-2xl font-bold text-green-700 mb-4 flex items-center gap-2">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Verified Marks ({verifiedMarks.filter(m => 
                      (selectedSubjectFilter === 'all' || m.subject === selectedSubjectFilter) &&
                      (selectedExamTypeFilter === 'all' || m.examType === selectedExamTypeFilter)
                    ).length})
                  </h3>
                  
                  {verifiedMarks.filter(m => 
                    (selectedSubjectFilter === 'all' || m.subject === selectedSubjectFilter) &&
                    (selectedExamTypeFilter === 'all' || m.examType === selectedExamTypeFilter)
                  ).length === 0 ? (
                    <div className="bg-white p-8 rounded-xl text-center border-2 border-green-200">
                      <p className="text-gray-600 text-lg">No verified marks yet</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {verifiedMarks.filter(m => 
                        (selectedSubjectFilter === 'all' || m.subject === selectedSubjectFilter) &&
                        (selectedExamTypeFilter === 'all' || m.examType === selectedExamTypeFilter)
                      ).map((marks) => (
                        <div key={marks.id} className="bg-white p-6 rounded-xl shadow-lg border-2 border-green-300 hover:shadow-xl transition-all">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-4 mb-3">
                                <h4 className="text-xl font-bold text-gray-800">{marks.studentName}</h4>
                                <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold">
                                  Roll No: {marks.rollNumber}
                                </span>
                                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm font-bold">
                                  ✓ VERIFIED
                                </span>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                <div>
                                  <p className="text-sm text-gray-600">Subject</p>
                                  <p className="font-bold text-gray-800">{marks.subject}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">Exam Type</p>
                                  <p className="font-bold text-gray-800 capitalize">{marks.examType.replace(/-/g, ' ')}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">Marks</p>
                                  <p className="font-bold text-green-600 text-xl">{marks.marksObtained} / {marks.totalMarks}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-gray-600">Percentage</p>
                                  <p className="font-bold text-green-600 text-xl">
                                    {((marks.marksObtained / marks.totalMarks) * 100).toFixed(1)}%
                                  </p>
                                </div>
                              </div>
                              <div className="text-sm text-gray-500 space-y-1">
                                <p>Submitted: {marks.submittedAt.toLocaleDateString()} at {marks.submittedAt.toLocaleTimeString()}</p>
                                <p>Verified by: {marks.verifiedBy} on {marks.verifiedAt?.toLocaleDateString()}</p>
                                {marks.remarks && <p className="text-purple-600 font-semibold">Remarks: {marks.remarks}</p>}
                              </div>
                            </div>
                            <button
                              onClick={() => deleteMarks(marks)}
                              className="ml-4 text-red-600 hover:text-red-800 hover:bg-red-100 p-2 rounded-lg transition-all"
                              title="Delete marks"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quiz Tab */}
        {activeTab === 'quiz' && (
          <div className="space-y-6">
            {!selectedClass ? (
              <div className="text-center py-20 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl border-2 border-dashed border-cyan-200">
                <svg className="w-24 h-24 mx-auto mb-6 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">Select a Class</h3>
                <p className="text-gray-600">Please select a class to create and manage quizzes</p>
              </div>
            ) : (
              <div>
                <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-8 rounded-2xl shadow-2xl mb-8 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-3xl font-bold mb-2">Quiz Management</h2>
                      <p className="text-cyan-100">Create and manage quizzes for {selectedClass}</p>
                    </div>
                    <svg className="w-16 h-16 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                </div>

                {/* Create Quiz Form */}
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-cyan-100 mb-8">
                  <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                    <svg className="w-7 h-7 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create New Quiz
                  </h3>

                  <div className="space-y-6">
                    {/* Basic Quiz Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Quiz Title *</label>
                        <input
                          type="text"
                          value={quizTitle}
                          onChange={(e) => setQuizTitle(e.target.value)}
                          placeholder="e.g., Chapter 5 Quiz"
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-cyan-500 focus:outline-none transition-colors"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Subject *</label>
                        <input
                          type="text"
                          value={quizSubject}
                          onChange={(e) => setQuizSubject(e.target.value)}
                          placeholder="e.g., Mathematics"
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-cyan-500 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                      <textarea
                        value={quizDescription}
                        onChange={(e) => setQuizDescription(e.target.value)}
                        placeholder="Brief description of the quiz"
                        rows={3}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-cyan-500 focus:outline-none transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Duration (minutes)</label>
                        <input
                          type="number"
                          value={quizDuration}
                          onChange={(e) => setQuizDuration(e.target.value)}
                          min="1"
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-cyan-500 focus:outline-none transition-colors"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Total Marks</label>
                        <input
                          type="number"
                          value={quizTotalMarks}
                          onChange={(e) => setQuizTotalMarks(e.target.value)}
                          min="1"
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-cyan-500 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    {/* Questions Section */}
                    <div className="border-t-2 border-gray-200 pt-6 mt-6">
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-xl font-bold text-gray-800">Questions</h4>
                        <div className="flex gap-2">
                          <button
                            onClick={() => addQuestion('mcq')}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
                          >
                            + MCQ
                          </button>
                          <button
                            onClick={() => addQuestion('true-false')}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold"
                          >
                            + True/False
                          </button>
                          <button
                            onClick={() => addQuestion('fill-blank')}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-semibold"
                          >
                            + Fill-in-Blank
                          </button>
                        </div>
                      </div>

                      {quizQuestions.map((q, qIndex) => (
                        <div key={qIndex} className="bg-gray-50 p-6 rounded-xl mb-4 border-2 border-gray-200">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-bold text-gray-700">Q{qIndex + 1}</span>
                              <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                                q.type === 'mcq' ? 'bg-blue-100 text-blue-700' :
                                q.type === 'true-false' ? 'bg-green-100 text-green-700' :
                                'bg-purple-100 text-purple-700'
                              }`}>
                                {q.type === 'mcq' ? 'Multiple Choice' :
                                 q.type === 'true-false' ? 'True/False' :
                                 'Fill in the Blank'}
                              </span>
                            </div>
                            <button
                              onClick={() => removeQuestion(qIndex)}
                              className="text-red-600 hover:text-red-800 hover:bg-red-100 p-2 rounded-lg transition-all"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Question *</label>
                              <textarea
                                value={q.question}
                                onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                                placeholder="Enter your question"
                                rows={2}
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-cyan-500 focus:outline-none transition-colors"
                              />
                            </div>

                            {/* MCQ Options */}
                            {q.type === 'mcq' && q.options && (
                              <div className="space-y-3">
                                <label className="block text-sm font-semibold text-gray-700">Options *</label>
                                {q.options.map((option, oIndex) => (
                                  <div key={oIndex} className="flex items-center gap-3">
                                    <input
                                      type="radio"
                                      name={`correct-${qIndex}`}
                                      checked={q.correctAnswer === oIndex}
                                      onChange={() => updateQuestion(qIndex, 'correctAnswer', oIndex)}
                                      className="w-5 h-5 text-cyan-600"
                                    />
                                    <input
                                      type="text"
                                      value={option}
                                      onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                      placeholder={`Option ${String.fromCharCode(65 + oIndex)}`}
                                      className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-cyan-500 focus:outline-none transition-colors"
                                    />
                                  </div>
                                ))}
                                <p className="text-sm text-gray-600 italic">Select the radio button for the correct answer</p>
                              </div>
                            )}

                            {/* True/False Options */}
                            {q.type === 'true-false' && (
                              <div className="space-y-3">
                                <label className="block text-sm font-semibold text-gray-700">Correct Answer *</label>
                                <div className="flex gap-4">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`tf-${qIndex}`}
                                      checked={q.correctAnswer === 0}
                                      onChange={() => updateQuestion(qIndex, 'correctAnswer', 0)}
                                      className="w-5 h-5 text-green-600"
                                    />
                                    <span className="text-lg font-semibold text-green-700">True</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`tf-${qIndex}`}
                                      checked={q.correctAnswer === 1}
                                      onChange={() => updateQuestion(qIndex, 'correctAnswer', 1)}
                                      className="w-5 h-5 text-red-600"
                                    />
                                    <span className="text-lg font-semibold text-red-700">False</span>
                                  </label>
                                </div>
                              </div>
                            )}

                            {/* Fill-in-Blank Answer */}
                            {q.type === 'fill-blank' && (
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Correct Answer *</label>
                                <input
                                  type="text"
                                  value={q.correctAnswer as string}
                                  onChange={(e) => updateQuestion(qIndex, 'correctAnswer', e.target.value)}
                                  placeholder="Enter the correct answer"
                                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:outline-none transition-colors"
                                />
                                <p className="text-sm text-gray-600 italic mt-2">Answer matching is case-insensitive</p>
                              </div>
                            )}

                            {/* Points */}
                            <div className="w-32">
                              <label className="block text-sm font-semibold text-gray-700 mb-2">Points</label>
                              <input
                                type="number"
                                value={q.points}
                                onChange={(e) => updateQuestion(qIndex, 'points', parseInt(e.target.value) || 1)}
                                min="1"
                                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-cyan-500 focus:outline-none transition-colors"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={createQuiz}
                      disabled={creatingQuiz || !quizTitle.trim() || !quizSubject.trim()}
                      className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                      {creatingQuiz ? (
                        <>
                          <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Creating Quiz...
                        </>
                      ) : (
                        <>
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Create Quiz
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Existing Quizzes */}
                <div className="bg-white p-8 rounded-2xl shadow-xl border border-cyan-100">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                      <svg className="w-7 h-7 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Existing Quizzes
                    </h3>
                    <button
                      onClick={() => {
                        loadQuizzes();
                        loadQuizSubmissions();
                      }}
                      className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-sm font-semibold flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </button>
                  </div>

                  {quizzes.length === 0 ? (
                    <div className="text-center py-16 bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl border-2 border-dashed border-cyan-200">
                      <svg className="w-20 h-20 mx-auto mb-4 text-cyan-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <p className="text-gray-600 text-lg font-medium">No quizzes created yet</p>
                      <p className="text-gray-500 text-sm mt-2">Create your first quiz above</p>
                    </div>
                  ) : (
                    <div className="grid gap-6">
                      {quizzes.map((quiz) => (
                        <div key={quiz.id} className="bg-gradient-to-br from-cyan-50 to-blue-50 p-6 rounded-xl shadow-lg border-2 border-cyan-200 hover:shadow-xl transition-all">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="text-2xl font-bold text-gray-800 mb-2">{quiz.title}</h4>
                              {quiz.description && (
                                <p className="text-gray-600 mb-3">{quiz.description}</p>
                              )}
                              <div className="flex flex-wrap gap-3">
                                <span className="px-3 py-1 bg-cyan-100 text-cyan-800 rounded-lg text-sm font-semibold">
                                  {quiz.subject}
                                </span>
                                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm font-semibold">
                                  {quiz.duration} minutes
                                </span>
                                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-lg text-sm font-semibold">
                                  {quiz.totalMarks} marks
                                </span>
                                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm font-semibold">
                                  {quiz.questions.length} questions
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className={`px-4 py-2 rounded-lg text-sm font-bold ${
                                quiz.status === 'draft'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : quiz.status === 'active' 
                                    ? 'bg-green-100 text-green-800' 
                                    : 'bg-gray-100 text-gray-600'
                              }`}>
                                {quiz.status === 'draft' ? '📝 DRAFT' : quiz.status === 'active' ? '✅ PUBLISHED' : '🔒 CLOSED'}
                              </span>
                              
                              {/* Action Buttons */}
                              <div className="flex gap-2 mt-2">
                                {quiz.status === 'draft' && (
                                  <button
                                    onClick={() => toggleQuizStatus(quiz)}
                                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-semibold flex items-center gap-1"
                                    title="Publish quiz to students"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Publish
                                  </button>
                                )}
                                
                                {quiz.status === 'active' && (
                                  <button
                                    onClick={() => toggleQuizStatus(quiz)}
                                    className="px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-semibold flex items-center gap-1"
                                    title="Close quiz (stop accepting submissions)"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Close
                                  </button>
                                )}
                                
                                {quiz.status === 'closed' && (
                                  <button
                                    onClick={() => toggleQuizStatus(quiz)}
                                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold flex items-center gap-1"
                                    title="Reopen quiz"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                    Reopen
                                  </button>
                                )}
                                
                                <button
                                  onClick={() => deleteQuiz(quiz)}
                                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold flex items-center gap-1"
                                  title="Delete quiz permanently"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="border-t border-cyan-200 pt-4 mt-4">
                            <p className="text-sm text-gray-600">
                              Created by {quiz.createdBy} on {quiz.createdAt.toLocaleDateString()}
                            </p>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-sm text-gray-600">
                                Submissions: {quizSubmissions.filter(s => s.quizId === quiz.id).length} students
                              </p>
                              {quizSubmissions.length > 0 && (
                                <p className="text-xs text-gray-500">
                                  (Total submissions loaded: {quizSubmissions.length})
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Show submissions for this quiz */}
                          {quizSubmissions.filter(s => s.quizId === quiz.id).length > 0 && (
                            <div className="mt-4 border-t border-cyan-200 pt-4">
                              <h5 className="font-bold text-gray-700 mb-3">Recent Submissions:</h5>
                              <div className="space-y-2">
                                {quizSubmissions.filter(s => s.quizId === quiz.id).slice(0, 5).map((submission) => (
                                  <div key={submission.id} className="flex items-center justify-between bg-white p-3 rounded-lg">
                                    <div>
                                      <span className="font-semibold text-gray-800">{submission.studentName}</span>
                                      <span className="text-gray-600 text-sm ml-2">(Roll: {submission.rollNumber})</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <span className="text-lg font-bold text-cyan-600">
                                        {submission.score} / {submission.totalMarks}
                                      </span>
                                      <span className="text-sm text-gray-500">
                                        {submission.submittedAt.toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* AI Teaching Assistant */}
      <TeacherAIAssistant 
        teacherName={user?.displayName || user?.email || 'Teacher'}
        teacherClass={selectedClass}
        onCreateQuiz={(quizData) => {
          console.log('🤖 AI Quiz Data Received:', quizData);
          
          // Switch to quiz tab to show the quiz creation form
          setActiveTab('quiz');
          // NOTE: Don't set setCreatingQuiz(true) here - that's only for button loading state!
          
          // Pre-fill quiz basic info
          if (quizData) {
            if (quizData.title) {
              setQuizTitle(quizData.title);
            }
            if (quizData.totalMarks) {
              setQuizTotalMarks(quizData.totalMarks.toString());
            }
            if (quizData.duration) {
              setQuizDuration(quizData.duration.toString());
            }
            if (quizData.subject) {
              setQuizSubject(quizData.subject);
            }
            if (quizData.description) {
              setQuizDescription(quizData.description);
            }
            
            // Pre-fill AI-generated questions
            if (quizData.questions && Array.isArray(quizData.questions) && quizData.questions.length > 0) {
              console.log('✅ Setting AI-generated questions:', quizData.questions);
              setQuizQuestions(quizData.questions);
              setSuccessMessage(`🤖 AI Quiz created with ${quizData.questions.length} questions! Review and publish.`);
            } else {
              setSuccessMessage('🤖 AI Quiz form opened! Add your questions or let AI generate them.');
            }
          }
          
          // Scroll to quiz section
          setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }, 100);
        }}
      />
    </div>
  );
}
