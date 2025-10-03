# 🔍 Debug Quiz Scores and Marks Not Showing

## Quick Debug Steps

### Step 1: Open Browser Console (F12)

Look for these specific log messages:

#### For Quiz Submissions:
```
🔍 [Quiz] Starting to load quiz submissions for roll number: 10A02
🔍 [Quiz] Query complete. Documents found: X
```

#### For Marks:
```
🔍 [Marks] Starting to load student marks for roll number: 10A02
🔍 [Marks] Query complete. Documents found: Y
```

---

## What to Check:

### If `Documents found: 0` for Quiz:

**Check your Firestore `quizSubmissions` collection:**

1. **Field Name:** Must be `studentRollNumber` (not `rollNumber`)
2. **Field Value:** Must match exactly: `"10A02"` (case-sensitive)

**Example Document:**
```javascript
{
  studentRollNumber: "10A02",  // ← Must match exactly!
  studentName: "Priya Patel",
  quizTitle: "Math Quiz 1",
  score: 8,
  totalQuestions: 10,
  class: "Class 10A"
}
```

**Common Issues:**
- ❌ Using `rollNumber` instead of `studentRollNumber`
- ❌ Roll number doesn't match: "10a02" vs "10A02"
- ❌ Extra spaces: "10A02 " vs "10A02"

---

### If `Documents found: 0` for Marks:

**Check your Firestore `studentMarks` collection:**

1. **Field Name:** Must be `rollNumber` (not `studentRollNumber`)
2. **Field Value:** Must match exactly: `"10A02"`
3. **Verified Field:** Must exist and be truthy

**Example Document:**
```javascript
{
  rollNumber: "10A02",  // ← Must match exactly!
  studentName: "Priya Patel",
  subject: "Mathematics",
  marks: 85,
  totalMarks: 100,
  verified: true,  // ← Must be true!
  class: "Class 10A"
}
```

**Common Issues:**
- ❌ Using `studentRollNumber` instead of `rollNumber`
- ❌ `verified: false` (won't show in total)
- ❌ `verified` field missing
- ❌ Roll number mismatch

---

## Field Name Differences (IMPORTANT!)

| Collection | Field Name for Roll Number |
|------------|---------------------------|
| `attendance` | `rollNumber` ✅ |
| `studentMarks` | `rollNumber` ✅ |
| `quizSubmissions` | `studentRollNumber` ✅ |

**Notice:** Quiz uses `studentRollNumber`, others use `rollNumber`!

---

## Quick Test

### Copy Console Output Here:

1. Open parent dashboard
2. Press F12
3. Look for lines starting with 🔍
4. Copy and share:
   - `🔍 [Quiz] Documents found: X`
   - `🔍 [Marks] Documents found: Y`
   - `🔍 [Attendance] Documents found: Z`

### Share Your Firestore Data:

Take screenshots or copy data from:
1. `quizSubmissions` collection (any document for student 10A02)
2. `studentMarks` collection (any document for student 10A02)

This will help identify the exact issue!

---

## Expected vs Actual

### Quiz Submissions - Correct Structure:
```javascript
{
  studentRollNumber: "10A02",     // ← Not "rollNumber"!
  score: 8,                       // Number
  totalQuestions: 10,             // Number
  quizTitle: "Math Quiz 1",
  class: "Class 10A"
}
```

### Student Marks - Correct Structure:
```javascript
{
  rollNumber: "10A02",            // ← Not "studentRollNumber"!
  marks: 85,                      // Number
  totalMarks: 100,                // Number
  verified: true,                 // Must be true!
  subject: "Mathematics",
  class: "Class 10A"
}
```

---

## Next Steps:

1. **Check console logs** (F12) - What does "Documents found" say?
2. **Check Firestore** - Do the documents exist?
3. **Check field names** - Are they exactly as shown above?
4. **Check roll numbers** - Do they match exactly (case-sensitive)?
5. **Share the output** - Copy console logs and Firestore data here
