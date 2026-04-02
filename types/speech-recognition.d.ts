// Make this file included by TS (it will be if it's inside your project and not excluded)

export {};

declare global {
    interface Window {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
    }

    type SpeechRecognitionConstructor = new () => SpeechRecognition;

    interface SpeechRecognition extends EventTarget {
        continuous: boolean;
        interimResults: boolean;
        lang: string;

        onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => unknown) | null;
        onend: ((this: SpeechRecognition, ev: Event) => unknown) | null;
        onerror: ((this: SpeechRecognition, ev: Event) => unknown) | null;

        start(): void;
        stop(): void;
        abort(): void;
    }

    interface SpeechRecognitionAlternative {
        transcript: string;
        confidence: number;
    }

    interface SpeechRecognitionResult {
        readonly isFinal: boolean;
        readonly length: number;
        item(index: number): SpeechRecognitionAlternative;
        [index: number]: SpeechRecognitionAlternative;
    }

    interface SpeechRecognitionResultList {
        readonly length: number;
        item(index: number): SpeechRecognitionResult;
        [index: number]: SpeechRecognitionResult;
    }

    interface SpeechRecognitionEvent extends Event {
        readonly resultIndex: number;
        readonly results: SpeechRecognitionResultList;
    }
}