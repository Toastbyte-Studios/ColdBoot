import { observer } from 'mobx-react-lite';
import React, { createContext, useContext } from 'react';
import {
  Text as RNText,
  TextProps,
  TextStyle,
  useColorScheme,
} from 'react-native';
import { getColorSchemeForThemeMode } from '../hooks/useTheme';
import { useSettingsStore } from '../stores';

/**
 * True inside another `Text`. A nested `Text` inherits its parent's colour, so
 * it must not apply the default ink or it would override that inheritance —
 * e.g. a bold span inside an accent-coloured sentence would turn back to ink.
 */
const TextNestingContext = createContext(false);

/**
 * Custom Text component that automatically scales font size based on user
 * settings, and defaults its colour to the theme's ink.
 *
 * Font size: applies the font scale from the SettingsStore to any fontSize
 * styles.
 *
 * Colour: React Native's `Text` has no theme, so a label without an explicit
 * `color` renders the platform default (black on iOS) — readable on the light
 * scheme and near-invisible on the dark one. Top-level `Text` therefore starts
 * from `PRIMARY_DARK`, which inverts with the scheme. Any `color` in `style`
 * still wins, because the default is placed first in the style array.
 */
export const Text = observer((props: TextProps) => {
  const settingsStore = useSettingsStore();
  const systemColorScheme = useColorScheme();
  const isNested = useContext(TextNestingContext);
  const { style, ...otherProps } = props;

  // Apply font scaling to any numeric fontSize in the style (supports objects and arrays)
  let scaledStyle: TextProps['style'] = style;
  if (style != null) {
    const scale = settingsStore.fontScale;

    const scaleFontInStyleObject = (styleObj: TextStyle | false | '') => {
      if (!styleObj || typeof styleObj !== 'object') {
        return styleObj;
      }
      if (typeof styleObj.fontSize === 'number') {
        return {
          ...styleObj,
          fontSize: styleObj.fontSize * scale,
        };
      }
      return styleObj;
    };

    if (Array.isArray(style)) {
      scaledStyle = style.map((item) => {
        // Preserve registered style IDs (numbers), nullish values, and nested arrays
        if (typeof item === 'number' || item == null || Array.isArray(item)) {
          return item;
        }
        return scaleFontInStyleObject(item as TextStyle | false | '');
      }) as TextProps['style'];
    } else if (typeof style === 'number') {
      // Registered style ID; cannot safely inspect or modify
      scaledStyle = style;
    } else {
      scaledStyle = scaleFontInStyleObject(style);
    }
  }

  // Reading themeMode here is tracked by `observer`, so a theme switch
  // re-renders every Text without each one holding its own reaction.
  const finalStyle: TextProps['style'] = isNested
    ? scaledStyle
    : [
        {
          color: getColorSchemeForThemeMode(
            settingsStore.themeMode,
            systemColorScheme,
          ).PRIMARY_DARK,
        },
        scaledStyle,
      ];

  return (
    <TextNestingContext.Provider value={true}>
      <RNText {...otherProps} style={finalStyle} />
    </TextNestingContext.Provider>
  );
});
