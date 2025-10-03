# 🎯 LMS Setup Complete Guide

## 📋 Two Things You Must Do

### 1️⃣ Update Firestore Security Rules ✅

**Why:** Allow teachers to read/write learning materials

**How:**
1. Open `FIRESTORE_RULES_COMPLETE.txt` in this folder
2. Copy ALL the content
3. Go to: https://console.firebase.google.com/
4. Select project: `my-login-app-8a4fa`
5. Click **Firestore Database** (left menu)
6. Click **Rules** tab (top)
7. Delete everything in the editor
8. Paste the copied rules
9. Click **Publish** (top right)

**Verify:** You should see this rule in the published rules:
```javascript
match /learningMaterials/{materialId} {
  allow read, write: if request.auth != null;
}
```

---

### 2️⃣ Create Firestore Index ✅

**Why:** Enable queries that filter by class and sort by date

**How:**
1. When you first visit Learning Materials tab, you'll see an error
2. The error contains a special link
3. Click the link (it's in the error message or browser console)
4. Click "Create Index" button in Firebase Console
5. Wait 1-2 minutes for "Building..." to change to "Enabled"
6. Refresh the page

**Alternative Manual Method:**
1. Go to: https://console.firebase.google.com/
2. Select project: `my-login-app-8a4fa`
3. Click **Firestore Database** → **Indexes** tab
4. Click **Create Index**
5. Fill in:
   - Collection ID: `learningMaterials`
   - Fields to index:
     * Field path: `class`, Query scope: Ascending
     * Field path: `uploadedAt`, Query scope: Descending
6. Click **Create**
7. Wait for index to build

---

## 🎓 How to Use the LMS

### Step 1: Select a Class
At the top of the dashboard, select a class from the dropdown (e.g., "Class 10-A")

### Step 2: Go to Learning Materials Tab
Click the "Learning Materials" tab (third tab)

### Step 3: Prepare Google Drive Link
1. Upload your file (PDF, PPT, etc.) to Google Drive
2. Right-click → Share → "Anyone with the link"
3. Copy the share link

### Step 4: Add Material
Fill in the form:
- **Title:** e.g., "Chapter 5 - Physics"
- **Subject:** e.g., "Physics"
- **Material Type:** Select PDF/PPT/Lecture/Notes/Other
- **Google Drive Link:** Paste the link from step 3
- Click **"Add Material Link"**

### Step 5: View Materials
- Materials appear as cards below the form
- Click **"View"** to open in Google Drive
- Click **"Delete"** to remove

---

## 🐛 Debugging

### Yellow Debug Box
If you see a yellow box above the "Add Material Link" button, it shows:
- ✅ Title filled: Yes/No
- ✅ Subject filled: Yes/No
- ✅ Drive link filled: Yes/No
- ✅ Class selected: Yes/No (IMPORTANT!)
- ✅ Button Status: ENABLED/DISABLED

**If button is DISABLED:** Check which field shows "❌ No" and fill it.

### Common Issues

#### "Class selected: ❌ No"
- **Cause:** You haven't selected a class
- **Fix:** Select a class from the dropdown at the top

#### "Failed to load materials: The query requires an index"
- **Cause:** Firestore index not created yet
- **Fix:** See "2️⃣ Create Firestore Index" above

#### "Permission Denied"
- **Cause:** Firestore security rules not updated
- **Fix:** See "1️⃣ Update Firestore Security Rules" above

#### "Invalid Google Drive link"
- **Cause:** Link format not recognized
- **Fix:** Use proper Google Drive shareable link format:
  - ✅ `https://drive.google.com/file/d/ABC123/view`
  - ✅ `https://drive.google.com/open?id=ABC123`
  - ✅ `https://docs.google.com/document/d/ABC123/`
  - ❌ Short links (goo.gl) won't work

#### "Upload function called!" alert but nothing happens
- **Cause:** Error in Firestore operation
- **Fix:** Check browser console (F12) for detailed error message

---

## ✅ Verification Checklist

Before reporting issues, check:

- [ ] Logged in as a teacher
- [ ] Selected a class from dropdown
- [ ] Firestore rules published (check Firebase Console)
- [ ] Firestore index created and enabled (check Firebase Console)
- [ ] All form fields filled (title, subject, link)
- [ ] Google Drive link is valid and shared
- [ ] Browser console checked for errors (F12)

---

## 📚 Reference Files

- **Security Rules:** `FIRESTORE_RULES_COMPLETE.txt`
- **Index Guide:** `FIRESTORE_INDEX_SETUP.md`
- **Google Drive Integration:** `GOOGLE_DRIVE_INTEGRATION.md`
- **Feature Guide:** `LMS_FEATURE_GUIDE.md`

---

## 🎉 Success Indicators

You know it's working when:
1. ✅ No error messages appear
2. ✅ Debug box shows all ✅ checks
3. ✅ "Add Material Link" button is enabled
4. ✅ Alert appears: "Upload function called!"
5. ✅ Success message: "Material link added successfully!"
6. ✅ Material card appears in the list below
7. ✅ "Uploaded Materials (1)" counter increases

---

## 🆘 Still Not Working?

1. **Check browser console** (F12 → Console tab) for detailed errors
2. **Check Firebase Console:**
   - Firestore Database → Rules (are rules published?)
   - Firestore Database → Indexes (is index enabled?)
   - Firestore Database → Data (can you see the collections?)
3. **Try logging out and logging back in**
4. **Clear browser cache and refresh** (Ctrl+Shift+R)

---

## 📞 Need Help?

If you've completed all steps and it's still not working:
1. Copy the error message from browser console
2. Share what the yellow debug box shows
3. Verify your Firebase Console settings (rules + indexes)
