import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet } from "react-native";

// Must match the native splash background (app.json) for a seamless handoff
const BG_COLOR = "#081129";

// Minimum time the splash is shown regardless of how fast auth resolves
const MIN_DISPLAY_MS = 3000;

interface Props {
  isReady: boolean;
  onAnimationEnd: () => void;
}

// ─── Pulsing dot ────────────────────────────────────────────────────────────

function PulseDot({ delay }: { delay: number }) {
  const opacity = useRef(new Animated.Value(0.25)).current;
  const scale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 450, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 450, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0.25, duration: 500, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0.7, duration: 500, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [delay, opacity, scale]);

  return (
    <Animated.View style={[styles.dot, { opacity, transform: [{ scale }] }]} />
  );
}

// ─── Main splash ────────────────────────────────────────────────────────────

export default function AppSplashScreen({ isReady, onAnimationEnd }: Props) {
  // Entrance animated values
  const outerGlowOpacity = useRef(new Animated.Value(0)).current;
  const outerGlowScale = useRef(new Animated.Value(0.5)).current;
  const innerGlowOpacity = useRef(new Animated.Value(0)).current;
  const innerGlowScale = useRef(new Animated.Value(0.5)).current;
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  // Halo ring starts larger and contracts down to 1× (settling effect)
  const ringScale = useRef(new Animated.Value(1.4)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const nameOpacity = useRef(new Animated.Value(0)).current;
  const nameY = useRef(new Animated.Value(18)).current;
  const dotsOpacity = useRef(new Animated.Value(0)).current;

  // Exit animated values
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const containerScale = useRef(new Animated.Value(1)).current;

  // Enforce a minimum display time independent of auth speed
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinTimeElapsed(true), MIN_DISPLAY_MS);
    return () => clearTimeout(t);
  }, []);

  // ── Entrance ──────────────────────────────────────────────────────────────
  useEffect(() => {
    Animated.sequence([

      Animated.delay(120),
      // Phase 1: glows bloom, icon springs in simultaneously
      Animated.parallel([
        Animated.timing(outerGlowOpacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(outerGlowScale, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(innerGlowOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(innerGlowScale, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
      ]),
      // Phase 2: halo ring contracts and settles around the icon
      Animated.parallel([
        Animated.timing(ringOpacity, { toValue: 0.45, duration: 360, useNativeDriver: true }),
        Animated.timing(ringScale, { toValue: 1, duration: 460, useNativeDriver: true }),
      ]),
      // Phase 3: name slides up, dots fade in
      Animated.parallel([
        Animated.timing(nameOpacity, { toValue: 1, duration: 430, useNativeDriver: true }),
        Animated.timing(nameY, { toValue: 0, duration: 430, useNativeDriver: true }),
        Animated.timing(dotsOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
    ]).start();
  }, [outerGlowOpacity, outerGlowScale, innerGlowOpacity, innerGlowScale, logoScale, logoOpacity, ringOpacity, ringScale, nameOpacity, nameY, dotsOpacity]);

  // ── Exit ─────────────────────────────────────────────────────────────────
  // Only exits when BOTH auth is done AND minimum time has passed
  const shouldExit = isReady && minTimeElapsed;

  useEffect(() => {
    if (!shouldExit) return;
    Animated.parallel([
      // Fade out
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 580,
        useNativeDriver: true,
      }),
      // Slight scale-up gives a premium "zoom through" feeling
      Animated.timing(containerScale, {
        toValue: 1.05,
        duration: 580,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) onAnimationEnd();
    });
  }, [shouldExit, containerOpacity, containerScale, onAnimationEnd]);

  return (
    <Animated.View
      pointerEvents={shouldExit ? "none" : "auto"}
      style={[
        styles.container,
        { opacity: containerOpacity, transform: [{ scale: containerScale }] },
      ]}
    >
      {/* Outer glow — large, very subtle bloom */}
      <Animated.View
        style={[
          styles.glowOuter,
          { opacity: outerGlowOpacity, transform: [{ scale: outerGlowScale }] },
        ]}
      />

      {/* Inner glow — tighter, slightly brighter */}
      <Animated.View
        style={[
          styles.glowInner,
          { opacity: innerGlowOpacity, transform: [{ scale: innerGlowScale }] },
        ]}
      />

      {/* Halo ring that contracts from outside and settles around the icon */}
      <Animated.View
        style={[styles.ring, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]}
      />

      {/* App icon */}
      <Animated.Image
        source={{
          uri: "https://ojyq.org/wp-content/uploads/2025/04/IMG-20250318-WA0007.jpg",
        }}
        style={[
          styles.logo,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
        resizeMode="cover"
      />

      {/* App name */}
      <Animated.Text
        style={[
          styles.appName,
          { opacity: nameOpacity, transform: [{ translateY: nameY }] },
        ]}
      >
        OJYQ
      </Animated.Text>

      {/* Pulsing dots — visible while waiting for auth + min time */}
      <Animated.View style={[styles.dotsRow, { opacity: dotsOpacity }]}>
        <PulseDot delay={0} />
        <PulseDot delay={220} />
        <PulseDot delay={440} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BG_COLOR,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    elevation: 9999,
  },
  // Large outer bloom (very dim)
  glowOuter: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 170,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
  },
  // Tighter inner bloom
  glowInner: {
    position: "absolute",
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  // Halo border that settles around the icon
  ring: {
    position: "absolute",
    width: 134,
    height: 134,
    borderRadius: 35,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.45)",
    backgroundColor: "transparent",
  },
  logo: {
    width: 112,
    height: 112,
    borderRadius: 28,
    overflow: "hidden",
  },
  appName: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 10,
    marginTop: 32,
    textTransform: "uppercase",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 10,
    position: "absolute",
    bottom: 80,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "rgba(255, 255, 255, 0.75)",
  },
});
