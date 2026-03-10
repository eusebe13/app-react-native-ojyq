/**
 * ChannelItem - Élément de liste de canal
 * 
 * Affiche un canal avec avatar, dernier message et indicateur non lu.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Channel } from '../../types/models';
import { useTheme } from '../../hooks/useTheme';
import { Colors } from '../../theme/colors';

interface ChannelItemProps {
  channel: Channel;
  onPress: () => void;
  onLongPress: () => void;
}

export const ChannelItem: React.FC<ChannelItemProps> = ({
  channel,
  onPress,
  onLongPress,
}) => {
  const { colors, isDark } = useTheme();

  // Générer une couleur déterministe basée sur le nom
  const accentColors = [
    Colors.sky[500],
    Colors.accent.orange,
    Colors.accent.green,
    Colors.accent.purple,
    Colors.accent.pink,
    Colors.accent.teal,
  ];
  const hash = channel.name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const avatarColor = accentColors[hash % accentColors.length];

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.surface }]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      data-testid={`channel-item-${channel.id}`}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: avatarColor + '20' }]}>
        {channel.type === 'direct' ? (
          <Text style={[styles.avatarText, { color: avatarColor }]}>
            {channel.name.charAt(0).toUpperCase()}
          </Text>
        ) : (
          <Ionicons name="people" size={22} color={avatarColor} />
        )}
      </View>

      {/* Infos du canal */}
      <View style={styles.infoContainer}>
        <View style={styles.headerRow}>
          <Text 
            style={[styles.name, { color: colors.textPrimary }]}
            numberOfLines={1}
          >
            {channel.name}
          </Text>
          {channel.isPinned && (
            <Ionicons name="pin" size={12} color={colors.textTertiary} />
          )}
        </View>
        <Text 
          style={[styles.lastMessage, { color: colors.textTertiary }]}
          numberOfLines={1}
        >
          {channel.lastMessage || 'Nouveau canal'}
        </Text>
      </View>

      {/* Indicateurs */}
      <View style={styles.indicators}>
        {channel.unreadCount && channel.unreadCount > 0 ? (
          <View style={[styles.badge, { backgroundColor: colors.primary }]}>
            <Text style={styles.badgeText}>
              {channel.unreadCount > 99 ? '99+' : channel.unreadCount}
            </Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  infoContainer: {
    flex: 1,
    marginRight: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  lastMessage: {
    fontSize: 13,
  },
  indicators: {
    alignItems: 'flex-end',
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
});

export default ChannelItem;
