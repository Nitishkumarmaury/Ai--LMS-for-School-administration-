# ✅ Assignments Feature Setup Checklist

## Quick Setup (2 Steps)

### ☐ Step 1: Update Firestore Security Rules (Required)

1. Open `FIRESTORE_RULES_COMPLETE.txt` in this folder
2. Copy ALL the content
3. Go to: https://console.firebase.google.com/
4. Select project: `my-login-app-8a4fa`
5. Click **Firestore Database** → **Rules** tab
6. Delete everything and paste the new rules
7. Click **Publish**

**The rules now include:**
- ✅ teachers collection
- ✅ attendance collection
- ✅ emailNotifications collection
- ✅ studentEmails collection
- ✅ learningMaterials collection
- ✅ **assignments collection** (NEW!)

---

### ☐ Step 2: Create Firestore Index (One-Time Only)

**When you first click the Assignments tab**, you'll see an error with a link.

**Easy Method:**
1. Click the link in the error message
2. Click "Create Index" in Firebase Console
3. Wait 1-2 minutes
4. Refresh the page

**Manual Method:**
1. Go to Firebase Console → Firestore Database → Indexes
2. Click "Create Index"
3. Fill in:
   - Collection: `assignments`
   - Field 1: `class` - Ascending
   - Field 2: `createdAt` - Descending
   - Query scope: Collection
4. Click Create
5. Wait for "Building..." → "Enabled"

---

## 🎉 You're Done!

After completing both steps:
1. Refresh the Teacher Dashboard
2. Click the **"Assignments"** tab (pink button)
3. Create your first assignment!

---

## 📋 Features Now Available

- ✅ **4 Tabs** in Dashboard:
  1. Mark Attendance
  2. Attendance History
  3. Learning Materials
  4. **Assignments** (NEW!)

- ✅ **Create Assignments** with:
  - Title & Subject
  - Due Date & Max Marks
  - Description
  - Google Drive Link

- ✅ **View Assignments**:
  - Active vs Expired status
  - Due dates
  - Direct access to Google Drive
  - Easy delete functionality

---

## 🚀 How to Use

1. **Login** to Teacher Dashboard
2. **Select a class** from dropdown
3. **Click "Assignments" tab**
4. **Prepare assignment file**:
   - Upload to Google Drive
   - Share → "Anyone with the link"
   - Copy link
5. **Fill the form** and paste link
6. **Click "Create Assignment"**
7. Done! 🎉

---

## 📖 Full Documentation

See `ASSIGNMENTS_FEATURE_GUIDE.md` for:
- Detailed usage instructions
- Troubleshooting tips
- Best practices
- Data structure
- UI features

---

## ⚠️ Common Issues

### "Failed to load assignments: The query requires an index"
→ **Fix**: Complete Step 2 above (create index)

### "Permission Denied"
→ **Fix**: Complete Step 1 above (update rules)

### "Invalid Google Drive link"
→ **Fix**: Ensure link is in correct format and file is shared

---

## ✅ Verification

Test that everything works:
- [ ] Can see Assignments tab (pink button)
- [ ] Can create new assignment
- [ ] Assignment appears in list
- [ ] Can click "View" to open in Google Drive
- [ ] Can delete assignment
- [ ] Status shows "ACTIVE" for future due dates
- [ ] Status shows "EXPIRED" for past due dates

---

**Need Help?** Check `ASSIGNMENTS_FEATURE_GUIDE.md` for detailed troubleshooting!
