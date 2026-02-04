import React, { useState, useEffect } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, 
  Modal, Alert, ActivityIndicator 
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

export default function ChatListScreen() {
  const router = useRouter();
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // États pour le Modal (Création/Modification)
  const [modalVisible, setModalVisible] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // 1. Charger les canaux depuis Firestore
  useEffect(() => {
    const q = query(collection(db, 'channels'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setChannels(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Créer ou Modifier un canal
  const handleSaveChannel = async () => {
    if (!channelName.trim()) return;
    
    try {
      if (editingId) {
        // Modification
        await updateDoc(doc(db, 'channels', editingId), { name: channelName });
      } else {
        // Création
        await addDoc(collection(db, 'channels'), {
          name: channelName,
          createdAt: new Date(),
          lastMessage: 'Nouveau canal créé'
        });
      }
      setModalVisible(false);
      setChannelName('');
      setEditingId(null);
    } catch (e) {
      Alert.alert("Erreur", "Impossible de sauvegarder.");
    }
  };

  // 3. Gérer la suppression (Long press)
  const handleLongPress = (channel: any) => {
    Alert.alert(
      "Gérer le canal",
      `Que voulez-vous faire avec "${channel.name}" ?`,
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Modifier le nom", 
          onPress: () => {
            setChannelName(channel.name);
            setEditingId(channel.id);
            setModalVisible(true);
          } 
        },
        { 
          text: "Supprimer", 
          style: "destructive",
          onPress: async () => {
            await deleteDoc(doc(db, 'channels', channel.id));
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Discussions</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)}>
          <Ionicons name="create-outline" size={28} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={channels}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.channelItem}
              onPress={() => router.push(`/channel/${item.id}?name=${item.name}`)}
              onLongPress={() => handleLongPress(item)}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name[0]?.toUpperCase()}</Text>
              </View>
              <View style={styles.channelInfo}>
                <Text style={styles.channelName}>{item.name}</Text>
                <Text style={styles.lastMsg} numberOfLines={1}>{item.lastMessage}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          )}
        />
      )}

      {/* Modal Création/Edition */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalView}>
            <Text style={styles.modalTitle}>{editingId ? "Modifier le canal" : "Nouveau Canal"}</Text>
            <TextInput 
              style={styles.input} 
              placeholder="Nom du canal (ex: Général)" 
              value={channelName}
              onChangeText={setChannelName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.btnCancel}>
                <Text style={{color: 'red'}}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveChannel} style={styles.btnSave}>
                <Text style={{color: 'white', fontWeight: 'bold'}}>Sauvegarder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f2f7' },
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 60, paddingHorizontal: 20, paddingBottom: 15, backgroundColor: '#fff' 
  },
  title: { fontSize: 30, fontWeight: 'bold' },
  channelItem: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', 
    padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' 
  },
  avatar: { 
    width: 50, height: 50, borderRadius: 25, backgroundColor: '#e1e1e1', 
    justifyContent: 'center', alignItems: 'center', marginRight: 15 
  },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: '#555' },
  channelInfo: { flex: 1 },
  channelName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  lastMsg: { fontSize: 14, color: '#888' },
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalView: { backgroundColor: 'white', borderRadius: 20, padding: 25 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 20, fontSize: 16 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  btnCancel: { padding: 10 },
  btnSave: { backgroundColor: '#007AFF', padding: 10, borderRadius: 8, paddingHorizontal: 20 }
});