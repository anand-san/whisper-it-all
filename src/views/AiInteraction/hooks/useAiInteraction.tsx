import { UnlistenFn, listen } from "@tauri-apps/api/event";
import { getCurrentWindow, CloseRequestedEvent } from "@tauri-apps/api/window";
import { useRef, useEffect } from "react";

interface TranscriptionPayload {
  text: string;
}

export type RecorderState = "idle" | "recording" | "transcribing";

export type SendMessageFn = (text: string) => void;
export type SetTranscriptionStatusFn = (isTranscribing: RecorderState) => void;

export default function useAiInteraction() {
  const unlistenTriggerRef = useRef<UnlistenFn | null>(null);
  const unlistenStateRef = useRef<UnlistenFn | null>(null); // Ref for state listener
  const sendMessageRef = useRef<SendMessageFn | null>(null);
  const setTranscriptionStatusRef = useRef<SetTranscriptionStatusFn | null>(
    null
  );

  // Triggered when transcription is ready and message can be sent to AI
  useEffect(() => {
    const appWindow = getCurrentWindow();
    const setupTriggerListener = async () => {
      unlistenTriggerRef.current = await listen<TranscriptionPayload>(
        "trigger_ai_interaction",
        (event) => {
          appWindow.setFocus();
          if (sendMessageRef.current && event.payload.text) {
            sendMessageRef.current(event.payload.text);
          }
        }
      );
    };

    setupTriggerListener();

    return () => {
      if (unlistenTriggerRef.current) {
        unlistenTriggerRef.current();
        unlistenTriggerRef.current = null;
      }
    };
  }, []);

  // Triggered when the state of the recorder changes
  useEffect(() => {
    const setupStateListener = async () => {
      unlistenStateRef.current = await listen<RecorderState>(
        "state_changed",
        (event) => {
          if (setTranscriptionStatusRef.current) {
            setTranscriptionStatusRef.current(event.payload);
          }
        }
      );
    };

    setupStateListener();

    return () => {
      if (unlistenStateRef.current) {
        unlistenStateRef.current();
        unlistenStateRef.current = null;
      }
    };
  }, []);

  // Triggered when user closes the window manually
  // We prevent window close and just hide it so that user can use the shortcut next time
  useEffect(() => {
    const appWindow = getCurrentWindow();
    let unlistenClose: (() => void) | null = null;

    const setupCloseListener = async () => {
      unlistenClose = await appWindow.onCloseRequested(
        async (event: CloseRequestedEvent) => {
          console.log(
            "Close requested for AI Interaction window, hiding instead."
          );
          event.preventDefault();
          await appWindow.hide();
        }
      );
    };

    setupCloseListener();

    return () => {
      if (unlistenClose) {
        console.log(
          "Cleaning up close request listener for AI Interaction window."
        );
        unlistenClose();
      }
    };
  }, []);

  return {
    sendMessageRef,
    setTranscriptionStatusRef,
  };
}
