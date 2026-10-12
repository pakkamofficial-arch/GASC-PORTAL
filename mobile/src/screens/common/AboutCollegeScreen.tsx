import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Image,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { Header, Card, Badge } from '../../components';

const { width } = Dimensions.get('window');

export const AboutCollegeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <Header
        title="About Institution"
        subtitle="Govt. Arts & Science College, Kuthalam"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Campus Photograph Showcase */}
        <View style={styles.photoContainer}>
          <Image
            source={require('../../../assets/branding/college-photo.jpg')}
            style={styles.campusPhoto}
            resizeMode="cover"
            accessibilityLabel="Photograph of Government Arts and Science College, Kuthalam Campus"
          />
          <View style={styles.photoOverlay}>
            <View style={styles.tag}>
              <Ionicons name="location" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.tagText}>Kuthalam Campus, Mayiladuthurai</Text>
            </View>
          </View>
        </View>

        {/* Official College Emblem & Name Header */}
        <Card style={styles.institutionCard}>
          <View style={styles.emblemRow}>
            <Image
              source={require('../../../assets/branding/college-logo.png')}
              style={styles.emblemImage}
              resizeMode="contain"
              accessibilityLabel="Official College Emblem"
            />
            <View style={styles.emblemTextWrap}>
              <View style={styles.mottoBadge}>
                <Text style={styles.mottoText}>அறிவே ஆற்றல்</Text>
              </View>
              <Text style={styles.collegeTitle}>
                Government Arts & Science College
              </Text>
              <Text style={styles.tamilCollegeTitle}>
                அரசு கலை மற்றும் அறிவியல் கல்லூரி, குத்தாலம்
              </Text>
              <Text style={styles.affiliationText}>
                Affiliated with Annamalai University
              </Text>
            </View>
          </View>
        </Card>

        {/* Key Institutional Facts */}
        <View style={styles.sectionTitleRow}>
          <Ionicons name="information-circle-outline" size={18} color={theme.colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>Institutional Overview</Text>
        </View>

        <Card style={styles.detailsCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>State Department:</Text>
            <Text style={styles.infoValue}>Higher Education Department, Tamil Nadu</Text>
          </View>
          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Affiliating University:</Text>
            <Text style={styles.infoValue}>Annamalai University, Chidambaram</Text>
          </View>
          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Institution Status:</Text>
            <Text style={styles.infoValue}>Government Owned & Funded (Co-Educational)</Text>
          </View>
          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>District / Pin Code:</Text>
            <Text style={styles.infoValue}>Mayiladuthurai District — 609 810</Text>
          </View>
          <View style={styles.infoDivider} />

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Campus Working Hours:</Text>
            <Text style={styles.infoValue}>09:30 AM – 04:00 PM (Monday to Friday)</Text>
          </View>
        </Card>

        {/* Academic Departments */}
        <View style={styles.sectionTitleRow}>
          <Ionicons name="school-outline" size={18} color={theme.colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>Offered Academic Programmes</Text>
        </View>

        <Card style={styles.programCard}>
          {[
            { code: 'B.Sc. CS', title: 'B.Sc Computer Science', desc: 'Software, Web, Algorithms & Database Systems', shift: 'Shift I' },
            { code: 'B.Sc. MATH', title: 'B.Sc Mathematics', desc: 'Pure & Applied Mathematics, Operations Research', shift: 'Shift I' },
            { code: 'B.Com.', title: 'Bachelor of Commerce', desc: 'Financial Accounting, Auditing, Corporate Law', shift: 'Shift I' },
            { code: 'B.A. ENG', title: 'B.A English Literature', desc: 'British, Indian, & World Literature & Phonetics', shift: 'Shift I' },
            { code: 'B.A. TAM', title: 'B.A Tamil Literature', desc: 'Classical Sangam Literature & Modern Linguistics', shift: 'Shift I' },
          ].map((prog, index) => (
            <View key={prog.code}>
              <View style={styles.progItem}>
                <View style={styles.progBadge}>
                  <Text style={styles.progBadgeText}>{prog.code}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.progTitle}>{prog.title}</Text>
                  <Text style={styles.progDesc}>{prog.desc}</Text>
                </View>
                <Badge label={prog.shift} type="info" />
              </View>
              {index < 4 && <View style={styles.infoDivider} />}
            </View>
          ))}
        </Card>

        {/* Student Support Services & Facilities */}
        <View style={styles.sectionTitleRow}>
          <Ionicons name="sparkles-outline" size={18} color={theme.colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.sectionTitle}>Campus Facilities & Student Services</Text>
        </View>

        <View style={styles.facilityGrid}>
          {[
            { icon: 'book-outline', title: 'Central Library', desc: 'Textbooks, journals & digital reading desk' },
            { icon: 'desktop-outline', title: 'Computer Lab', desc: 'High-speed internet & programming lab' },
            { icon: 'bus-outline', title: 'TNSTC Bus Pass', desc: 'State Government concession travel pass' },
            { icon: 'ribbon-outline', title: 'Post-Matric Aid', desc: 'Scholarships for BC, MBC, SC & ST students' },
          ].map((fac) => (
            <Card key={fac.title} style={styles.facilityCard}>
              <View style={styles.facilityIconCircle}>
                <Ionicons name={fac.icon as any} size={20} color={theme.colors.primary} />
              </View>
              <Text style={styles.facilityTitle}>{fac.title}</Text>
              <Text style={styles.facilityDesc}>{fac.desc}</Text>
            </Card>
          ))}
        </View>

        {/* Administrative Office Contact */}
        <Card style={styles.contactCard}>
          <View style={styles.contactHeader}>
            <Ionicons name="mail-outline" size={18} color={theme.colors.primary} style={{ marginRight: 6 }} />
            <Text style={styles.contactTitle}>Administrative Office Contact</Text>
          </View>
          <Text style={styles.contactText}>
            Principal's Office, Government Arts and Science College{'\n'}
            Kuthalam - 609 810, Mayiladuthurai District, Tamil Nadu{'\n'}
            Email: principal@gasckuthalam.edu.in
          </Text>
        </Card>

        {/* Developer Credit */}
        <View style={styles.developerCreditCard}>
          <Ionicons name="code-slash-outline" size={15} color={theme.colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.developerCreditText}>
            Developed by <Text style={styles.developerCreditName}>Abishek Shanmugavadivel</Text>
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    padding: theme.spacing.base,
    paddingBottom: 40,
  },
  photoContainer: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
    backgroundColor: '#000000',
    marginBottom: theme.spacing.base,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  campusPhoto: {
    width: '100%',
    height: Math.min(width * 0.52, 220),
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(23, 107, 58, 0.88)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: theme.borderRadius.sm,
  },
  tagText: {
    fontFamily: theme.typography.fonts.semibold,
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  institutionCard: {
    padding: 16,
    marginBottom: 14,
  },
  emblemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emblemImage: {
    width: 68,
    height: 68,
    marginRight: 14,
    backgroundColor: '#FFFFFF',
  },
  emblemTextWrap: {
    flex: 1,
  },
  mottoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primaryDark,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  mottoText: {
    fontFamily: theme.typography.fonts.tamilSemiBold,
    color: '#DCE7DC',
    fontSize: 10,
    fontWeight: '700',
  },
  collegeTitle: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primary,
    lineHeight: 20,
  },
  tamilCollegeTitle: {
    fontFamily: theme.typography.fonts.tamilSemiBold,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  affiliationText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 3,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  sectionTitle: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.text,
  },
  detailsCard: {
    padding: 14,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoLabel: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: 12,
    color: theme.colors.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: 12,
    color: theme.colors.text,
    flex: 1.4,
    textAlign: 'right',
  },
  infoDivider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: 4,
  },
  programCard: {
    padding: 14,
    marginBottom: 10,
  },
  progItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  progBadge: {
    backgroundColor: theme.colors.tint,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 4,
    marginRight: 10,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  progBadgeText: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: 10,
    color: theme.colors.primary,
  },
  progTitle: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: 13,
    color: theme.colors.text,
  },
  progDesc: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  facilityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  facilityCard: {
    width: '48%',
    padding: 12,
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  facilityIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.tint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  facilityTitle: {
    fontFamily: theme.typography.fonts.bold,
    fontSize: 12,
    color: theme.colors.text,
    marginBottom: 2,
  },
  facilityDesc: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 10,
    color: theme.colors.textSecondary,
    lineHeight: 14,
  },
  contactCard: {
    padding: 14,
    backgroundColor: theme.colors.surface,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  contactTitle: {
    fontFamily: theme.typography.fonts.semibold,
    fontSize: 13,
    color: theme.colors.primary,
  },
  contactText: {
    fontFamily: theme.typography.fonts.regular,
    fontSize: 12,
    color: theme.colors.textSecondary,
    lineHeight: 18,
  },
  developerCreditCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.tint,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
  },
  developerCreditText: {
    fontFamily: theme.typography.fonts.medium,
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  developerCreditName: {
    fontFamily: theme.typography.fonts.bold,
    color: theme.colors.primaryDark,
    fontWeight: '700',
  },
});
