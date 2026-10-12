import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';

// Auth Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { ActivateAccountScreen } from '../screens/auth/ActivateAccountScreen';
import { FirstLoginChangePasswordScreen } from '../screens/auth/FirstLoginChangePasswordScreen';

// Student Screens
import { StudentDashboardScreen } from '../screens/student/StudentDashboardScreen';
import { StudentAttendanceScreen } from '../screens/student/StudentAttendanceScreen';
import { StudentMarksScreen } from '../screens/student/StudentMarksScreen';
import { StudentTimetableScreen } from '../screens/student/StudentTimetableScreen';
import { StudentIDCardScreen } from '../screens/student/StudentIDCardScreen';
import { StudentBonafideScreen } from '../screens/student/StudentBonafideScreen';
import { StudentFeesScreen } from '../screens/student/StudentFeesScreen';
import { StudentAssignmentsScreen } from '../screens/student/StudentAssignmentsScreen';
import { StudentMaterialsScreen } from '../screens/student/StudentMaterialsScreen';
import { StudentQuizzesScreen } from '../screens/student/StudentQuizzesScreen';
import { AIStudyCentreScreen } from '../screens/student/AIStudyCentreScreen';
import { StudentComplaintsScreen } from '../screens/student/StudentComplaintsScreen';

// Faculty Screens
import { FacultyDashboardScreen } from '../screens/faculty/FacultyDashboardScreen';
import { FacultyAttendanceScreen } from '../screens/faculty/FacultyAttendanceScreen';
import { FacultyMarksScreen } from '../screens/faculty/FacultyMarksScreen';
import { FacultyAssignmentsScreen } from '../screens/faculty/FacultyAssignmentsScreen';
import { FacultyMaterialsScreen } from '../screens/faculty/FacultyMaterialsScreen';
import { FacultyLeaveScreen } from '../screens/faculty/FacultyLeaveScreen';
import { StudentAdmissionScreen } from '../screens/faculty/StudentAdmissionScreen';

// Admin Screens
import { AdminDashboardScreen } from '../screens/admin/AdminDashboardScreen';
import { AdminClassesScreen } from '../screens/admin/AdminClassesScreen';
import { AdminTemplatesScreen } from '../screens/admin/AdminTemplatesScreen';
import { AdminComplaintsScreen } from '../screens/admin/AdminComplaintsScreen';
import { AdminStudentsScreen } from '../screens/admin/AdminStudentsScreen';
import { AdminFacultyScreen } from '../screens/admin/AdminFacultyScreen';
import { AdminBonafideScreen } from '../screens/admin/AdminBonafideScreen';
import { AdminReportsScreen } from '../screens/admin/AdminReportsScreen';
import { AdminAuditLogsScreen } from '../screens/admin/AdminAuditLogsScreen';

// HOD Screens
import { HODDashboardScreen } from '../screens/hod/HODDashboardScreen';
import { HODFacultyAssignmentsScreen } from '../screens/hod/HODFacultyAssignmentsScreen';
import { HODShortagesScreen } from '../screens/hod/HODShortagesScreen';
import { HODAttendanceReportsScreen } from '../screens/hod/HODAttendanceReportsScreen';

// Common Screens
import { NoticesScreen } from '../screens/common/NoticesScreen';
import { EventsCalendarScreen } from '../screens/common/EventsCalendarScreen';
import { AIChatScreen } from '../screens/common/AIChatScreen';
import { AboutCollegeScreen } from '../screens/common/AboutCollegeScreen';

// Chat & Security Screens
import { ChatListScreen } from '../screens/chat/ChatListScreen';
import { ChatConversationScreen } from '../screens/chat/ChatConversationScreen';
import { AdminSecurityScreen } from '../screens/admin/AdminSecurityScreen';

const Stack = createNativeStackNavigator();

export const RootNavigator: React.FC = () => {
  const { user, mustChangePasswordPending } = useAuth();

  if (!user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="ActivateAccount" component={ActivateAccountScreen} />
        <Stack.Screen name="AboutCollege" component={AboutCollegeScreen} />
      </Stack.Navigator>
    );
  }

  // Mandatory initial password change gate: prevents access to all role screens until updated
  if (mustChangePasswordPending || user.mustChangePassword) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="FirstLoginChangePassword" component={FirstLoginChangePasswordScreen} />
      </Stack.Navigator>
    );
  }

  if (user.role === 'STUDENT') {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="StudentDashboard" component={StudentDashboardScreen} />
        <Stack.Screen name="ChatList" component={ChatListScreen} />
        <Stack.Screen name="ChatConversation" component={ChatConversationScreen} />
        <Stack.Screen name="AIChat" component={AIChatScreen} />
        <Stack.Screen name="StudentAttendance" component={StudentAttendanceScreen} />
        <Stack.Screen name="StudentMarks" component={StudentMarksScreen} />
        <Stack.Screen name="StudentTimetable" component={StudentTimetableScreen} />
        <Stack.Screen name="StudentIDCard" component={StudentIDCardScreen} />
        <Stack.Screen name="StudentBonafide" component={StudentBonafideScreen} />
        <Stack.Screen name="StudentFees" component={StudentFeesScreen} />
        <Stack.Screen name="StudentAssignments" component={StudentAssignmentsScreen} />
        <Stack.Screen name="StudentMaterials" component={StudentMaterialsScreen} />
        <Stack.Screen name="StudentQuizzes" component={StudentQuizzesScreen} />
        <Stack.Screen name="AIStudyCentre" component={AIStudyCentreScreen} />
        <Stack.Screen name="StudentComplaints" component={StudentComplaintsScreen} />
        <Stack.Screen name="EventsCalendar" component={EventsCalendarScreen} />
        <Stack.Screen name="Notices" component={NoticesScreen} />
        <Stack.Screen name="AboutCollege" component={AboutCollegeScreen} />
      </Stack.Navigator>
    );
  }

  if (user.role === 'STAFF' || user.role === 'FACULTY') {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="FacultyDashboard">
        <Stack.Screen name="FacultyDashboard" component={FacultyDashboardScreen} />
        <Stack.Screen name="ChatList" component={ChatListScreen} />
        <Stack.Screen name="ChatConversation" component={ChatConversationScreen} />
        <Stack.Screen name="AIChat" component={AIChatScreen} />
        <Stack.Screen name="FacultyAttendance" component={FacultyAttendanceScreen} />
        <Stack.Screen name="FacultyMarks" component={FacultyMarksScreen} />
        <Stack.Screen name="FacultyAssignments" component={FacultyAssignmentsScreen} />
        <Stack.Screen name="FacultyMaterials" component={FacultyMaterialsScreen} />
        <Stack.Screen name="FacultyLeave" component={FacultyLeaveScreen} />
        <Stack.Screen name="StudentAdmission" component={StudentAdmissionScreen} />
        <Stack.Screen name="HODDashboard" component={HODDashboardScreen} />
        <Stack.Screen name="HODFacultyAssignments" component={HODFacultyAssignmentsScreen} />
        <Stack.Screen name="HODShortages" component={HODShortagesScreen} />
        <Stack.Screen name="HODAttendanceReports" component={HODAttendanceReportsScreen} />
        <Stack.Screen name="EventsCalendar" component={EventsCalendarScreen} />
        <Stack.Screen name="Notices" component={NoticesScreen} />
        <Stack.Screen name="AboutCollege" component={AboutCollegeScreen} />
      </Stack.Navigator>
    );
  }

  // Admin & Principal Office
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="ChatList" component={ChatListScreen} />
      <Stack.Screen name="ChatConversation" component={ChatConversationScreen} />
      <Stack.Screen name="AdminSecurity" component={AdminSecurityScreen} />
      <Stack.Screen name="AIChat" component={AIChatScreen} />
      <Stack.Screen name="AdminClasses" component={AdminClassesScreen} />
      <Stack.Screen name="AdminTemplates" component={AdminTemplatesScreen} />
      <Stack.Screen name="AdminComplaints" component={AdminComplaintsScreen} />
      <Stack.Screen name="AdminStudents" component={AdminStudentsScreen} />
      <Stack.Screen name="AdminFaculty" component={AdminFacultyScreen} />
      <Stack.Screen name="AdminBonafide" component={AdminBonafideScreen} />
      <Stack.Screen name="AdminReports" component={AdminReportsScreen} />
      <Stack.Screen name="AdminAuditLogs" component={AdminAuditLogsScreen} />
      <Stack.Screen name="HODDashboard" component={HODDashboardScreen} />
      <Stack.Screen name="HODFacultyAssignments" component={HODFacultyAssignmentsScreen} />
      <Stack.Screen name="HODShortages" component={HODShortagesScreen} />
      <Stack.Screen name="HODAttendanceReports" component={HODAttendanceReportsScreen} />
      <Stack.Screen name="StudentAdmission" component={StudentAdmissionScreen} />
      <Stack.Screen name="EventsCalendar" component={EventsCalendarScreen} />
      <Stack.Screen name="Notices" component={NoticesScreen} />
      <Stack.Screen name="AboutCollege" component={AboutCollegeScreen} />
    </Stack.Navigator>
  );
};
