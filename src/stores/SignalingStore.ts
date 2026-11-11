import { makeAutoObservable, runInAction } from 'mobx';
import { AppState, NativeEventSubscription, Platform } from 'react-native';
import RNFS from 'react-native-fs';
import NitroSound, {
  AudioSourceAndroidType,
  type RecordBackType,
} from 'react-native-nitro-sound';
import Sound from 'react-native-sound';
import Torch from 'react-native-torch';
import { FlashlightModes } from '../../constants';
import { FlashlightModeType } from '../types/common-types';
import {
  addReading,
  createSoundSession,
  MeterReadings,
  SoundSession,
} from '../utils/soundLevel';

/**
 * Where the decibel meter's recorder writes. The recorder can only meter
 * while it records to a file, so it gets one throwaway file in the caches
 * directory (never backed up), overwritten each session and deleted on stop.
 * Left to its default, the recorder saves a new timestamped file to Documents
 * every session and nothing ever deletes it.
 */
export const DECIBEL_METER_RECORDING_PATH = `${RNFS.CachesDirectoryPath}/decibel-meter.${
  Platform.OS === 'ios' ? 'm4a' : 'mp4'
}`;

/**
 * What the recorder's readings measure on this platform: average power on
 * iOS, peak amplitude on Android (see `MeterReadings`).
 */
const METER_READINGS: MeterReadings =
  Platform.OS === 'android' ? 'peak' : 'power';

/**
 * Every start and stop of the meter's recorder, in order. The recorder is one
 * native singleton writing to one file, so a start must not reach it while an
 * earlier stop is still releasing it (or deleting that file). This lives at
 * module level, not on the store, because `RootStore.reset()` swaps in a new
 * store while the old one may still be shutting the recorder down.
 *
 * Never rejects: each step's own caller sees its failure.
 */
let meterLifecycle: Promise<void> = Promise.resolve();

/** Runs a recorder step once every earlier one has finished. */
function queueMeterStep(step: () => Promise<void>): Promise<void> {
  const run = meterLifecycle.then(step);
  meterLifecycle = run.catch(() => undefined);
  return run;
}

/** Deletes the meter's throwaway recording, if there is one. */
async function discardMeterRecording(): Promise<void> {
  try {
    if (await RNFS.exists(DECIBEL_METER_RECORDING_PATH)) {
      await RNFS.unlink(DECIBEL_METER_RECORDING_PATH);
    }
  } catch (error) {
    console.warn('Could not delete the decibel meter recording:', error);
  }
}

export class SignalingStore {
  private appStateSubscription: NativeEventSubscription;
  private dotSound: Sound | null = null;
  private dashSound: Sound | null = null;
  private audioLoaded: boolean = false;
  private audioLoading: boolean = false;

  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
    // Keep torch consistent when app state changes (best-effort)
    this.appStateSubscription = AppState.addEventListener(
      'change',
      this.handleAppStateChange,
    );
    // SOS audio files are loaded lazily on first SOS activation to avoid
    // activating the iOS audio session (and interrupting background audio)
    // at app startup.
  }

  /**
   * Ensures the SOS audio session category is claimed and sound files are
   * loaded. Idempotent — safe to call multiple times; the load is only
   * triggered once (`audioLoading` guards against concurrent calls).
   * @private
   */
  private ensureAudioReady() {
    if (this.audioLoaded || this.audioLoading) return;
    this.audioLoading = true;
    Sound.setCategory('Playback');
    this.loadSosAudio();
  }

  /**
   * Loads the SOS audio files (dot and dash beeps).
   * Releases any previously allocated Sound instances before creating new
   * ones to avoid leaking native resources on repeated calls.
   * @private
   */
  private loadSosAudio() {
    // Release any previously allocated sounds before loading fresh instances.
    if (this.dotSound) {
      this.dotSound.release();
      this.dotSound = null;
    }
    if (this.dashSound) {
      this.dashSound.release();
      this.dashSound = null;
    }

    let dotLoaded = false;
    let dashLoaded = false;
    let hasError = false;

    const checkBothLoaded = () => {
      if (hasError) return;
      if (dotLoaded && dashLoaded) {
        this.audioLoaded = true;
        this.audioLoading = false;
      }
    };

    this.dotSound = new Sound('sos_dot.wav', Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.error('Failed to load dot sound:', error);
        hasError = true;
        this.audioLoading = false;
        return;
      }
      dotLoaded = true;
      checkBothLoaded();
    });

    this.dashSound = new Sound('sos_dash.wav', Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.error('Failed to load dash sound:', error);
        hasError = true;
        this.audioLoading = false;
        return;
      }
      dashLoaded = true;
      checkBothLoaded();
    });
  }

  // --------------------------------------------------------------------
  // ===== Flashlight =====
  // --------------------------------------------------------------------
  // Flashlight state management
  flashlightMode: FlashlightModeType[keyof FlashlightModeType] =
    FlashlightModes.OFF;
  private sosTimer: ReturnType<typeof setTimeout> | null = null;
  private isTorchOn: boolean = false;
  private strobeInterval: ReturnType<typeof setInterval> | null = null;
  strobeFrequencyHz: number = 5; // default frequency
  nightvisionBrightness: number = 1.0; // brightness level for nightvision (fixed at 100%)
  sosWithTone: boolean = true; // whether SOS should play an accompanying tone (DEFAULT true)

  /**
   * Sets the flashlight mode to the specified value.
   * If the selected mode is already active, toggles the flashlight off.
   * Otherwise, activates the selected mode.
   *
   * @param mode - The desired flashlight mode. Can be 'off', 'on', 'sos', 'strobe', or 'nightvision'.
   */
  setFlashlightMode(mode: FlashlightModeType[keyof FlashlightModeType]) {
    // Exclusive selection: tapping active mode turns it off
    const next = this.flashlightMode === mode ? FlashlightModes.OFF : mode;
    const changed = next !== this.flashlightMode;
    this.flashlightMode = next;
    if (changed) {
      // Switching between two live modes restarts the clock: the elapsed time
      // describes the mode that is running now, not the session as a whole.
      this.flashlightActiveSince =
        next === FlashlightModes.OFF ? null : Date.now();
    }
    this.applyFlashlightState();
  }

  get isFlashlightOn() {
    return this.flashlightMode === FlashlightModes.ON;
  }

  /**
   * Applies the current flashlight state based on the `flashlightMode` property.
   * Stops any running SOS or strobe patterns before setting the new state.
   *
   * - If `flashlightMode` is `'on'`, turns the torch on.
   * - If `flashlightMode` is `'sos'`, starts the SOS pattern.
   * - If `flashlightMode` is `'strobe'`, starts the strobe pattern.
   * - If `flashlightMode` is `'nightvision'`, torch is turned off (nightvision uses screen only).
   * - For any other value, turns the torch off.
   *
   * @private
   */
  private applyFlashlightState() {
    // Stop any running patterns
    this.stopSOS();
    this.stopStrobe();
    this.stopMorseTransmission();
    // Apply steady on/off
    if (this.flashlightMode === FlashlightModes.ON) {
      this.setTorch(true);
      return;
    }
    if (this.flashlightMode === FlashlightModes.SOS) {
      this.startSOS();
      return;
    }
    if (this.flashlightMode === FlashlightModes.STROBE) {
      this.startStrobe();
      return;
    }
    if (this.flashlightMode === FlashlightModes.NIGHTVISION) {
      // Nightvision mode uses screen only, torch is off
      this.setTorch(false);
      return;
    }
    // Default: off
    this.setTorch(false);
  }

  /**
   * Handles changes in the application's state.
   *
   * If the app returns to the foreground (`state` is `'active'`),
   * this method re-applies the flashlight state to ensure it is set correctly.
   *
   * @param state - The new state of the application (e.g., `'active'`, `'background'`, etc.).
   */
  private handleAppStateChange = (state: string) => {
    // If returning to foreground while flashlight should be on, re-apply.
    if (state === 'active') {
      this.applyFlashlightState();
    }
    // The meter only listens while ColdBoot is on screen. iOS cuts the
    // microphone off in the background anyway (no background audio mode),
    // and Android would otherwise keep recording out of sight.
    if (state === 'background') {
      this.stopDecibelMeter();
    }
  };

  // Low-level torch setter with state tracking
  private setTorch(on: boolean) {
    this.isTorchOn = on;
    Torch.switchState(on);
  }

  // SOS pattern: "... --- ..." in Morse
  // Timing conventions: dot=1 unit, dash=3 units, intra-signal gap=1 unit off,
  // letter gap=3 units off, repetition gap=1000ms off (as requested).
  // Choose unit=200ms for readable pacing.
  private readonly sosUnitMs = 200;

  /**
   * Starts the SOS flashlight signal pattern.
   *
   * This method initiates a repeating sequence that flashes the torch in the Morse code pattern for "SOS":
   * three short flashes (dots), three long flashes (dashes), and three short flashes (dots), with appropriate
   * timing gaps between signals and letters. The sequence repeats with a pause between cycles.
   *
   * If sosWithTone is enabled, audible beep tones accompany the light flashes.
   *
   * If the flashlight mode is changed from 'sos', the sequence stops and the torch is turned off.
   * Any existing SOS pattern is stopped before starting a new one.
   *
   * @private
   */
  private startSOS() {
    this.stopSOS(); // Stop any existing SOS pattern
    // Kick off lazy audio loading when tone is enabled so sounds are ready
    // as soon as possible for the first flash step.
    if (this.sosWithTone) {
      this.ensureAudioReady();
    }
    // Sequence builder: returns array of {on:boolean, ms:number, type:'dot'|'dash'|null}
    const unit = this.sosUnitMs;
    const dot = [
      { on: true, ms: unit, type: 'dot' as const },
      { on: false, ms: unit, type: null },
    ];
    const dash = [
      { on: true, ms: 3 * unit, type: 'dash' as const },
      { on: false, ms: unit, type: null },
    ];
    const letterGap = [{ on: false, ms: 3 * unit, type: null }];

    const S = [...dot, ...dot, ...dot, ...letterGap];
    const O = [...dash, ...dash, ...dash, ...letterGap];
    const sequence = [...S, ...O, ...S];

    const repeatPause = [{ on: false, ms: 1000, type: null }];

    const runOnce = (index: number) => {
      if (this.flashlightMode !== FlashlightModes.SOS) {
        this.setTorch(false);
        return;
      }
      const step = sequence[index] ?? null;
      const nextDelay = step ? step.ms : repeatPause[0].ms;
      const nextOn = step ? step.on : false;
      this.setTorch(nextOn);

      // Play audio tone if sosWithTone is enabled and torch is on
      if (this.sosWithTone && nextOn && step) {
        this.playSosTone(step.type);
      }

      const nextIndex = step
        ? index + 1 < sequence.length
          ? index + 1
          : -1
        : -1;
      this.sosTimer = setTimeout(() => {
        if (nextIndex === -1) {
          // Pause then restart sequence
          this.setTorch(false);
          // Clear current timer before creating a new one
          this.sosTimer = null;
          this.sosTimer = setTimeout(() => runOnce(0), repeatPause[0].ms);
        } else {
          runOnce(nextIndex);
        }
      }, nextDelay);
    };

    // Kick off the sequence
    runOnce(0);
  }

  /**
   * Plays an SOS tone (dot or dash beep).
   * @param type - The type of tone to play ('dot' or 'dash')
   * @private
   */
  private playSosTone(type: 'dot' | 'dash' | null) {
    if (!type) return;
    // Trigger audio loading if it hasn't started yet (e.g. when called from
    // Morse transmission before SOS mode has ever been activated).
    this.ensureAudioReady();
    if (!this.audioLoaded) return;

    const sound = type === 'dot' ? this.dotSound : this.dashSound;
    if (sound) {
      try {
        sound.stop(() => {
          sound.play((success) => {
            if (!success) {
              console.error('Failed to play SOS tone');
            }
          });
        });
      } catch (error) {
        console.error('Error playing SOS tone:', error);
      }
    }
  }

  /**
   * Stops the SOS timer if it is currently active.
   * Clears the timeout, resets the `sosTimer` property to `null`, and stops any playing audio.
   *
   * @private
   */
  private stopSOS() {
    if (this.sosTimer) {
      clearTimeout(this.sosTimer);
      this.sosTimer = null;
    }
    // Stop any playing audio
    if (this.dotSound) {
      this.dotSound.stop();
    }
    if (this.dashSound) {
      this.dashSound.stop();
    }
  }

  // Strobe implementation: toggle torch at `strobeFrequencyHz`
  setStrobeFrequency(hz: number) {
    const clamped = Math.max(1, Math.min(15, Math.round(hz)));
    this.strobeFrequencyHz = clamped;
    if (this.flashlightMode === FlashlightModes.STROBE) {
      // restart strobe at new frequency
      this.startStrobe();
    }
  }

  /**
   * Starts the strobe effect for the torch by toggling its state at a frequency defined by `strobeFrequencyHz`.
   * The strobe interval is calculated to ensure a minimum period of 10ms.
   * If the flashlight mode changes from 'strobe', the strobe effect is stopped automatically.
   * The torch is set to its initial state immediately before starting the interval.
   *
   * @private
   */
  private startStrobe() {
    this.stopStrobe();
    const hz = this.strobeFrequencyHz;
    const periodMs = Math.max(10, Math.floor(1000 / hz / 2));
    let on = false;
    this.setTorch(on); // Set initial state immediately
    this.strobeInterval = setInterval(() => {
      if (this.flashlightMode !== FlashlightModes.STROBE) {
        this.stopStrobe();
        return;
      }
      on = !on;
      this.setTorch(on);
    }, periodMs);
  }

  /**
   * Stops the strobe effect by clearing the strobe interval and resetting its reference.
   * Ensures the torch is turned off unless the flashlight mode is set to steady on.
   */
  private stopStrobe() {
    if (this.strobeInterval) {
      clearInterval(this.strobeInterval);
      this.strobeInterval = null;
    }
    // Ensure torch off when stopping strobe unless steady on is selected
    if (this.flashlightMode !== FlashlightModes.ON) {
      this.setTorch(false);
    }
  }

  // SOS tone toggle
  /**
   * Toggles the SOS tone on or off.
   *
   * @param enabled - Whether the SOS tone should be enabled.
   */
  setSosWithTone(enabled: boolean) {
    this.sosWithTone = enabled;
    // If SOS is currently active and tone is being switched on, start loading
    // audio immediately so tones are available as soon as possible.
    if (enabled && this.flashlightMode === FlashlightModes.SOS) {
      this.ensureAudioReady();
    }
  }

  // --------------------------------------------------------------------
  // ===== Decibel Meter =====
  // --------------------------------------------------------------------
  decibelMeterActive: boolean = false;
  /**
   * The current or last meter session: level, min / average / max, history.
   * In dBFS; the screen converts with the calibration setting. Kept after
   * the meter stops so the results can still be read; cleared by
   * `resetSoundSession` and replaced when the meter starts again.
   */
  soundSession: SoundSession | null = null;

  /**
   * When the currently-running tool started, as a Unix timestamp, or `null`
   * when nothing is running.
   *
   * The active-tool card shows how long a tool has been going ("Running ·
   * 4m 12s"). Elapsed time cannot be derived from `flashlightMode` /
   * `decibelMeterActive` alone, and deriving it in the component would reset
   * the count every time the user navigated away, so the start time belongs
   * to the store that owns the tool's lifecycle.
   */
  flashlightActiveSince: number | null = null;
  decibelMeterActiveSince: number | null = null;

  getActiveSince(kind: 'flashlight' | 'decibel'): number | null {
    return kind === 'decibel'
      ? this.decibelMeterActiveSince
      : this.flashlightActiveSince;
  }

  /**
   * Bumped by every start and stop, so a queued start can tell it has been
   * overtaken (stopped, or stopped and started again) before its turn came.
   */
  private meterGeneration: number = 0;
  /** Whether this store's recorder has started and not been stopped yet. */
  private meterRecorderRunning: boolean = false;
  /** Set by `dispose`; a disposed store never starts the meter again. */
  private disposed: boolean = false;

  /**
   * Starts the decibel meter: records from the microphone with metering on
   * and feeds each reading into a fresh `soundSession`.
   *
   * The store owns the recorder, not the screen, so the meter keeps running
   * when the user navigates away and can be stopped from anywhere (the
   * running-tool card) with the microphone actually released.
   *
   * The meter shows as running straight away; the recorder itself starts
   * once any earlier stop has finished releasing it.
   *
   * Microphone permission must already be granted. Throws if the recorder
   * can't start, leaving the meter stopped.
   */
  async startDecibelMeter(): Promise<void> {
    if (this.decibelMeterActive || this.disposed) {
      return;
    }
    this.setDecibelMeterActive(true);
    this.soundSession = createSoundSession(Date.now(), METER_READINGS);
    const generation = ++this.meterGeneration;

    await queueMeterStep(async () => {
      if (generation !== this.meterGeneration) {
        // Stopped before the recorder got going: nothing to start.
        return;
      }
      try {
        await discardMeterRecording();
        await NitroSound.startRecorder(
          DECIBEL_METER_RECORDING_PATH,
          {
            // Turn off automatic gain and voice processing, which squash loud
            // sounds and lift quiet ones: fine for a voice memo, wrong for a
            // meter.
            AVModeIOS: 'measurement',
            AudioSourceAndroid: AudioSourceAndroidType.VOICE_RECOGNITION,
          },
          true,
        );
        this.meterRecorderRunning = true;
        NitroSound.addRecordBackListener(this.handleMeterReading);
      } catch (error) {
        NitroSound.removeRecordBackListener();
        await discardMeterRecording();
        runInAction(() => {
          // Only undo the state this start set up; if the meter has been
          // stopped (or restarted) since, that state is someone else's.
          if (generation === this.meterGeneration) {
            this.setDecibelMeterActive(false);
            this.soundSession = null;
          }
        });
        throw error;
      }
    });
  }

  /**
   * Stops the decibel meter, releases the microphone and deletes the
   * throwaway recording. Safe to call when the meter isn't running.
   *
   * The meter shows as stopped straight away. The returned promise settles
   * once the recorder is released, including one that was still starting.
   */
  async stopDecibelMeter(): Promise<void> {
    if (!this.decibelMeterActive) {
      return;
    }
    this.setDecibelMeterActive(false);
    this.meterGeneration++;
    await queueMeterStep(this.releaseMeterRecorder);
  }

  private async releaseMeterRecorder(): Promise<void> {
    NitroSound.removeRecordBackListener();
    if (this.meterRecorderRunning) {
      this.meterRecorderRunning = false;
      try {
        await NitroSound.stopRecorder();
      } catch (error) {
        console.warn('Error stopping the decibel meter recorder:', error);
      }
    }
    await discardMeterRecording();
  }

  private handleMeterReading(event: RecordBackType) {
    if (!this.decibelMeterActive || !this.soundSession) {
      return;
    }
    this.soundSession = addReading(
      this.soundSession,
      event.currentMetering,
      Date.now(),
    );
  }

  /**
   * Clears the session's min / average / max and history. If the meter is
   * running, it carries on into a fresh session.
   */
  resetSoundSession() {
    this.soundSession = this.decibelMeterActive
      ? createSoundSession(Date.now())
      : null;
  }

  /**
   * Sets the decibel meter active state. Only the flag: use
   * `startDecibelMeter` / `stopDecibelMeter` to run the recorder.
   * When active, the decibel meter appears in the footer.
   *
   * @param active - Whether the decibel meter should be active.
   */
  setDecibelMeterActive(active: boolean) {
    const changed = active !== this.decibelMeterActive;
    this.decibelMeterActive = active;
    if (changed) {
      this.decibelMeterActiveSince = active ? Date.now() : null;
    }
  }

  // --------------------------------------------------------------------
  // ===== Morse Code Transmission =====
  // --------------------------------------------------------------------
  private morseTimer: ReturnType<typeof setTimeout> | null = null;
  isMorseTransmitting: boolean = false;

  /**
   * Transmits a morse code message using the flashlight and optional sound.
   * Uses the same timing conventions as SOS: dot=1 unit, dash=3 units.
   *
   * @param morseCode - The morse code string (e.g., "... --- ...")
   * @param withTone - Whether to play accompanying audio tones
   */
  transmitMorseMessage(morseCode: string, withTone: boolean) {
    // Stop any other flashlight patterns
    this.stopSOS();
    this.stopStrobe();
    this.stopMorseTransmission();
    runInAction(() => {
      this.isMorseTransmitting = true;
    });

    // Start loading audio early so sounds are ready by the first tone step.
    if (withTone) {
      this.ensureAudioReady();
    }

    const unit = this.sosUnitMs;
    const sequence: Array<{
      on: boolean;
      ms: number;
      type: 'dot' | 'dash' | null;
    }> = [];

    // Parse morse code string into sequence
    const chars = morseCode.split('');
    for (let i = 0; i < chars.length; i++) {
      const char = chars[i];
      const prevChar = i > 0 ? chars[i - 1] : null;
      const nextChar = i < chars.length - 1 ? chars[i + 1] : null;

      if (char === '.') {
        // Dot: on for 1 unit
        sequence.push({ on: true, ms: unit, type: 'dot' });
        sequence.push({ on: false, ms: unit, type: null }); // intra-signal gap
      } else if (char === '-') {
        // Dash: on for 3 units
        sequence.push({ on: true, ms: 3 * unit, type: 'dash' });
        sequence.push({ on: false, ms: unit, type: null }); // intra-signal gap
      } else if (char === ' ') {
        // Skip spaces that are adjacent to '/' to avoid double-counting gaps
        if (prevChar !== '/' && nextChar !== '/') {
          // Space between letters (already has 1 unit gap from last signal)
          // Add 2 more units to make total 3 units
          sequence.push({ on: false, ms: 2 * unit, type: null });
        }
      } else if (char === '/') {
        // Word separator: 7 units total (already has 1 unit gap from last signal)
        // Add 6 more units to make total 7 units
        sequence.push({ on: false, ms: 6 * unit, type: null });
      }
    }

    const runSequence = (index: number) => {
      if (index >= sequence.length) {
        // Sequence complete
        this.setTorch(false);
        runInAction(() => {
          this.isMorseTransmitting = false;
        });
        return;
      }

      const step = sequence[index];
      this.setTorch(step.on);

      // Play audio tone if enabled and torch is on
      if (withTone && step.on && step.type) {
        this.playSosTone(step.type);
      }

      this.morseTimer = setTimeout(() => {
        runSequence(index + 1);
      }, step.ms);
    };

    // Start the sequence
    runSequence(0);
  }

  /**
   * Stops the current morse code transmission.
   */
  stopMorseTransmission() {
    if (this.morseTimer) {
      clearTimeout(this.morseTimer);
      this.morseTimer = null;
    }
    runInAction(() => {
      this.isMorseTransmitting = false;
    });
    this.setTorch(false);
    // Stop any playing audio
    if (this.dotSound) {
      this.dotSound.stop();
    }
    if (this.dashSound) {
      this.dashSound.stop();
    }
  }

  // --------------------------------------------------------------------
  // ==== Cleanup on store disposal ====
  // --------------------------------------------------------------------
  dispose() {
    this.stopSOS();
    this.stopStrobe();
    this.stopMorseTransmission();
    this.appStateSubscription?.remove();
    // Release the microphone, including a recorder that's still starting.
    // The release is queued ahead of anything the replacement store starts,
    // so it can't stop or delete the next session's recording.
    this.disposed = true;
    this.stopDecibelMeter();

    // Release audio resources
    if (this.dotSound) {
      this.dotSound.release();
      this.dotSound = null;
    }
    if (this.dashSound) {
      this.dashSound.release();
      this.dashSound = null;
    }
  }
}
