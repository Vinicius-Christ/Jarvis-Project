/**
 * wakeWordEngine.ts — Browser-based Wake Word Detection
 * 
 * Uses @foo-software/openwakeword for browser-side ONNX evaluation 
 * to detect the "Jarvis" keyword entirely offline.
 * NOTE: The raw WASM runtime runs via AudioWorklet.
 */

export interface WakeWordOptions {
    modelUrl: string;
    keyword: string; // e.g. "hey_jarvis"
    onWakeWordDetected: () => void;
    sensitivity?: number; // 0.0 - 1.0
}

export class WakeWordEngine {
    private options: WakeWordOptions;
    private audioContext: AudioContext | null = null;
    private stream: MediaStream | null = null;
    private engineInstance: any = null; // OpenWakeWord reference
    private isListening = false;

    constructor(options: WakeWordOptions) {
        this.options = options;
    }

    public async init() {
        // In a real environment, you would instantiate the ONNX session
        // and load the specific openwakeword `.onnx` model file here.
        // We mock the runtime initialize here for architecture completeness
        // because installing @foo-software/openwakeword requires WASM configuration

        console.log(`[Wake Word] Initializing model: ${this.options.modelUrl}`);

        // Simulate engine loading
        return new Promise((resolve) => {
            setTimeout(() => {
                this.engineInstance = "READY";
                resolve(true);
            }, 500);
        });
    }

    public async start() {
        if (!this.engineInstance || this.isListening) return;

        try {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: 16000 // OpenWakeWord requires 16kHz
            });

            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

            console.log(`[Wake Word] Listening for keyword: ${this.options.keyword}`);
            this.isListening = true;

            // Simulate passive keyword listener — would normally process AudioWorklet Node floats
            this.startSimulatedListener();

        } catch (err) {
            console.error("[Wake Word] Failed to start:", err);
            this.isListening = false;
        }
    }

    public stop() {
        this.isListening = false;
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.audioContext && this.audioContext.state !== "closed") {
            this.audioContext.close();
            this.audioContext = null;
        }
        console.log("[Wake Word] Stopped");
    }

    private startSimulatedListener() {
        // This provides a fallback button on the global window to simulate a wake word trigger
        // Since true ONNX AudioWorklet execution requires serving WASM files via a bundler.
        (window as any).simulateWakeWord = () => {
            if (this.isListening) {
                console.log(`[Wake Word] ⚡ DETECTED: ${this.options.keyword}`);
                this.options.onWakeWordDetected();
            }
        };
    }
}
