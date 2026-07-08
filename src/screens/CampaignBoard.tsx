import React from 'react';
import { Pressable, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, Rect, RadialGradient, Stop } from 'react-native-svg';

import { CharacterAvatar } from '@/components/CharacterAvatar';
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

const ENEMY_FILL: Record<string, string> = {
  wisp: 'rgba(190,205,225,0.7)',
  wailer: 'rgba(175,195,120,0.7)',
  shrieker: 'rgba(220,120,170,0.7)',
  husk: 'rgba(150,120,180,0.7)',
  whisper: '#0c0a12',
};

/** Top-down stylized board (flat-sprite fallback per handoff). Grid → path → altar → towers → enemies. */
export function CampaignBoard({ state, armed, onTapBoard }: Props) {
  const [w, setW] = React.useState(0);
  const h = w * (GRID_ROWS / GRID_COLS);

  const handle = (e: GestureResponderEvent) => {
    if (w === 0) return;
    const { locationX, locationY } = e.nativeEvent;
    onTapBoard(locationX / w, locationY / h);
  };

  const cell = w / GRID_COLS;
  const armedRange = armed ? normRange(TOWERS[armed].range) * w : 0;

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
    >
      {w > 0 ? (
        <Pressable onPress={handle} style={{ width: w, height: h }}>
          <Svg width={w} height={h}>
            <Defs>
              <RadialGradient id="altar" cx="50%" cy="50%" r="60%">
                <Stop offset="0%" stopColor="#3a2350" />
                <Stop offset="100%" stopColor="#160f22" />
              </RadialGradient>
            </Defs>

            {/* buildable tiles */}
            {BUILDABLE.map((t, i) => (
              <Rect
                key={`b${i}`}
                x={t.x * w - cell / 2 + 2}
                y={t.y * h - cell / 2 + 2}
                width={cell - 4}
                height={cell - 4}
                rx={4}
                fill="#101a28"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={1}
              />
            ))}

            {/* path tiles */}
            {PATH.map((t, i) => (
              <Rect
                key={`p${i}`}
                x={t.x * w - cell / 2 + 2}
                y={t.y * h - cell / 2 + 2}
                width={cell - 4}
                height={cell - 4}
                rx={4}
                fill={i === PATH.length - 1 ? 'url(#altar)' : '#123036'}
                stroke={i === PATH.length - 1 ? 'rgba(107,79,160,0.8)' : 'rgba(0,194,199,0.4)'}
                strokeWidth={1}
              />
            ))}

            {/* path connector line */}
            {PATH.slice(0, -1).map((t, i) => (
              <Line
                key={`l${i}`}
                x1={t.x * w}
                y1={t.y * h}
                x2={PATH[i + 1].x * w}
                y2={PATH[i + 1].y * h}
                stroke="rgba(0,194,199,0.25)"
                strokeWidth={2}
              />
            ))}

            {/* tower range rings */}
            {state.towers.map((tw) => (
              <Circle
                key={`r${tw.id}`}
                cx={tw.pos.x * w}
                cy={tw.pos.y * h}
                r={normRange(TOWERS[tw.type].range) * w}
                fill={TOWERS[tw.type].glowPrefix + '0.05)'}
                stroke={TOWERS[tw.type].glowPrefix + '0.28)'}
                strokeWidth={1}
              />
            ))}

            {/* enemies */}
            {state.enemies.map((en) => {
              const px = en.pos.x * w;
              const py = en.pos.y * h;
              const size = en.type === 'whisper' ? 15 : en.type === 'husk' ? 11 : 8;
              const hpPct = Math.max(0, en.health / en.maxHealth);
              return (
                <G key={en.id}>
                  <Ellipse cx={px} cy={py} rx={size} ry={size * 1.15} fill={ENEMY_FILL[en.type]} stroke="rgba(255,255,255,0.5)" strokeWidth={en.type === 'whisper' ? 1.4 : 0.8} />
                  {/* hp bar */}
                  <Rect x={px - size} y={py - size * 1.6} width={size * 2} height={2.5} rx={1} fill="rgba(0,0,0,0.5)" />
                  <Rect x={px - size} y={py - size * 1.6} width={size * 2 * hpPct} height={2.5} rx={1} fill={en.type === 'whisper' ? '#b39be0' : '#e08a8a'} />
                </G>
              );
            })}
          </Svg>

          {/* tower avatars overlaid */}
          {state.towers.map((tw) => (
            <View
              key={tw.id}
              pointerEvents="none"
              style={{ position: 'absolute', left: tw.pos.x * w - 15, top: tw.pos.y * h - 15 }}
            >
              <CharacterAvatar id={tw.type} size={30} borderWidth={2} />
            </View>
          ))}

          {/* floating damage numbers */}
          {state.floaties.map((f) => {
            const age = state.elapsed - f.born;
            return (
              <View
                key={f.id}
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: f.pos.x * w - 18,
                  top: f.pos.y * h - 14 - age * 18,
                  opacity: Math.max(0, 1 - age),
                }}
              >
                <T variant="monoBold" size={f.crit ? 13 : 11} color={f.color} glow={f.crit ? 'rgba(184,146,42,.8)' : undefined}>
                  {f.value}
                </T>
              </View>
            );
          })}

          {/* armed placement hint ring follows nothing but shows range at center */}
          {armed ? (
            <View pointerEvents="none" style={styles.armHint}>
              <T variant="mono" size={9} color={colors.tealSoft} spacing={1}>
                TAP A DARK TILE TO RAISE · {TOWERS[armed].name.toUpperCase()} ({TOWERS[armed].cost})
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
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,194,199,0.28)',
    borderStyle: 'dashed',
    backgroundColor: '#0b1420',
  },
  armHint: {
    position: 'absolute',
    top: 8,
    left: 10,
    right: 10,
    alignItems: 'center',
  },
});
