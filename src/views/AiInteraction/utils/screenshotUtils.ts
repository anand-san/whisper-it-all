import { invoke } from "@tauri-apps/api/core";
import { Event, UnlistenFn, listen, once } from "@tauri-apps/api/event";
import { API_BASE } from "./constants";

// Status type for screenshot progress updates
interface ScreenshotStatus {
  status: string; // "processing", "idle", "error"
  progress?: number;
  error?: string;
}

// Result type for the screenshot data
interface ScreenshotResult {
  image_data: number[]; // Raw binary data as array of bytes
  width: number;
  height: number;
  mime_type: string; // e.g., "image/png"
}

// Status callback type
type ScreenshotStatusCallback = (status: ScreenshotStatus) => void;

// Event constants
const EVENT_SCREENSHOT_STATUS = "screenshot:status";
const EVENT_SCREENSHOT_RESULT = "screenshot:result";
const EVENT_SCREENSHOT_ERROR = "screenshot:error";

/**
 * Captures the primary screen using the backend command.
 *
 * The backend processes screenshot capture asynchronously and sends events
 * for status updates, the result, and any errors.
 *
 * @param onStatusUpdate Optional callback for receiving real-time status updates
 * @returns A Promise that resolves with a File object containing the screenshot,
 *          or rejects with an error message if the capture fails.
 */
export async function captureScreenshot(
  onStatusUpdate?: ScreenshotStatusCallback
): Promise<string> {
  console.log("Starting screenshot capture...");

  // Set up status event listener if a callback was provided
  let statusUnlisten: (() => void) | undefined;

  if (onStatusUpdate) {
    try {
      statusUnlisten = await listen<ScreenshotStatus>(
        EVENT_SCREENSHOT_STATUS,
        (event) => {
          onStatusUpdate(event.payload);
        }
      );
    } catch (err) {
      console.error("Failed to set up screenshot status listener:", err);
    }
  }

  try {
    // Create a promise that will be resolved when we receive the screenshot
    // or rejected if we receive an error
    const resultPromise = new Promise<string>((resolve, reject) => {
      // Set up one-time result listeners - these will automatically be removed after triggered once
      let resultUnlisten: UnlistenFn | null = null;
      let errorUnlisten: UnlistenFn | null = null;

      const setupListeners = async () => {
        try {
          // Listen for the successful result
          resultUnlisten = await once<string>(
            EVENT_SCREENSHOT_RESULT,
            (event) => {
              console.log("Screenshot captured successfully (Base64 received)");
              resolve(event.payload);
              // Clean up error listener since we got a successful result
              if (errorUnlisten) errorUnlisten();
            }
          );

          // Listen for errors
          errorUnlisten = await once<string>(
            EVENT_SCREENSHOT_ERROR,
            (event) => {
              console.error("Screenshot capture failed:", event.payload);
              reject(new Error(event.payload));
              // Clean up result listener since we got an error
              if (resultUnlisten) resultUnlisten();
            }
          );
        } catch (err) {
          console.error("Failed to set up event listeners:", err);
          reject(new Error("Failed to set up screenshot event listeners"));
        }
      };

      // Set up the listeners
      setupListeners();
    });

    // Invoke the command to start the screenshot process
    // This returns immediately while processing continues in the background
    await invoke("capture_screenshot");

    // Wait for either the result or an error
    return await resultPromise;
  } finally {
    // Clean up the status event listener if it exists
    if (statusUnlisten) {
      statusUnlisten();
    }
  }
}

/**
 * Processes an image using the backend vision API
 *
 * @param base64Image The base64-encoded image data (including the data URL prefix)
 * @param prompt Optional text prompt to send along with the image
 * @param modelId Optional model ID to use (default is llama-3.2-11b-vision-preview)
 * @returns A promise that resolves with the text description of the image
 */
export async function processImageWithVision(
  base64Image: string,
  prompt: string = "This is a screenshot of a user's screen, We need to analyze what they are doing and extract all the text and images from the screen in order to support them on their question.",
  modelId?: string
): Promise<string> {
  console.log("Processing image with vision API...");

  try {
    // Send the base64 image to our backend vision API
    const apiUrl = API_BASE + "/vision";

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: `data:image/jpeg;base64,${base64Image}`,
        prompt,
        modelId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Vision API request failed:", response.status, errorText);
      throw new Error(
        `Vision API request failed: ${response.status} ${errorText}`
      );
    }

    const result = await response.json();
    console.log("Vision API response received");
    return result.text;
  } catch (error) {
    console.error("Error processing image with vision:", error);
    throw error;
  }
}

/**
 * Captures a screenshot and processes it with the vision API in one step
 *
 * @param prompt Optional text prompt to send along with the image
 * @param modelId Optional model ID to use
 * @param onStatusUpdate Optional callback for receiving screenshot capture status updates
 * @returns A promise that resolves with the text description of the screenshot
 */
export async function captureAndAnalyzeScreenshot(
  prompt: string = "What's in this image?",
  modelId?: string,
  onStatusUpdate?: ScreenshotStatusCallback
): Promise<string> {
  try {
    // Capture the screenshot
    const screenshot = await captureScreenshot(onStatusUpdate);

    // Process the screenshot with vision API
    return await processImageWithVision(screenshot, prompt, modelId);
  } catch (error) {
    console.error("Error capturing and analyzing screenshot:", error);
    throw error;
  }
}
