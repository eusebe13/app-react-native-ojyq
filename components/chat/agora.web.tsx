// Ce fichier ne sera lu QUE par le navigateur Web
import React from 'react';
import { View, Text } from 'react-native';

export const createAgoraRtcEngine = () => null;
export const ChannelProfileType = {};
export const ClientRoleType = {};

// On ajoute "(props: any)" ici pour accepter silencieusement ce qu'envoie [id].tsx
export const RtcSurfaceView = (props: any) => (
  <View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1F2937' }, props.style]}>
    <Text style={{ color: 'white', textAlign: 'center', padding: 10 }}>
      Vidéo non supportée sur le navigateur Web
    </Text>
  </View>
);