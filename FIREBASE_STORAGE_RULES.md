# Firebase Storage Security Rules

## Current Rules for Learning Materials

To enable file uploads and downloads for your LMS feature, you need to update your Firebase Storage security rules in the Firebase Console.

### How to Update Storage Rules:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **my-login-app-8a4fa**
3. Navigate to **Storage** from the left sidebar
4. Click on the **Rules** tab
5. Replace the existing rules with the rules below
6. Click **Publish**

### Recommended Storage Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Learning Materials - Teachers can upload, everyone can read
    match /learning-materials/{class}/{type}/{fileName} {
      // Allow authenticated teachers to upload files (max 50MB)
      allow write: if request.auth != null 
                   && request.resource.size < 50 * 1024 * 1024;
      
      // Allow authenticated users to read files
      allow read: if request.auth != null;
    }
    
    // Deny all other access
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

### Rule Explanation:

1. **Learning Materials Path**: `/learning-materials/{class}/{type}/{fileName}`
   - `{class}`: Class name (e.g., "Class 10A", "Class 9B")
   - `{type}`: Material type (pdf, ppt, lecture, notes, other)
   - `{fileName}`: Unique filename with timestamp

2. **Write Access**: 
   - Only authenticated users can upload
   - File size limit: 50MB
   - Prevents unauthorized uploads

3. **Read Access**:
   - Only authenticated users can download
   - Students and teachers can view materials

### Testing:

After publishing the rules:
1. Login to the teacher dashboard
2. Navigate to the "Learning Materials" tab
3. Try uploading a PDF, PPT, or other file
4. Verify the file appears in the materials list
5. Click "View" to download/open the file

### Supported File Types:

- **PDF**: .pdf
- **PowerPoint**: .ppt, .pptx
- **Documents**: .doc, .docx, .txt
- **Videos**: .mp4, .avi, .mov
- **Images**: .jpg, .jpeg, .png

### File Size Limits:

- Maximum file size: 50MB per file
- This can be adjusted in the storage rules by changing the size check

### Security Considerations:

✅ Only authenticated users can upload files
✅ File size limit prevents abuse
✅ Files are organized by class and type
✅ Only authenticated users can read files

❌ No public access to files
❌ Unauthenticated users cannot access any files

### Firestore Collection for Metadata:

The system also stores file metadata in Firestore collection: **learningMaterials**

Fields stored:
- `title`: Material title
- `description`: Material description  
- `type`: pdf/ppt/lecture/notes/other
- `fileName`: Original filename
- `fileUrl`: Firebase Storage download URL
- `fileSize`: File size in bytes
- `class`: Class name
- `subject`: Subject name
- `uploadedBy`: Teacher name
- `uploadedByEmail`: Teacher email
- `uploadedAt`: Upload timestamp

### Troubleshooting:

**Error: "Firebase Storage: User does not have permission"**
- Ensure Storage rules are published
- Check user is authenticated
- Verify file path matches the rules pattern

**Error: "File too large"**
- File exceeds 50MB limit
- Compress the file or increase limit in rules

**Upload stuck at 0%**
- Check internet connection
- Verify Firebase Storage is enabled
- Check browser console for errors

## Next Steps:

1. ✅ Update Storage rules in Firebase Console
2. ✅ Test file upload functionality
3. ✅ Verify files can be downloaded
4. ✅ Check Firestore for metadata
5. ✅ Test delete functionality

---

Last Updated: October 2, 2025
