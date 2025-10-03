# 📝 Assignments Feature Guide

## Overview

The Assignments feature allows teachers to create, manage, and share assignments with students using Google Drive links. This feature is integrated into the Teacher Dashboard alongside attendance tracking and learning materials.

## ✨ Features

### For Teachers:
- ✅ Create assignments with detailed information
- ✅ Set due dates and maximum marks
- ✅ Share assignment files via Google Drive links
- ✅ View all assignments for each class
- ✅ Track assignment status (Active/Expired)
- ✅ Delete assignments
- ✅ Automatic status updates based on due date

## 🎯 How to Use

### 1. Access Assignments Tab
1. Login to Teacher Dashboard
2. Select a class from the dropdown
3. Click the **"Assignments"** tab (pink button with clipboard icon)

### 2. Create a New Assignment

#### Step 1: Prepare Assignment File
1. Create your assignment document (PDF, Word, etc.)
2. Upload to Google Drive
3. Right-click → **"Share"** → **"Anyone with the link"**
4. Copy the shareable link

#### Step 2: Fill Assignment Form
- **Title** * (Required): Assignment name (e.g., "Math Assignment - Chapter 5")
- **Subject** * (Required): Subject name (e.g., "Mathematics")
- **Due Date** * (Required): Select date and time
- **Maximum Marks** (Optional): Total marks (e.g., 100)
- **Description** (Optional): Instructions, requirements, etc.
- **Assignment Link** * (Required): Paste Google Drive link

#### Step 3: Submit
- Click **"Create Assignment"**
- Assignment will appear in the list below
- Students can access it via the Google Drive link

### 3. View Assignments

Assignments are displayed as cards with:
- **Status Badge**: 
  - ✅ ACTIVE (green) - before due date
  - ⏰ EXPIRED (gray) - after due date
- **Subject Tag**: Assignment subject
- **Title & Description**: Assignment details
- **Due Date**: Submission deadline
- **Max Marks**: If specified
- **Actions**:
  - **View**: Opens assignment in Google Drive
  - **Delete**: Removes assignment

### 4. Manage Assignments

#### View Assignment
- Click **"View"** button to open in Google Drive
- Assignment opens in new tab
- Students can view/download from the link

#### Delete Assignment
- Click **"Delete"** button
- Confirm deletion
- Assignment is permanently removed

## 🔧 Setup Requirements

### 1. Update Firestore Security Rules

The `assignments` collection must be added to your Firestore rules:

```javascript
// Assignments collection - REQUIRED FOR ASSIGNMENTS
match /assignments/{assignmentId} {
  allow read, write: if request.auth != null;
}
```

**How to Update:**
1. Open `FIRESTORE_RULES_COMPLETE.txt`
2. Copy all content (it already includes assignments rule)
3. Go to Firebase Console → Firestore Database → Rules
4. Paste and click **Publish**

### 2. Create Firestore Index (First-Time Only)

When you first visit the Assignments tab, you may see an error about missing index. This is normal!

**How to Fix:**
1. The error message contains a special link
2. Click the link (opens Firebase Console)
3. Click **"Create Index"** button
4. Wait 1-2 minutes for index to build
5. Refresh the page

**Manual Index Creation:**
- Collection: `assignments`
- Fields:
  - `class` - Ascending
  - `createdAt` - Descending

## 📊 Data Structure

### Assignment Object
```javascript
{
  title: string,              // Assignment title
  description: string,        // Assignment description
  subject: string,            // Subject name
  class: string,              // Class name
  dueDate: Timestamp,         // Submission deadline
  assignmentUrl: string,      // Google Drive link
  createdBy: string,          // Teacher name
  createdByEmail: string,     // Teacher email
  createdAt: Timestamp,       // Creation timestamp
  maxMarks: number | null,    // Maximum marks (optional)
}
```

### Status Calculation
- **Active**: Current time < Due date
- **Expired**: Current time >= Due date
- Status is calculated in real-time when loading assignments

## 🎨 UI Features

### Color Scheme
- **Tab Button**: Pink/Rose gradient
- **Create Form**: Pink/Rose accents
- **Status Badges**:
  - Active: Green gradient
  - Expired: Gray
- **Action Buttons**:
  - View: Blue/Indigo gradient
  - Delete: Red/Pink gradient

### Icons
- 📋 Clipboard icon for Assignments tab
- 📝 Document icon for assignment cards
- 📅 Calendar icon for due dates
- ⭐ Star icon for marks
- 🔗 Link icon for Google Drive

### Responsive Design
- **Desktop**: 2-column grid layout
- **Tablet**: 2-column grid layout
- **Mobile**: Single column layout

## ⚠️ Important Notes

### Google Drive Links
- **Accepted formats**:
  - `https://drive.google.com/file/d/FILE_ID/view`
  - `https://drive.google.com/open?id=FILE_ID`
  - `https://docs.google.com/document/d/FILE_ID/`
- **Sharing**: Always set to "Anyone with the link"
- **Permissions**: View-only recommended for students

### Due Date Handling
- Use `datetime-local` input for precise time selection
- Timezone is based on local browser timezone
- Status updates automatically when page loads
- Past dates are allowed (for backdated assignments)

### Storage
- **No file upload to Firebase Storage**
- All files hosted on Google Drive
- Only metadata and links stored in Firestore
- No storage costs or quotas to worry about

## 🐛 Troubleshooting

### "Failed to load assignments: The query requires an index"
**Solution**: Create Firestore index (see Setup Requirements above)

### "Permission Denied"
**Solution**: Update Firestore security rules (see Setup Requirements above)

### "Invalid Google Drive link format"
**Solution**: 
- Check link format
- Ensure file is shared properly
- Try copying the link again

### Assignment not appearing after creation
**Solution**:
- Check if class is selected
- Verify assignment was created (check Firestore console)
- Refresh the page
- Check browser console for errors

### Can't click "Create Assignment" button
**Solution**:
- Fill all required fields (marked with *)
- Title, Subject, Due Date, and Drive Link are mandatory
- Button is disabled until all required fields are filled

## 📈 Best Practices

### Creating Assignments
1. **Clear Titles**: Use descriptive names with chapter/topic
2. **Detailed Descriptions**: Include all instructions and requirements
3. **Reasonable Due Dates**: Give students enough time
4. **Mark Allocation**: Always specify maximum marks
5. **File Organization**: Keep assignment files organized in Google Drive folders

### Managing Assignments
1. **Regular Cleanup**: Delete old/expired assignments periodically
2. **Preview Before Sharing**: Always test the Google Drive link
3. **Update Permissions**: Verify Google Drive sharing settings
4. **Backup**: Keep local copies of assignment files
5. **Communication**: Inform students about new assignments

### Google Drive Organization
```
📁 Assignments/
  📁 Class 10A/
    📁 Mathematics/
      📄 Chapter 1 Assignment.pdf
      📄 Chapter 2 Assignment.pdf
    📁 Physics/
      📄 Lab Assignment 1.pdf
  📁 Class 10B/
    ...
```

## 🔄 Workflow Example

### Complete Assignment Creation Workflow:
1. **Prepare Assignment**
   - Create assignment document
   - Upload to Google Drive
   - Organize in appropriate folder

2. **Share Assignment**
   - Right-click file → Share
   - Set to "Anyone with the link"
   - Copy shareable link

3. **Create in Dashboard**
   - Login to Teacher Dashboard
   - Select class
   - Click Assignments tab
   - Fill form with assignment details
   - Paste Google Drive link
   - Click "Create Assignment"

4. **Verify**
   - Assignment appears in list
   - Status shows as "Active"
   - Click "View" to test link
   - Confirm students can access

5. **Monitor**
   - Check assignment list regularly
   - Watch for expired assignments
   - Delete old assignments when done

## 🎓 Student Access

Students can access assignments through:
1. Direct Google Drive link (shared by teacher)
2. Future student portal integration (if implemented)
3. Email notifications (if implemented)

**Current Implementation**: 
- Teachers create assignments in dashboard
- Share Google Drive links with students via communication channels
- Students access files directly from Google Drive

## 📝 Future Enhancements (Possible)

- [ ] Student submission tracking
- [ ] Grade management
- [ ] Email notifications to students
- [ ] Student dashboard for viewing assignments
- [ ] Submission status tracking
- [ ] Comments and feedback system
- [ ] Assignment templates
- [ ] Bulk assignment creation
- [ ] Calendar view for due dates
- [ ] Export assignments list

## ✅ Success Indicators

You know it's working when:
1. ✅ Assignments tab visible in dashboard
2. ✅ Can create new assignments
3. ✅ Assignments appear in list
4. ✅ Google Drive links open correctly
5. ✅ Status shows Active/Expired correctly
6. ✅ Can delete assignments
7. ✅ Different classes have separate assignments

---

## 🆘 Need Help?

If issues persist:
1. Check browser console (F12) for errors
2. Verify Firebase Console settings (Rules + Indexes)
3. Test Google Drive link separately
4. Clear browser cache
5. Try different browser
6. Check internet connection

## 📚 Related Documentation

- `LMS_COMPLETE_SETUP_GUIDE.md` - Overall LMS setup
- `GOOGLE_DRIVE_INTEGRATION.md` - Google Drive integration details
- `FIRESTORE_RULES_COMPLETE.txt` - Complete Firestore rules
- `FIRESTORE_INDEX_SETUP.md` - Index creation guide
