/**
 * Checks the radio reference table against the FCC rules it cites
 * (47 CFR Part 95, and 97.301 for amateur privileges). See `metadata.sources`
 * in the data file.
 */
import radioFrequencies from '../src/data/radioFrequencies.json';

const { frequencies } = radioFrequencies;
const mhz = (f: string) => Number(f.replace(' MHz', ''));
const byName = (
  channels: { name: string; frequency: string; notes?: string }[],
  name: string,
) => channels.find((c) => c.name === name);

describe('radioFrequencies.json', () => {
  it('lists each frequency once per service', () => {
    Object.values(frequencies).forEach((service) => {
      const freqs = service.channels.map((c) => c.frequency);
      expect(new Set(freqs).size).toBe(freqs.length);
    });
  });

  it('cites its sources', () => {
    expect(radioFrequencies.metadata.sources.length).toBeGreaterThan(0);
  });

  describe('HAM', () => {
    const { channels, licenseInfo } = frequencies.HAM;

    it('has the national 2 m simplex calling frequency', () => {
      expect(byName(channels, '2m FM Simplex Calling')?.frequency).toBe(
        '146.520 MHz',
      );
    });

    it('says 10 m FM is beyond Technician privileges', () => {
      const tenMetre = channels.find((c) => c.frequency === '29.600 MHz');
      expect(tenMetre?.notes).toMatch(/General/);
      expect(licenseInfo).toMatch(/29\.600 MHz needs General/);
    });
  });

  describe('CB', () => {
    const { channels } = frequencies.CB;

    it('reserves channel 9 for emergencies and traveler assistance', () => {
      const nine = byName(channels, 'Channel 9');
      expect(nine?.frequency).toBe('27.065 MHz');
      expect(nine?.notes).toMatch(/emergenc/i);
      expect(nine?.notes).toMatch(/FCC rule/);
    });

    it('labels every other channel use as a convention', () => {
      channels
        .filter((c) => c.name !== 'Channel 9')
        .forEach((c) => expect(c.notes).toMatch(/\(convention\)$/));
    });

    it('keeps every channel inside the 40-channel band', () => {
      channels.forEach((c) => {
        expect(mhz(c.frequency)).toBeGreaterThanOrEqual(26.965);
        expect(mhz(c.frequency)).toBeLessThanOrEqual(27.405);
      });
    });
  });

  describe('GMRS', () => {
    const { channels } = frequencies.GMRS;
    const mains = channels.filter((c) => c.name.endsWith('R'));

    it('lists all eight repeater channels, 15R to 22R', () => {
      expect(mains.map((c) => c.name)).toEqual(
        [15, 16, 17, 18, 19, 20, 21, 22].map((n) => `Channel ${n} / ${n}R`),
      );
    });

    it('gives each repeater an input 5 MHz above its output', () => {
      mains.forEach((c) => {
        const input = (mhz(c.frequency) + 5).toFixed(3);
        expect(c.notes).toContain(`input ${input} MHz`);
      });
    });

    it('calls the channel 20 travel tone a convention', () => {
      const twenty = byName(mains, 'Channel 20 / 20R');
      expect(twenty?.notes).toMatch(/141\.3 Hz/);
      expect(twenty?.notes).toMatch(/not an FCC rule/);
      mains
        .filter((c) => c !== twenty)
        .forEach((c) => expect(c.notes).not.toMatch(/travel/i));
    });
  });

  describe('FRS', () => {
    const { channels } = frequencies.FRS;

    it('has channels 1 to 22, in order', () => {
      expect(channels.map((c) => c.name)).toEqual(
        Array.from({ length: 22 }, (_, i) => `Channel ${i + 1}`),
      );
    });

    it('limits 8–14 to 0.5 W and shares every channel with GMRS', () => {
      channels.forEach((c, i) => {
        const n = i + 1;
        expect(c.notes).toMatch(n >= 8 && n <= 14 ? /^0\.5W/ : /^2W/);
        expect(c.notes).toMatch(/Shared with GMRS/);
      });
    });

    it('matches GMRS on the shared simplex channels', () => {
      const gmrs = frequencies.GMRS.channels;
      expect(byName(gmrs, 'Channel 1 (Simplex)')?.frequency).toBe(
        channels[0].frequency,
      );
      expect(byName(gmrs, 'Channel 15 / 15R')?.frequency).toBe(
        channels[14].frequency,
      );
    });
  });

  describe('MURS', () => {
    const { channels, licenseInfo } = frequencies.MURS;

    it('has the five MURS channels', () => {
      expect(channels.map((c) => c.frequency)).toEqual([
        '151.820 MHz',
        '151.880 MHz',
        '151.940 MHz',
        '154.570 MHz',
        '154.600 MHz',
      ]);
    });

    it('puts Blue Dot and Green Dot on 154.570 and 154.600 only', () => {
      const dotted = channels.filter((c) => /Dot/.test(c.name));
      expect(dotted.map((c) => [c.name, c.frequency])).toEqual([
        ['Channel 4 (Blue Dot)', '154.570 MHz'],
        ['Channel 5 (Green Dot)', '154.600 MHz'],
      ]);
    });

    it('uses 11.25 kHz on the 151 MHz channels and 20 kHz on the 154s', () => {
      channels.forEach((c) => {
        expect(c.mode).toContain(
          mhz(c.frequency) < 154 ? '11.25 kHz' : '20 kHz',
        );
      });
    });

    it('notes that repeaters are not allowed', () => {
      expect(licenseInfo).toMatch(/Repeaters are not allowed/);
    });
  });
});
