/**
 * EventCard - Composant de carte d'événement
 * 
 * Affiche un événement ou un quart de travail avec distinction visuelle.
 * Support du mode sombre/clair.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CalendarEvent, EventType } from '../../types/models';
import { useTheme } from '../../hooks/useTheme';
import { Colors } from '../../theme/colors';

interface EventCardProps {
  event: CalendarEvent;
  onPress?: () => void;
  onLongPress?: () => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onPress,
  onLongPress,
}) => {
  const { colors, isDark } = useTheme();
  const isPast = event.dateObj ? event.dateObj < new Date() : false;
  const isShift = event.type === 'shift';

  const accentColor = isPast 
    ? colors.eventPast 
    : isShift 
      ? colors.eventShift 
      : colors.eventGeneral;

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { 
          backgroundColor: colors.surface,
          borderLeftColor: accentColor,
          opacity: event.pending ? 0.6 : 1,
        },
        isPast && { backgroundColor: isDark ? Colors.navy[800] : Colors.neutral.gray[100] }
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={500}
      activeOpacity={0.8}
      data-testid={`event-card-${event.id}`}
    >
      {/* Bande colorée latérale */}
      <View style={[styles.stripe, { backgroundColor: accentColor }]} />

      {/* Section Date */}
      <View style={[styles.dateSection, { borderRightColor: colors.borderLight }]}>
        <Text style={[styles.dateText, { color: isPast ? colors.textTertiary : colors.textPrimary }]}>
          {event.dateObj && formatDate(event.dateObj)}
        </Text>
        <Text style={[styles.timeText, { color: colors.textTertiary }]}>
          {event.dateObj && formatTime(event.dateObj)}
        </Text>
      </View>

      {/* Section Contenu */}
      <View style={styles.contentSection}>
        <Text 
          style={[styles.title, { color: isPast ? colors.textTertiary : colors.textPrimary }]}
          numberOfLines={1}
        >
          {event.title} {isPast && '(Terminé)'}
        </Text>

        <View style={styles.detailsRow}>
          {/* Badge Type */}
          <View style={[styles.typeBadge, { backgroundColor: accentColor + '20' }]}>
            <Text style={[styles.typeText, { color: accentColor }]}>
              {isShift ? 'QUART' : 'ÉVÉNEMENT'}
            </Text>
          </View>

          {/* Lieu */}
          {event.location && (
            <View style={styles.locationRow}>
              <Ionicons 
                name="location-outline" 
                size={12} 
                color={colors.textTertiary} 
              />
              <Text style={[styles.locationText, { color: colors.textTertiary }]}>
                {event.location}
              </Text>
            </View>
          )}
        </View>

        {/* Assigné (pour les quarts) */}
        {isShift && 'assigneeName' in event && event.assigneeName && (
          <View style={styles.assigneeRow}>
            <Ionicons name="person-outline" size={12} color={colors.eventShift} />
            <Text style={[styles.assigneeText, { color: colors.eventShift }]}>
              {event.assigneeName}
            </Text>
          </View>
        )}
      </View>

      {/* Indicateur de synchronisation */}
      {event.pending && (
        <View style={styles.pendingIndicator}>
          <Ionicons name="cloud-upload-outline" size={14} color={colors.textTertiary} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
  },
  stripe: {
    width: 0, // La bordure fait office de stripe
  },
  dateSection: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    minWidth: 70,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '700',
  },
  timeText: {
    fontSize: 11,
    marginTop: 4,
  },
  contentSection: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 11,
  },
  assigneeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  assigneeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  pendingIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
});

export default EventCard;
