# Firestore Security Rules Update

## Add this to your Firebase Console → Firestore Database → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Teachers collection - authenticated users can read/write their own data
    match /teachers/{teacherId} {
      allow read, write: if request.auth != null && request.auth.uid == teacherId;
    }
    
    // Attendance collection - authenticated users can read/write
    match /attendance/{attendanceId} {
      allow read, write: if request.auth != null;
    }
    
    // Email notifications collection - authenticated users can read/write
    match /emailNotifications/{emailId} {
      allow read, write: if request.auth != null;
    }
    
    // Student emails collection - authenticated users can read/write
    // NEW: This allows teachers to save and update parent email addresses
    match /studentEmails/{studentId} {
      allow read, write: if request.auth != null;
    }
    
    // Learning materials collection - authenticated users can read/write
    // IMPORTANT: Required for LMS functionality
    match /learningMaterials/{materialId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## How to Update:

1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project: `my-login-app-8a4fa`
3. Click **Firestore Database** in left menu
4. Click **Rules** tab at the top
5. Copy and paste the rules above
6. Click **Publish**

## What This Does:

- ✅ Allows teachers to save parent email addresses permanently
- ✅ Emails persist across all classes
- ✅ Emails survive page refreshes
- ✅ All authenticated teachers can read/write student emails
