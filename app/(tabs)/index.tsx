import React from "react";
import {
  Image,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Icon components (using Unicode emoji/symbols as fallback)
const DocumentIcon = () => <Text style={styles.icon}>📄</Text>;
const FormIcon = () => <Text style={styles.icon}>📋</Text>;
const CardIcon = () => <Text style={styles.icon}>🎫</Text>;
const EditIcon = () => <Text style={styles.icon}>✏️</Text>;
const ChartIcon = () => <Text style={styles.icon}>📊</Text>;
const ChevronIcon = () => <Text style={styles.chevron}>›</Text>;
const EmailIcon = () => <Text style={styles.contactIcon}>✉️</Text>;
const PhoneIcon = () => <Text style={styles.contactIcon}>📱</Text>;
const FacebookIcon = () => <Text style={styles.contactIcon}>👥</Text>;

interface DocumentLinkProps {
  icon: React.ReactNode;
  title: string;
  url: string;
}

const DocumentLink = ({ icon, title, url }: DocumentLinkProps) => (
  <TouchableOpacity
    style={styles.documentCard}
    onPress={() => Linking.openURL(url)}
    activeOpacity={0.7}
  >
    <View style={styles.documentCardContent}>
      <View style={styles.documentIconContainer}>{icon}</View>
      <View style={styles.documentTextContainer}>
        <Text style={styles.documentTitle}>{title}</Text>
        <Text style={styles.documentSubtext}>Appuyer pour ouvrir</Text>
      </View>
      <ChevronIcon />
    </View>
  </TouchableOpacity>
);

const HomeScreen = () => {
  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoWrapper}>
            <Image
              source={{
                uri: "https://ojyq.org/wp-content/uploads/2025/04/IMG-20250318-WA0007.jpg",
              }}
              style={styles.logo}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.organizationName}>
            Organisation de la jeunesse
          </Text>
          <Text style={styles.organizationNameBold}>Yira du Québec</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>ESPACE MEMBRES</Text>
          </View>
        </View>

        {/* Welcome Section */}
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>📂 Documents & Ressources</Text>
          <Text style={styles.welcomeDescription}>
            Accédez à tous les documents et modèles essentiels pour les membres
            de l'O.J.Y.Q.
          </Text>
        </View>

        {/* Documents Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Documents disponibles</Text>

          <DocumentLink
            icon={<DocumentIcon />}
            title="Demande de fonds"
            url="https://docs.google.com/document/d/1DF0Dq-laPTGJDa0M-SEOUrTqR4szV2GK/edit?usp=sharing"
          />

          <DocumentLink
            icon={<FormIcon />}
            title="Formulaire de dépense (Facture)"
            url="https://docs.google.com/forms/d/10bSS1_EP4Mp8xGZx8AaNkP_KU_3z8HQovJBK7mDqEMk"
          />

          <DocumentLink
            icon={<CardIcon />}
            title="Carte d'invitation"
            url="https://docs.google.com/document/d/1P4gsxMJtLNesD4H7mdwnobPJHUT-8-vc"
          />

          <DocumentLink
            icon={<EditIcon />}
            title="Démission / Absence"
            url="https://docs.google.com/document/d/1rJvOx5GWH9Wr9dnBxuvB9XcFFzrj_vvZ"
          />

          <DocumentLink
            icon={<ChartIcon />}
            title="Contribution mensuelle OJYQ"
            url="https://docs.google.com/spreadsheets/d/1o8PALcnfRligb1yGkOC_GSwGRGg8klvm4qDaw9ttb4w"
          />
        </View>

        {/* Contact Section */}
        <View style={styles.contactSection}>
          <Text style={styles.sectionTitle}>Contact & Réseaux</Text>

          <View style={styles.contactGrid}>
            <View style={styles.contactCard}>
              <EmailIcon />
              <Text style={styles.contactLabel}>Email</Text>
              <TouchableOpacity
                onPress={() => Linking.openURL("mailto:info@ojyq.org")}
              >
                <Text style={styles.contactValue}>info@ojyq.org</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.contactCard}>
              <PhoneIcon />
              <Text style={styles.contactLabel}>Téléphone</Text>
              <TouchableOpacity
                onPress={() => Linking.openURL("tel:+14386224435")}
              >
                <Text style={styles.contactValue}>+1 438-622-4435</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={styles.socialButton}
            onPress={() =>
              Linking.openURL(
                "https://www.facebook.com/people/OJYQ/61573730380786/",
              )
            }
            activeOpacity={0.8}
          >
            <FacebookIcon />
            <Text style={styles.socialButtonText}>
              Suivez-nous sur Facebook
            </Text>
            <ChevronIcon />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.copyright}>
            © 2025 Organisation de la jeunesse Yira du Québec
          </Text>
          <Text style={styles.copyrightSub}>Tous droits réservés</Text>
        </View>
      </ScrollView>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
    paddingTop: 20,
  },
  logoWrapper: {
    marginBottom: 16,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },
  organizationName: {
    fontSize: 18,
    fontWeight: "500",
    color: "#64748B",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  organizationNameBold: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  badge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  badgeText: {
    color: "#6366F1",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  welcomeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  welcomeDescription: {
    fontSize: 15,
    color: "#64748B",
    lineHeight: 22,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 16,
    paddingLeft: 4,
  },
  documentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  documentCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  documentIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: "#EEF2FF",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  icon: {
    fontSize: 24,
  },
  documentTextContainer: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
    marginBottom: 2,
  },
  documentSubtext: {
    fontSize: 13,
    color: "#64748B",
  },
  chevron: {
    fontSize: 24,
    color: "#94A3B8",
    fontWeight: "300",
  },
  contactSection: {
    marginBottom: 32,
  },
  contactGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  contactCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  contactIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  contactLabel: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 4,
    fontWeight: "600",
  },
  contactValue: {
    fontSize: 13,
    color: "#6366F1",
    fontWeight: "600",
    textAlign: "center",
  },
  socialButton: {
    backgroundColor: "#1877F2",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#1877F2",
    gap: 12,
    shadowColor: "#1877F2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    flex: 1,
  },
  footer: {
    alignItems: "center",
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  copyright: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    fontWeight: "500",
  },
  copyrightSub: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 4,
  },
});

export default HomeScreen;
