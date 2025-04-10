import React from "react";

import { Assistant } from "./assistant";
import useAiInteraction from "./hooks/useAiInteraction";

const AiInteractionWindow: React.FC = () => {
  const { sendMessageRef, setTranscriptionStatusRef } = useAiInteraction();

  return (
    <div className="flex flex-col h-full text-foreground">
      <Assistant
        sendMessageRef={sendMessageRef}
        setTranscriptionStatusRef={setTranscriptionStatusRef}
      />
    </div>
  );
};

export default AiInteractionWindow;
