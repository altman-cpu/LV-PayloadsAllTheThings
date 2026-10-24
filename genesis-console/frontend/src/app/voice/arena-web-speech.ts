/**
 * @arena-ai/agents-web-speech — v0.0.1 (vendored)
 * ------------------------------------------------
 * Installed as a local, version-pinned library because this exact package
 * name is not published on npm — vendoring keeps v0.0.1 reproducible and
 * offline-safe instead of pretending an npm install succeeded.
 *
 * Adaptive like a transport layer (not Tor itself — it does not route or
 * anonymise network traffic): it adapts to whatever the browser actually
 * supports — synthesis → recognition → recording → silent text fallback —
 * and adjusts voice frequency (rate/pitch) on the fly.
 *
 * Defensive by design: voice is ONLY for the operator in front of this
 * console, with explicit mic permission. It never records, follows, or
 * broadcasts other people, and it has no harassment feature.
 */

export interface VoiceSettings { rate: number; pitch: number; volume: number; voiceName?: string }

export const ARENA_WEB_SPEECH_VERSION = '0.0.1';

export class ArenaWebSpeech {
  readonly version = ARENA_WEB_SPEECH_VERSION;
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];

  get synthesisSupported() { return typeof window !== 'undefined' && 'speechSynthesis' in window; }
  get recognitionSupported() {
    return typeof window !== 'undefined' && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
  }

  voices(): SpeechSynthesisVoice[] {
    return this.synthesisSupported ? window.speechSynthesis.getVoices() : [];
  }

  speak(text: string, s: VoiceSettings, onEnd?: () => void): boolean {
    if (!this.synthesisSupported) return false;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = s.rate; u.pitch = s.pitch; u.volume = s.volume;
    const v = this.voices().find((x) => x.name === s.voiceName);
    if (v) u.voice = v;
    if (onEnd) u.onend = onEnd;
    window.speechSynthesis.speak(u);
    return true;
  }

  stopSpeaking() { if (this.synthesisSupported) window.speechSynthesis.cancel(); }

  listen(onText: (t: string) => void, onError?: (e: string) => void): (() => void) | null {
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Ctor) { onError?.('Speech recognition not supported in this browser — type instead.'); return null; }
    const rec = new Ctor();
    rec.lang = 'en-US'; rec.interimResults = true; rec.continuous = false;
    rec.onresult = (ev: any) => {
      const text = Array.from(ev.results).map((r: any) => r[0].transcript).join(' ');
      onText(text);
    };
    rec.onerror = (ev: any) => onError?.(String(ev?.error || 'recognition error'));
    rec.start();
    return () => { try { rec.stop(); } catch { /* noop */ } };
  }

  /** Compile a recording of the operator's own `bash genesis …` line. Mic is opt-in only. */
  async startRecording(): Promise<boolean> {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return false;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.chunks = [];
    this.recorder = new MediaRecorder(stream);
    this.recorder.ondataavailable = (e) => { if (e.data.size) this.chunks.push(e.data); };
    this.recorder.start();
    return true;
  }

  stopRecording(filename = 'bash-genesis-handshake.webm'): Promise<{ url: string; filename: string; blob: Blob } | null> {
    return new Promise((resolve) => {
      if (!this.recorder) return resolve(null);
      this.recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.recorder?.mimeType || 'audio/webm' });
        resolve({ url: URL.createObjectURL(blob), filename, blob });
        this.recorder?.stream.getTracks().forEach((t) => t.stop());
        this.recorder = null;
      };
      this.recorder.stop();
    });
  }

  /** Live frequency data for the visualiser (operator's mic only, opt-in). */
  async micAnalyser(): Promise<{ analyser: AnalyserNode; stop: () => void } | null> {
    if (!navigator.mediaDevices?.getUserMedia) return null;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    return { analyser, stop: () => { stream.getTracks().forEach((t) => t.stop()); ctx.close(); } };
  }
}
