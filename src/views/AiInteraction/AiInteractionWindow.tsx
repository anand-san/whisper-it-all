import React from "react";
import { useChat } from "@ai-sdk/react";

import {
  ModelSelectionProvider,
  useModelSelection,
} from "./context/ModelSelectionContext"; // Keep the provider
import { API_BASE } from "./utils/constants"; // Keep the API base constant
import ChatInterface from "./components/ChatInterface"; // Import the new interface component
import { ChatSection } from "@llamaindex/chat-ui"; // Import ChatSection
import { TooltipProvider } from "../../components/ui/tooltip"; // Import TooltipProvider

// Main component using the refactored structure
const AiInteractionWindow: React.FC = () => {
  const { selectedModelId } = useModelSelection();
  const CHAT_API_URL = `${API_BASE}/chat`;
  // Removed UPLOAD_API_URL as it's not needed

  // Configure useChat from ai/react
  const chat = useChat({
    api: CHAT_API_URL,
    body: {
      modelId: selectedModelId, // Pass selected model ID
    },
    // Add error handling if needed
    // onError: (error) => { console.error("Chat error:", error); },
  });

  return (
    // Wrap ChatInterface with TooltipProvider and ChatSection
    <TooltipProvider>
      <ChatSection
        handler={chat}
        className="flex flex-col h-full text-foreground overflow-hidden"
      >
        {/* Render the ChatInterface without passing chat/uploadAPI props */}
        <ChatInterface />
      </ChatSection>
    </TooltipProvider>
  );
};

// Keep the context provider wrapper
const AiInteractionWindowWithContext: React.FC = () => {
  return (
    <ModelSelectionProvider>
      <AiInteractionWindow />
    </ModelSelectionProvider>
  );
};
export default AiInteractionWindowWithContext;
