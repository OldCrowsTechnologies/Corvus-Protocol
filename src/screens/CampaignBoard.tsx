import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, Line, Path as SvgPath, Polyline } from 'react-native-svg';

import { boardMap, enemyArt, towerArt } from '@/art';
import { T } from '@/components/T';
import { BUILDABLE, GRID_COLS, GRID_ROWS, PATH } from '@/game/board';
import { TOWERS } from '@/game/constants';
import { normRange } from '@/game/engine';
import type { CampaignState, TowerType } from '@/game/types';
import { colors } from '@/theme/tokens';

interface Props {
  state: CampaignState;
  armed: TowerType | null;
  onTapBoard: (nx: number, ny: number) => void;
}

/** On-board sprite pixel size per enemy type (enlarged for on-phone visibility). */
const ENEMY_SIZE: Record<string, number> = {
  wisp: 36,
  wailer: 40,
  shrieker: 34,
  husk: 50,
  whisper: 74,
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Atmospheric isometric battlefield: painterly bible map backdrop → violet vignette →
 * luminescent path + pulsing altar + buildable pads → fog → drifting motes → enemies/towers.
 */
export function CampaignBoard({ state, armed, onTapBoard }: Props) {
  const [w, setW] = React.useState(0);
  const h = w * (GRID_ROWS / GRID_COLS);
  const cell = w / GRID_COLS;

  // ambient pulse for the summoning circle + path glow
  const pulse = React.useRef(new Animated.Value(0)).current;
  const drift = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 4200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 4200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();
  }, [pulse, drift]);

  const origin = React.useRef({ x: 0, y: 0 });
  const boardRef = React.useRef<View>(null);
  const measure = () => boardRef.current?.measureInWindow((x, y) => { origin.current = { x, y }; });

  const handle = (e: GestureResponderEvent) => {
    if (w === 0) return;
    const ne = e.nativeEvent;
    // Prefer locationX/Y (native). Fall back to pageX/Y − board origin (RN-web omits locationX).
    let lx = ne.locationX;
    let ly = ne.locationY;
    if (typeof lx !== 'number' || Number.isNaN(lx) || typeof ly !== 'number' || Number.isNaN(ly)) {
      lx = ne.pageX - origin.current.x;
      ly = ne.pageY - origin.current.y;
    }
    onTapBoard(lx / w, ly / h);
  };

  const altar = PATH[PATH.length - 1];
  const pathPts = PATH.map((p) => `${p.x * w},${p.y * h}`).join(' ');
  const moteY = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });

  return (
    <View style={styles.wrap} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 ? (
        <Pressable ref={boardRef} onLayout={measure} onPress={handle} style={{ width: w, height: h }}>
          {/* painterly battlefield backdrop */}
          <Image source={boardMap} style={[StyleSheet.absoluteFill, { width: w, height: h }]} resizeMode="cover" />
          {/* violet vignette so gameplay reads over the art */}
          <LinearGradient
            colors={['rgba(10,8,20,0.35)', 'rgba(8,10,18,0.15)', 'rgba(107,79,160,0.18)']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />

          <Svg width={w} height={h} style={StyleSheet.absoluteFill}>
            {/* buildable pads — subtle, brighten while a tower is armed */}
            {BUILDABLE.map((t, i) => (
              <Circle
                key={`b${i}`}
                cx={t.x * w}
                cy={t.y * h}
                r={cell * 0.34}
                fill={armed ? 'rgba(0,194,199,0.14)' : 'rgba(0,194,199,0.04)'}
                stroke={armed ? 'rgba(0,194,199,0.7)' : 'rgba(120,200,210,0.18)'}
                strokeWidth={armed ? 1.6 : 1}
                strokeDasharray={armed ? undefined : '3,4'}
              />
            ))}

            {/* luminescent path — wide soft glow + bright core */}
            <Polyline points={pathPts} fill="none" stroke="rgba(0,194,199,0.18)" strokeWidth={cell * 0.5} strokeLinecap="round" strokeLinejoin="round" />
            <Polyline points={pathPts} fill="none" stroke="rgba(0,194,199,0.32)" strokeWidth={cell * 0.28} strokeLinecap="round" strokeLinejoin="round" />
            <Polyline points={pathPts} fill="none" stroke="rgba(150,240,245,0.85)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

            {/* pulsing summoning-circle altar */}
            <AnimatedCircle
              cx={altar.x * w}
              cy={altar.y * h}
              r={pulse.interpolate({ inputRange: [0, 1], outputRange: [cell * 0.5, cell * 0.66] })}
              fill="rgba(107,79,160,0.22)"
              stroke="rgba(179,155,224,0.9)"
              strokeWidth={2}
            />
            <Circle cx={altar.x * w} cy={altar.y * h} r={cell * 0.34} fill="rgba(107,79,160,0.35)" stroke="#b39be0" strokeWidth={1.5} />

            {/* tower range rings */}
            {state.towers.map((tw) => (
              <Circle
                key={`r${tw.id}`}
                cx={tw.pos.x * w}
                cy={tw.pos.y * h}
                r={normRange(TOWERS[tw.type].range) * w}
                fill={TOWERS[tw.type].glowPrefix + '0.06)'}
                stroke={TOWERS[tw.type].glowPrefix + '0.45)'}
                strokeWidth={1.4}
              />
            ))}

            {/* tower attack beams to their current target-in-range (nearest-progress enemy) */}
            {state.towers.map((tw) => {
              if (TOWERS[tw.type].dps <= 0) return null;
              const range = normRange(TOWERS[tw.type].range);
              let tgt: { x: number; y: number } | null = null;
              let best = -1;
              for (const en of state.enemies) {
                const d = Math.hypot(en.pos.x - tw.pos.x, en.pos.y - tw.pos.y);
                if (d <= range && en.t > best) { best = en.t; tgt = en.pos; }
              }
              if (!tgt) return null;
              return (
                <Line
                  key={`beam${tw.id}`}
                  x1={tw.pos.x * w}
                  y1={tw.pos.y * h}
                  x2={tgt.x * w}
                  y2={tgt.y * h}
                  stroke={TOWERS[tw.type].glowPrefix + '0.5)'}
                  strokeWidth={1.5}
                  strokeLinecap="round"
                />
              );
            })}
          </Svg>

          {/* drifting rune motes */}
          {[0.2, 0.5, 0.8].map((mx, i) => (
            <Animated.View
              key={`mote${i}`}
              pointerEvents="none"
              style={{
                position: 'absolute', left: mx * w, top: (0.2 + i * 0.22) * h,
                width: 3, height: 3, borderRadius: 2,
                backgroundColor: i % 2 ? '#b39be0' : '#8fd8da',
                transform: [{ translateY: moteY }],
                shadowColor: i % 2 ? '#b39be0' : '#00C2C7', shadowOpacity: 0.9, shadowRadius: 5,
              }}
            />
          ))}

          {/* bottom fog */}
          <LinearGradient
            colors={['transparent', 'rgba(0,194,199,0.05)', 'rgba(6,9,14,0.45)']}
            style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: h * 0.28 }}
            pointerEvents="none"
          />

          {/* enemy sprites with HP bars */}
          {state.enemies.map((en) => {
            const size = ENEMY_SIZE[en.type] ?? 34;
            const hpPct = Math.max(0, en.health / en.maxHealth);
            return (
              <View
                key={en.id}
                pointerEvents="none"
                style={{ position: 'absolute', left: en.pos.x * w - size / 2, top: en.pos.y * h - size / 2, width: size, alignItems: 'center' }}
              >
                <View style={{ width: size * 0.78, height: 3, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.6)' }}>
                  <View style={{ width: `${hpPct * 100}%`, height: '100%', borderRadius: 2, backgroundColor: en.type === 'whisper' ? '#b39be0' : '#e0687f' }} />
                </View>
                <Image source={enemyArt[en.type]} style={{ width: size, height: size, resizeMode: 'contain', marginTop: 1 }} />
              </View>
            );
          })}

          {/* towers — bright bible art on a glowing base disc */}
          {state.towers.map((tw) => {
            const tsize = Math.min(cell * 1.05, 58);
            const accent = TOWERS[tw.type].color;
            return (
              <View
                key={tw.id}
                pointerEvents="none"
                style={{ position: 'absolute', left: tw.pos.x * w - tsize / 2, top: tw.pos.y * h - tsize / 2, width: tsize, height: tsize, alignItems: 'center', justifyContent: 'flex-end' }}
              >
                <View style={{ position: 'absolute', bottom: 2, width: tsize * 0.6, height: tsize * 0.26, borderRadius: tsize * 0.3, backgroundColor: TOWERS[tw.type].glowPrefix + '0.3)', borderWidth: 1.5, borderColor: accent, shadowColor: accent, shadowOpacity: 1, shadowRadius: 9 }} />
                <Image source={towerArt[tw.type]} style={{ width: tsize, height: tsize, resizeMode: 'contain' }} />
              </View>
            );
          })}

          {/* floating damage numbers */}
          {state.floaties.map((f) => {
            const age = state.elapsed - f.born;
            return (
              <View key={f.id} pointerEvents="none" style={{ position: 'absolute', left: f.pos.x * w - 18, top: f.pos.y * h - 14 - age * 20, opacity: Math.max(0, 1 - age) }}>
                <T variant="monoBold" size={f.crit ? 14 : 11} color={f.crit ? '#E4C15A' : f.color} glow={f.crit ? 'rgba(228,193,90,.9)' : 'rgba(0,0,0,.8)'}>
                  {f.value}{f.crit ? '!' : ''}
                </T>
              </View>
            );
          })}

          {armed ? (
            <View pointerEvents="none" style={styles.armHint}>
              <T variant="monoBold" size={10} color={colors.tealSoft} spacing={1}>
                TAP A GLOWING PAD · {TOWERS[armed].name.toUpperCase()} ({TOWERS[armed].cost})
              </T>
            </View>
          ) : null}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(107,79,160,0.4)',
    backgroundColor: '#0b0a14',
    shadowColor: '#6B4FA0',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  armHint: {
    position: 'absolute',
    top: 8,
    left: 10,
    right: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(6,9,14,0.5)',
    paddingVertical: 4,
    borderRadius: 8,
  },
});
