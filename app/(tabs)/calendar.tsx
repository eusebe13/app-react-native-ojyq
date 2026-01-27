import { Ionicons } from "@expo/vector-icons"; // Pour les icônes
import React, { useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// 1. Données initiales (Simulation de la Base de Données)
const initialEvents = [
  {
    id: "1",
    date: "10 Fév",
    title: "Assemblée Générale",
    time: "18h00",
    type: "General",
  },
  {
    id: "2",
    date: "12 Fév",
    title: "Sécurité - Concert",
    time: "14h00",
    type: "Shift",
  },
  {
    id: "3",
    date: "14 Fév",
    title: "Réunion d'équipe",
    time: "09h00",
    type: "General",
  },
  {
    id: "4",
    date: "15 Fév",
    title: "Distribution alimentaire",
    time: "10h00",
    type: "Shift",
  },
];

const Calendar = () => {
  const [events, setEvents] = useState(initialEvents);
  const [text, setText] = useState("");

  // Fonction simple pour ajouter un événement (Simulation)
  const addEvent = () => {
    if (text.trim().length > 0) {
      const newEvent = {
        id: Math.random().toString(),
        date: "20 Fév", // Date par défaut pour l'exemple
        title: text,
        time: "12h00",
        type: "General",
      };
      setEvents([...events, newEvent]);
      setText("");
    }
  };

  return (
    <View style={styles.container}>
      {/* Titre de la page */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Agenda OJYQ</Text>
      </View>

      {/* Liste des événements */}
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={[
              styles.eventCard,
              // Bordure orange pour les Shifts, Bleu pour le reste
              {
                borderLeftColor: item.type === "Shift" ? "#FF9500" : "#007AFF",
              },
            ]}
          >
            <View style={styles.dateContainer}>
              <Text style={styles.dateText}>{item.date}</Text>
              <Text style={styles.timeText}>{item.time}</Text>
            </View>
            <View style={styles.contentContainer}>
              <Text style={styles.eventTitle}>{item.title}</Text>
              <Text style={styles.eventType}>
                {item.type === "Shift" ? "QUART DE TRAVAIL" : "ÉVÉNEMENT"}
              </Text>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />

      {/* Zone de saisie (Comme dans votre exemple Chat) */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
        style={styles.inputContainer}
      >
        <TextInput
          style={styles.input}
          placeholder="Ajouter un événement rapide..."
          value={text}
          onChangeText={setText}
        />
        <TouchableOpacity onPress={addEvent} style={styles.addButton}>
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  listContent: {
    padding: 16,
    paddingBottom: 100, // Espace pour l'input
  },
  eventCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    // Ombre légère
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    // Bordure gauche colorée
    borderLeftWidth: 5,
  },
  dateContainer: {
    marginRight: 15,
    alignItems: "center",
    justifyContent: "center",
    borderRightWidth: 1,
    borderRightColor: "#eee",
    paddingRight: 15,
    minWidth: 60,
  },
  dateText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  timeText: {
    fontSize: 12,
    color: "#888",
    marginTop: 4,
  },
  contentContainer: {
    flex: 1,
    justifyContent: "center",
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  eventType: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#999",
    textTransform: "uppercase",
  },
  inputContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  input: {
    flex: 1,
    height: 50,
    backgroundColor: "#f0f0f0",
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 16,
    marginRight: 10,
  },
  addButton: {
    width: 50,
    height: 50,
    backgroundColor: "#007AFF",
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default Calendar;
