import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useVercelUseChatRuntime } from "@assistant-ui/react-ai-sdk";
import { Thread } from "./assistant-ui/thread";
import { ThreadList } from "./assistant-ui/thread-list";
import { useChat } from "@ai-sdk/react";
import { MutableRefObject, useEffect, useState } from "react";
import { useModelSelection } from "./context/ModelSelectionContext";
import {
  Sidebar,
  SidebarContent,
  SidebarProvider,
  SidebarTrigger,
  SidebarHeader,
} from "../../components/ui/sidebar";
import { MessagesSquare } from "lucide-react";
import {
  RecorderState,
  SendMessageFn,
  SetTranscriptionStatusFn,
} from "./hooks/useAiInteraction";

interface AssistantProps {
  sendMessageRef: MutableRefObject<SendMessageFn | null>;
  setTranscriptionStatusRef: MutableRefObject<SetTranscriptionStatusFn | null>;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
export const Assistant = ({
  sendMessageRef,
  setTranscriptionStatusRef,
}: AssistantProps) => {
  const { selectedModelId } = useModelSelection();
  const CHAT_API_URL = `${API_BASE}/api/chat`;

  const chat = useChat({
    api: CHAT_API_URL,
    body: {
      modelId: selectedModelId,
    },
  });

  const { append } = chat;
  const runtime = useVercelUseChatRuntime(chat);
  const [recorderState, setRecorderState] = useState<RecorderState>("idle");

  useEffect(() => {
    if (sendMessageRef) {
      sendMessageRef.current = (text: string) => {
        append({
          role: "user",
          content: text,
        });
      };
    }

    return () => {
      if (sendMessageRef) {
        sendMessageRef.current = null;
      }
    };
  }, [append, sendMessageRef]);

  useEffect(() => {
    if (setTranscriptionStatusRef) {
      setTranscriptionStatusRef.current = (
        currentRecorderState: RecorderState
      ) => {
        setRecorderState(currentRecorderState);
      };
    }

    return () => {
      if (setTranscriptionStatusRef) {
        setTranscriptionStatusRef.current = null;
      }
    };
  }, [setTranscriptionStatusRef]);

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <SidebarProvider defaultOpen={false}>
        <div className="flex h-dvh w-full">
          <Sidebar>
            <SidebarHeader className="flex items-center justify-between">
              <h2 className="text-md font-semibold px-2">Vaiced</h2>
            </SidebarHeader>
            <SidebarContent>
              <ThreadList />
            </SidebarContent>
          </Sidebar>
          <div className="absolute mt-6 ml-2 left-0 top-0 flex items-center">
            <SidebarTrigger className="mr-2 text-white">
              <MessagesSquare className="h-5 w-5" />
            </SidebarTrigger>
          </div>
          <div className="flex-1 w-full h-full px-4 pt-4">
            <Thread recorderState={recorderState} />
          </div>
        </div>
      </SidebarProvider>
    </AssistantRuntimeProvider>
  );
};
