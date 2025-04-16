import React, { useEffect, useState } from "react";
import {
  ChatInput,
  ChatMessages,
  useChatUI, // Added
} from "@llamaindex/chat-ui"; // Removed useFile
import CustomChatMessagesList from "./CustomChatMessageList"; // Import the message list
import ModelSelectorSheet from "./ModelSelectorSheet"; // Import the model selector
import { Button } from "../../../components/ui/button"; // Added Button
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu"; // Added DropdownMenu
import {
  SendHorizontalIcon,
  ChevronDownIcon,
  MonitorUp,
  CircleStopIcon,
} from "lucide-react"; // Added Icons
import {
  captureScreenshot,
  processImageWithVision,
} from "../utils/screenshotUtils"; // Added screenshot utils
import useAiInteraction, { RecorderState } from "../hooks/useAiInteraction";
import RecordingIndicator from "../../../components/RecordingIndicator";
import TranscribingIndicator from "../../../components/TranscribingIndicator";

// Removed ChatInterfaceProps interface

const ChatInterface: React.FC = () => {
  const [recorderState, setRecorderState] = useState<RecorderState>("idle");
  // Removed props
  // Get isLoading and stop directly from useChatUI hook, which now works due to context
  const { isLoading, stop, append } = useChatUI();
  const { sendMessageRef, setTranscriptionStatusRef } = useAiInteraction();

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
  }, [sendMessageRef]);

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

  const handleAnalyzeScreen = async () => {
    try {
      const screenshot = await captureScreenshot();
      if (!screenshot) {
        console.error("Failed to capture screenshot");
        // TODO: Show user feedback
        return;
      }
      // Show loading state? Maybe append a temporary message?
      const result = await processImageWithVision(screenshot); // Assuming this returns text
      if (!result) {
        console.error("Failed to process image");
        // TODO: Show user feedback
        return;
      }
      // TODO: Decide how to use the 'result' (e.g., display it, append it?)
      console.log("Screen Analysis Result:", result);
    } catch (error) {
      console.error("Error analyzing screen:", error);
      // TODO: Show user feedback
    }
  };

  return (
    // Removed TooltipProvider (now wrapping in AiInteractionWindow)
    // Removed outer div and ChatSection (now wrapping in AiInteractionWindow)
    <>
      {/* ChatMessages component - Added bg-transparent */}
      <ChatMessages className="flex-grow overflow-y-auto p-0 space-y-4 bg-transparent pt-4">
        <CustomChatMessagesList />
        {/* Optional: Actions like copy/regenerate can be added if needed */}
        {/* <ChatMessages.Actions /> */}
      </ChatMessages>

      {/* Input area including Model Selector and ChatInput - Removed border-t, added bg-transparent */}
      <div className="flex flex-col items-center bg-transparent">
        {/* Model Selector Sheet Trigger */}
        <ModelSelectorSheet />

        {recorderState === "recording" && <RecordingIndicator />}
        {recorderState === "transcribing" && <TranscribingIndicator />}
        {recorderState === "idle" && (
          <ChatInput
            className="w-full mt-2 bg-white/50 p-0" // Added width and margin
            // Removed annotations and resetUploadedFiles props
          >
            {/* Input form - Custom Actions */}
            <ChatInput.Form className="flex items-center gap-2">
              {/* Added flex and gap */}
              <ChatInput.Field
                type="input"
                placeholder="Send a message..."
                className="flex-grow bg-transparent border-none focus:outline-none focus:ring-0" // Added flex-grow
              />
              {/* Added flex-grow */}
              {/* Conditional Action Buttons */}
              {!isLoading ? (
                <DropdownMenu>
                  <div className="inline-flex rounded-md shadow-sm">
                    <ChatInput.Submit className="size-8 rounded-r-none bg-secondary text-primary cursor-pointer transition-opacity ease-in hover:bg-neutral-200">
                      <span>
                        <SendHorizontalIcon className="h-4 w-4" />
                      </span>
                    </ChatInput.Submit>

                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="secondary"
                        size="icon" // Use size="icon"
                        className="size-8 p-1 rounded-l-none cursor-pointer transition-opacity ease-in hover:bg-neutral-200"
                      >
                        <ChevronDownIcon className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </div>

                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={handleAnalyzeScreen}>
                      <MonitorUp className="mr-2 h-4 w-4" />
                      <span>Analyze Screen</span>
                    </DropdownMenuItem>
                    {/* Add other actions here */}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  variant="secondary"
                  size="icon" // Use size="icon"
                  className="size-8 p-1 cursor-pointer transition-opacity ease-in hover:bg-neutral-200"
                  onClick={stop} // Call stop function on click
                >
                  <CircleStopIcon className="h-4 w-4" />
                </Button>
              )}
            </ChatInput.Form>
          </ChatInput>
        )}
      </div>
    </> // Close fragment
  );
};

export default ChatInterface;
