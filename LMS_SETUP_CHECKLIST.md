# 🚀 LMS Setup Checklist

Complete these steps to activate the Learning Management System feature:

## ✅ Setup Steps

### 1. Firebase Storage Rules (REQUIRED)
- [ ] Go to [Firebase Console](https://console.firebase.google.com/)
- [ ] Select project: **my-login-app-8a4fa**
- [ ] Navigate to **Storage** → **Rules**
- [ ] Copy rules from `FIREBASE_STORAGE_RULES.md`
- [ ] Click **Publish**
- [ ] Wait for rules to deploy (~30 seconds)

### 2. Test Upload
- [ ] Open http://localhost:3000
- [ ] Login with teacher credentials
- [ ] Click **"Learning Materials"** tab
- [ ] Select a class
- [ ] Fill upload form:
  - Title: "Test Material"
  - Subject: "Test"
  - Select a small PDF file
- [ ] Click **Upload Material**
- [ ] Verify upload completes successfully
- [ ] Confirm material appears in list

### 3. Test Download
- [ ] Click **View** button on uploaded material
- [ ] Verify file opens/downloads correctly
- [ ] Check file content is correct

### 4. Test Delete
- [ ] Click **Delete** button
- [ ] Confirm deletion prompt
- [ ] Verify material is removed from list
- [ ] Check Firebase Storage to confirm file deleted

## 📋 Pre-Flight Checks

Before using in production:

- [ ] Firebase Storage is enabled
- [ ] Storage rules are published
- [ ] Firestore rules allow `learningMaterials` collection
- [ ] Teachers have valid authentication
- [ ] Internet connection is stable
- [ ] Browser supports file uploads

## 🔧 Firebase Configuration Status

Current Setup:
- ✅ Firebase initialized
- ✅ Authentication configured
- ✅ Firestore configured
- ✅ Storage imported in code
- ⏳ Storage rules (NEEDS SETUP)

## 📝 Storage Rules Quick Copy

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /learning-materials/{class}/{type}/{fileName} {
      allow write: if request.auth != null 
                   && request.resource.size < 50 * 1024 * 1024;
      allow read: if request.auth != null;
    }
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

## 🎯 Quick Test Credentials

Use existing teacher accounts:
- Email: (your teacher email)
- Password: (your password)
- Access Code: TEACH2024001, TEACH2024002, or TEACH2024003

## 📂 Test Files Suggestions

Good test files:
- Small PDF (< 5MB)
- PowerPoint presentation
- Text document
- Small image

Avoid for initial test:
- Large video files
- Files > 50MB
- Corrupted files

## ⚠️ Common Issues & Solutions

### Issue: "Permission denied" error
**Solution**: Update Storage rules in Firebase Console

### Issue: Upload stuck at 0%
**Solution**: 
1. Check internet connection
2. Verify Storage is enabled
3. Check browser console

### Issue: File not appearing in list
**Solution**:
1. Refresh the page
2. Check Firestore for document
3. Verify `loadLearningMaterials()` is called

### Issue: Delete not working
**Solution**:
1. Check Storage rules allow delete
2. Verify user is authenticated
3. Check file exists in Storage

## 🎉 Success Indicators

You'll know it's working when:
- ✅ Upload progress bar reaches 100%
- ✅ Success message appears
- ✅ Material card appears in grid
- ✅ View button opens file
- ✅ Delete removes material
- ✅ No console errors

## 📞 Next Steps After Setup

1. Upload sample materials for each class
2. Test with different file types
3. Verify mobile responsiveness
4. Train teachers on usage
5. Monitor Firebase Storage usage
6. Plan for student access interface

## 💡 Tips

- Start with small files for testing
- Use descriptive titles from the start
- Organize materials by subject
- Delete test materials after verification
- Monitor Firebase Storage quota

---

**Important**: Do not use in production until Storage rules are published!

**Status**: ⏳ Awaiting Firebase Storage rules setup
