'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface TeacherAIAssistantProps {
  teacherName: string;
  teacherClass: string;
  onCreateQuiz?: (quizData: any) => void; // Callback to create quiz in dashboard
}

export default function TeacherAIAssistant({ teacherName, teacherClass, onCreateQuiz }: TeacherAIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showQuizCreator, setShowQuizCreator] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello ${teacherName}! 👋 I'm your AI Teaching Assistant. I can help you with:\n\n� **Creating & Assigning Quizzes** (NEW!)\n�📊 Analyzing student performance\n💡 Generating quiz questions\n� Creating assignment ideas\n🎯 Providing teaching strategies\n📈 Understanding class trends\n\n**Try saying:** "Create a quiz on [topic]" and I'll generate it for you!\n\nHow can I assist you today?`,
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Store quiz parameters from the initial request to avoid re-extraction bugs
  const [quizParams, setQuizParams] = useState<{
    numQuestions: number;
    marksPerQuestion: number;
    totalMarks: number;
    duration: number;
    subject: string;
    topic: string;
  } | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Helper function to parse questions from AI response
  const parseQuestionsFromAIResponse = (aiResponse: string, topic: string, marksPerQuestion: number = 2): any[] => {
    const questions: any[] = [];
    
    console.log('🔍 Starting to parse questions from AI response');
    console.log('📝 Response length:', aiResponse.length);
    
    // Split by answer key and explanations sections
    const mainQuizSection = aiResponse.split('--- ANSWER KEY ---')[0] || aiResponse.split('ANSWER KEY')[0] || aiResponse;
    const answerKeySection = aiResponse.split('--- ANSWER KEY ---')[1]?.split('--- EXPLANATIONS ---')[0] || '';
    
    console.log('📋 Main quiz section length:', mainQuizSection.length);
    console.log('🔑 Answer key section length:', answerKeySection.length);
    
    // Extract answer key
    const answerKeyLines = answerKeySection.split('\n').filter(l => l.trim().length > 0);
    const answerKey: { [key: number]: string } = {};
    
    answerKeyLines.forEach(line => {
      const match = line.match(/^(\d+)\.\s*(.+)/);
      if (match) {
        const questionNum = parseInt(match[1]);
        answerKey[questionNum] = match[2].trim();
      }
    });
    
    console.log('🔑 Answer key extracted:', answerKey);
    
    // Parse numbered questions (1. 2. 3. etc.)
    const questionBlocks = mainQuizSection.split(/(?=^\d+\.\s+)/m).filter(b => b.trim().length > 0);
    
    console.log('📊 Found', questionBlocks.length, 'question blocks');
    
    for (let blockIndex = 0; blockIndex < questionBlocks.length; blockIndex++) {
      const block = questionBlocks[blockIndex];
      if (block.trim().length < 10) continue;
      
      // Extract question number
      const questionNumMatch = block.match(/^(\d+)\./);
      if (!questionNumMatch) continue;
      
      const questionNum = parseInt(questionNumMatch[1]);
      const correctAnswerFromKey = answerKey[questionNum];
      
      console.log(`\n📌 Processing Question ${questionNum}`);
      console.log('Block preview:', block.substring(0, 150));
      
      const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      // Extract the main question text (first line after number, or line with "(5 marks)")
      let questionText = '';
      for (const line of lines) {
        if (line.match(/^\d+\.\s+/) || line.includes('(5 marks)') || line.includes('marks)')) {
          questionText = line.replace(/^\d+\.\s+/, '').replace(/\(\d+\s*marks?\)/gi, '').trim();
          if (questionText.length > 10) break;
        }
      }
      
      console.log('❓ Question text:', questionText.substring(0, 100));
      
      // Detect question type and parse accordingly
      const hasOptions = block.match(/\b[A-D][\)\.]\s+/i);
      const hasTrueFalse = block.toLowerCase().includes('true') && block.toLowerCase().includes('false');
      const hasFillBlank = block.includes('____') || block.includes('_____');
      
      if (hasOptions && !hasTrueFalse) {
        // MCQ Question
        console.log('✅ Detected: MCQ');
        const options: string[] = [];
        let correctAnswerIndex = 0;
        
        for (const line of lines) {
          const optionMatch = line.match(/^([A-D])[\)\.]\s+(.+)/i);
          if (optionMatch) {
            const optionLetter = optionMatch[1].toUpperCase();
            const optionText = optionMatch[2].replace(/✓|✔/g, '').trim();
            options.push(optionText);
            
            // Check if this is the correct answer
            if (line.includes('✓') || line.includes('✔')) {
              correctAnswerIndex = options.length - 1;
            } else if (correctAnswerFromKey && correctAnswerFromKey.toUpperCase() === optionLetter) {
              correctAnswerIndex = options.length - 1;
            }
          }
        }
        
        if (options.length >= 4 && questionText) {
          questions.push({
            type: 'mcq',
            question: questionText,
            options: options.slice(0, 4),
            correctAnswer: correctAnswerIndex,
            points: marksPerQuestion
          });
          console.log('✅ Added MCQ with', options.length, 'options, correct:', correctAnswerIndex);
        }
      } else if (hasTrueFalse) {
        // True/False Question
        console.log('✅ Detected: True/False');
        let correctAnswer = 'True';
        
        // Check from answer key first
        if (correctAnswerFromKey) {
          if (correctAnswerFromKey.toLowerCase().includes('false')) {
            correctAnswer = 'False';
          }
        } else {
          // Check from question block
          if (block.includes('False ✓') || block.includes('false ✓')) {
            correctAnswer = 'False';
          }
        }
        
        questions.push({
          type: 'true-false',
          question: questionText,
          correctAnswer: correctAnswer,
          points: marksPerQuestion
        });
        console.log('✅ Added True/False, correct:', correctAnswer);
      } else if (hasFillBlank) {
        // Fill-in-the-Blank Question
        console.log('✅ Detected: Fill-in-the-Blank');
        const correctAnswer = correctAnswerFromKey || '';
        
        questions.push({
          type: 'fill-blank',
          question: questionText,
          correctAnswer: correctAnswer,
          points: marksPerQuestion
        });
        console.log('✅ Added Fill-blank, answer:', correctAnswer);
      } else {
        // Short Answer Question
        console.log('✅ Detected: Short Answer');
        const expectedAnswer = correctAnswerFromKey || 'Students should provide a detailed explanation.';
        
        questions.push({
          type: 'short-answer',
          question: questionText,
          expectedAnswer: expectedAnswer,
          points: marksPerQuestion
        });
        console.log('✅ Added Short Answer');
      }
    }
    
    console.log('🎉 Total questions parsed:', questions.length);
    
    // If parsing failed, throw error
    if (questions.length === 0) {
      console.error('❌ Failed to parse any questions');
      throw new Error('Failed to parse questions from AI response. Please try again with a clearer topic.');
    }
    
    return questions.slice(0, 10); // Limit to 10 questions
  };

  const generateAIResponse = async (userMessage: string): Promise<string> => {
    try {
      console.log('🤖 Generating AI Response for:', userMessage);
      
      // Using Google's Gemini AI with official SDK
      const API_KEY = 'AIzaSyAOdvhUGMO25A1ujFGKNT_JkBJKizuROqI';
      const ai = new GoogleGenAI({ apiKey: API_KEY });

      // Check if this is a quiz generation request
      const lowerMessage = userMessage.toLowerCase();
      const isQuizRequest = lowerMessage.includes('quiz') || lowerMessage.includes('test') || lowerMessage.includes('create');

      let promptText = '';
      
      if (isQuizRequest) {
        console.log('📝 Detected Quiz Request');
        console.log('📋 User Message:', userMessage);
        
        // ENHANCED EXTRACTION - Handle multiple formats and typos
        let topic = 'General Knowledge';
        let subject = 'General Studies';
        
        // Fix common typos in the input first
        let normalizedMsg = userMessage.toLowerCase()
          .replace(/chpter/gi, 'chapter')      // chpter → chapter
          .replace(/chater/gi, 'chapter')      // chater → chapter
          .replace(/chaptre/gi, 'chapter')     // chaptre → chapter
          .replace(/subjct/gi, 'subject')      // subjct → subject
          .replace(/sbject/gi, 'subject')      // sbject → subject
          .replace(/qustion/gi, 'question')    // qustion → question
          .replace(/questin/gi, 'question')    // questin → question
          .replace(/queston/gi, 'question')    // queston → question
          .replace(/minuts/gi, 'minutes')      // minuts → minutes
          .replace(/minuets/gi, 'minutes')     // minuets → minutes
          .replace(/miuntes/gi, 'minutes');    // miuntes → minutes
        
        console.log('🔧 Normalized message:', normalizedMsg);
        
        // Extract subject first (more reliable)
        if (normalizedMsg.includes('math') || normalizedMsg.includes('trigono') || normalizedMsg.includes('algebra') || normalizedMsg.includes('geometry')) {
          subject = 'Mathematics';
          console.log('📚 Subject detected: Mathematics');
        } else if (normalizedMsg.includes('physics') || normalizedMsg.includes('force') || normalizedMsg.includes('motion') || normalizedMsg.includes('energy')) {
          subject = 'Physics';
          console.log('📚 Subject detected: Physics');
        } else if (normalizedMsg.includes('chemistry') || normalizedMsg.includes('reaction') || normalizedMsg.includes('element') || normalizedMsg.includes('compound')) {
          subject = 'Chemistry';
          console.log('📚 Subject detected: Chemistry');
        } else if (normalizedMsg.includes('biology') || normalizedMsg.includes('bio ') || normalizedMsg.includes('cell') || normalizedMsg.includes('organism') || normalizedMsg.includes('plant') || normalizedMsg.includes('respir') || normalizedMsg.includes('digest') || normalizedMsg.includes('photo')) {
          subject = 'Biology';
          console.log('📚 Subject detected: Biology');
        } else if (normalizedMsg.includes('history') || normalizedMsg.includes('freedom') || normalizedMsg.includes('struggle') || normalizedMsg.includes('war')) {
          subject = 'History';
          console.log('📚 Subject detected: History');
        } else if (normalizedMsg.includes('geography') || normalizedMsg.includes('climate') || normalizedMsg.includes('earth') || normalizedMsg.includes('map')) {
          subject = 'Geography';
          console.log('📚 Subject detected: Geography');
        } else if (normalizedMsg.includes('english') || normalizedMsg.includes('grammar') || normalizedMsg.includes('literature')) {
          subject = 'English';
          console.log('📚 Subject detected: English');
        } else if (normalizedMsg.includes('science')) {
          subject = 'Science';
          console.log('📚 Subject detected: Science');
        } else {
          console.log('⚠️ No specific subject detected, using default: General Studies');
        }
        
        // Extract topic/chapter - Try multiple patterns (use normalized message)
        // Pattern 1: "chapter [name]" (most direct)
        let chapterMatch = normalizedMsg.match(/chapter\s+([a-zA-Z\s,\-']+?)(?:\s+make|\s+set|\s+of|\s+for|\s+class|\s+\d|\.|\s*$)/i);
        if (chapterMatch) {
          topic = chapterMatch[1].trim();
          console.log('✅ Pattern 1 matched (chapter):', topic);
        }
        
        // Pattern 2: "subject [subject] chapter [name]"
        if (topic === 'General Knowledge') {
          const subjectChapterMatch = normalizedMsg.match(/subject\s+\w+\s+chapter\s+([a-zA-Z\s,\-']+?)(?:\s+make|\s+set|\s+of|\s+for|\s+class|\s+\d|\.|\s*$)/i);
          if (subjectChapterMatch) {
            topic = subjectChapterMatch[1].trim();
            console.log('✅ Pattern 2 matched (subject + chapter):', topic);
          }
        }
        
        // Pattern 3: "on [topic]"
        if (topic === 'General Knowledge') {
          const onMatch = normalizedMsg.match(/(?:on|about)\s+([a-zA-Z\s,\-']+?)(?:\s+for|\s+class|\s+make|\s+set|\.|\s*$)/i);
          if (onMatch) {
            topic = onMatch[1].trim();
            console.log('✅ Pattern 3 matched (on/about):', topic);
          }
        }
        
        // Pattern 4: Direct topic names with fuzzy matching
        if (topic === 'General Knowledge') {
          // Mathematics topics
          if (normalizedMsg.includes('trigono')) {
            topic = 'Trigonometry';
          } else if (normalizedMsg.includes('algebra')) {
            topic = 'Algebra';
          } else if (normalizedMsg.includes('geometry')) {
            topic = 'Geometry';
          } else if (normalizedMsg.includes('calculus')) {
            topic = 'Calculus';
          } else if (normalizedMsg.includes('probability')) {
            topic = 'Probability';
          } else if (normalizedMsg.includes('statistics')) {
            topic = 'Statistics';
          } 
          // Physics topics
          else if (normalizedMsg.includes('motion')) {
            topic = 'Motion';
          } else if (normalizedMsg.includes('force')) {
            topic = 'Force and Laws of Motion';
          } else if (normalizedMsg.includes('energy')) {
            topic = 'Energy';
          } else if (normalizedMsg.includes('electric')) {
            topic = 'Electricity';
          } else if (normalizedMsg.includes('magnet')) {
            topic = 'Magnetism';
          } else if (normalizedMsg.includes('light')) {
            topic = 'Light';
          } 
          // Biology topics
          else if (normalizedMsg.includes('respir')) {
            topic = 'Respiration';
          } else if (normalizedMsg.includes('digest')) {
            topic = 'Digestion';
          } else if (normalizedMsg.includes('photo')) {
            topic = 'Photosynthesis';
          } else if (normalizedMsg.includes('cell')) {
            topic = 'Cell Biology';
          } else if (normalizedMsg.includes('inherit') || normalizedMsg.includes('genetic')) {
            topic = 'Heredity and Genetics';
          } else if (normalizedMsg.includes('evolut')) {
            topic = 'Evolution';
          } else if (normalizedMsg.includes('reproduc')) {
            topic = 'Reproduction';
          } else if (normalizedMsg.includes('excret')) {
            topic = 'Excretion';
          } else if (normalizedMsg.includes('nervous')) {
            topic = 'Nervous System';
          } else if (normalizedMsg.includes('circulat') || normalizedMsg.includes('blood')) {
            topic = 'Circulatory System';
          }
          // Chemistry topics
          else if (normalizedMsg.includes('acid') || normalizedMsg.includes('base')) {
            topic = 'Acids, Bases and Salts';
          } else if (normalizedMsg.includes('reaction')) {
            topic = 'Chemical Reactions';
          } else if (normalizedMsg.includes('periodic')) {
            topic = 'Periodic Table';
          } else if (normalizedMsg.includes('carbon')) {
            topic = 'Carbon and its Compounds';
          } else if (normalizedMsg.includes('metal')) {
            topic = 'Metals and Non-metals';
          }
          
          if (topic !== 'General Knowledge') {
            console.log('✅ Pattern 4 (fuzzy) matched:', topic);
          }
        }
        
        // Pattern 5: Last resort - if topic still not found, look for keywords directly in the message
        if (topic === 'General Knowledge') {
          console.log('⚠️ No pattern matched, trying direct keyword search...');
          // Common chapter/topic words that might appear
          const topicKeywords = [
            'respiration', 'digestion', 'photosynthesis', 'heredity', 'genetics', 
            'evolution', 'reproduction', 'excretion', 'nervous', 'circulation',
            'trigonometry', 'algebra', 'geometry', 'calculus', 'probability',
            'motion', 'force', 'energy', 'electricity', 'magnetism', 'light',
            'acids', 'bases', 'salts', 'reactions', 'periodic', 'carbon', 'metals'
          ];
          
          for (const keyword of topicKeywords) {
            if (normalizedMsg.includes(keyword)) {
              // Capitalize the keyword
              topic = keyword.charAt(0).toUpperCase() + keyword.slice(1);
              console.log('✅ Pattern 5 (direct keyword) matched:', topic);
              break;
            }
          }
        }
        
        // Clean up extracted topic
        topic = topic.replace(/^\s+|\s+$/g, ''); // Trim
        topic = topic.replace(/\s{2,}/g, ' '); // Remove multiple spaces
        
        // Capitalize first letter of each word for better presentation
        if (topic !== 'General Knowledge' && !topic.includes('and')) {
          topic = topic.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        }
        
        // If we detected a subject but still have generic topic, use subject name
        if (subject === 'Mathematics' && topic === 'General Knowledge') {
          topic = 'Mathematics';
        } else if (subject === 'Biology' && topic === 'General Knowledge') {
          topic = 'Biology';
        } else if (subject === 'Physics' && topic === 'General Knowledge') {
          topic = 'Physics';
        } else if (subject === 'Chemistry' && topic === 'General Knowledge') {
          topic = 'Chemistry';
        }
        
        console.log('📚 Extracted - Topic:', topic, '| Subject:', subject);
        console.log('🔍 Debug - Original message:', userMessage);
        console.log('🔧 Normalized message:', normalizedMsg);
        
        // Extract class level from teacherClass (e.g., "Class 10" -> "10")
        const classMatch = teacherClass.match(/(\d+)/);
        const classLevel = classMatch ? classMatch[1] : '10';
        
        // Extract number of questions if specified
        const questionMatch = normalizedMsg.match(/(\d+)\s*(?:question|ques|q)/i);
        const numQuestions = questionMatch ? parseInt(questionMatch[1]) : 10;
        
        // Extract marks per question if specified
        const marksMatch = normalizedMsg.match(/(?:each\s+of\s+)?(\d+)\s*marks?/i);
        const marksPerQuestion = marksMatch ? parseInt(marksMatch[1]) : 2;
        const totalMarks = marksPerQuestion * numQuestions;
        
        // Extract duration/time if specified
        const timeMatch = normalizedMsg.match(/(\d+)\s*(?:minutes?|mins?|min)/i);
        const duration = timeMatch ? parseInt(timeMatch[1]) : Math.max(15, Math.min(120, totalMarks * 2));
        
        console.log('📊 Quiz Parameters:');
        console.log('  - Questions:', numQuestions);
        console.log('  - Marks per question:', marksPerQuestion);
        console.log('  - Total marks:', totalMarks);
        console.log('  - Duration:', duration, 'minutes');
        console.log('🎯 FINAL - Sending to Gemini AI with Topic:', topic, '| Subject:', subject);
        
        // Store quiz parameters for later use when user types "1"
        setQuizParams({
          numQuestions,
          marksPerQuestion,
          totalMarks,
          duration,
          subject,
          topic
        });
        
        // Professional Educational Prompt
        promptText = `**Role:** Act as an expert educational content creator and a subject matter expert in ${subject}. You specialize in designing effective quizzes for students in the Indian education system (CBSE/ICSE curriculum).

**Primary Task:** Generate a high-quality quiz based on the following detailed specifications.

**[Core Quiz Parameters]**
* **Topic:** "${topic}"
* **Class Level:** ${classLevel}
* **Subject:** ${subject}
* **Language:** English
* **Marks per Question:** ${marksPerQuestion} marks
* **Total Marks:** ${totalMarks} marks

**[Quiz Structure and Content]**
* **Total Number of Questions:** ${numQuestions}
* **Marks Distribution:** Each question worth ${marksPerQuestion} marks (Total: ${totalMarks} marks)
* **Difficulty Progression:** The quiz must follow a clear difficulty curve:
    * **Easy (Recall-based):** First ${Math.ceil(numQuestions * 0.3)} questions should be simple, testing basic definitions and facts.
    * **Medium (Understanding & Application):** The next ${Math.ceil(numQuestions * 0.4)} questions should require students to apply concepts or explain processes.
    * **Hard (Analysis & Evaluation):** The final ${Math.floor(numQuestions * 0.3)} questions should be challenging, requiring analysis, problem-solving, or evaluating scenarios (High Order Thinking Skills - HOTS).
* **Question Types:** Include a balanced mix of:
    * ${Math.ceil(numQuestions * 0.5)} Multiple Choice Questions (MCQs) with 4 distinct options (A, B, C, D).
    * ${Math.ceil(numQuestions * 0.2)} True or False questions.
    * ${Math.ceil(numQuestions * 0.2)} Fill-in-the-Blank questions.
    * ${Math.max(1, Math.floor(numQuestions * 0.1))} Short Answer Questions (requiring a 1-2 sentence answer).
* **IMPORTANT:** All questions MUST be specifically about "${topic}" in ${subject}. Do NOT create generic ${subject} questions.

**[Formatting and Output Requirements]**
1.  **Quiz Title:**
    * Start with: "**QUIZ: ${topic} - Class ${classLevel}**"
    
2.  **Quiz Section:**
    * Present all ${numQuestions} questions clearly numbered from 1 to ${numQuestions}.
    * Each question should show "(${marksPerQuestion} marks)" after the question text.
    * For MCQs, ensure only one option is correct and the others (distractors) are plausible but incorrect.
    * Mark the correct answer with ✓ symbol.
    * The question text should be unambiguous and appropriate for the specified class level.

3.  **Answer Key Section:**
    * After the quiz, provide a separate section titled "--- ANSWER KEY ---".
    * List the correct answer for each question (e.g., 1. B, 2. True, 3. Mitochondria).

4.  **Explanations Section:**
    * Following the answer key, provide another section titled "--- EXPLANATIONS ---".
    * For EACH question, provide a brief (1-2 sentence) explanation for why the correct answer is right. This is crucial for learning.

**[Important Instructions]**
- Generate EXACTLY ${numQuestions} questions (no more, no less)
- Each question must be worth EXACTLY ${marksPerQuestion} marks
- Ensure questions are aligned with CBSE/ICSE curriculum for Class ${classLevel}
- Focus SPECIFICALLY on ${topic} chapter/topic - NOT generic ${subject}
- Use clear, grammatically correct language
- Make sure MCQ options are well-distributed and plausible
- Include real-world applications where relevant
- Maintain Indian educational context and examples
- CRITICAL: Do NOT create "General Knowledge" questions - stick to "${topic}"

Begin generating the quiz now based on all the above specifications.`;

        console.log('✅ Using Professional Educational Prompt');
        console.log('🎯 Target Topic:', topic, '| Target Subject:', subject);
      } else {
        // Regular teaching assistance
        promptText = `You are an AI assistant helping a teacher named ${teacherName} who teaches ${teacherClass}. 
Be helpful, professional, and provide practical teaching advice. 

Teacher's question: ${userMessage}`;
      }

      // Use the new SDK to generate content
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: promptText,
        config: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      });

      console.log('🌐 API Response received:', response.text ? 'Success' : 'Failed');
      console.log('📋 Full API Response:', response);
      
      if (response.text) {
        const aiText = response.text;
        console.log('✅ AI Response generated successfully - USING GOOGLE GEMINI API (New SDK)');
        console.log('📊 Response length:', aiText.length, 'characters');
        return aiText;
      } else {
        console.error('❌ Unexpected API response structure:', response);
        throw new Error('Invalid API response structure. The API returned no text content.');
      }
    } catch (error) {
      console.error('❌ Google Gemini API Error Details:', error);
      
      // Enhanced error handling
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to reach Google Gemini API. Please check your internet connection.');
      } else if (error instanceof Error && error.message.includes('API key')) {
        throw new Error('API Key Error: The provided API key is invalid or expired. Please check your Google AI Studio settings.');
      } else if (error instanceof Error) {
        throw new Error(`Failed to generate AI response: ${error.message}`);
      } else {
        throw new Error('Unknown error occurred while generating AI response. Please try again.');
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input.trim();
    setInput('');
    setIsLoading(true);

    try {
      // Check if user wants to assign the quiz
      if (currentInput === '1' || currentInput.toLowerCase().includes('assign') || currentInput.toLowerCase().includes('auto-create')) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `✅ **AI Quiz Creation Initiated!**

🤖 I'm now creating a complete quiz for your ${teacherClass} students with:

✨ **Auto-Generated Features:**
- 10 ready-to-review questions
- Correct answers pre-configured
- Professional formatting
- Automatic scoring setup

**📝 What happens next:**
1. ✅ Click "Create AI Quiz" button below
2. ✅ Quiz form opens with complete questions
3. ✅ Review and customize the quiz
4. ✅ Click "Create Quiz" to save as DRAFT
5. ✅ Click "Publish" button to make it available to students

**🎯 You have full control - review first, then publish when ready!**

Click the green button below to proceed...`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        // Use stored quiz parameters instead of re-extracting (avoids bugs)
        let quizTopic = quizParams?.topic || 'General Knowledge';
        let quizSubject = quizParams?.subject || 'General Studies';
        let marksPerQuestion = quizParams?.marksPerQuestion || 2;
        let totalMarks = quizParams?.totalMarks || 10;
        let duration = quizParams?.duration || 15;
        let quizQuestions: any[] = [];
        
        console.log('✅ Using stored quiz parameters:', quizParams);
        
        const lastAIMessage = messages.filter(m => m.role === 'assistant').pop();
        if (lastAIMessage) {
          // Parse questions from the AI response with correct marks per question
          quizQuestions = parseQuestionsFromAIResponse(lastAIMessage.content, quizTopic, marksPerQuestion);
          
          // If quiz params weren't stored (edge case), try to extract from AI response
          if (!quizParams) {
            console.warn('⚠️ Quiz params not found in state, attempting fallback extraction...');
            
            // Extract marks per question from AI response as fallback
            const marksMatch = lastAIMessage.content.match(/\((\d+)\s*marks?\)/i);
            if (marksMatch) {
              marksPerQuestion = parseInt(marksMatch[1]);
            }
            
            // Count questions in the AI response
            const questionCount = (lastAIMessage.content.match(/^\d+\.\s+/gm) || []).length;
            
            // Calculate total marks based on actual question count
            totalMarks = marksPerQuestion * questionCount;
            
            console.log('📊 Fallback extraction - Questions:', questionCount, '| Marks per Q:', marksPerQuestion, '| Total:', totalMarks);
          }
        }
        
        console.log('📊 Quiz Details:', {
          topic: quizTopic,
          subject: quizSubject,
          marksPerQuestion,
          totalMarks,
          duration,
          questionCount: quizQuestions.length
        });
        
        // If no questions were parsed, show error
        if (quizQuestions.length === 0) {
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `❌ **Error: Unable to Create Quiz**

I couldn't parse the quiz questions from the previous response. This might be because:
- The AI response format was unexpected
- No quiz was generated in the previous message

**Please try:**
1. Ask me to "create a quiz on [your topic]" again
2. Be specific about the topic (e.g., "create quiz on Trigonometry")

I'll generate a fresh quiz for you!`,
            timestamp: new Date(),
          };
          setMessages(prev => [...prev, errorMessage]);
          setQuizParams(null); // Clear params on error
          setIsLoading(false);
          return;
        }
        
        // Store complete quiz data including questions
        setGeneratedQuiz({
          title: `${quizTopic} - ${quizSubject}`,
          subject: quizSubject,
          description: `This quiz on ${quizTopic} for ${teacherClass} contains ${quizQuestions.length} questions worth ${marksPerQuestion} marks each (Total: ${totalMarks} marks). All questions and answers are pre-configured and ready to publish.`,
          totalMarks: totalMarks,
          duration: duration,
          questions: quizQuestions
        });
        
        // Clear stored quiz params after using them
        setQuizParams(null);
        
        // Show quiz creator UI
        setShowQuizCreator(true);
        setIsLoading(false);
        return;
      }

      const aiResponse = await generateAIResponse(currentInput);
      
      // Check if this is a quiz response and format it appropriately
      const isQuizResponse = currentInput.toLowerCase().includes('quiz') || 
                            currentInput.toLowerCase().includes('test') || 
                            currentInput.toLowerCase().includes('create');
      
      // Add AI badge to all responses
      const aiBadge = '🤖 **Powered by Google Gemini AI**\n\n';
      
      let formattedContent = aiBadge + aiResponse;
      
      if (isQuizResponse) {
        // Add action prompt at the end if it's a quiz
        formattedContent = `${aiResponse}

---

**✨ Your quiz is ready!**

**What would you like to do next?**

1️⃣ **Type "1"** to open this quiz in the dashboard form (saves as DRAFT)
2️⃣ **Type "regenerate"** to create a different version
3️⃣ **Type "modify [your request]"** to adjust the quiz

💡 **Note:** After creating the quiz, you'll need to click the "Publish" button to make it available to students. This gives you full control over when students can access the quiz!`;
      }
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: formattedContent,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('❌ Detailed Error:', error);
      
      // Better error message based on error type
      let errorContent = '❌ **Error: Unable to Generate Response**\n\n';
      
      if (error instanceof Error) {
        if (error.message.includes('API key')) {
          errorContent += '**Issue:** Invalid or expired API key\n';
          errorContent += '**Solution:** Please check your Google Gemini API key configuration.\n\n';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorContent += '**Issue:** Network connection problem\n';
          errorContent += '**Solution:** Please check your internet connection and try again.\n\n';
        } else if (error.message.includes('rate limit') || error.message.includes('quota')) {
          errorContent += '**Issue:** API rate limit exceeded\n';
          errorContent += '**Solution:** Please wait a few moments and try again.\n\n';
        } else {
          errorContent += `**Issue:** ${error.message}\n\n`;
        }
      } else {
        errorContent += '**Issue:** An unexpected error occurred\n\n';
      }
      
      errorContent += '💡 **What you can try:**\n';
      errorContent += '1. Check your internet connection\n';
      errorContent += '2. Wait a moment and try again\n';
      errorContent += '3. Try rephrasing your question\n';
      errorContent += '4. Check browser console (F12) for detailed error logs';
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickPrompts = [
    "Create a quiz on Mathematics for my class",
    "Generate quiz questions for Science",
    "Help me create a test on English Literature",
    "Analyze student performance trends",
    "Suggest assignment ideas",
  ];

  const handleQuickPrompt = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <>
      {/* Floating AI Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full p-4 shadow-2xl hover:shadow-3xl transition-all z-50 group animate-bounce hover:animate-none"
        title="AI Teaching Assistant"
      >
        <div className="relative">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span className="absolute -top-1 -right-1 bg-green-400 w-3 h-3 rounded-full animate-ping"></span>
          <span className="absolute -top-1 -right-1 bg-green-500 w-3 h-3 rounded-full"></span>
        </div>
        <span className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          AI Assistant 🤖
        </span>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 animate-slideUp">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <span className="absolute bottom-0 right-0 bg-green-400 w-3 h-3 rounded-full border-2 border-white"></span>
              </div>
              <div>
                <h3 className="font-bold text-lg">AI Teaching Assistant</h3>
                <p className="text-xs text-purple-100">Always here to help!</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Quick Prompts */}
          {messages.length <= 1 && (
            <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-pink-50 border-b">
              <p className="text-xs font-semibold text-gray-700 mb-2">✨ Quick Start:</p>
              <div className="flex flex-wrap gap-2">
                {quickPrompts.slice(0, 3).map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleQuickPrompt(prompt)}
                    className="text-xs px-3 py-1 bg-white text-purple-600 rounded-full hover:bg-purple-100 transition-colors border border-purple-200"
                  >
                    {prompt.length > 30 ? prompt.substring(0, 27) + '...' : prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                      : 'bg-white text-gray-900 shadow-md border border-gray-200'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-300">
                      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-full p-1">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <span className="text-xs font-bold text-gray-800">AI Assistant</span>
                    </div>
                  )}
                  <p className="whitespace-pre-wrap text-sm leading-relaxed font-medium">{message.content}</p>
                  <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-purple-200' : 'text-gray-600'}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl px-4 py-3 shadow-md border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white border-t rounded-b-2xl">
            {showQuizCreator && (
              <div className="mb-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="bg-green-500 text-white rounded-full p-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm font-semibold text-green-800">Quiz Ready!</span>
                  </div>
                  <button
                    onClick={() => {
                      setShowQuizCreator(false);
                      // Navigate to quiz creation in dashboard with generated quiz data
                      if (onCreateQuiz && generatedQuiz) {
                        onCreateQuiz(generatedQuiz);
                      } else if (onCreateQuiz) {
                        // Fallback if no quiz data stored
                        onCreateQuiz({
                          title: `Quiz - General`,
                          subject: 'General',
                          description: `Quiz for ${teacherClass}`,
                          totalMarks: 10,
                          duration: 15,
                          questions: 5
                        });
                      }
                      // Add success message
                      const successMsg: Message = {
                        id: Date.now().toString(),
                        role: 'assistant',
                        content: `🎉 **Quiz Form Opened!**

The quiz creation form is now open with AI-generated questions pre-filled.

**📝 Next Steps:**
1. ✅ Review the questions and details
2. ✅ Click "Create Quiz" button → Saves as **DRAFT**
3. ✅ Find your quiz in the list with "📝 DRAFT" badge
4. ✅ Click "Publish" button → Makes it available to students

**🎯 You have full control - the quiz will NOT be visible to students until you click "Publish"!**`,
                        timestamp: new Date(),
                      };
                      setMessages(prev => [...prev, successMsg]);
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg text-xs font-semibold hover:shadow-lg transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    🤖 Create AI Quiz
                  </button>
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                className="flex-1 px-4 py-3 border border-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm text-gray-900 placeholder-gray-700 font-medium"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                  input.trim() && !isLoading
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:shadow-lg'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-700 mt-2 text-center font-medium">
              💡 Tip: Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
