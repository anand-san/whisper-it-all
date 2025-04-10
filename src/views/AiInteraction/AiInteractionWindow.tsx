import React from "react";

import { Assistant } from "./assistant";
import useAiInteraction from "./hooks/useAiInteraction";
import { ModelSelectionProvider } from "./context/ModelSelectionContext"; // Import the provider

const AiInteractionWindow: React.FC = () => {
  const { sendMessageRef, setTranscriptionStatusRef } = useAiInteraction();

  return (
    <ModelSelectionProvider>
      <div className="flex flex-col h-full text-foreground">
        <Assistant
          sendMessageRef={sendMessageRef}
          setTranscriptionStatusRef={setTranscriptionStatusRef}
        />
      </div>
    </ModelSelectionProvider>
  );
};

export default AiInteractionWindow;
