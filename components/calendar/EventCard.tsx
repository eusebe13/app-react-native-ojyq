import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CalendarEvent } from '../../types/models';

interface EventCardProps {
  event: CalendarEvent;
  onLongPress: () => void;
}

export function EventCard({ event, onLongPress }: EventCardProps) {
  const isShift = event.type === 'shift';
  
  // Formatage de l'heure (ex: 14:00)
  const timeString = event.dateObj 
    ? event.dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : 'Heure inconnue';

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onLongPress={onLongPress}
      // Si l'événement est "pending" (créé hors-ligne), on le rend un peu transparent
      className={`flex-row bg-white dark:bg-gray-800 rounded-2xl mb-4 shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden ${event.pending ? 'opacity-60' : 'opacity-100'}`}
    >
      {/* Bande de couleur latérale pour distinguer visuellement le type */}
      <View className={`w-3 ${isShift ? 'bg-orange-500' : 'bg-blue-600'}`} />

      <View className="flex-1 p-4">
        {/* En-tête : Titre + Icône de synchronisation si hors-ligne */}
        <View className="flex-row justify-between items-start">
          <Text 
            className="flex-1 text-lg font-bold text-gray-900 dark:text-white"
            numberOfLines={1}
          >
            {event.title}
          </Text>
          {event.pending && (
            <Ionicons name="cloud-upload-outline" size={16} color="#9CA3AF" />
          )}
        </View>

        {/* Détails : Heure et Lieu */}
        <View className="flex-row items-center mt-2 gap-4">
          <View className="flex-row items-center gap-1">
            <Ionicons name="time-outline" size={16} color="#6B7280" />
            <Text className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {timeString}
            </Text>
          </View>
          
          <View className="flex-row items-center gap-1 flex-1">
            <Ionicons name="location-outline" size={16} color="#6B7280" />
            <Text 
              className="text-sm font-medium text-gray-600 dark:text-gray-300 flex-1"
              numberOfLines={1}
            >
              {event.location}
            </Text>
          </View>
        </View>

        {/* Badge spécifique pour les Quarts de travail (Shifts) */}
        {isShift && (
          <View className="mt-3 flex-row items-center">
            <View className="bg-orange-100 dark:bg-orange-500/20 px-3 py-1.5 rounded-lg flex-row items-center gap-1.5">
              <Ionicons name="person" size={14} color="#F97316" />
              <Text className="text-xs font-bold text-orange-600 dark:text-orange-400">
                Assigné à : {event.assigneeName || 'À assigner'}
              </Text>
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
