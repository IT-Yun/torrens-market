import { View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

/**
 * Original vector illustration of Adelaide: the River Torrens in the
 * foreground, city skyline, and the Adelaide Hills behind — the app's
 * namesake scene. Drawn in-house; no third-party assets.
 */
export function AdelaideHero({ width = 320, height = 180 }: { width?: number; height?: number }) {
  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox="0 0 320 180">
        <Defs>
          <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFE9C7" />
            <Stop offset="1" stopColor="#FDF6EA" />
          </LinearGradient>
          <LinearGradient id="river" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#2E9C8C" />
            <Stop offset="1" stopColor="#1B7A6D" />
          </LinearGradient>
        </Defs>

        {/* sky */}
        <Rect x="0" y="0" width="320" height="180" rx="20" fill="url(#sky)" />
        {/* sun */}
        <Circle cx="252" cy="44" r="20" fill="#F4A83D" />
        <Circle cx="252" cy="44" r="28" fill="#F4A83D" opacity="0.25" />

        {/* Adelaide Hills (back range) */}
        <Path
          d="M0 96 Q 40 70 84 88 Q 128 104 168 84 Q 210 64 250 86 Q 290 106 320 90 L320 180 L0 180 Z"
          fill="#9CC3A8"
          opacity="0.7"
        />
        {/* hills (front range) */}
        <Path
          d="M0 112 Q 56 92 108 108 Q 160 122 214 104 Q 268 88 320 108 L320 180 L0 180 Z"
          fill="#6FA98A"
          opacity="0.8"
        />

        {/* city skyline */}
        <Rect x="58" y="86" width="14" height="46" rx="2" fill="#2F4A44" />
        <Rect x="76" y="72" width="18" height="60" rx="2" fill="#3B5B53" />
        <Rect x="98" y="92" width="12" height="40" rx="2" fill="#2F4A44" />
        <Rect x="114" y="80" width="16" height="52" rx="2" fill="#3B5B53" />
        <Rect x="134" y="96" width="12" height="36" rx="2" fill="#2F4A44" />
        {/* windows */}
        <Rect x="80" y="78" width="10" height="3" fill="#FFE9C7" opacity="0.8" />
        <Rect x="80" y="86" width="10" height="3" fill="#FFE9C7" opacity="0.6" />
        <Rect x="118" y="86" width="8" height="3" fill="#FFE9C7" opacity="0.7" />

        {/* River Torrens */}
        <Path d="M0 132 Q 80 122 160 132 Q 240 142 320 130 L320 180 L0 180 Z" fill="url(#river)" />
        {/* river highlights */}
        <Ellipse cx="96" cy="146" rx="26" ry="3" fill="#FFFFFF" opacity="0.25" />
        <Ellipse cx="210" cy="154" rx="34" ry="3.5" fill="#FFFFFF" opacity="0.2" />
        {/* footbridge (Torrens footbridge silhouette) */}
        <Path
          d="M120 132 Q 160 112 200 132"
          stroke="#FFFFFF"
          strokeWidth="3"
          fill="none"
          opacity="0.85"
        />
        <Path d="M126 131 L126 138 M160 122 L160 134 M194 131 L194 138" stroke="#FFFFFF" strokeWidth="2" opacity="0.7" />

        {/* black swan of the Torrens */}
        <Path
          d="M236 150 q -2 -8 4 -10 q 7 -2 7 5 q 0 4 -4 5 l 6 0 q 6 0 5 4 l -16 0 q -3 0 -2 -4 Z"
          fill="#2A2D2E"
        />
        <Circle cx="247" cy="143" r="1" fill="#F4A83D" />
      </Svg>
    </View>
  );
}
