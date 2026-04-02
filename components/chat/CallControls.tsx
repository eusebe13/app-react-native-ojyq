/**
 * CallControls - Contrôles pour les appels Audio/Vidéo
 * 
 * UI préparée pour WebRTC - Boutons d'appel dans l'en-tête du chat.
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { showToast } from '@/components/Toast';
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
      showToast(`Appel audio vers "${channelName}" — bientôt disponible avec WebRTC.`, 'info');
    }
  };

  const handleVideoCall = () => {
    if (onStartCall) {
      onStartCall('video');
    } else {
      // Simulation pour le moment
      showToast(`Appel vidéo vers "${channelName}" — bientôt disponible avec WebRTC.`, 'info');
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
