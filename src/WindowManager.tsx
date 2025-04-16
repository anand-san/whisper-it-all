import { useEffect, useState } from "react";
import { getCurrentWindow as tauriWindow } from "@tauri-apps/api/window";
import RecorderWindow from "./views/Recorder/RecorderWindow";
import AiInteractionWindow from "./views/AiInteraction/AiInteractionWindow"; // Import the new component

const WindowManager = () => {
  const [windowLabel, setWindowLabel] = useState<string | null>(null);

  useEffect(() => {
    const getWindowLabel = async () => {
      try {
        const label = tauriWindow().label;
        console.log("Window label:", label);
        setWindowLabel(label);
      } catch (error) {
        console.error("Error getting window label:", error);
      }
    };

    getWindowLabel();
  }, []);

  if (windowLabel === null) {
    // Still loading
    return <div className="loading">Loading...</div>;
  }

  // Render the appropriate component based on the window label
  switch (windowLabel) {
    case "main": // Now renders the AI Interaction Window
      return (
        <>
          <div className="h-screen grow bg-background/50 rounded-md">
            <div
              className="absolute top-0 h-7 w-full z-50"
              data-tauri-drag-region
            />
            <AiInteractionWindow />
          </div>
        </>
      );
    case "recorder":
      return (
        <>
          <RecorderWindow />
        </>
      );
    default:
      return <div>Unknown window: {windowLabel}</div>;
  }
};

export default WindowManager;
