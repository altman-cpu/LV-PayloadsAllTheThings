import { Component, OnInit, OnDestroy, ViewChild, ElementRef, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from './services/api.service';
import { ArenaWebSpeech, ARENA_WEB_SPEECH_VERSION } from './voice/arena-web-speech';

@Component({
  selector: 'gen-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
})
export class AppComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  voice = new ArenaWebSpeech();
  speechVersion = ARENA_WEB_SPEECH_VERSION;

  health: any = null;
  identity: any = null;
  tor: any = null;
  connectors: any[] = [];
  voiceStatus: any = null;
  entropy: any = null;

  // Checker
  targetUrl = 'https://example.com';
  viaTor = false;
  method = 'HEAD';
  checkResult: any = null;
  checkError = '';
  checking = false;

  // Voice
  speakText = 'GENESIS handshake. Genesis Tencen Sintra. Angular Force 1. Anonymous, allowlisted, end to end.';
  rate = 1; pitch = 1; volume = 1;
  voiceNames: string[] = [];
  selectedVoice = '';
  speaking = false;
  listening = false;
  transcript = '';
  voiceError = '';
  recordings: { url: string; filename: string }[] = [];
  recording = false;
  micLive = false;
  private stopListen: (() => void) | null = null;
  private micStop: (() => void) | null = null;
  private poll: any = null;

  @ViewChild('radar') radar?: ElementRef<HTMLCanvasElement>;
  @ViewChild('freq') freq?: ElementRef<HTMLCanvasElement>;
  private analyser: AnalyserNode | null = null;
  private raf = 0;
  sweep = 0;
  log: string[] = [];

  bashCommand = signal('');

  ngOnInit() {
    this.sayLog('GENESIS console booting — Angular Force 1');
    this.api.health().subscribe({ next: (v) => { this.health = v; this.sayLog('Backend health OK'); }, error: () => this.sayLog('Backend not reachable yet — start it with ./run.sh') });
    this.api.identity().subscribe({
      next: (v) => {
        this.identity = v;
        this.bashCommand.set(`bash genesis handshake --id "${v.handshake}" --as "${v.displayName}"`);
        this.sayLog(`Identity handshake: ${v.handshake}`);
      },
    });
    this.refreshTor(); this.refreshConnectors();
    this.api.voiceStatus().subscribe({ next: (v) => (this.voiceStatus = v) });
    this.api.entropy().subscribe({ next: (v) => (this.entropy = v) });
    this.voiceNames = this.voice.voices().map((v) => v.name);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => { this.voiceNames = this.voice.voices().map((v) => v.name); };
    }
    this.poll = setInterval(() => {
      this.api.entropy().subscribe({ next: (v) => (this.entropy = v) });
      this.drawRadar();
    }, 2500);
    setTimeout(() => this.drawRadar(), 300);
    this.animateFreq();
  }

  ngOnDestroy() { clearInterval(this.poll); cancelAnimationFrame(this.raf); this.micStop?.(); }

  sayLog(m: string) { this.log = [`${new Date().toLocaleTimeString()}  ${m}`, ...this.log].slice(0, 40); }

  refreshTor() { this.api.torStatus().subscribe({ next: (v) => { this.tor = v; this.sayLog(`Tor: ${v.mode}`); } }); }
  refreshConnectors() { this.api.connectors().subscribe({ next: (v) => (this.connectors = v.connectors || []) }); }

  runCheck() {
    this.checking = true; this.checkError = ''; this.checkResult = null;
    this.api.check({ url: this.targetUrl, viaTor: this.viaTor, method: this.method }).subscribe({
      next: (v) => { this.checkResult = v; this.checking = false; this.sayLog(`Check ${v.status} in ${v.ms}ms — ${this.targetUrl}${this.viaTor ? ' via Tor' : ''}`); },
      error: (e) => { this.checkError = e?.error?.error || 'Check failed'; this.checking = false; this.sayLog(`Check blocked/failed: ${this.checkError}`); },
    });
  }

  speakHandshake() {
    const text = this.identity?.handshakePhrase || this.speakText;
    this.doSpeak(text);
  }
  doSpeak(text = this.speakText) {
    this.voiceError = '';
    this.speaking = true;
    const ok = this.voice.speak(text, { rate: this.rate, pitch: this.pitch, volume: this.volume, voiceName: this.selectedVoice || undefined }, () => (this.speaking = false));
    if (!ok) { this.speaking = false; this.voiceError = 'Web Speech synthesis is not available in this browser. The Grok server route is ready when XAI_API_KEY is set — see Voice panel status.'; }
    else this.sayLog(`Speaking (rate ${this.rate}, pitch ${this.pitch}): ${text.slice(0, 70)}…`);
  }
  stopSpeak() { this.voice.stopSpeaking(); this.speaking = false; }

  toggleListen() {
    if (this.listening) { this.stopListen?.(); this.listening = false; return; }
    this.voiceError = '';
    this.stopListen = this.voice.listen(
      (t) => { this.transcript = t; this.speakText = t; },
      (e) => { this.voiceError = e; this.listening = false; },
    );
    this.listening = Boolean(this.stopListen);
  }

  async toggleRecording() {
    if (this.recording) {
      const out = await this.voice.stopRecording(`bash-genesis-${Date.now()}.webm`);
      if (out) { this.recordings = [out, ...this.recordings]; this.sayLog(`Recording compiled: ${out.filename}`); }
      this.recording = false; return;
    }
    try { this.recording = await this.voice.startRecording(); this.sayLog('Recording your own handshake line — mic is opt-in, only you.'); }
    catch { this.voiceError = 'Microphone permission was not granted — recording stays off.'; }
  }

  async toggleMic() {
    if (this.micLive) { this.micStop?.(); this.analyser = null; this.micLive = false; return; }
    try {
      const m = await this.voice.micAnalyser();
      if (m) { this.analyser = m.analyser; this.micStop = m.stop; this.micLive = true; }
    } catch { this.voiceError = 'Microphone permission was not granted — frequency visualiser stays off.'; }
  }

  drawRadar() {
    const c = this.radar?.nativeElement; if (!c) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    const { width: w, height: h } = c; const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2 - 8;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(125,211,252,.35)';
    for (const f of [0.33, 0.66, 1]) { ctx.beginPath(); ctx.arc(cx, cy, r * f, 0, Math.PI * 2); ctx.stroke(); }
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); ctx.stroke(); }
    // Entropy-driven blips — system surroundings (entropy + Tor state), never people.
    const seed = String(this.entropy?.hex || 'genesis');
    for (let i = 0; i < 18; i++) {
      const a = (parseInt(seed.slice(i * 2, i * 2 + 2) || '7f', 16) / 255) * Math.PI * 2;
      const d = ((i * 37) % 90 + 10) / 100 * r;
      ctx.fillStyle = i % 5 ? 'rgba(52,211,153,.9)' : 'rgba(251,191,36,.95)';
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 3, 0, Math.PI * 2); ctx.fill();
    }
    this.sweep += 0.4;
    const a = this.sweep % (Math.PI * 2);
    const g = ctx.createConicGradient ? ctx.createConicGradient(a, cx, cy) : null;
    if (g) { g.addColorStop(0, 'rgba(56,189,248,.45)'); g.addColorStop(0.12, 'rgba(56,189,248,0)'); g.addColorStop(1, 'rgba(56,189,248,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, a - 0.5, a); ctx.fill(); }
    ctx.fillStyle = '#e0f2fe'; ctx.font = '11px system-ui';
    ctx.fillText(`360° surroundings · entropy mean ${this.entropy?.mean ?? '—'} · Tor ${this.tor?.listening ? 'ON' : 'direct'}`, 10, h - 10);
  }

  animateFreq() {
    const draw = () => {
      const c = this.freq?.nativeElement;
      if (c) {
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, c.width, c.height);
          const bars = 48;
          let data: Uint8Array | null = null;
          if (this.analyser) { data = new Uint8Array(this.analyser.frequencyBinCount); this.analyser.getByteFrequencyData(data); }
          for (let i = 0; i < bars; i++) {
            const v = data ? data[Math.floor(i * data.length / bars)] / 255 : Math.abs(Math.sin(Date.now() / 500 + i)) * (this.speaking ? 0.7 : 0.12);
            ctx.fillStyle = `hsl(${190 + i * 2} 90% ${45 + v * 25}%)`;
            ctx.fillRect(i * (c.width / bars), c.height - v * c.height, c.width / bars - 2, v * c.height);
          }
        }
      }
      this.raf = requestAnimationFrame(draw);
    };
    draw();
  }

  copyBash() { navigator.clipboard?.writeText(this.bashCommand()); this.sayLog('Copied: ' + this.bashCommand()); }
  json(v: any) { return JSON.stringify(v, null, 2); }
}
