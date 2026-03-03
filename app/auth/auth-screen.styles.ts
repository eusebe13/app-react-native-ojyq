// auth-screen.styles.ts
import { Dimensions, StyleSheet } from "react-native";

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0F172A", // Dark blue-gray background
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: "center",
        padding: 24,
        paddingTop: 60,
    },
    logoContainer: {
        alignItems: "center",
        marginBottom: 40,
    },
    logo: {
        width: 110,
        height: 110,
        borderRadius: 55,
        borderWidth: 4,
        borderColor: "rgba(255, 255, 255, 0.2)",
        shadowColor: "#6366F1",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
    },
    headerContainer: {
        marginBottom: 40,
    },
    title: {
        fontSize: 36,
        fontWeight: "800",
        marginBottom: 8,
        textAlign: "center",
        color: "#FFFFFF",
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: "500",
        textAlign: "center",
        color: "#94A3B8",
        letterSpacing: 0.3,
    },
    formContainer: {
        width: "100%",
        backgroundColor: "rgba(255, 255, 255, 0.05)", // Glass effect
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.1)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.3,
        shadowRadius: 30,
        elevation: 10,
    },
    inputContainer: {
        marginBottom: 20,
    },
    input: {
        borderWidth: 2,
        borderColor: "rgba(255, 255, 255, 0.15)",
        padding: 18,
        borderRadius: 16,
        backgroundColor: "rgba(255, 255, 255, 0.08)",
        fontSize: 16,
        color: "#FFFFFF",
        fontWeight: "500",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    inputDisabled: {
        backgroundColor: "rgba(255, 255, 255, 0.03)",
        opacity: 0.5,
        borderColor: "rgba(255, 255, 255, 0.05)",
    },
    hintText: {
        color: "#FCD34D",
        marginTop: 8,
        fontSize: 13,
        paddingLeft: 6,
        fontWeight: "500",
    },
    errorText: {
        color: "#FCA5A5",
        fontSize: 13,
        paddingLeft: 6,
        fontWeight: "500",
    },
    errorContainer: {
        marginBottom: 16,
        backgroundColor: "rgba(248, 113, 113, 0.15)",
        padding: 16,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: "#F87171",
    },
    button: {
        backgroundColor: "#6366F1", // Indigo
        padding: 20,
        borderRadius: 16,
        alignItems: "center",
        marginTop: 12,
        marginBottom: 20,
        shadowColor: "#6366F1",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.1)",
    },
    buttonDisabled: {
        backgroundColor: "rgba(148, 163, 184, 0.3)",
        shadowOpacity: 0,
        elevation: 0,
        borderColor: "rgba(255, 255, 255, 0.05)",
    },
    buttonText: {
        color: "#FFFFFF",
        fontSize: 17,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
    switchButton: {
        padding: 16,
        alignItems: "center",
        borderRadius: 12,
        backgroundColor: "rgba(255, 255, 255, 0.03)",
    },
    switchText: {
        textAlign: "center",
        color: "#A5B4FC",
        fontSize: 15,
        fontWeight: "600",
        letterSpacing: 0.3,
    },
});

export default styles;
