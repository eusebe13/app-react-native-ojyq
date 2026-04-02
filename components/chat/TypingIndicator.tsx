import React, { useEffect, useRef, useMemo } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/contexts/ThemeContext";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TypingIndicatorProps {
  typingNames: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildLabel(names: string[]): string {
  if (names.length === 1) return `${names[0]} est en train d'écrire...`;
  if (names.length === 2) return `${names[0]} et ${names[1]} écrivent...`;
  return "Plusieurs personnes écrivent...";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const TypingIndicator = React.memo(function TypingIndicator({
  typingNames,
}: TypingIndicatorProps) {
  const { colors, tokens } = useAppTheme();
  const styles = useMemo(() => getStyles(colors, tokens), [colors, tokens]);

  // Three animated values, one per dot
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (typingNames.length === 0) return;

    const DURATION = 300;
    const DELAY = 200;
    const RISE = -6; // translateY upward

    const makeBounce = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: RISE,
            duration: DURATION,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: DURATION,
            useNativeDriver: true,
          }),
          // pause before repeating — wait for the other two dots to finish
          Animated.delay(DELAY * 2),
        ]),
      );

    const loop1 = makeBounce(dot1, 0);
    const loop2 = makeBounce(dot2, DELAY);
    const loop3 = makeBounce(dot3, DELAY * 2);

    loop1.start();
    loop2.start();
    loop3.start();

    return () => {
      loop1.stop();
      loop2.stop();
      loop3.stop();
      dot1.setValue(0);
      dot2.setValue(0);
      dot3.setValue(0);
    };
  }, [typingNames.length, dot1, dot2, dot3]);

  if (typingNames.length === 0) return null;

  const dotStyle = (anim: Animated.Value) => [
    styles.dot,
    { backgroundColor: colors.textTertiary, transform: [{ translateY: anim }] },
  ];

  return (
    <View style={styles.wrapper}>
      {/* Bubble */}
      <View style={[styles.bubble, { backgroundColor: colors.surface }]}>
        <Animated.View style={dotStyle(dot1)} />
        <Animated.View style={dotStyle(dot2)} />
        <Animated.View style={dotStyle(dot3)} />
      </View>

      {/* Label */}
      <Text style={[styles.label, { color: colors.textSecondary }]}>
        {buildLabel(typingNames)}
      </Text>
    </View>
  );
});

export default TypingIndicator;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const getStyles = (colors: any, tokens: any) =>
  StyleSheet.create({
    wrapper: {
      paddingHorizontal: tokens.space.md ?? 12,
      paddingBottom: tokens.space.xs ?? 4,
      alignItems: "flex-start",
    },
    bubble: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 18,
      borderBottomLeftRadius: 4,
      // subtle shadow
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    label: {
      marginTop: 4,
      fontSize: tokens.font.xs ?? 10,
      marginLeft: 4,
    },
  });
