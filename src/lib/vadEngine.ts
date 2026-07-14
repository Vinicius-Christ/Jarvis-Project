/**
 * vadEngine.ts — Frontend Voice Activity Detection
 * 
 * Uses @ricky0123/vad-web (Silero VAD ONNX wrapper) to detect when the
 * user starts and stops speaking strictly locally on the client.
 */

import { MicVAD, utils } from "@ricky0123/vad-web";

export interface VADOptions {
    onSpeechStart: () => void;
    onSpeechEnd: (audioPayload: ArrayBuffer) => void;
    onVADMisfire?: () => void;
    positiveSpeechThreshold?: number;
    negativeSpeechThreshold?: number;
    redemptionFrames?: number;
    preSpeechPadFrames?: number;
    minSpeechFrames?: number;
}

export class VADEngine {
    private vadInstance: MicVAD | null = null;
    private options: VADOptions;

    constructor(options: VADOptions) {
        this.options = options;
    }

    public async init() {
        try {
            this.vadInstance = await MicVAD.new({
                onSpeechStart: () => {
                    this.options.onSpeechStart();
                },
                onSpeechEnd: (audio: Float32Array) => {
                    // VAD provides raw Float32Array PCM samples at 16000Hz.
                    // Convert to WAV buffer for backend Whisper STT
                    const wavBuffer = utils.encodeWAV(audio);
                    this.options.onSpeechEnd(wavBuffer);
                },
                onVADMisfire: () => {
                    if (this.options.onVADMisfire) {
                        this.options.onVADMisfire();
                    }
                },
                positiveSpeechThreshold: this.options.positiveSpeechThreshold ?? 0.8,
                negativeSpeechThreshold: this.options.negativeSpeechThreshold ?? 0.8 - 0.15,
                redemptionFrames: this.options.redemptionFrames ?? 30, // Default is usually around ~1 second of silence
                preSpeechPadFrames: this.options.preSpeechPadFrames ?? 1,
                minSpeechFrames: this.options.minSpeechFrames ?? 5,
                // @ts-ignore - Some bundlers might need specific base URLs depending on vite serving
                workletURL: "/vad.worklet.bundle.min.js",
                modelURL: "/silero_vad.onnx",
            });
            console.log("[VAD Engine] Silero VAD Initialized");
        } catch (err) {
            console.error("[VAD Engine] Initialization failed:", err);
            throw err;
        }
    }

    public start() {
        if (this.vadInstance) {
            this.vadInstance.start();
            console.log("[VAD Engine] Started listening");
        }
    }

    public pause() {
        if (this.vadInstance) {
            this.vadInstance.pause();
            console.log("[VAD Engine] Paused listening");
        }
    }

    public destroy() {
        if (this.vadInstance) {
            this.vadInstance.destroy();
            this.vadInstance = null;
            console.log("[VAD Engine] Destroyed");
        }
    }
}
