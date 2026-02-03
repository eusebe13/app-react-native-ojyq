import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { logOut } from "../../hooks/use-auth";

const HomeScreen = () => (
  <View style={styles.container}>
    <Image
      source={{ uri: "https://via.placeholder.com/300x150" }}
      style={styles.banner}
    />
    <Text style={styles.welcomeText}>Welcome to the App!</Text>
    <TouchableOpacity
      style={styles.button}
      onPress={() => logOut()}
    >
      <Text style={styles.buttonText}>Logout</Text>
    </TouchableOpacity>
    
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9f9f9",
    padding: 16,
  },
  banner: {
    width: "100%",
    height: 150,
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#007BFF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default HomeScreen;
