import { logOut } from "@/hooks/use-auth";
import React from "react";
import { Button, Image, StyleSheet, Text, View } from "react-native";
const Profile = () => (
  <View style={styles.container}>
    <Image
      source={{ uri: "https://via.placeholder.com/150" }}
      style={styles.avatar}
    />
    <Text style={styles.name}>John Doe</Text>
    <Text style={styles.email}>johndoe@example.com</Text>
    <Button
      title="Edit Profile"
      onPress={() => alert("Edit Profile Pressed")}
    />
    <Button title="Log Out" onPress={logOut} color="#FF3B30" />
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
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  email: {
    fontSize: 16,
    color: "#666",
    marginBottom: 16,
  },
});

export default Profile;
