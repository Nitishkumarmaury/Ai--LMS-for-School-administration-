# Parent Login Troubleshooting Guide

## ❌ Error: "Invalid roll number. Student not found in system."

This error occurs when trying to sign up or login with a roll number that doesn't exist in the students database.

### Root Causes:

1. **Student hasn't registered yet** - The most common cause
2. **Roll number not assigned by teacher** - Teacher needs to create roll numbers first
3. **Incorrect roll number format** - Case-sensitive, must match exactly
4. **Student used different roll number** - Check what the student actually registered with

---

## ✅ Solution Steps

### Step 1: Verify Roll Number Assignment (Teacher's Job)

**Teacher must do this FIRST:**

1. Login to Teacher Dashboard
2. Go to "Attendance" tab
3. Select the class
4. Click "Manage Roll Numbers"
5. Add roll numbers for all students in the class
   - Example: Class 10A might have roll numbers: 10A01, 10A02, 10A03, etc.
   - Example: Class 12B might have: 12B001, 12B002, etc.

**Firestore Collection: `studentRollNumbers`**
```javascript
{
  class: "10-A",
  rollNumber: "10A01",
  isRegistered: false,
  createdAt: "2025-10-02T10:00:00.000Z"
}
```

---

### Step 2: Student Registration (Student's Job)

**Student must do this BEFORE parent can sign up:**

1. Go to Student Login page
2. Click "Sign Up"
3. Fill in:
   - Full Name
   - Roll Number (MUST match the one teacher assigned)
   - Email
   - Password
   - Select Class
4. Click "Sign Up"
5. System will:
   - Verify roll number exists for that class
   - Check if roll number is not already registered
   - Create student account
   - Mark roll number as registered

**Firestore Collections Updated:**
```javascript
// students collection
{
  name: "John Doe",
  rollNumber: "10A01",
  class: "10-A",
  email: "john@example.com",
  password: "hashed_password"
}

// studentRollNumbers collection (updated)
{
  class: "10-A",
  rollNumber: "10A01",
  isRegistered: true,  // ← Changed from false
  studentName: "John Doe"
}
```

---

### Step 3: Parent Sign Up (Parent's Job)

**NOW parent can sign up:**

1. Go to Parent Login page
2. Click "Don't have an account? Sign Up"
3. Fill in:
   - Parent Name
   - Parent Email
   - Parent Phone
   - Student Roll Number (the one student registered with)
   - Create Password
4. Click "Create Account"

**Firestore Collection: `parents`**
```javascript
{
  parentName: "Jane Doe",
  parentEmail: "jane@example.com",
  parentPhone: "1234567890",
  studentRollNumber: "10A01",
  password: "parent_password",
  studentName: "John Doe",
  studentClass: "10-A",
  createdAt: "2025-10-02T15:00:00.000Z"
}
```

---

## 🔍 Debugging Steps

### Check if Roll Number Exists

1. Open Firebase Console
2. Go to Firestore Database
3. Open `studentRollNumbers` collection
4. Search for the roll number
5. Check:
   - Does it exist?
   - What class is it assigned to?
   - Is `isRegistered` true or false?

### Check if Student is Registered

1. Open Firebase Console
2. Go to Firestore Database
3. Open `students` collection
4. Search for documents where `rollNumber == "YOUR_ROLL_NUMBER"`
5. Check:
   - Does the student exist?
   - Does the roll number match EXACTLY (case-sensitive)?
   - What class is listed?

### Check if Parent Already Exists

1. Open Firebase Console
2. Go to Firestore Database
3. Open `parents` collection
4. Search for documents where `studentRollNumber == "YOUR_ROLL_NUMBER"`
5. If parent exists:
   - Use "Login" instead of "Sign Up"
   - Use the password you created during signup

---

## 📝 Common Issues & Solutions

### Issue 1: "Student not found" during parent signup

**Problem:** Student hasn't registered yet

**Solution:**
1. Student must complete registration first
2. Then parent can sign up
3. Order matters: Teacher → Student → Parent

---

### Issue 2: Roll number case sensitivity

**Problem:** Roll number "10a01" vs "10A01"

**Solution:**
- Roll numbers are case-sensitive
- Must match EXACTLY
- System auto-converts to uppercase in parent login
- Check what the student actually used during registration

---

### Issue 3: Parent account already exists

**Problem:** Trying to sign up when account exists

**Solution:**
- Click "Already have an account? Login"
- Use your existing password
- If you forgot password, contact admin (password reset feature to be added)

---

### Issue 4: Wrong class selected

**Problem:** Roll number exists but for different class

**Solution:**
- Verify the correct class name
- Check with teacher which class the roll number belongs to
- Class names must match exactly: "10-A" not "10A" or "Class 10 A"

---

## 🎯 Testing Checklist

Use this checklist to test the parent login system:

### Teacher Setup
- [ ] Teacher assigns roll numbers to class
- [ ] Roll numbers appear in `studentRollNumbers` collection
- [ ] Roll numbers show `isRegistered: false`

### Student Registration
- [ ] Student can see assigned roll numbers
- [ ] Student completes signup with correct roll number
- [ ] Student account created in `students` collection
- [ ] Roll number marked as `isRegistered: true`
- [ ] Student can login successfully

### Parent Signup
- [ ] Parent enters student's roll number
- [ ] System finds student in database
- [ ] Parent account created in `parents` collection
- [ ] Parent data includes student name and class

### Parent Login
- [ ] Parent can login with roll number and password
- [ ] System verifies student exists
- [ ] System verifies parent credentials
- [ ] Parent redirected to dashboard
- [ ] Dashboard shows correct student information

---

## 🔧 Manual Testing Steps

### Test Scenario 1: Complete Flow

```
1. TEACHER ACTION:
   - Login as teacher
   - Select class "10-A"
   - Add roll number "TEST01"

2. STUDENT ACTION:
   - Go to student signup
   - Enter name: "Test Student"
   - Enter roll number: "TEST01"
   - Select class: "10-A"
   - Complete registration

3. PARENT ACTION:
   - Go to parent signup
   - Enter roll number: "TEST01"
   - Fill parent details
   - Create account
   - Login with roll number and password
   - View student dashboard
```

### Test Scenario 2: Error Cases

```
1. PARENT TRIES TO SIGNUP BEFORE STUDENT:
   Expected: "Student not found" error
   
2. PARENT TRIES TO SIGNUP WITH WRONG ROLL NUMBER:
   Expected: "Student not found" error
   
3. PARENT TRIES TO SIGNUP TWICE:
   Expected: "Parent account already exists" error
   
4. PARENT TRIES TO LOGIN WITH WRONG PASSWORD:
   Expected: "Invalid password" error
```

---

## 📊 Database Structure

### studentRollNumbers Collection
```
Document ID: auto-generated
Fields:
  - class: string (e.g., "10-A")
  - rollNumber: string (e.g., "10A01")
  - isRegistered: boolean (false initially, true after student registers)
  - createdAt: timestamp
  - studentName: string (added after registration)
```

### students Collection
```
Document ID: auto-generated
Fields:
  - name: string
  - rollNumber: string
  - class: string
  - email: string
  - password: string
  - createdAt: timestamp
```

### parents Collection
```
Document ID: auto-generated
Fields:
  - parentName: string
  - parentEmail: string
  - parentPhone: string
  - studentRollNumber: string
  - password: string
  - studentName: string (copied from student)
  - studentClass: string (copied from student)
  - createdAt: timestamp
```

---

## 🚀 Quick Fix Commands

### Check Console Logs (Browser)

Open browser console (F12) and look for:
```
Searching for student with roll number: TEST01
Students found: 0  ← Problem! Should be 1
```

or

```
Searching for student with roll number: TEST01
Students found: 1  ← Good!
Student found: Test Student in class 10-A
```

### Firebase Console Direct Check

1. **Verify roll number exists:**
   - Collection: `studentRollNumbers`
   - Query: `rollNumber == "TEST01" AND class == "10-A"`

2. **Verify student registered:**
   - Collection: `students`
   - Query: `rollNumber == "TEST01"`

3. **Verify parent doesn't exist (for signup):**
   - Collection: `parents`
   - Query: `studentRollNumber == "TEST01"`

---

## 💡 Important Notes

1. **Order is critical:**
   - Teacher assigns roll numbers FIRST
   - Student registers SECOND
   - Parent signs up LAST

2. **Roll numbers are case-sensitive:**
   - "10A01" ≠ "10a01"
   - Parent login auto-converts to uppercase
   - But student must register with correct case

3. **Class names must match exactly:**
   - Spaces matter: "10-A" ≠ "10 - A"
   - Case matters: "10-A" ≠ "10-a"
   - Hyphens matter: "10-A" ≠ "10A"

4. **One parent account per student:**
   - Each roll number can have only one parent account
   - If you need multiple parents, contact admin

5. **Console logging enabled:**
   - Check browser console for detailed error messages
   - Helps identify exact point of failure

---

## 🆘 Still Having Issues?

### Detailed Error Messages

The system now provides detailed error messages with specific instructions:

```
Student with roll number "TEST01" not found. Please ensure:
1. The student has completed registration via Student Login
2. The roll number is correct (case-sensitive)
3. The teacher has assigned this roll number to the class
```

### Contact Points

1. **For teacher issues:** Check teacher dashboard functionality
2. **For student issues:** Check student registration process
3. **For parent issues:** Check this troubleshooting guide

### Browser Console

Always check browser console (Press F12) for detailed logs:
- Student lookup results
- Database query results
- Error stack traces

---

## ✅ Success Indicators

You know everything is working when:

1. ✅ Teacher can assign roll numbers
2. ✅ Student can register with assigned roll number
3. ✅ Parent can sign up with student's roll number
4. ✅ Parent can login successfully
5. ✅ Parent dashboard shows student's progress
6. ✅ All data appears correctly in Firestore

---

## 🔄 Complete System Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     TEACHER DASHBOARD                        │
│                                                              │
│  1. Select Class (e.g., "10-A")                             │
│  2. Go to Attendance Tab                                     │
│  3. Click "Manage Roll Numbers"                              │
│  4. Add roll numbers: 10A01, 10A02, 10A03, etc.            │
│                                                              │
│  ✅ Creates documents in studentRollNumbers collection       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     STUDENT LOGIN/SIGNUP                     │
│                                                              │
│  1. Student goes to Student Login page                       │
│  2. Clicks "Sign Up"                                         │
│  3. Enters roll number (10A01)                               │
│  4. Selects class (10-A)                                     │
│  5. System verifies roll number exists and not registered    │
│  6. Creates student account                                  │
│                                                              │
│  ✅ Creates document in students collection                  │
│  ✅ Updates studentRollNumbers: isRegistered = true          │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    PARENT LOGIN/SIGNUP                       │
│                                                              │
│  1. Parent goes to Parent Login page                         │
│  2. Clicks "Sign Up"                                         │
│  3. Enters student's roll number (10A01)                     │
│  4. System verifies student exists in database               │
│  5. Parent completes signup form                             │
│  6. Creates parent account                                   │
│                                                              │
│  ✅ Creates document in parents collection                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                     PARENT DASHBOARD                         │
│                                                              │
│  Shows:                                                      │
│  - Student name and class                                    │
│  - Quiz scores                                               │
│  - Verified marks                                            │
│  - Attendance percentage                                     │
│  - Announcements                                             │
│  - Assignment submissions                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📞 Support

For additional help:
1. Check browser console for detailed logs
2. Verify Firestore data structure
3. Review error messages carefully
4. Follow the order: Teacher → Student → Parent
5. Check roll number case sensitivity

**Remember:** The system is designed to fail gracefully with helpful error messages. Read the error messages carefully - they tell you exactly what's wrong and how to fix it!
