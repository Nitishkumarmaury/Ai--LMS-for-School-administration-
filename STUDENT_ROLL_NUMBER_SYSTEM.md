# Student Roll Number Management System

## Overview
A secure student registration system where **teachers create unique roll numbers** that students must use to sign up. This ensures only authorized students can register for each class.

---

## How It Works

### For Teachers:

1. **Navigate to "Manage Students" Tab**
   - Select your class from the dropdown
   - Click the "Manage Students" tab button (blue gradient)

2. **Add Roll Numbers**
   - Enter Roll Number (e.g., "001", "042")
   - Enter Student Name
   - Click "Add Roll Number"
   - Roll number is now available for student registration

3. **View Roll Number Status**
   - **Available** (Gray badge): Roll number not yet registered
   - **Registered** (Green badge): Student has signed up with this roll number
   - Registered roll numbers cannot be deleted

4. **Delete Roll Numbers**
   - Only available (unregistered) roll numbers can be deleted
   - Click the red trash icon to delete

---

### For Students:

1. **Visit Student Login Page**
   - Click "Student Login" from main page

2. **Click "Create Account"**

3. **Fill Signup Form:**
   - **Name**: Your full name
   - **Roll Number**: Must be the exact roll number assigned by your teacher
   - **Email**: Your email address
   - **Password**: Create a secure password (min 6 characters)
   - **Class**: Select your class from dropdown

4. **Validation:**
   - System checks if roll number exists for your class
   - System checks if roll number is available (not already registered)
   - If valid, account is created
   - Roll number is marked as "Registered"

5. **Login:**
   - Use your **name** and **password** to login (not email!)
   - Redirected to student dashboard

---

## Key Features

### Security
- ✅ Roll numbers must be pre-created by teachers
- ✅ Students cannot register with arbitrary roll numbers
- ✅ One roll number = One student account
- ✅ Roll numbers are unique per class (different classes can have same roll number)

### Validation
- ✅ Roll number must exist in Firestore (`studentRollNumbers` collection)
- ✅ Roll number must match the selected class
- ✅ Roll number must not be already registered
- ✅ Email must not be already in use

### Teacher Control
- ✅ Teachers can add/delete roll numbers
- ✅ Teachers can see registration status
- ✅ Registered roll numbers are protected from deletion
- ✅ Teachers can manage multiple classes independently

---

## Firestore Setup

### Required Collections:

#### 1. `studentRollNumbers` Collection
```
Document fields:
- rollNumber: string (e.g., "001")
- studentName: string (e.g., "Rahul Sharma")
- class: string (e.g., "Class 10A")
- isRegistered: boolean (false initially, true after signup)
- registeredStudentId: string (student document ID after signup)
- createdBy: string (teacher name)
- createdAt: Timestamp
```

#### 2. `students` Collection
```
Document fields:
- uid: string (Firebase Auth UID)
- name: string
- rollNumber: string
- email: string
- class: string
- createdAt: string (ISO date)
```

### Firestore Rules:

```javascript
// Student Roll Numbers collection
match /studentRollNumbers/{rollNumberId} {
  allow read: if request.auth != null; // All authenticated users can read
  allow write: if request.auth != null; // Teachers can write
}

// Students collection
match /students/{studentId} {
  allow read, write: if request.auth != null;
}
```

### Required Firestore Index:

**Collection:** `studentRollNumbers`  
**Fields:**
1. `class` (Ascending)
2. `rollNumber` (Ascending)

**Query Scope:** Collection

---

## Workflow Example

### Scenario: Teacher adds student "Rahul Sharma" to Class 10A

1. **Teacher Actions:**
   ```
   - Selects "Class 10A"
   - Clicks "Manage Students" tab
   - Enters Roll Number: "001"
   - Enters Student Name: "Rahul Sharma"
   - Clicks "Add Roll Number"
   ```

2. **Firestore State:**
   ```javascript
   studentRollNumbers/doc123 = {
     rollNumber: "001",
     studentName: "Rahul Sharma",
     class: "Class 10A",
     isRegistered: false,
     createdBy: "Mr. Teacher",
     createdAt: Timestamp
   }
   ```

3. **Student Actions:**
   ```
   - Goes to Student Login
   - Clicks "Create Account"
   - Enters Name: "Rahul Sharma"
   - Enters Roll Number: "001"
   - Enters Email: "rahul@example.com"
   - Enters Password: "secure123"
   - Selects Class: "Class 10A"
   - Clicks "Sign Up"
   ```

4. **Validation Process:**
   ```
   ✅ Roll number "001" exists for Class 10A
   ✅ Roll number is not registered (isRegistered = false)
   ✅ Email "rahul@example.com" is not in use
   ✅ Password meets requirements (6+ characters)
   ```

5. **Account Creation:**
   ```javascript
   // Firebase Auth account created
   // students collection updated:
   students/doc456 = {
     uid: "firebase-auth-uid",
     name: "Rahul Sharma",
     rollNumber: "001",
     email: "rahul@example.com",
     class: "Class 10A",
     createdAt: "2025-10-02T..."
   }
   
   // studentRollNumbers updated:
   studentRollNumbers/doc123 = {
     ...previous fields,
     isRegistered: true,
     registeredStudentId: "doc456"
   }
   ```

6. **Result:**
   - Student can now login with name "Rahul Sharma" and password
   - Teacher sees roll number "001" with green "Registered" badge
   - Roll number "001" cannot be deleted (protected)

---

## Error Messages

### Student Signup Errors:

| Error | Meaning | Solution |
|-------|---------|----------|
| "Roll number XXX is not assigned for Class YYY. Please contact your teacher." | Roll number doesn't exist in system | Ask teacher to create the roll number |
| "This roll number is already registered by another student." | Another student used this roll number | Contact teacher for correct roll number |
| "Email already in use. Please use a different email." | Email used by another account | Use different email or login |
| "Password should be at least 6 characters." | Password too short | Use longer password |

### Teacher Errors:

| Error | Meaning | Solution |
|-------|---------|----------|
| "This roll number already exists in this class." | Duplicate roll number | Use different roll number |
| "Cannot delete roll number that is already registered by a student." | Trying to delete registered roll number | Cannot be deleted (student is using it) |
| "Failed to load roll numbers: The query requires an index" | Firestore index missing | Click link in console to create index |

---

## Testing Checklist

### Teacher Side:
- [ ] Can add roll number successfully
- [ ] Cannot add duplicate roll number in same class
- [ ] Can see roll numbers list
- [ ] Can delete unregistered roll numbers
- [ ] Cannot delete registered roll numbers
- [ ] Status badges show correctly (Available/Registered)
- [ ] Different classes can have same roll number

### Student Side:
- [ ] Cannot signup with non-existent roll number
- [ ] Cannot signup with registered roll number
- [ ] Can signup with valid available roll number
- [ ] Roll number marked as registered after signup
- [ ] Can login with name and password
- [ ] Error messages are clear and helpful

---

## Troubleshooting

### "Index Required" Error (Teacher)

**Problem:** When clicking "Manage Students" tab, error shows: "The query requires an index"

**Solution:**
1. Check browser console for Firebase Console link
2. Click the link (opens Firebase Console with pre-filled index config)
3. Click "Create Index"
4. Wait 1-2 minutes for index to build
5. Refresh the page

**Manual Index Creation:**
```
Collection ID: studentRollNumbers
Fields:
  1. class (Ascending)
  2. rollNumber (Ascending)
Query Scope: Collection
```

### "Roll Number Not Found" Error (Student)

**Problem:** Student gets error during signup

**Possible Causes:**
1. Teacher hasn't created the roll number yet
2. Student entered wrong roll number
3. Student selected wrong class
4. Roll number already registered by another student

**Solution:**
- Verify roll number with teacher
- Check class selection is correct
- Ask teacher to check "Manage Students" tab

### "Permission Denied" Error

**Problem:** Firestore operations fail

**Solution:**
1. Open `FIRESTORE_RULES_COMPLETE.txt`
2. Copy all rules
3. Firebase Console → Firestore Database → Rules
4. Paste and Publish
5. Wait 30 seconds for rules to propagate

---

## Best Practices

### For Teachers:
1. ✅ Create all roll numbers at start of academic year
2. ✅ Use consistent format (001, 002, etc. or R001, R002)
3. ✅ Keep roll numbers sequential for easy tracking
4. ✅ Verify student details before creating roll number
5. ✅ Check "Registered" status regularly

### For School Admins:
1. ✅ Train teachers on roll number creation
2. ✅ Establish roll number format standards
3. ✅ Provide roll number list to students
4. ✅ Have backup list of assigned roll numbers
5. ✅ Monitor registration completion rates

### For Students:
1. ✅ Keep roll number safe (write it down)
2. ✅ Verify class selection during signup
3. ✅ Use strong password (8+ characters)
4. ✅ Remember name used during signup (for login)
5. ✅ Contact teacher immediately if roll number doesn't work

---

## Future Enhancements

Potential features to add:
- [ ] Bulk roll number upload (CSV import)
- [ ] Roll number generation tool (auto-generate sequential numbers)
- [ ] Email verification for students
- [ ] Parent email linking
- [ ] Roll number transfer (if student leaves/joins)
- [ ] Class promotion (move students to next class)
- [ ] Student profile editing
- [ ] Roll number search/filter
- [ ] Export registered students list
- [ ] SMS notifications for roll number assignment

---

## Support

If you encounter issues:
1. Check this documentation first
2. Verify Firestore rules are published
3. Verify Firestore index is created
4. Check browser console for error details
5. Ensure Firebase project is active
6. Check network connectivity

---

**Last Updated:** October 2, 2025  
**Version:** 1.0.0
