# 🔍 Troubleshooting: Parent Dashboard Not Showing Student Marks

## Problem: Parent dashboard shows 0 marks/scores/attendance

## Quick Diagnostic Steps

### Step 1: Open Browser Console (F12)
**Look for these log messages:**

```
🔍 [Quiz] Starting to load quiz submissions for roll number: [ROLL_NUMBER]
🔍 [Quiz] Query complete. Documents found: X
🔍 [Marks] Starting to load student marks for roll number: [ROLL_NUMBER]
🔍 [Marks] Query complete. Documents found: Y
🔍 [Attendance] Starting to load attendance for roll number: [ROLL_NUMBER]
🔍 [Attendance] Query complete. Documents found: Z
```

### Step 2: Interpret Console Output

#### If you see: `Documents found: 0`
**Meaning:** No data exists in Firestore for this student
**Solution:** Need to add data for this student

#### If you see: `permission-denied` error
**Meaning:** Firebase security rules blocking access
**Solution:** Parent needs to re-signup with Firebase Authentication

#### If you see: `Documents found: X` where X > 0
**Meaning:** Data exists but not displaying
**Solution:** Check the debug section on dashboard

---

## Common Causes & Solutions

### 1. ❌ Roll Number Mismatch

**Problem:** Parent signed up with roll number that doesn't match student data

**Check:**
1. Open parent dashboard
2. Expand "Debug Information" section
3. Look at `studentRollNumber` field
4. Compare with actual student data in Firestore

**Fix:**
- Roll numbers must match **exactly** (case-sensitive, no extra spaces)
- If mismatch: Re-signup parent with correct roll number

**Example:**
```
❌ Parent has: "S001 " (extra space)
✅ Student data: "S001"

❌ Parent has: "s001" (lowercase)
✅ Student data: "S001" (uppercase)
```

---

### 2. ❌ No Student Data in Firestore

**Problem:** Student has no quiz submissions, marks, or attendance records

**Check Firestore Collections:**

#### `quizSubmissions` Collection
- Should have documents with field: `studentRollNumber: "S001"`
- Each document should have: `score`, `totalQuestions`, `quizTitle`

#### `studentMarks` Collection
- Should have documents with field: `rollNumber: "S001"`
- Each document should have: `subject`, `marks`, `totalMarks`, `verified: true`
- **Important:** Only marks with `verified: true` appear in scoreboard!

#### `attendance` Collection
- Should have documents with field: `class: "Class 10A"`
- Each document has array `students` with objects containing:
  ```javascript
  {
    rollNumber: "S001",
    status: "Present" // or "Absent"
  }
  ```

**Fix:**
1. Go to Teacher Dashboard
2. Add quiz scores for the student
3. Upload marks and verify them (click verify button!)
4. Mark attendance for the student's class

---

### 3. ❌ Marks Not Verified

**Problem:** Marks uploaded but not showing in parent dashboard

**Reason:** Only **verified** marks count in the scoreboard

**Check:**
1. Go to Teacher Dashboard
2. Find "Marks Management" section
3. Look for student's marks
4. Click "Verify" button for each subject

**In Firestore:**
- Document must have: `verified: true`
- If `verified: false` or missing → Won't appear in total

---

### 4. ❌ Parent Not Authenticated

**Problem:** Old parent accounts created before Firebase Auth integration

**Symptoms:**
- Console shows: `permission-denied` error
- All data shows 0 even though data exists

**Fix:**
1. Parent must **re-signup** (not login!)
2. Use same email, name, roll number
3. Create new password
4. This creates Firebase Authentication account
5. Now login will work with data access

**Why?**
- Old accounts: Only in Firestore (no auth)
- New accounts: Firebase Auth + Firestore (full access)
- Firestore rules require authentication

---

### 5. ❌ Wrong Class Selected

**Problem:** Attendance not showing

**Reason:** Attendance is stored per class

**Check:**
1. Parent's `studentClass` field
2. Must match the class in attendance records
3. Example: "Class 10A" vs "10A" → Different!

**Fix:**
- Ensure parent signed up with exact class name
- Check teacher attendance records use same class name

---

## Testing with Sample Data

### Create Test Data for Roll Number "S001"

#### 1. Add Quiz Submission (Firebase Console)
Collection: `quizSubmissions`
```javascript
{
  studentRollNumber: "S001",
  studentName: "Test Student",
  quizTitle: "Math Quiz 1",
  score: 8,
  totalQuestions: 10,
  submittedAt: new Date().toISOString(),
  class: "Class 10A"
}
```

#### 2. Add Student Marks (Firebase Console)
Collection: `studentMarks`
```javascript
{
  rollNumber: "S001",
  studentName: "Test Student",
  subject: "Mathematics",
  marks: 85,
  totalMarks: 100,
  verified: true,  // ← MUST BE TRUE!
  class: "Class 10A",
  uploadedAt: new Date().toISOString()
}
```

#### 3. Add Attendance (Firebase Console)
Collection: `attendance`
```javascript
{
  class: "Class 10A",
  date: "2025-10-01",
  students: [
    {
      rollNumber: "S001",
      studentName: "Test Student",
      status: "Present"
    }
  ]
}
```

---

## Verification Checklist

Use the **Debug Information** section on parent dashboard:

- [ ] `studentRollNumber` matches student data exactly
- [ ] `studentClass` matches attendance class exactly
- [ ] Quiz Submissions > 0 (check count)
- [ ] Student Marks > 0 (check count)
- [ ] Verified marks showing correct total
- [ ] Attendance Records > 0 (check count)
- [ ] No `permission-denied` errors in console
- [ ] Parent authenticated (check console: "Parent authenticated: [email]")

---

## Still Not Working?

### Check Firestore Security Rules

Rules should allow authenticated reads:
```javascript
match /quizSubmissions/{docId} {
  allow read: if request.auth != null;
}
match /studentMarks/{docId} {
  allow read: if request.auth != null;
}
match /attendance/{docId} {
  allow read: if request.auth != null;
}
```

### Check Firebase Auth

In browser console:
```javascript
// Should see: Parent authenticated: [email]
```

If not authenticated:
1. Logout
2. Re-signup (not login!)
3. This creates Firebase Auth account

---

## Expected Console Output (Success)

```
Parent authenticated: parent@example.com
Parent data loaded: {name: "Parent Name", studentRollNumber: "S001", ...}
Loading data for student: S001

🔍 [Quiz] Starting to load quiz submissions for roll number: S001
🔍 [Quiz] Query complete. Documents found: 3
🔍 [Quiz] Processing submission: {id: "xyz", quizTitle: "Math Quiz 1", score: 8, totalQuestions: 10}
✅ [Quiz] Final stats: {totalSubmissions: 3, totalScore: 24, totalMarks: 30, percentage: "80.0%"}

🔍 [Marks] Starting to load student marks for roll number: S001
🔍 [Marks] Query complete. Documents found: 5
🔍 [Marks] Processing mark: {id: "abc", subject: "Mathematics", marks: 85, totalMarks: 100, verified: true}
✅ [Marks] Final stats: {totalMarks: 5, verifiedCount: 5, totalVerified: 425, totalMax: 500, percentage: "85.0%"}

🔍 [Attendance] Starting to load attendance for roll number: S001
🔍 [Attendance] Query complete. Documents found: 20
✅ [Attendance] Final stats: {totalRecords: 20, presentCount: 18, percentage: "90%"}
```

---

## Quick Fix Summary

| Issue | Fix |
|-------|-----|
| All zeros showing | Check console logs, verify data exists |
| Permission denied | Re-signup parent (creates Firebase Auth) |
| Roll number mismatch | Re-signup with correct roll number |
| Marks verified but not showing | Expand debug section, check console |
| Attendance not showing | Verify class name matches exactly |
| Some marks missing | Teacher must verify marks (click verify button) |

---

## Need Help?

1. Open browser console (F12)
2. Copy all logs starting with 🔍, ✅, or ❌
3. Take screenshot of Debug Information section
4. Check if data exists in Firebase Console
5. Share console logs for diagnosis
