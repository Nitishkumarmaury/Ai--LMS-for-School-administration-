# 📋 Assignments Feature - Dual Google Drive Links Update

## 🎯 What Changed?

The Assignments feature has been **upgraded** to support **TWO Google Drive links** instead of one:

1. **📁 Drive Folder Link** - Link to a folder containing all assignment materials
2. **📄 Assignment PDF Link** - Direct link to the assignment document/PDF

---

## 🌟 Why This Is Better

### Before (Single Link)
- Teachers could only attach ONE link
- Had to choose between folder OR document
- Students couldn't access both at once

### After (Dual Links)
- Teachers attach BOTH folder AND PDF
- Students can browse all materials in folder
- Students can directly view the assignment PDF
- Better organization and accessibility

---

## 📸 New UI Layout

### Create Assignment Form

Now has **TWO separate input fields**:

```
┌─────────────────────────────────────────────────┐
│ 📁 Drive Folder Link *                          │
│ ┌─────────────────────────────────────────────┐ │
│ │ https://drive.google.com/drive/folders/... │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 📄 Assignment PDF Link *                        │
│ ┌─────────────────────────────────────────────┐ │
│ │ https://drive.google.com/file/d/...        │ │
│ └─────────────────────────────────────────────┘ │
│ 📌 How to share assignment:                     │
│ 1. Upload assignment PDF to Google Drive        │
│ 2. Right-click → "Share" → "Anyone with link"   │
│ 3. Copy the link and paste it here              │
└─────────────────────────────────────────────────┘
```

### Assignment Cards

Each assignment now shows **THREE action buttons**:

```
┌──────────────────────────────────────────────────┐
│ Assignment Title                    [Active]     │
│ Subject: Mathematics | Due: Oct 10, 2025        │
│                                                  │
│ ┌──────────────────────────────────────────┐   │
│ │ 📁 Open Folder (Purple button)           │   │
│ └──────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────┐   │
│ │ 📄 View PDF (Blue button)                │   │
│ └──────────────────────────────────────────┘   │
│ ┌──────────────────────────────────────────┐   │
│ │ 🗑️ Delete (Red button)                    │   │
│ └──────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

---

## 🔧 Updated Data Structure

### Firestore Document (assignments collection)

```javascript
{
  id: "auto-generated",
  title: "Algebra Assignment 1",
  description: "Solve equations from chapter 5",
  subject: "Mathematics",
  class: "Class 10A",
  dueDate: Timestamp,
  
  // NEW: Two separate links
  assignmentFolderUrl: "https://drive.google.com/drive/folders/1ABC...",
  assignmentPdfUrl: "https://drive.google.com/file/d/1XYZ...",
  
  createdBy: "Teacher Name",
  createdByEmail: "teacher@school.com",
  createdAt: Timestamp,
  maxMarks: 50,
  status: "active" // calculated on load
}
```

---

## 📝 How to Use (Teacher Guide)

### Step 1: Prepare Your Google Drive

**Create a folder structure:**
```
📁 Class 10A - Mathematics
  ├── 📁 Assignment 1 - Algebra
  │   ├── 📄 assignment.pdf (main assignment)
  │   ├── 📄 reference_material.pdf
  │   ├── 📄 solution_hints.pdf
  │   └── 📄 rubric.pdf
```

**Share the folder:**
1. Right-click folder → Share
2. Set to "Anyone with the link"
3. Copy folder link: `https://drive.google.com/drive/folders/1ABC...`

**Share the main PDF:**
1. Right-click `assignment.pdf` → Share
2. Set to "Anyone with the link"
3. Copy file link: `https://drive.google.com/file/d/1XYZ...`

---

### Step 2: Create Assignment in Dashboard

1. Go to **Assignments** tab
2. Fill in the form:
   - **Title**: "Assignment 1 - Algebra"
   - **Subject**: "Mathematics"
   - **Due Date**: October 10, 2025
   - **Max Marks**: 50
   - **Description**: "Solve all equations from chapter 5"
   - **📁 Drive Folder Link**: Paste the folder link
   - **📄 Assignment PDF Link**: Paste the PDF link

3. Click **"Create Assignment"**

---

### Step 3: Students Access the Assignment

Students can now:
1. Click **"📁 Open Folder"** to browse all materials
2. Click **"📄 View PDF"** to directly view the assignment
3. Download files from the folder as needed

---

## 🎨 Button Color Guide

| Button | Color | Purpose |
|--------|-------|---------|
| 📁 Open Folder | Purple → Indigo | Open Drive folder with all materials |
| 📄 View PDF | Blue → Cyan | View assignment PDF directly |
| 🗑️ Delete | Red → Pink | Remove assignment (with confirmation) |

---

## ⚙️ Technical Changes Summary

### Files Modified
- ✅ `src/pages/TeacherDashboard.tsx` (updated)

### Changes Made

1. **Assignment Interface** (lines 44-57)
   ```typescript
   interface Assignment {
     // ... other fields
     assignmentFolderUrl: string; // NEW
     assignmentPdfUrl: string;    // NEW (replaces assignmentUrl)
   }
   ```

2. **State Variables** (lines 85-93)
   ```typescript
   const [assignmentFolderLink, setAssignmentFolderLink] = useState('');
   const [assignmentPdfLink, setAssignmentPdfLink] = useState('');
   ```

3. **loadAssignments() Function** (lines 738-789)
   - Fetches both `assignmentFolderUrl` and `assignmentPdfUrl`
   - No longer uses `assignmentUrl`

4. **createAssignment() Function** (lines 791-863)
   - Validates BOTH links (folder + PDF)
   - Saves BOTH links to Firestore
   - Shows error if either link is missing

5. **Create Form UI** (lines 1718-1770)
   - Two separate input fields
   - Different placeholders (folders vs files)
   - Button validation checks both links

6. **Assignment Card UI** (lines 1865-1902)
   - Three buttons in vertical layout
   - Purple "Open Folder" button
   - Blue "View PDF" button
   - Red "Delete" button

---

## 🔍 Link Validation

Both links are validated using the existing `validateDriveLink()` function:

**Folder Link** must match:
- `https://drive.google.com/drive/folders/...`

**PDF Link** must match:
- `https://drive.google.com/file/d/...`

Invalid links will show error: "Invalid Google Drive link format."

---

## 🚀 Setup Requirements (No Change)

The Firestore setup remains the same:

### 1. Firestore Rules (Already Updated)
```javascript
match /assignments/{assignmentId} {
  allow read, write: if request.auth != null;
}
```

### 2. Firestore Index (Same as Before)
- **Collection**: `assignments`
- **Fields**: `class` (Ascending), `createdAt` (Descending)
- **Query Scope**: Collection

---

## 📊 Benefits of Dual Links

### For Teachers
✅ Better organization (folder for all materials)  
✅ Direct PDF link for main assignment  
✅ Easier to manage supplementary materials  
✅ Students can access everything in one place

### For Students
✅ Quick access to assignment PDF  
✅ Can browse folder for additional resources  
✅ Download what they need  
✅ No confusion about which file to open

### For Organization
✅ Consistent folder structure  
✅ All materials grouped together  
✅ Easy to update/add materials  
✅ Better archiving

---

## 🎓 Best Practices

### Folder Structure
```
📁 [Class] - [Subject]
  ├── 📁 Assignment 1 - [Topic]
  │   ├── 📄 assignment.pdf (main)
  │   ├── 📄 reference_notes.pdf
  │   └── 📄 rubric.pdf
  ├── 📁 Assignment 2 - [Topic]
  └── 📁 Assignment 3 - [Topic]
```

### Naming Convention
- **Folders**: "Assignment X - [Topic Name]"
- **Main PDF**: "assignment.pdf" or "assignment_[topic].pdf"
- **Supplementary**: "reference_", "hints_", "rubric_"

### Sharing Settings
- ✅ Set folder to "Anyone with the link"
- ✅ Set main PDF to "Anyone with the link"
- ⚠️ Do NOT give edit access to students
- ⚠️ Only give "Viewer" permissions

---

## 🔥 Migration from Old Assignments

If you created assignments with the old single-link system:

### Option 1: Create New Assignments
1. Delete old assignments
2. Create new ones with both links
3. Recommended for clean data

### Option 2: Manual Firestore Update
1. Go to Firebase Console → Firestore
2. Find old assignment documents
3. Add new fields:
   - `assignmentFolderUrl`: [folder link]
   - `assignmentPdfUrl`: [old assignmentUrl]
4. Delete old `assignmentUrl` field

---

## ❓ Troubleshooting

### "Please enter a Google Drive folder link"
- You left the folder link field empty
- Enter a valid Google Drive folder link

### "Please enter a Google Drive PDF link"
- You left the PDF link field empty
- Enter a valid Google Drive file link

### "Invalid Google Drive folder link format"
- Folder link doesn't match expected format
- Must be: `https://drive.google.com/drive/folders/...`

### "Invalid Google Drive PDF link format"
- PDF link doesn't match expected format
- Must be: `https://drive.google.com/file/d/...`

### Create button is disabled
- Check if ALL required fields are filled:
  - ✅ Title
  - ✅ Subject
  - ✅ Due Date
  - ✅ Folder Link
  - ✅ PDF Link

### Buttons not showing on assignment cards
- Refresh the page
- Check browser console for errors
- Ensure both links exist in Firestore

---

## 🆕 New Features Summary

| Feature | Status |
|---------|--------|
| Dual Google Drive Links | ✅ Implemented |
| Folder Link Input | ✅ Added |
| PDF Link Input | ✅ Added |
| "Open Folder" Button | ✅ Purple gradient |
| "View PDF" Button | ✅ Blue gradient |
| Vertical Button Layout | ✅ Stacked buttons |
| Link Validation | ✅ Both links checked |
| Error Messages | ✅ Separate errors |
| Firestore Schema | ✅ Updated |

---

## 📌 Quick Reference

### Create Form Fields (in order)
1. Assignment Title *
2. Subject *
3. Due Date *
4. Max Marks (optional)
5. Description (optional)
6. **📁 Drive Folder Link** * (NEW)
7. **📄 Assignment PDF Link** * (NEW)

### Assignment Card Buttons (top to bottom)
1. **📁 Open Folder** (purple) - Opens Drive folder
2. **📄 View PDF** (blue) - Opens assignment PDF
3. **🗑️ Delete** (red) - Deletes assignment

---

## 🎉 That's It!

You now have a **dual-link assignment system** that gives teachers and students better organization and access to materials!

### Need Help?
- Check Firestore rules are published
- Ensure composite index is created
- Both links must be valid Google Drive links
- Test with a real assignment

---

**Last Updated**: October 2, 2025  
**Version**: 2.0 (Dual Links)  
**Previous Version**: 1.0 (Single Link)
