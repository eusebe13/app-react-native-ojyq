/**
 * CallControls - Contrôles pour les appels Audio/Vidéo
 * 
 * UI préparée pour WebRTC - Boutons d'appel dans l'en-tête du chat.
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { CallType } from '../../types/models';

interface CallControlsProps {
  channelId: string;
  channelName: string;
  onStartCall?: (type: CallType) => void;
}

export const CallControls: React.FC<CallControlsProps> = ({
  channelId,
  channelName,
  onStartCall,
}) => {
  const { colors } = useTheme();

  const handleAudioCall = () => {
    if (onStartCall) {
      onStartCall('audio');
    } else {
      // Simulation pour le moment
      Alert.alert(
        'Appel Audio',
        `Lancement d'un appel audio vers "${channelName}"...\n\nCette fonctionnalité sera bientôt disponible avec WebRTC.`,
        [{ text: 'OK' }]
      );
    }
  };

  const handleVideoCall = () => {
    if (onStartCall) {
      onStartCall('video');
    } else {
      // Simulation pour le moment
      Alert.alert(
        'Appel Vidéo',
        `Lancement d'un appel vidéo vers "${channelName}"...\n\nCette fonctionnalité sera bientôt disponible avec WebRTC.`,
        [{ text: 'OK' }]
      );
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primaryTint }]}
        onPress={handleAudioCall}
        activeOpacity={0.7}
        data-testid="call-audio-btn"
      >
        <Ionicons name="call" size={20} color={colors.primary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.primaryTint }]}
        onPress={handleVideoCall}
        activeOpacity={0.7}
        data-testid="call-video-btn"
      >
        <Ionicons name="videocam" size={20} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CallControls;
