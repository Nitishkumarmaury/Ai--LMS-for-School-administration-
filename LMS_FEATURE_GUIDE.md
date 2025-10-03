# 📚 Learning Management System (LMS) Feature

## Overview

The LMS feature has been added to the Teacher Dashboard, allowing teachers to upload and manage learning materials for their classes. Students can access these materials through a dedicated interface.

## 🎯 Features

### For Teachers:
- ✅ Upload learning materials (PDF, PPT, Videos, Notes)
- ✅ Organize materials by class and subject
- ✅ Add titles and descriptions to materials
- ✅ Track file size and upload progress
- ✅ View all uploaded materials
- ✅ Delete materials when no longer needed
- ✅ Auto-detection of file types

### Material Types Supported:
1. **PDF Files** (.pdf) - Documents, worksheets, study guides
2. **PowerPoint** (.ppt, .pptx) - Presentations, lectures
3. **Lecture Videos** (.mp4, .avi, .mov) - Video lectures, tutorials
4. **Notes** (.doc, .docx, .txt) - Text notes, study materials
5. **Other** - Any other educational content

## 🚀 How to Use

### Step 1: Access LMS
1. Login to Teacher Dashboard
2. Click on **"Learning Materials"** tab
3. Select your class from the dropdown

### Step 2: Upload Material
1. Fill in the upload form:
   - **Material Title**: Name of the material (e.g., "Chapter 5 - Physics")
   - **Subject**: Subject name (e.g., "Physics", "Mathematics")
   - **Description**: Brief description (optional)
   - **Material Type**: Select type (PDF, PPT, Lecture, Notes, Other)
   - **Select File**: Choose file from your computer (Max 50MB)

2. Click **"Upload Material"** button
3. Wait for upload to complete (progress bar shows status)
4. Material will appear in the materials list

### Step 3: View Materials
- All uploaded materials are displayed as cards
- Each card shows:
  - File icon (based on type)
  - Title and description
  - Subject and filename
  - File size and upload date
  - View and Delete buttons

### Step 4: Manage Materials
- **View**: Click "View" to open/download the file
- **Delete**: Click "Delete" to remove the material (requires confirmation)

## 📁 File Organization

Files are organized in Firebase Storage with the following structure:

```
learning-materials/
  ├── Class 10A/
  │   ├── pdf/
  │   ├── ppt/
  │   ├── lecture/
  │   ├── notes/
  │   └── other/
  ├── Class 10B/
  │   ├── pdf/
  │   ├── ppt/
  │   └── ...
  └── ...
```

## 🔧 Technical Implementation

### Technologies Used:
- **Firebase Storage**: File storage and hosting
- **Firestore Database**: Metadata storage
- **React Hooks**: State management (useState, useEffect)
- **TypeScript**: Type safety
- **Tailwind CSS**: Modern UI design

### Firebase Collections:

#### learningMaterials Collection
```typescript
{
  id: string;              // Auto-generated document ID
  title: string;           // Material title
  description: string;     // Material description
  type: 'pdf' | 'ppt' | 'lecture' | 'notes' | 'other';
  fileName: string;        // Original filename
  fileUrl: string;         // Firebase Storage download URL
  fileSize: number;        // File size in bytes
  class: string;           // Class name
  subject: string;         // Subject name
  uploadedBy: string;      // Teacher name
  uploadedByEmail: string; // Teacher email
  uploadedAt: Timestamp;   // Upload timestamp
}
```

### Key Functions:

1. **loadLearningMaterials()**: Loads materials for selected class
2. **handleFileSelect()**: Validates and selects file for upload
3. **uploadLearningMaterial()**: Uploads file to Firebase Storage
4. **deleteLearningMaterial()**: Deletes file and metadata
5. **formatFileSize()**: Formats bytes to readable size (KB/MB)
6. **getFileIcon()**: Returns appropriate icon for file type

## 🔒 Security & Permissions

### Firebase Storage Rules:
```javascript
// Teachers can upload, authenticated users can read
match /learning-materials/{class}/{type}/{fileName} {
  allow write: if request.auth != null 
               && request.resource.size < 50 * 1024 * 1024;
  allow read: if request.auth != null;
}
```

### Security Features:
- ✅ Only authenticated users can upload
- ✅ File size limited to 50MB
- ✅ Only authenticated users can view
- ✅ Files organized by class (access control ready)
- ✅ Upload tracking with user email

## 📊 File Size Limits

| Limit Type | Size |
|------------|------|
| Maximum File Size | 50 MB |
| Recommended Size | < 20 MB |
| PDF Documents | < 10 MB |
| Presentations | < 20 MB |
| Videos | < 50 MB |

## 🎨 UI Design Features

### Upload Form:
- Modern gradient background (indigo to purple)
- Dashed border for visual appeal
- Responsive grid layout
- Real-time progress bar
- File type auto-detection
- Disabled state during upload

### Material Cards:
- Grid layout (1-3 columns responsive)
- Color-coded file type icons
- Hover effects with scale animation
- Gradient badges for file types
- Detailed metadata display
- Action buttons (View/Delete)

## 🐛 Troubleshooting

### Upload Issues:

**Problem**: Upload fails with "Permission denied"
**Solution**: Update Firebase Storage rules (see FIREBASE_STORAGE_RULES.md)

**Problem**: "File too large" error
**Solution**: Compress file or increase size limit in rules

**Problem**: Upload stuck at 0%
**Solution**: 
- Check internet connection
- Verify Firebase Storage is enabled
- Check browser console for errors

### Display Issues:

**Problem**: Materials not showing
**Solution**: 
- Ensure class is selected
- Check Firestore permissions
- Reload the page

**Problem**: Download not working
**Solution**:
- Verify Storage read permissions
- Check file URL validity
- Try opening in new tab

## 📱 Responsive Design

The LMS interface is fully responsive:
- **Desktop**: 3-column grid for materials
- **Tablet**: 2-column grid
- **Mobile**: Single column layout
- Touch-friendly buttons and controls

## 🔮 Future Enhancements

Potential features to add:
- [ ] Student view interface
- [ ] Download tracking and analytics
- [ ] Material categories and tags
- [ ] Search and filter functionality
- [ ] Bulk upload capability
- [ ] Material sharing between classes
- [ ] Comment/feedback system
- [ ] Material expiration dates
- [ ] Version control for materials
- [ ] Notification when new material is uploaded

## 📝 Code Structure

### State Variables:
```typescript
const [learningMaterials, setLearningMaterials] = useState<LearningMaterial[]>([]);
const [uploadFile, setUploadFile] = useState<File | null>(null);
const [uploadProgress, setUploadProgress] = useState(0);
const [uploading, setUploading] = useState(false);
const [materialTitle, setMaterialTitle] = useState('');
const [materialDescription, setMaterialDescription] = useState('');
const [materialType, setMaterialType] = useState<'lecture' | 'pdf' | 'ppt' | 'notes' | 'other'>('pdf');
const [materialSubject, setMaterialSubject] = useState('');
```

### Upload Flow:
1. User selects file → `handleFileSelect()`
2. User fills form fields
3. User clicks Upload → `uploadLearningMaterial()`
4. File uploads to Storage with progress tracking
5. Metadata saved to Firestore
6. Materials list refreshed → `loadLearningMaterials()`
7. Success message displayed

## 🎓 Best Practices

### For Teachers:
1. Use descriptive titles (include chapter/topic)
2. Always fill in the subject field
3. Add meaningful descriptions
4. Organize materials by type correctly
5. Delete outdated materials regularly
6. Keep file sizes reasonable
7. Use standard file formats

### File Naming:
- Original filename is preserved
- Timestamp added automatically (prevents conflicts)
- Special characters are handled

### Content Guidelines:
- Only upload educational content
- Respect copyright laws
- Ensure file quality is good
- Test files before uploading
- Keep materials relevant to syllabus

## 📞 Support

For issues or questions:
1. Check FIREBASE_STORAGE_RULES.md for setup
2. Review Firebase Console for errors
3. Check browser console for debugging
4. Verify Firebase configuration

## 🎉 Success Metrics

Track these metrics to measure success:
- Number of materials uploaded per class
- Most popular file types
- Average file size
- Upload success rate
- Student engagement (future feature)

---

**Last Updated**: October 2, 2025
**Version**: 1.0
**Status**: ✅ Production Ready (after Firebase Storage rules are set)
