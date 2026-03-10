/**
 * PollBubble - Composant de sondage dans le chat
 * 
 * Affiche un sondage interactif avec votes Pour/Contre.
 * Intégration avec Firestore pour la mise à jour des votes.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Poll } from '../../types/models';
import { useTheme } from '../../hooks/useTheme';
import { Colors } from '../../theme/colors';

interface PollBubbleProps {
  poll: Poll;
  messageId: string;
  currentUserId: string;
  onVote: (messageId: string, poll: Poll, voteType: 'yes' | 'no') => void;
}

export const PollBubble: React.FC<PollBubbleProps> = ({
  poll,
  messageId,
  currentUserId,
  onVote,
}) => {
  const { colors, isDark } = useTheme();
  const hasVoted = poll.voters?.includes(currentUserId);
  const totalVotes = poll.yes + poll.no;
  const yesPercent = totalVotes > 0 ? Math.round((poll.yes / totalVotes) * 100) : 0;
  const noPercent = totalVotes > 0 ? Math.round((poll.no / totalVotes) * 100) : 0;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? Colors.navy[700] : Colors.sky[50] }]}>
      {/* En-tête du sondage */}
      <View style={styles.header}>
        <Ionicons name="stats-chart" size={16} color={colors.primary} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Sondage
        </Text>
      </View>

      {/* Question */}
      <Text style={[styles.question, { color: colors.textPrimary }]}>
        {poll.question || "Êtes-vous d'accord ?"}
      </Text>

      {/* Barres de progression (si a voté) */}
      {hasVoted && (
        <View style={styles.resultsContainer}>
          {/* Barre Pour */}
          <View style={styles.resultRow}>
            <Text style={[styles.resultLabel, { color: colors.success }]}>Pour</Text>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${yesPercent}%`, 
                    backgroundColor: colors.success 
                  }
                ]} 
              />
            </View>
            <Text style={[styles.resultPercent, { color: colors.textSecondary }]}>
              {yesPercent}%
            </Text>
          </View>

          {/* Barre Contre */}
          <View style={styles.resultRow}>
            <Text style={[styles.resultLabel, { color: colors.error }]}>Contre</Text>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${noPercent}%`, 
                    backgroundColor: colors.error 
                  }
                ]} 
              />
            </View>
            <Text style={[styles.resultPercent, { color: colors.textSecondary }]}>
              {noPercent}%
            </Text>
          </View>

          <Text style={[styles.totalVotes, { color: colors.textTertiary }]}>
            {totalVotes} vote{totalVotes > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Boutons de vote (si pas encore voté) */}
      {!hasVoted && poll.isActive !== false && (
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.voteButton, styles.yesButton]}
            onPress={() => onVote(messageId, poll, 'yes')}
            activeOpacity={0.7}
            data-testid="poll-vote-yes"
          >
            <Ionicons name="thumbs-up" size={18} color="#fff" />
            <Text style={styles.voteButtonText}>Pour ({poll.yes})</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.voteButton, styles.noButton]}
            onPress={() => onVote(messageId, poll, 'no')}
            activeOpacity={0.7}
            data-testid="poll-vote-no"
          >
            <Ionicons name="thumbs-down" size={18} color="#fff" />
            <Text style={styles.voteButtonText}>Contre ({poll.no})</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Message si a déjà voté */}
      {hasVoted && (
        <View style={styles.votedIndicator}>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          <Text style={[styles.votedText, { color: colors.success }]}>
            Vous avez voté
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 12,
    minWidth: 220,
    maxWidth: 280,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  question: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
    lineHeight: 20,
  },
  resultsContainer: {
    gap: 8,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  resultLabel: {
    fontSize: 11,
    fontWeight: '600',
    width: 45,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  resultPercent: {
    fontSize: 11,
    fontWeight: '600',
    width: 35,
    textAlign: 'right',
  },
  totalVotes: {
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  voteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  yesButton: {
    backgroundColor: Colors.accent.green,
  },
  noButton: {
    backgroundColor: Colors.accent.red,
  },
  voteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  votedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
  },
  votedText: {
    fontSize: 11,
    fontWeight: '500',
  },
});

export default PollBubble;
