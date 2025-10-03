# Student Login System - Complete Guide

## 🎓 Overview

A complete student authentication and dashboard system that allows students to:
- **Sign up** with roll number, name, email, and password
- **Login** using just name and password
- View assignments, learning materials, announcements, and attendance
- Track attendance percentage with warnings for <75%

---

## 📋 Features

### 1. **Main Landing Page** (`/main`)
- Beautiful 3-card interface for Student/Teacher/Parent login options
- Gradient backgrounds with role-specific colors
- Smooth animations and hover effects

### 2. **Student Login Page** (`/student-login`)
- **Login Tab**: Quick login with name + password only
- **Signup Tab**: Full registration with roll number, name, class, email, password
- Automatic email-to-name mapping for easy login
- Roll number uniqueness validation

### 3. **Student Dashboard** (`/student-dashboard`)
Four main tabs:

#### 📋 Assignments Tab
- View all assignments for student's class
- Status badges: 🟢 Active (before due date) | ⚪ Expired (after due date)
- Quick access to Google Drive folder and PDF
- Shows due date and maximum marks

#### 📚 Learning Materials Tab
- Browse uploaded study materials by subject
- Direct links to Google Drive resources
- Material descriptions and upload dates

#### 📢 Announcements Tab
- Class-specific announcements from teachers
- Priority badges: HIGH (red) | MEDIUM (yellow) | LOW (blue)
- Chronological display with dates

#### ✓ Attendance Tab
- **Overall attendance percentage** (red if <75%)
- Warning alert for low attendance
- Complete attendance history with date-wise records
- Present/Absent status badges

---

## 🔧 Setup Instructions

### Step 1: Update Firestore Rules

Add the `students` collection rule to your Firestore:

```javascript
// Students collection - REQUIRED FOR STUDENT LOGIN
match /students/{studentId} {
  allow read, write: if request.auth != null;
}
```

**How to Update:**
1. Open [Firebase Console](https://console.firebase.google.com/)
2. Go to **Firestore Database** → **Rules**
3. Copy the content from `FIRESTORE_RULES_COMPLETE.txt`
4. Paste and click **Publish**

### Step 2: Create Firestore Indexes

You need **3 composite indexes** for the student dashboard:

#### Index 1: Assignments
- **Collection ID**: `assignments`
- **Field 1**: `class` (Ascending)
- **Field 2**: `createdAt` (Descending)
- **Query Scope**: Collection

#### Index 2: Learning Materials
- **Collection ID**: `learningMaterials`
- **Field 1**: `class` (Ascending)
- **Field 2**: `uploadedAt` (Descending)
- **Query Scope**: Collection

#### Index 3: Announcements
- **Collection ID**: `announcements`
- **Field 1**: `class` (Ascending)
- **Field 2**: `createdAt` (Descending)
- **Query Scope**: Collection

**Automatic Method:**
1. Navigate to `/student-dashboard` in your browser
2. Click any tab (Assignments/Materials/Announcements)
3. If index is missing, an error message will appear with a **direct link**
4. Click the link → Firebase Console opens with pre-filled index config
5. Click **"Create Index"** → Wait 1-2 minutes → Refresh page

**Manual Method:**
1. Firebase Console → Firestore Database → Indexes
2. Click "Create Index"
3. Fill in the fields as listed above
4. Wait for index to build (status: Building → Enabled)

### Step 3: Test the System

1. **Navigate to Main Page**
   ```
   http://localhost:3000/main
   ```

2. **Create a Student Account**
   - Click "Login as Student"
   - Click "Don't have an account? Sign Up"
   - Fill in:
     - Full Name: John Doe
     - Roll Number: 101
     - Class: Class 10
     - Email: john.doe@example.com
     - Password: password123
   - Click "Sign Up"

3. **Login as Student**
   - Click "Already have an account? Login"
   - Enter:
     - Full Name: John Doe
     - Password: password123
   - Click "Login"

4. **Verify Dashboard Access**
   - Should redirect to `/student-dashboard`
   - Student info displays in header
   - Four tabs should be visible

---

## 📊 Data Structure

### Students Collection (`/students/{studentId}`)

```javascript
{
  uid: string,              // Firebase Auth UID
  name: string,             // Full name (used for login)
  rollNumber: string,       // Unique roll number
  email: string,            // Email address
  class: string,            // Class name (e.g., "Class 10")
  createdAt: string         // ISO timestamp
}
```

### How Login Works

1. **Signup Process:**
   - Student enters: name, roll number, class, email, password
   - System creates Firebase Auth account with email + password
   - System saves student data to Firestore with Auth UID
   - Student document stored in `/students` collection

2. **Login Process:**
   - Student enters: name + password only
   - System queries Firestore to find student document by name
   - System retrieves associated email from student document
   - System authenticates using Firebase Auth with email + password
   - Student data stored in localStorage for session
   - Redirect to dashboard

3. **Dashboard Loading:**
   - Retrieve student info from localStorage
   - Load assignments/materials/announcements filtered by student's class
   - Load attendance records filtered by roll number or name
   - Calculate attendance percentage
   - Display warning if <75%

---

## 🎨 UI/UX Features

### Color Scheme
- **Main Page**: Blue/Indigo/Purple gradient background
- **Student Portal**: Blue theme (from-blue-400 to-blue-600)
- **Teacher Portal**: Green theme (from-green-400 to-green-600)
- **Parent Portal**: Purple theme (from-purple-400 to-purple-600)

### Responsive Design
- Mobile-first approach
- Grid layouts for desktop, stacked for mobile
- Touch-friendly buttons and cards
- Smooth animations and transitions

### User Experience
- **Back buttons** on all login pages to return to main
- **Loading states** during authentication
- **Error messages** with red borders and icons
- **Success messages** with green borders and icons
- **Status badges** with color coding
- **Warning alerts** for low attendance (<75%)

---

## 🔐 Security Features

1. **Firebase Authentication**
   - Secure password hashing
   - Email verification available
   - Session management

2. **Firestore Security Rules**
   - All collections require authentication
   - Students can only read/write when logged in
   - Data isolated by class

3. **Client-Side Validation**
   - Roll number uniqueness check
   - Email format validation
   - Password strength (min 6 characters)
   - Required field validation

---

## 🚀 How Students Use the System

### First Time (Signup)
1. Go to `localhost:3000/main`
2. Click **"Login as Student"**
3. Click **"Don't have an account? Sign Up"**
4. Fill registration form with roll number, name, class, email, password
5. Click **"Sign Up"** → Account created successfully
6. Auto-switch to Login tab

### Every Time (Login)
1. Go to `localhost:3000/main`
2. Click **"Login as Student"**
3. Enter **Name** and **Password** only
4. Click **"Login"** → Redirect to dashboard

### Using Dashboard
- **View Assignments**: Click Assignments tab → See active/expired assignments → Click folder/PDF links
- **View Materials**: Click Materials tab → Browse study materials → Click to open in Google Drive
- **View Announcements**: Click Announcements tab → Read class announcements → See priority levels
- **Check Attendance**: Click Attendance tab → See percentage → View date-wise history

### Logout
- Click **"Logout"** button in header → Redirect to login page

---

## 🐛 Troubleshooting

### Problem: "Student not found"
**Solution**: Student hasn't signed up yet. Click "Don't have an account? Sign Up" and create account.

### Problem: "Incorrect password"
**Solution**: Check password spelling. Password is case-sensitive.

### Problem: "Roll number already exists"
**Solution**: Choose a different roll number. Each student needs unique roll number.

### Problem: "Email already in use"
**Solution**: Email is registered to another account. Use different email or try logging in.

### Problem: "The query requires an index"
**Solution**: 
1. Look for error message with link to Firebase Console
2. Click the link
3. Click "Create Index" button
4. Wait 1-2 minutes for index to build
5. Refresh the page

### Problem: Attendance percentage shows 0%
**Solution**: 
- No attendance records found for this student
- Teacher hasn't marked attendance yet
- Check if student's roll number matches attendance records

### Problem: Low attendance warning (<75%)
**Action Required**:
- Student needs to improve attendance
- Contact teacher about absences
- Review attendance history to identify missing days

---

## 📈 Future Enhancements

### Phase 1 (High Priority)
- [ ] Assignment submission feature
- [ ] Email notifications for new assignments
- [ ] Download materials for offline access
- [ ] Attendance leave requests

### Phase 2 (Medium Priority)
- [ ] Marks/grades display
- [ ] Timetable view
- [ ] Fee payment integration
- [ ] Parent portal with child monitoring

### Phase 3 (Nice to Have)
- [ ] Chat with teachers
- [ ] Discussion forums
- [ ] Study groups
- [ ] Achievement badges
- [ ] Progress reports with charts

---

## 📞 Support

If you encounter issues:
1. Check Firestore rules are published
2. Verify indexes are created and enabled
3. Check browser console for errors
4. Ensure Firebase project is properly configured
5. Verify student account is created in Firestore

---

## ✅ Success Checklist

- [ ] Firestore rules updated with students collection
- [ ] 3 composite indexes created (assignments, materials, announcements)
- [ ] Main page loads at `/main`
- [ ] Student can sign up successfully
- [ ] Student can login with name + password
- [ ] Dashboard loads with 4 tabs
- [ ] Assignments display correctly
- [ ] Materials display correctly
- [ ] Announcements display correctly
- [ ] Attendance shows percentage and history
- [ ] Low attendance warning appears if <75%
- [ ] Logout works and redirects to login

**Your student portal is ready to use!** 🎉
