import { config } from '../../config';
import {
  Student,
  Faculty,
  AttendanceRecord,
  AttendanceSession,
  Announcement,
  StudyMaterial,
  TimetableSlot,
  Department,
  AIChatConversation,
} from '../../models';
import { TokenPayload } from '../../types';
import {
  GASC_APP_METADATA,
  GASC_SYSTEM_PROMPT,
  ERROR_TROUBLESHOOTING_CATALOG,
  COMMON_APP_WORKFLOWS,
} from './knowledge/gasc-knowledge-base';

export class AIService {
  private static isConfigured(): boolean {
    return Boolean(config.ai.apiKey && config.ai.apiKey.trim().length > 0);
  }

  /**
   * Deterministic check for developer attribution queries to guarantee
   * consistent exact spelling: "Abishek Shanmugavadivel"
   */
  public static checkDeveloperAttribution(message: string): string | null {
    const trimmed = message.trim().toLowerCase();
    
    // Who created/developed this app/system/connect?
    const developerRegex =
      /\b(who|whom)\s+(created|developed|built|made|programmed|wrote|designed)\s+(this|the|gasc)?\s*(app|application|connect|portal|system|software|platform)?\b/i;
    const whoIsDevRegex =
      /\b(who|whom)\s+(is|was)\s+the\s+(developer|creator|author|engineer|architect|maker)\b/i;
    const whoBuiltRegex =
      /\bwho\s+(built|developed|created)\s+(this|it|gasc\s+connect)\b/i;

    // Who created you (the assistant)?
    const whoCreatedYouRegex =
      /\b(who|whom)\s+(created|developed|built|made)\s+(you|ai|assistant|chatbot)\b/i;

    if (whoCreatedYouRegex.test(trimmed)) {
      return GASC_APP_METADATA.aiCreationAnswer;
    }

    if (
      developerRegex.test(trimmed) ||
      whoIsDevRegex.test(trimmed) ||
      whoBuiltRegex.test(trimmed) ||
      trimmed.includes('who developed gasc connect') ||
      trimmed.includes('who created this app') ||
      trimmed.includes('who is the developer') ||
      trimmed.includes('developer name')
    ) {
      return GASC_APP_METADATA.verifiedCreationAnswer;
    }

    return null;
  }

  /**
   * Application-Only Guardrail: Detects off-topic queries unrelated to GASC Connect.
   */
  public static checkOffTopicQuery(message: string): string | null {
    const lower = message.toLowerCase();

    // Whitelisted college / academic / app terms that should ALWAYS be processed
    const whitelistedTerms = [
      'gasc',
      'kuthalam',
      'college',
      'attendance',
      'timetable',
      'mark',
      'internal',
      'semester',
      'exam',
      'syllabus',
      'subject',
      'faculty',
      'student',
      'principal',
      'hod',
      'circular',
      'notice',
      'announcement',
      'bonafide',
      'conduct',
      'certificate',
      'transfer',
      'fee',
      'payment',
      'material',
      'notes',
      'chat',
      'group',
      'message',
      'login',
      'password',
      'register',
      'complaint',
      'ticket',
      'id card',
      'developer',
      'abishek',
      'shanmugavadivel',
      'error',
      'bug',
      'troubleshoot',
      'failed',
      'download',
      'upload',
      'course',
      'department',
      'computer science',
      'english',
      'tamil',
      'mathematics',
      'commerce',
    ];

    const hasCollegeContext = whitelistedTerms.some((term) => lower.includes(term));
    if (hasCollegeContext) {
      return null;
    }

    // Typical off-topic indicators
    const offTopicPatterns = [
      /write\s+(a\s+)?(python|java|c\+\+|javascript|sql|code|script|program)\b/i,
      /tell\s+(me\s+)?(a\s+)?(joke|story|poem|riddle)\b/i,
      /who\s+won\s+the\b/i,
      /cricket|football|ipl|world\s+cup|match\s+score/i,
      /movie|cinema|actor|actress|hollywood|kollywood|song/i,
      /recipe|how\s+to\s+cook|weather\s+in|stock\s+market|bitcoin|crypto/i,
      /president\s+of|prime\s+minister\s+of|capital\s+of\b/i,
    ];

    const isExplicitlyOffTopic = offTopicPatterns.some((pattern) => pattern.test(lower));
    if (isExplicitlyOffTopic) {
      return (
        `I am the official GASC Connect AI Assistant for Government Arts and Science College, Kuthalam.\n\n` +
        `My purpose is exclusively to assist you with using the college portal, understanding features, and troubleshooting application issues.\n\n` +
        `I can help you with:\n` +
        `• Checking attendance percentage & 75% university eligibility\n` +
        `• Today's class timetable & lecture periods\n` +
        `• Accessing syllabus notes & study materials\n` +
        `• Applying for and downloading Bonafide Certificates\n` +
        `• Using encrypted Class and College Chats\n` +
        `• Step-by-step troubleshooting for app errors and login issues\n\n` +
        `How can I assist you with GASC Connect today?`
      );
    }

    return null;
  }

  /**
   * Diagnostic Error Detection: Matches reported errors to verified troubleshooting steps.
   */
  public static checkErrorTroubleshooting(message: string): string | null {
    const lower = message.toLowerCase();

    let guideKey: keyof typeof ERROR_TROUBLESHOOTING_CATALOG | null = null;

    if (
      lower.includes('login') &&
      (lower.includes('fail') || lower.includes('cannot') || lower.includes('invalid') || lower.includes('password') || lower.includes('wrong'))
    ) {
      guideKey = 'LOGIN_FAILURE';
    } else if (lower.includes('session') || lower.includes('401') || lower.includes('unauthorized') || lower.includes('token expired')) {
      guideKey = 'SESSION_EXPIRED';
    } else if (lower.includes('403') || lower.includes('forbidden') || lower.includes('permission denied') || lower.includes('restricted')) {
      guideKey = 'PERMISSION_DENIED';
    } else if (
      lower.includes('message') &&
      (lower.includes('fail') || lower.includes('cannot send') || lower.includes('not sending') || lower.includes('chat error'))
    ) {
      guideKey = 'CHAT_SEND_FAILURE';
    } else if (lower.includes('upload') || lower.includes('attachment') || lower.includes('file size') || lower.includes('pdf error')) {
      guideKey = 'UPLOAD_FAILURE';
    } else if (lower.includes('bonafide') || lower.includes('certificate')) {
      if (lower.includes('fail') || lower.includes('error') || lower.includes('pending') || lower.includes('cannot download')) {
        guideKey = 'CERTIFICATE_ERROR';
      }
    } else if (lower.includes('attendance') && (lower.includes('error') || lower.includes('missing') || lower.includes('wrong') || lower.includes('not showing'))) {
      guideKey = 'ATTENDANCE_ERROR';
    }

    if (guideKey && ERROR_TROUBLESHOOTING_CATALOG[guideKey]) {
      const guide = ERROR_TROUBLESHOOTING_CATALOG[guideKey];
      return (
        `🛠️ **Troubleshooting Guide: ${guide.title}**\n\n` +
        `**Issue Summary:** ${guide.description}\n\n` +
        `**Most Likely Causes:**\n` +
        guide.likelyCauses.map((c) => `• ${c}`).join('\n') +
        `\n\n**Recommended Steps:**\n` +
        guide.steps.join('\n') +
        `\n\n**Escalation Path:**\n` +
        `📌 ${guide.escalation}`
      );
    }

    return null;
  }

  /**
   * Matches common how-to questions about app workflows.
   */
  public static checkCommonWorkflows(message: string): string | null {
    const lower = message.toLowerCase();

    if (lower.includes('how') && lower.includes('attendance')) {
      return `📊 **How to Check Attendance:**\n\n${COMMON_APP_WORKFLOWS.ATTENDANCE}`;
    }
    if (lower.includes('how') && (lower.includes('timetable') || lower.includes('schedule'))) {
      return `🗓️ **How to View Timetable:**\n\n${COMMON_APP_WORKFLOWS.TIMETABLE}`;
    }
    if (lower.includes('how') && (lower.includes('material') || lower.includes('notes') || lower.includes('study'))) {
      return `📚 **How to Access Study Materials:**\n\n${COMMON_APP_WORKFLOWS.STUDY_MATERIALS}`;
    }
    if (lower.includes('how') && (lower.includes('bonafide') || lower.includes('certificate'))) {
      return `📄 **How to Apply for Bonafide Certificate:**\n\n${COMMON_APP_WORKFLOWS.BONAFIDE}`;
    }
    if (lower.includes('how') && (lower.includes('chat') || lower.includes('class group'))) {
      return `💬 **How to Use Class Chat:**\n\n${COMMON_APP_WORKFLOWS.CLASS_CHAT}`;
    }
    if (lower.includes('forgot') && lower.includes('password')) {
      return `🔐 **Password Recovery Procedure:**\n\n${COMMON_APP_WORKFLOWS.PASSWORD_RECOVERY}`;
    }

    return null;
  }

  /**
   * Main App-Aware Institutional AI College Assistant
   */
  public static async handleCollegeChat(
    user: TokenPayload,
    message: string
  ): Promise<{ response: string; isAiConfigured: boolean; source: 'AI' | 'DATABASE' }> {
    const role = user.role === 'STAFF' || user.role === 'FACULTY' ? 'STAFF' : user.role;
    const lowerMsg = message.toLowerCase();

    // 1. FAST-PATH: Developer Identity Attribution (deterministic accuracy)
    const devAnswer = this.checkDeveloperAttribution(message);
    if (devAnswer) {
      await this.persistMessage(user.userId, 'user', message);
      await this.persistMessage(user.userId, 'assistant', devAnswer, false);
      return { response: devAnswer, isAiConfigured: this.isConfigured(), source: 'DATABASE' };
    }

    // 2. SCOPE GUARD: Reject completely off-topic general inquiries politely
    const offTopicReply = this.checkOffTopicQuery(message);
    if (offTopicReply) {
      await this.persistMessage(user.userId, 'user', message);
      await this.persistMessage(user.userId, 'assistant', offTopicReply, false);
      return { response: offTopicReply, isAiConfigured: this.isConfigured(), source: 'DATABASE' };
    }

    // 3. ERROR TROUBLESHOOTING: Check if user reports an application error
    const errorTroubleshootReply = this.checkErrorTroubleshooting(message);
    if (errorTroubleshootReply) {
      await this.persistMessage(user.userId, 'user', message);
      await this.persistMessage(user.userId, 'assistant', errorTroubleshootReply, false);
      return { response: errorTroubleshootReply, isAiConfigured: this.isConfigured(), source: 'DATABASE' };
    }

    // 4. COMMON WORKFLOWS: Step-by-step guidance for standard app operations
    const workflowReply = this.checkCommonWorkflows(message);
    if (workflowReply) {
      await this.persistMessage(user.userId, 'user', message);
      await this.persistMessage(user.userId, 'assistant', workflowReply, false);
      return { response: workflowReply, isAiConfigured: this.isConfigured(), source: 'DATABASE' };
    }

    // 5. GATHER ROLE-SCOPED AUTHORIZED INSTITUTIONAL CONTEXT
    let contextStr = '';
    let deterministicAnswer: string | null = null;

    if (role === 'STUDENT') {
      const student = await Student.findOne({ userId: user.userId })
        .populate('departmentId', 'name code')
        .populate('courseId', 'name code')
        .lean();

      let totalSessions = 0;
      let attendedSessions = 0;
      const subjectBreakdown: Record<string, { total: number; attended: number; code?: string }> = {};

      if (student) {
        const records = await AttendanceRecord.find({ studentId: student._id })
          .populate({ path: 'sessionId', populate: { path: 'subjectId', select: 'title code' } })
          .lean();

        records.forEach((rec: any) => {
          totalSessions++;
          const isAttended = rec.status === 'PRESENT' || rec.status === 'OD' || rec.status === 'EXCUSED';
          if (isAttended) attendedSessions++;
          const subTitle = rec.sessionId?.subjectId?.title || 'Core Subject';
          const subCode = rec.sessionId?.subjectId?.code || '';
          if (!subjectBreakdown[subTitle]) {
            subjectBreakdown[subTitle] = { total: 0, attended: 0, code: subCode };
          }
          subjectBreakdown[subTitle].total++;
          if (isAttended) subjectBreakdown[subTitle].attended++;
        });
      }

      const overallPct = totalSessions > 0 ? Math.round((attendedSessions / totalSessions) * 100) : 0;

      const notices = await Announcement.find({ targetRole: { $in: ['ALL', 'STUDENT'] } })
        .sort({ publishedAt: -1 })
        .limit(4)
        .select('title content priority publishedAt')
        .lean();

      const materials = student
        ? await StudyMaterial.find({ departmentId: student.departmentId, isPublished: true })
            .populate('subjectId', 'title code')
            .sort({ createdAt: -1 })
            .limit(4)
            .select('title fileName fileSize subjectId publicationDate')
            .lean()
        : [];

      contextStr = `STUDENT PROFILE:
Name: ${student?.fullName || 'Student'}
Register No: ${student?.registerNo || user.identifier}
Department: ${(student?.departmentId as any)?.name || 'Academic Dept'}
Course: ${(student?.courseId as any)?.name || 'Course'}
Semester: ${student?.currentSemester || 1}, Section: ${student?.section || 'A'}
ATTENDANCE RECORD:
Overall Percentage: ${overallPct}% (${attendedSessions}/${totalSessions} periods attended)
Regulation Status: ${overallPct >= 75 ? 'Satisfies 75% minimum threshold' : 'WARNING: Shortage below 75% requirement'}
Subject-wise attendance:
${Object.entries(subjectBreakdown)
  .map(([sub, stat]) => `• ${sub} (${stat.code || ''}): ${stat.total > 0 ? Math.round((stat.attended / stat.total) * 100) : 0}% (${stat.attended}/${stat.total})`)
  .join('\n') || 'No period sessions recorded yet.'}
LATEST CIRCULARS & NOTICES:
${notices.map((n) => `• [${n.priority}] ${n.title}: ${n.content.slice(0, 100)} (${new Date(n.publishedAt).toLocaleDateString()})`).join('\n') || 'No active circulars.'}
AVAILABLE STUDY MATERIALS:
${materials.map((m: any) => `• ${m.title} (${m.subjectId?.title || 'Subject'}) - ${m.fileName}`).join('\n') || 'No materials uploaded yet.'}`;

      if (lowerMsg.includes('attendance') || lowerMsg.includes('percentage') || lowerMsg.includes('present') || lowerMsg.includes('absent')) {
        const subList = Object.entries(subjectBreakdown)
          .map(([sub, stat]) => `• **${sub}**: ${stat.total > 0 ? Math.round((stat.attended / stat.total) * 100) : 0}% (${stat.attended}/${stat.total} periods)`)
          .join('\n');
        deterministicAnswer = `📊 **Official Attendance Summary for ${student?.fullName || 'Student'}**\n\n• **Overall Attendance:** **${overallPct}%** (${attendedSessions} attended of ${totalSessions} conducted periods).\n• **University Threshold (75%):** ${overallPct >= 75 ? '✅ Satisfies examination eligibility.' : '⚠️ Below 75% required threshold. Please attend upcoming sessions.'}\n\n**Subject Breakdown:**\n${subList || 'No period-level records marked yet.'}`;
      } else if (lowerMsg.includes('circular') || lowerMsg.includes('notice') || lowerMsg.includes('announcement')) {
        deterministicAnswer = `📢 **Official College Circulars:**\n\n${notices.map((n) => `• **${n.title}** (${new Date(n.publishedAt).toLocaleDateString('en-IN')}): ${n.content}`).join('\n\n') || 'No recent college circulars published.'}`;
      } else if (lowerMsg.includes('material') || lowerMsg.includes('note') || lowerMsg.includes('study')) {
        deterministicAnswer = `📚 **Study Materials Available for Your Programme:**\n\n${materials.map((m: any) => `• **${m.title}** (${m.subjectId?.title || 'Subject'}): \`${m.fileName}\``).join('\n') || 'No notes currently uploaded for your course.'}`;
      }
    } else if (role === 'STAFF') {
      const faculty = await Faculty.findOne({ userId: user.userId })
        .populate('departmentId', 'name code')
        .populate('assignedClasses.subjectId', 'title code')
        .populate('assignedClasses.departmentId', 'name code')
        .lean();

      const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
      const currentDay = days[new Date().getDay()];
      const slots = faculty
        ? await TimetableSlot.find({ facultyId: faculty._id, dayOfWeek: currentDay })
            .populate('subjectId', 'title code')
            .populate('classId', 'name section year')
            .sort({ periodNo: 1 })
            .lean()
        : [];

      const sessions = faculty
        ? await AttendanceSession.find({ facultyId: faculty._id })
            .sort({ date: -1 })
            .limit(5)
            .populate('subjectId', 'title code')
            .lean()
        : [];

      const notes = faculty
        ? await StudyMaterial.find({ uploadedBy: faculty._id })
            .populate('subjectId', 'title code')
            .limit(5)
            .lean()
        : [];

      contextStr = `STAFF PROFILE:
Name: Prof. ${faculty?.fullName || 'Faculty Member'}
Employee ID: ${faculty?.employeeId || user.identifier}
Department: ${(faculty?.departmentId as any)?.name || 'Academic Dept'}
Designation: ${faculty?.designation || 'Assistant Professor'}
Assigned Classes:
${faculty?.assignedClasses?.map((ac: any) => `• ${(ac.subjectId as any)?.title || 'Subject'} - Sem ${ac.semester} Sec ${ac.section}`).join('\n') || 'None'}
TODAY'S TIMETABLE (${currentDay}):
${slots.map((s: any) => `• Period ${s.periodNo}: ${s.subjectId?.title || 'Subject'} (${s.roomNo ? `Room ${s.roomNo}` : ''})`).join('\n') || 'No periods scheduled for today.'}
RECENT ATTENDANCE SESSIONS SUBMITTED:
${sessions.map((sess: any) => `• ${sess.subjectId?.title || 'Subject'} Period ${sess.period} on ${new Date(sess.date).toLocaleDateString()}: ${sess.presentCount} Present, ${sess.absentCount} Absent`).join('\n') || 'No sessions submitted.'}
UPLOADED STUDY NOTES:
${notes.map((n: any) => `• ${n.title} (${n.subjectId?.title || 'Subject'})`).join('\n') || 'No notes uploaded.'}`;

      if (lowerMsg.includes('timetable') || lowerMsg.includes('schedule') || lowerMsg.includes('today')) {
        deterministicAnswer = `🗓️ **Today's Timetable (${currentDay}) for Prof. ${faculty?.fullName || ''}:**\n\n${slots.map((s: any) => `• **Period ${s.periodNo}**: ${(s.subjectId as any)?.title || 'Subject'} • Room ${s.roomNo || 'Main Block'}`).join('\n') || 'No scheduled lecture periods for today.'}`;
      } else if (lowerMsg.includes('class') || lowerMsg.includes('assigned') || lowerMsg.includes('subject')) {
        deterministicAnswer = `🏫 **Your Assigned Classes & Courses:**\n\n${faculty?.assignedClasses?.map((ac: any) => `• **${(ac.subjectId as any)?.title || 'Subject'}** (Semester ${ac.semester}, Section ${ac.section})`).join('\n') || 'No classes currently allocated.'}`;
      } else if (lowerMsg.includes('attendance') || lowerMsg.includes('session')) {
        deterministicAnswer = `📝 **Recent Attendance Sessions Logged:**\n\n${sessions.map((sess: any) => `• **${(sess.subjectId as any)?.title || 'Subject'}** (Period ${sess.period}, ${new Date(sess.date).toLocaleDateString('en-IN')}): ${sess.presentCount} Present, ${sess.absentCount} Absent`).join('\n') || 'No recorded attendance sessions.'}`;
      }
    } else {
      // ADMIN
      const [deptCount, facCount, stuCount, noticeCount] = await Promise.all([
        Department.countDocuments(),
        Faculty.countDocuments(),
        Student.countDocuments(),
        Announcement.countDocuments(),
      ]);

      contextStr = `ADMIN OVERVIEW:
Total Enrolled Students: ${stuCount}
Total Teaching Faculty: ${facCount}
Total Academic Departments: ${deptCount}
Total Published Circulars: ${noticeCount}`;

      if (lowerMsg.includes('student') || lowerMsg.includes('count') || lowerMsg.includes('faculty') || lowerMsg.includes('department')) {
        deterministicAnswer = `🏛️ **Institutional Overview for Principal / Administrator:**\n\n• **Registered Students:** ${stuCount}\n• **Teaching Faculty Members:** ${facCount}\n• **Academic Departments:** ${deptCount}\n• **Published Circulars:** ${noticeCount}`;
      }
    }

    // 6. CALL REAL GENERATIVE AI (GEMINI) IF API KEY IS CONFIGURED
    if (this.isConfigured()) {
      try {
        const fullPrompt = `${GASC_SYSTEM_PROMPT}

USER ROLE: ${role} (${user.identifier}).
AUTHORIZED INSTITUTIONAL CONTEXT:
${contextStr}

SECURITY & GOVERNANCE RULES:
1. ONLY answer with respect to the user's authorized role and their own data.
2. For personal college records (attendance, timetable, circulars, notes), rely strictly on the institutional context above.
3. NEVER fabricate or hallucinate student records or attendance data.
4. STRICT PRIVACY: NEVER reveal another student's marks, attendance, or private details.
5. DEVELOPER ATTRIBUTION: If asked who developed or created the application, answer: "${GASC_APP_METADATA.verifiedCreationAnswer}".
6. Provide clear, professional responses in English or Tamil depending on the user's language.

USER QUESTION: ${message}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${config.ai.modelName}:generateContent?key=${config.ai.apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: fullPrompt }] }],
            }),
            signal: controller.signal,
          }
        );
        clearTimeout(timeoutId);

        if (response.ok) {
          const json = await response.json();
          let text = json.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            // Guardrail check: if AI mentioned developer, ensure exact name
            if (text.toLowerCase().includes('developed by') && !text.includes('Abishek Shanmugavadivel')) {
              text = text.replace(/developed by\s+[^.,]+/i, 'Developed by Abishek Shanmugavadivel');
            }
            await this.persistMessage(user.userId, 'user', message);
            await this.persistMessage(user.userId, 'assistant', text, true);
            return { response: text, isAiConfigured: true, source: 'AI' };
          }
        }
      } catch (err) {
        // Fall through to deterministic / verified knowledge base
      }
    }

    // 7. DETERMINISTIC / LOCAL VERIFIED KNOWLEDGE BASE FALLBACK
    const finalAnswer =
      deterministicAnswer ||
      `[Government College Connect Assistant]\n\n` +
        `I can provide verified institutional details from your official college records:\n` +
        `• Attendance percentage & university threshold check\n` +
        `• Class timetable & assigned faculty schedule\n` +
        `• Latest college circulars & announcements\n` +
        `• Available study materials for your courses\n` +
        `• Application error troubleshooting\n\n` +
        `Ask a question such as: "What is my attendance percentage?", "Show my timetable", or "How do I download a Bonafide Certificate?".`;

    await this.persistMessage(user.userId, 'user', message);
    await this.persistMessage(user.userId, 'assistant', finalAnswer, false);

    return {
      response: finalAnswer,
      isAiConfigured: this.isConfigured(),
      source: 'DATABASE',
    };
  }

  /**
   * Persist user and assistant messages securely scoped to authenticated user
   */
  public static async persistMessage(
    userId: string,
    role: 'user' | 'assistant',
    content: string,
    isAi = false,
    isError = false
  ): Promise<void> {
    try {
      await AIChatConversation.findOneAndUpdate(
        { userId },
        {
          $push: {
            messages: {
              role,
              content,
              timestamp: new Date(),
              isAi,
              isError,
            },
          },
        },
        { upsert: true, new: true }
      );
    } catch (e) {
      // Non-fatal logging for persistence failures
      console.error('[AIService] Failed to persist chat message:', e);
    }
  }

  /**
   * Retrieve isolated chat conversation history for the authenticated user
   */
  public static async getChatHistory(userId: string): Promise<any[]> {
    const convo = await AIChatConversation.findOne({ userId }).lean();
    if (!convo || !convo.messages || convo.messages.length === 0) {
      return [];
    }
    return convo.messages.map((m) => ({
      id: `${m.role}-${new Date(m.timestamp).getTime()}`,
      sender: m.role,
      text: m.content,
      timestamp: new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isAi: m.isAi,
      isError: m.isError,
    }));
  }

  /**
   * Securely clear isolated conversation history for the authenticated user
   */
  public static async clearChatHistory(userId: string): Promise<boolean> {
    const res = await AIChatConversation.findOneAndUpdate(
      { userId },
      { $set: { messages: [] } },
      { new: true }
    );
    return Boolean(res);
  }

  // Study Assistant (Q&A / Explanations with Tamil/English support)
  public static async askAssistant(
    prompt: string,
    language: 'ENGLISH' | 'TAMIL' | 'BILATERAL' = 'BILATERAL',
    level: 'BEGINNER' | 'INTERMEDIATE' | 'EXAM_PREP' = 'EXAM_PREP'
  ): Promise<{ response: string; isAiConfigured: boolean }> {
    if (!this.isConfigured()) {
      return {
        response: this.generateFallbackExplanation(prompt, language),
        isAiConfigured: false,
      };
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${config.ai.modelName}:generateContent?key=${config.ai.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `You are an academic mentor for Government Arts and Science College, Kuthalam (Affiliated with Annamalai University). 
Explain this concept clearly for college students.
Language: ${language === 'TAMIL' ? 'Tamil' : language === 'BILATERAL' ? 'English with simple Tamil explanations where helpful' : 'English'}.
Level: ${level}.
Question: ${prompt}
Format with clear bullet points, real-world examples, and key takeaway.`,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (response.ok) {
        const json = await response.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return { response: text, isAiConfigured: true };
        }
      }
      return { response: this.generateFallbackExplanation(prompt, language), isAiConfigured: false };
    } catch (e) {
      return { response: this.generateFallbackExplanation(prompt, language), isAiConfigured: false };
    }
  }

  // Generate Notes
  public static async generateNotes(
    topic: string,
    subjectTitle: string
  ): Promise<{ notes: any; isAiConfigured: boolean }> {
    return {
      notes: {
        topic,
        subject: subjectTitle,
        overview: `Comprehensive academic revision notes for "${topic}" curated according to university curriculum guidelines.`,
        keyConcepts: [
          `Definition & Core Principles of ${topic}`,
          `Historical background and theoretical frameworks`,
          `Practical applications and case studies in Tamil Nadu context`,
          `Common examination questions and answering strategies`,
        ],
        detailedSummary: `1. Introduction: ${topic} plays a fundamental role in modern academic study.\n2. Key Pillars: Understand the foundational axioms, classifications, and methodologies.\n3. University Examination Points: Ensure clear diagrams, sequential definitions, and 2-mark & 10-mark structures.`,
        revisionTakeaway: `Review definition, memorize 3 standard examples, and practice previous year Annamalai University question patterns.`,
        tamilSummary: `முக்கிய குறிப்பு: ${topic} பற்றிய அடிப்படை வரைமுறைகள், கோட்பாடுகள் மற்றும் பல்கலைக்கழக தேர்வுக்கான மாதிரி வினாக்கள்.`,
      },
      isAiConfigured: this.isConfigured(),
    };
  }

  // Generate Practice Quiz
  public static async generatePracticeQuiz(
    topic: string
  ): Promise<{ questions: any[]; isAiConfigured: boolean }> {
    return {
      questions: [
        {
          questionText: `What is the primary significance of ${topic} in collegiate education?`,
          options: [
            'Provides core theoretical and practical foundation',
            'Used solely for recreational activities',
            'Optional unaccredited overview',
            'Replaced completely by basic arithmetic',
          ],
          correctOptionIndex: 0,
          explanation: `${topic} establishes the foundational principles essential for university curriculum mastery.`,
        },
        {
          questionText: `Which analytical method is best suited for evaluating ${topic}?`,
          options: [
            'Random speculation',
            'Systematic empirical examination and literature synthesis',
            'Ignoring primary source literature',
            'Surface level observation only',
          ],
          correctOptionIndex: 1,
          explanation: 'Empirical examination ensures verifiable, evidence-based academic rigor.',
        },
        {
          questionText: `Under Annamalai University evaluation standards, answers on ${topic} should prioritize:`,
          options: [
            'Word count without definitions',
            'Clear structural headings, verified points, and clear diagrams',
            'Unreferenced quotes',
            'Informal writing style',
          ],
          correctOptionIndex: 1,
          explanation: 'Clear structured headings and diagrams yield maximum marks under standard university rubrics.',
        },
      ],
      isAiConfigured: this.isConfigured(),
    };
  }

  // Career Guidance & Interview Assistant
  public static async getCareerGuidance(
    degree: string,
    interests: string
  ): Promise<{ guidance: any; isAiConfigured: boolean }> {
    return {
      guidance: {
        degree,
        recommendedPaths: [
          {
            path: 'Tamil Nadu Public Service Commission (TNPSC Group 1, 2, 4)',
            description: 'Prestigious state government administrative roles with job security and public service opportunities.',
            preparationKey: 'General Tamil / English, General Studies (Samacheer Kalvi 6-12 syllabus), and Aptitude.',
          },
          {
            path: 'Postgraduate Higher Education (M.Sc / M.A / MCA at State Universities)',
            description: 'Deepen academic specialization followed by UGC-NET / SET for College Assistant Professorship.',
            preparationKey: 'Core undergraduate syllabus revision, research methodologies, and entrance tests.',
          },
          {
            path: 'IT & Software Industry / Corporate Sector',
            description: 'High-growth technology roles in Chennai, Coimbatore, and Bengaluru tech hubs.',
            preparationKey: 'Data Structures, Web Development, English communication skills, and internship portfolio.',
          },
        ],
        interviewTips: [
          'Master self-introduction in professional English and Tamil.',
          'Be thoroughly prepared on your Final Year Project and core subjects.',
          'Demonstrate knowledge of Government Arts and Science College Kuthalam values.',
        ],
      },
      isAiConfigured: this.isConfigured(),
    };
  }

  private static generateFallbackExplanation(prompt: string, language: string): string {
    if (language === 'TAMIL') {
      return `[GASC கல்வி வழிகாட்டி]\n\nதாங்கள் கேட்ட கேள்வி: "${prompt}"\n\nஅடிப்படை விளக்கம்:\n1. இது குறித்த பல்கலைக்கழக பாடத்திட்டத்தின் முக்கிய பகுதிகளை கவனமாக படிக்கவும்.\n2. முந்தைய ஆண்டு வினாத்தாள்களை (Previous Year Question Papers) பயிற்சி செய்யவும்.\n3. விரிவுரையாளர்கள் மற்றும் துறை பேராசிரியர்களின் வழிகாட்டலைப் பெறவும்.\n\n(குறிப்பு: வெளிப்புற AI இணைப்பு தேவைப்படின் backend/.env கோப்பில் GEMINI_API_KEY ஐ உள்ளமைக்கவும்.)`;
    }
    return `[GASC Academic Study Assistant]\n\nQuery: "${prompt}"\n\nStructured Academic Explanation:\n1. Core Concept: Ensure you understand the standard theoretical definition and primary properties as specified in your university syllabus.\n2. Practical Application: Connect this topic to tangible real-world examples to reinforce memory retention.\n3. University Exam Focus: Prepare 2-mark definitions and 10-mark analytical essays with clear subheadings.\n\n(Note: Operating with verified institutional study engine. To enable live external LLM queries, set GEMINI_API_KEY in backend/.env).`;
  }
}
