/**
 * @format
 */

import React from 'react';
import { Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import {
  AIR_ACKNOWLEDGEMENT,
  GROUND_TO_AIR_SIGNALS,
  ICAO_GROUND_SIGNALS,
  OLDER_GROUND_SIGNALS,
} from '../src/screens/SignalMirror/data';
import GroundToAirSignalsScreen from '../src/screens/SignalMirror/GroundToAirSignalsScreen';

jest.mock('react-native-vector-icons/Ionicons', () => 'Ionicons');

jest.mock('../src/components/ScaledText', () => ({
  Text: require('react-native').Text,
}));

jest.mock('../src/hooks/useTheme', () => ({
  useTheme: () => require('../src/theme/colors').LIGHT_COLORS,
}));

jest.mock('../src/components/StackScreen', () => {
  const { Text: MockText, View: MockView } = require('react-native');
  return ({
    title,
    note,
    children,
  }: {
    title: string;
    note?: string;
    children: React.ReactNode;
  }) => (
    <MockView>
      <MockText>{title}</MockText>
      {note ? <MockText>{note}</MockText> : null}
      {children}
    </MockView>
  );
});

const find = (symbol: string) =>
  GROUND_TO_AIR_SIGNALS.find((s) => s.symbol === symbol);

describe('GroundToAirSignals', () => {
  describe('GROUND_TO_AIR_SIGNALS', () => {
    it('every signal should have required fields', () => {
      GROUND_TO_AIR_SIGNALS.forEach((signal) => {
        expect(signal.symbol.length).toBeGreaterThan(0);
        expect(signal.meaning.length).toBeGreaterThan(0);
        expect(signal.minSize.length).toBeGreaterThan(0);
        expect(signal.materials.length).toBeGreaterThan(0);
        expect(['icao', 'older']).toContain(signal.code);
      });
    });

    it('has no duplicate symbols', () => {
      const symbols = GROUND_TO_AIR_SIGNALS.map((s) => s.symbol);
      expect(new Set(symbols).size).toBe(symbols.length);
    });

    it('lists the ICAO code first, then the older code', () => {
      expect(GROUND_TO_AIR_SIGNALS).toEqual([
        ...ICAO_GROUND_SIGNALS,
        ...OLDER_GROUND_SIGNALS,
      ]);
    });

    it('ICAO set is exactly the Annex 12 survivors’ code', () => {
      expect(ICAO_GROUND_SIGNALS.map((s) => s.symbol)).toEqual([
        'V',
        'X',
        'N',
        'Y',
        '→',
      ]);
    });

    it('V means assistance and X means medical assistance', () => {
      expect(find('V')?.meaning).toMatch(/assist/i);
      expect(find('V')?.meaning).not.toMatch(/medical/i);
      expect(find('X')?.meaning).toMatch(/medical/i);
    });

    it('N and Y are no and yes', () => {
      expect(find('N')?.meaning).toMatch(/^no\b/i);
      expect(find('Y')?.meaning).toMatch(/^yes\b/i);
    });

    it('keeps the older code with its original meanings', () => {
      expect(OLDER_GROUND_SIGNALS.map((s) => s.symbol)).toEqual([
        'F',
        'K',
        '△',
        'LL',
        'JL',
      ]);
      expect(find('△')?.meaning).toMatch(/probably/i);
      expect(find('LL')?.meaning).toMatch(/well/i);
      expect(find('JL')?.meaning).toMatch(/not understood/i);
    });

    it('uses the ICAO minimum size of 2.5 m (8 ft)', () => {
      GROUND_TO_AIR_SIGNALS.forEach((signal) => {
        expect(signal.minSize).toMatch(/2\.5 m \(8 ft\)/);
      });
    });
  });

  it('describes how a pilot acknowledges by day and by night', () => {
    expect(AIR_ACKNOWLEDGEMENT).toMatch(/rock/i);
    expect(AIR_ACKNOWLEDGEMENT).toMatch(/twice/i);
    expect(AIR_ACKNOWLEDGEMENT).toMatch(/not understood/i);
  });

  describe('GroundToAirSignalsScreen', () => {
    const texts = () => {
      let tree!: ReactTestRenderer.ReactTestRenderer;
      ReactTestRenderer.act(() => {
        tree = ReactTestRenderer.create(<GroundToAirSignalsScreen />);
      });
      return tree.root.findAllByType(Text).map((t) => {
        const c = t.props.children;
        return Array.isArray(c) ? c.join('') : String(c);
      });
    };

    it('groups the symbols under the ICAO and older code labels', () => {
      const all = texts();
      const icao = all.indexOf('INTERNATIONAL CODE (ICAO)');
      const older = all.indexOf('OLDER CODE');
      expect(icao).toBeGreaterThan(-1);
      expect(older).toBeGreaterThan(icao);
      expect(all.indexOf('→')).toBeGreaterThan(icao);
      expect(all.indexOf('→')).toBeLessThan(older);
      expect(all.indexOf('JL')).toBeGreaterThan(older);
    });

    it('states the 2.5 m minimum and the pilot acknowledgement', () => {
      const all = texts();
      expect(all.some((t) => t.includes('2.5 m (8 ft)'))).toBe(true);
      expect(all).toContain(AIR_ACKNOWLEDGEMENT);
    });
  });
});
