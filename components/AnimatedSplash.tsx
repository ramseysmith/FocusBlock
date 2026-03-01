import React, { useEffect } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import Svg, {
  Path, Circle, Rect, Text as SvgText, Defs,
  LinearGradient, Stop, RadialGradient,
} from 'react-native-svg';
import { LinearGradient as ExpoGradient } from 'expo-linear-gradient';

// ── Animated SVG wrappers ────────────────────────────────────────────────────
const AnimatedPath   = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedRect   = Animated.createAnimatedComponent(Rect);
const AnimatedText   = Animated.createAnimatedComponent(SvgText);

// ── Reference canvas: 400 × 780 (same as original prototype) ────────────────
const W  = 400;
const H  = 780;
const CX = W / 2;       // 200  horizontal centre
const CY = H / 2 - 20;  // 370  vertical centre

// Arc – 150° sweep centred on top (-90°)
const ARC_R   = 95;
const ARC_CY  = CY - 55; // 315
const TO_RAD  = Math.PI / 180;
const S_RAD   = -165 * TO_RAD; // start: bottom-left of arc
const E_RAD   = -15  * TO_RAD; // end:   bottom-right of arc
const ARC_LEN = ARC_R * (150 * TO_RAD); // ≈ 248.7 px

const arcSX = CX + ARC_R * Math.cos(S_RAD);   // ≈ 108.24
const arcSY = ARC_CY + ARC_R * Math.sin(S_RAD); // ≈ 290.41
const arcEX = CX + ARC_R * Math.cos(E_RAD);   // ≈ 291.76
const arcEY = ARC_CY + ARC_R * Math.sin(E_RAD); // ≈ 290.41
const ARC_D = `M ${arcSX.toFixed(2)} ${arcSY.toFixed(2)} A ${ARC_R} ${ARC_R} 0 0 1 ${arcEX.toFixed(2)} ${arcEY.toFixed(2)}`;

// Divider line + diamond
const DIV_Y  = CY + 38;  // 408
const DIV_HW = 115;       // half-width

// Mini timer – 270° arc (75 %) from top, clockwise
const MINI_R        = 13;
const MINI_CY       = CY + 195; // 565
const MINI_ARC_LEN  = MINI_R * (270 * TO_RAD); // ≈ 61.26
// Start at top (CX, MINI_CY - MINI_R), end at left (CX - MINI_R, MINI_CY)
const MINI_D = `M ${CX} ${MINI_CY - MINI_R} A ${MINI_R} ${MINI_R} 0 1 1 ${CX - MINI_R} ${MINI_CY}`;

// ── Animation timing (ms) ────────────────────────────────────────────────────
const T_ARC_S   = 300;  const T_ARC_D   = 800;
const T_FOC_S   = 700;  const T_FOC_D   = 500;
const T_DIV_S   = 1000; const T_DIV_D   = 400;
const T_BLK_S   = 1200; const T_BLK_D   = 500;
const T_MINI_S  = 1600; const T_MINI_D  = 600;
const T_FADE_S  = 3200; const T_FADE_D  = 600;

// ── Component ────────────────────────────────────────────────────────────────
interface Props { onFinish: () => void; }

export default function AnimatedSplash({ onFinish }: Props) {
  const { width: sw, height: sh } = useWindowDimensions();

  // Shared values (all 0 → 1)
  const arcP   = useSharedValue(0);
  const focusP = useSharedValue(0);
  const divP   = useSharedValue(0);
  const blockP = useSharedValue(0);
  const miniP  = useSharedValue(0);
  const wrapOp = useSharedValue(1); // 1 → 0 fades the whole overlay out

  useEffect(() => {
    arcP.value   = withDelay(T_ARC_S,  withTiming(1, { duration: T_ARC_D,  easing: Easing.out(Easing.cubic) }));
    focusP.value = withDelay(T_FOC_S,  withTiming(1, { duration: T_FOC_D,  easing: Easing.out(Easing.poly(5)) }));
    divP.value   = withDelay(T_DIV_S,  withTiming(1, { duration: T_DIV_D,  easing: Easing.inOut(Easing.quad) }));
    blockP.value = withDelay(T_BLK_S,  withTiming(1, { duration: T_BLK_D,  easing: Easing.out(Easing.poly(5)) }));
    miniP.value  = withDelay(T_MINI_S, withTiming(1, { duration: T_MINI_D, easing: Easing.out(Easing.cubic) }));
    wrapOp.value = withDelay(T_FADE_S, withTiming(0, { duration: T_FADE_D, easing: Easing.inOut(Easing.quad) },
      (finished) => { 'worklet'; if (finished) runOnJS(onFinish)(); }
    ));
  }, []);

  // Diamond appears in the second half of the divider animation
  const diamondP = useDerivedValue(() => {
    'worklet';
    return divP.value > 0.5 ? Math.min(1, (divP.value - 0.5) / 0.5) : 0;
  });

  // ── Animated props ───────────────────────────────────────────────────────

  // Arc – soft glow (wide, low-opacity path behind main arc)
  const arcGlowProps = useAnimatedProps(() => ({
    strokeDashoffset: ARC_LEN * (1 - arcP.value),
    opacity: arcP.value * 0.12,
  }));

  // Arc – main stroke
  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: ARC_LEN * (1 - arcP.value),
    opacity: arcP.value > 0 ? 1 : 0,
  }));

  // Bright dot at the moving tip of the arc
  const dotProps = useAnimatedProps(() => {
    'worklet';
    const angle = S_RAD + (E_RAD - S_RAD) * arcP.value;
    return {
      cx: CX + ARC_R * Math.cos(angle),
      cy: ARC_CY + ARC_R * Math.sin(angle),
      opacity: arcP.value * 0.6,
    };
  });

  // FOCUS text – fade in + slight upward slide
  const focusProps = useAnimatedProps(() => ({
    opacity: focusP.value,
    y: (CY - 22) + (1 - focusP.value) * 15,
  }));

  // Divider line – expands symmetrically from centre
  const dividerProps = useAnimatedProps(() => {
    'worklet';
    const hw = DIV_HW * divP.value;
    return { x: CX - hw, width: hw * 2, opacity: divP.value * 0.25 };
  });

  // Diamond – 4-point polygon that scales up
  const diamondProps = useAnimatedProps(() => {
    'worklet';
    const ds = 5 * diamondP.value;
    const t = DIV_Y - ds, b = DIV_Y + ds, l = CX - ds, r = CX + ds;
    return {
      d: 'M ' + CX + ' ' + t + ' L ' + r + ' ' + DIV_Y +
         ' L ' + CX + ' ' + b + ' L ' + l + ' ' + DIV_Y + ' Z',
      opacity: diamondP.value * 0.4,
    };
  });

  // BLOCK text – fade in + slight upward slide
  const blockProps = useAnimatedProps(() => ({
    opacity: blockP.value * 0.88,
    y: (CY + 105) + (1 - blockP.value) * 15,
  }));

  // Mini timer background ring
  const miniRingProps = useAnimatedProps(() => ({ opacity: miniP.value }));

  // Mini timer progress arc (fills from 0 → 270° as miniP goes 0 → 1)
  const miniArcProps = useAnimatedProps(() => ({
    strokeDashoffset: MINI_ARC_LEN * (1 - miniP.value),
    opacity: miniP.value * 0.5,
  }));

  // Whole-overlay opacity (1 → 0 for the exit fade)
  const wrapStyle = useAnimatedStyle(() => ({ opacity: wrapOp.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, wrapStyle]} pointerEvents="none">
      {/* Dark purple gradient background */}
      <ExpoGradient
        colors={['#201A2B', '#15111D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.15, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* All animation elements rendered in a single SVG, scaled to screen */}
      <Svg
        width={sw}
        height={sh}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          {/* Arc stroke gradient: amberDim → amber → amberDim */}
          <LinearGradient id="arcGrad" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0"   stopColor="#C8896A" />
            <Stop offset="0.5" stopColor="#E8A87C" />
            <Stop offset="1"   stopColor="#C8896A" />
          </LinearGradient>

          {/* Subtle ambient glow centred on the logo */}
          <RadialGradient
            id="ambGlow"
            cx={CX}
            cy={ARC_CY - 30}
            r={200}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor="#E8A87C" stopOpacity={0.06} />
            <Stop offset="1" stopColor="#E8A87C" stopOpacity={0} />
          </RadialGradient>

          {/* Soft halo for the arc tip dot */}
          <RadialGradient id="dotGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor="#F0CBA8" stopOpacity={0.6} />
            <Stop offset="1" stopColor="#F0CBA8" stopOpacity={0} />
          </RadialGradient>
        </Defs>

        {/* Ambient glow */}
        <Rect x={0} y={0} width={W} height={H} fill="url(#ambGlow)" />

        {/* Arc glow – wide, very transparent path behind the main arc */}
        <AnimatedPath
          d={ARC_D}
          stroke="#E8A87C"
          strokeWidth={22}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={ARC_LEN}
          animatedProps={arcGlowProps}
        />

        {/* Arc – main amber stroke with gradient */}
        <AnimatedPath
          d={ARC_D}
          stroke="url(#arcGrad)"
          strokeWidth={7}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={ARC_LEN}
          animatedProps={arcProps}
        />

        {/* Glowing dot at the moving tip */}
        <AnimatedCircle r={12} fill="url(#dotGlow)" animatedProps={dotProps} />

        {/* FOCUS */}
        <AnimatedText
          x={CX}
          textAnchor="middle"
          alignmentBaseline="central"
          fontWeight="bold"
          fontSize={105}
          fontFamily="Helvetica Neue, Arial Black, sans-serif"
          fill="rgba(255,255,255,0.92)"
          letterSpacing={10}
          animatedProps={focusProps}
        >
          FOCUS
        </AnimatedText>

        {/* Divider line */}
        <AnimatedRect
          y={DIV_Y - 0.75}
          height={1.5}
          fill="#E8A87C"
          animatedProps={dividerProps}
        />

        {/* Diamond */}
        <AnimatedPath fill="#E8A87C" animatedProps={diamondProps} />

        {/* BLOCK */}
        <AnimatedText
          x={CX}
          textAnchor="middle"
          alignmentBaseline="central"
          fontWeight="bold"
          fontSize={105}
          fontFamily="Helvetica Neue, Arial Black, sans-serif"
          fill="#E8A87C"
          letterSpacing={10}
          animatedProps={blockProps}
        >
          BLOCK
        </AnimatedText>

        {/* Mini timer – background ring */}
        <AnimatedCircle
          cx={CX}
          cy={MINI_CY}
          r={MINI_R}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={2}
          fill="none"
          animatedProps={miniRingProps}
        />

        {/* Mini timer – amber progress arc (0 → 270°) */}
        <AnimatedPath
          d={MINI_D}
          stroke="#E8A87C"
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={MINI_ARC_LEN}
          animatedProps={miniArcProps}
        />
      </Svg>
    </Animated.View>
  );
}
