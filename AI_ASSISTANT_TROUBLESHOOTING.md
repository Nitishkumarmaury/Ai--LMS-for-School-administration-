# 🔧 AI Assistant Troubleshooting Guide

## Common Error: "I apologize, but I encountered an error. Please try again."

### 🔍 How to Diagnose the Issue

When you see this error, follow these steps:

#### **Step 1: Open Browser Console**
1. Press `F12` on your keyboard (or right-click → Inspect)
2. Click on the **Console** tab
3. Look for error messages starting with ❌

#### **Step 2: Identify the Error Type**

The console will show detailed error messages. Here are the common ones:

---

## 🚨 Common Issues & Solutions

### **Issue 1: API Key Error**

**Console Shows:**
```
❌ API Error Response: { "error": { "message": "API key not valid" } }
```

**Error Message:**
```
❌ Error: Unable to Generate Response
Issue: Invalid or expired API key
```

**Solution:**
1. Check your Google Cloud Console
2. Verify the API key is active: `AIzaSyB1vSpOqOA38KXYMX-wf8cD_PNECY68a3Q`
3. Make sure "Generative Language API" is enabled
4. Check if the key has usage restrictions (IP, referer, etc.)

**How to Fix:**
```typescript
// In TeacherAIAssistant.tsx, line ~150
const API_KEY = 'YOUR_VALID_API_KEY_HERE';
```

---

### **Issue 2: Network/Connection Error**

**Console Shows:**
```
❌ Network error: Unable to reach Google Gemini API
```

**Error Message:**
```
❌ Error: Unable to Generate Response
Issue: Network connection problem
```

**Solution:**
1. Check your internet connection
2. Try opening https://generativelanguage.googleapis.com in browser
3. Check if firewall/antivirus is blocking the request
4. Disable VPN if active
5. Try a different network

---

### **Issue 3: Rate Limit / Quota Exceeded**

**Console Shows:**
```
❌ API Error Response: { "error": { "message": "Quota exceeded" } }
```

**Error Message:**
```
❌ Error: Unable to Generate Response
Issue: API rate limit exceeded
```

**Solution:**
1. Wait 1-2 minutes before trying again
2. Check your Google Cloud Console quota usage
3. Consider upgrading to a paid plan if using heavily
4. Free tier limits:
   - 60 requests per minute
   - 1,500 requests per day

---

### **Issue 4: CORS Error (Cross-Origin)**

**Console Shows:**
```
Access to fetch at 'https://generativelanguage.googleapis.com' 
from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Solution:**
This should NOT happen with Gemini API (it allows CORS), but if it does:
1. Check if you're using the correct endpoint
2. Ensure you're using `fetch` with proper headers
3. Verify API key is passed as query parameter (not in headers)

**Current Endpoint (Correct):**
```
https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_KEY
```

---

### **Issue 5: Response Format Error**

**Console Shows:**
```
❌ Unexpected API response structure: { ... }
```

**Error Message:**
```
❌ Error: Unable to Generate Response
Issue: Invalid API response structure
```

**Solution:**
1. Check if the API endpoint is correct
2. Verify you're using `gemini-pro` model (not `gemini-pro-vision`)
3. Check console for full API response
4. Ensure request body format is correct

**Expected Response Structure:**
```json
{
  "candidates": [
    {
      "content": {
        "parts": [
          { "text": "AI generated content here..." }
        ]
      }
    }
  ]
}
```

---

### **Issue 6: Empty Response**

**Console Shows:**
```
✅ AI Response generated successfully
📊 Response length: 0 characters
```

**Solution:**
1. The API returned an empty response
2. Try rephrasing your question
3. Check if content filters blocked the response
4. Verify prompt is not too long (max 2048 tokens)

---

## 🧪 Testing Steps

### **Test 1: Basic Connection**
1. Open browser console
2. Type in AI Assistant: "hello"
3. Check console for:
   ```
   🤖 Generating AI Response for: hello
   ✅ USING GOOGLE GEMINI API
   ```

### **Test 2: Quiz Generation**
1. Type: "create quiz on trigonometry"
2. Check console for:
   ```
   📝 Detected Quiz Request
   📚 Extracted - Topic: Trigonometry | Subject: Mathematics
   🌐 API Response received: Success
   ✅ AI Response generated successfully
   ```

### **Test 3: Error Handling**
1. Temporarily change API key to invalid value:
   ```typescript
   const API_KEY = 'INVALID_KEY_TEST';
   ```
2. Try creating quiz
3. Should see detailed error message (not generic "try again")
4. Restore correct API key

---

## 🔧 Debug Checklist

When error occurs, check ALL of these:

- [ ] **Internet connection** - Can you access google.com?
- [ ] **API Key validity** - Is the key correct and active?
- [ ] **API enabled** - Is "Generative Language API" enabled in Google Cloud?
- [ ] **Quota available** - Have you exceeded daily/minute limits?
- [ ] **Browser console** - What exact error is shown?
- [ ] **Network tab** - Is the request being made? (F12 → Network tab)
- [ ] **Firewall/Antivirus** - Is anything blocking the API call?
- [ ] **VPN/Proxy** - Try disabling if active
- [ ] **Browser cache** - Try hard refresh (Ctrl+Shift+R)
- [ ] **Different browser** - Does it work in Chrome/Edge/Firefox?

---

## 📊 Enhanced Error Logging

The system now provides detailed error information:

### **In Browser Console:**
```
❌ Detailed Error: Error: Gemini API Error: API key not valid
❌ Google Gemini API Error Details: [Full error object]
📋 Full API Response: { "error": { ... } }
```

### **In UI:**
```
❌ Error: Unable to Generate Response

Issue: Invalid or expired API key
Solution: Please check your Google Gemini API key configuration.

💡 What you can try:
1. Check your internet connection
2. Wait a moment and try again
3. Try rephrasing your question
4. Check browser console (F12) for detailed error logs
```

---

## 🔑 API Key Management

### **Current API Key:**
```
AIzaSyB1vSpOqOA38KXYMX-wf8cD_PNECY68a3Q
```

### **How to Update API Key:**
1. Open `src/components/TeacherAIAssistant.tsx`
2. Find line ~150: `const API_KEY = '...'`
3. Replace with new key
4. Save file
5. Refresh browser

### **Security Best Practice:**
⚠️ **Warning:** API key is currently hardcoded. For production:
1. Move to environment variables (.env file)
2. Use server-side API calls (not client-side)
3. Implement rate limiting
4. Add IP restrictions in Google Cloud Console

**Better approach:**
```typescript
// .env.local
NEXT_PUBLIC_GEMINI_API_KEY=your_key_here

// In component
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
```

---

## 🌐 API Endpoint Information

### **Current Configuration:**
```javascript
Endpoint: https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent
Method: POST
Model: gemini-pro
Temperature: 0.7
TopK: 40
TopP: 0.95
MaxTokens: 2048
```

### **Valid Models:**
- ✅ `gemini-pro` - Text generation (currently used)
- ❌ `gemini-pro-vision` - Image + text (not used)
- ❌ `gemini-ultra` - Not yet available in API

---

## 📞 Getting More Help

### **If Issue Persists:**

1. **Check Google Cloud Console:**
   - Visit: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com
   - Verify API is enabled
   - Check quota usage
   - View error logs

2. **Test API Directly:**
   ```bash
   curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=YOUR_KEY" \
   -H 'Content-Type: application/json' \
   -d '{
     "contents": [{"parts":[{"text": "Hello"}]}]
   }'
   ```

3. **Check API Status:**
   - Visit: https://status.cloud.google.com/
   - Check if Gemini API has outages

4. **Review Full Console Logs:**
   - Copy all console errors
   - Check Network tab for failed requests
   - Look for any red errors

---

## ✅ Success Indicators

When everything is working correctly, you should see:

### **In Console:**
```
🤖 Generating AI Response for: create quiz on trigonometry
📝 Detected Quiz Request
📚 Extracted - Topic: Trigonometry | Subject: Mathematics
✅ Using Professional Educational Prompt
🌐 API Response received: Success
📋 Full API Response: { "candidates": [...] }
✅ AI Response generated successfully - USING GOOGLE GEMINI API
📊 Response length: 1234 characters
```

### **In UI:**
```
🤖 Powered by Google Gemini AI

🎯 AI-Generated Quiz: Trigonometry

[10 topic-specific questions about trigonometry]

✨ Your quiz is ready!
```

---

## 🎯 Quick Fixes Summary

| Error | Quick Fix |
|-------|-----------|
| API Key Invalid | Update key in TeacherAIAssistant.tsx line 150 |
| Network Error | Check internet, disable VPN |
| Rate Limit | Wait 1-2 minutes |
| CORS Error | Shouldn't happen - check endpoint URL |
| Empty Response | Rephrase question, check content filters |
| Parsing Error | Check console for full API response |

---

**Last Updated:** January 2025  
**Component:** TeacherAIAssistant.tsx  
**API Version:** Gemini Pro v1beta
