import React from "react";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";

const messages = [
  { id: "1", text: "Hello! How are you?" },
  { id: "2", text: "I'm good, thanks! How about you?" },
  { id: "3", text: "Doing great!" },
];

const Chat = () => (
  <View style={styles.container}>
    <FlatList
      data={messages}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={styles.messageBubble}>
          <Text style={styles.messageText}>{item.text}</Text>
        </View>
      )}
      contentContainerStyle={styles.messageList}
    />
    <TextInput style={styles.input} placeholder="Type a message..." />
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    padding: 16,
  },
  messageList: {
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  messageBubble: {
    backgroundColor: "#e1f5fe",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  messageText: {
    fontSize: 16,
    color: "#333",
  },
  input: {
    height: 50,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
  },
});

export default Chat;
