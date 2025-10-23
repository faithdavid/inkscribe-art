import { useState, useRef, useCallback } from "react";

interface UseAnimationRecorderReturn {
  isRecording: boolean;
  startRecording: (element: HTMLElement) => void;
  stopRecording: () => Promise<Blob | null>;
  downloadRecording: (blob: Blob, filename: string) => void;
}

export const useAnimationRecorder = (): UseAnimationRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async (element: HTMLElement) => {
    try {
      // Create a canvas to capture the element
      const canvas = document.createElement("canvas");
      const rect = element.getBoundingClientRect();
      
      canvas.width = rect.width * 2; // Higher resolution
      canvas.height = rect.height * 2;
      
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Scale for better quality
      ctx.scale(2, 2);

      // Load the background image from CSS
      const computedStyle = window.getComputedStyle(element);
      const bgImageUrl = computedStyle.backgroundImage.slice(5, -2); // Remove 'url("' and '")'
      
      const backgroundImage = new Image();
      backgroundImage.crossOrigin = "anonymous";
      backgroundImage.src = bgImageUrl;
      
      await new Promise((resolve, reject) => {
        backgroundImage.onload = resolve;
        backgroundImage.onerror = reject;
      });

      // Capture using manual rendering
      const captureFrame = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw the background image
        ctx.drawImage(backgroundImage, 0, 0, rect.width, rect.height);
        
        // Draw gradient overlay
        const gradient = ctx.createLinearGradient(0, 0, 0, rect.height);
        gradient.addColorStop(0, "transparent");
        gradient.addColorStop(0.5, "transparent");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0.2)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, rect.width, rect.height);

        // Get computed styles and draw text
        const textContainer = element.querySelector("div > div:last-child") as HTMLElement;
        if (textContainer) {
          const textElements = textContainer.querySelectorAll("span");
          textElements.forEach((el) => {
            const htmlEl = el as HTMLElement;
            const styles = window.getComputedStyle(htmlEl);
            const elRect = htmlEl.getBoundingClientRect();
            
            const opacity = parseFloat(styles.opacity);
            if (opacity > 0) {
              ctx.fillStyle = styles.color;
              ctx.font = `${styles.fontWeight} ${styles.fontSize} ${styles.fontFamily}`;
              ctx.textAlign = "center";
              ctx.globalAlpha = opacity;
              
              const text = htmlEl.textContent || "";
              const x = elRect.left - rect.left + elRect.width / 2;
              const y = elRect.top - rect.top + elRect.height / 2;
              
              if (text) {
                ctx.fillText(text, x, y);
              }
              
              ctx.globalAlpha = 1;
            }
          });
        }
      };

      // Start capturing frames
      const stream = canvas.captureStream(30); // 30 FPS
      
      // Set up interval to capture frames
      const frameInterval = setInterval(captureFrame, 1000 / 30);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: 8000000, // 8 Mbps for better quality
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        clearInterval(frameInterval);
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      // Store frame interval for cleanup
      (mediaRecorder as any).frameInterval = frameInterval;
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || !isRecording) {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        chunksRef.current = [];
        setIsRecording(false);
        
        // Clear frame interval
        if ((mediaRecorderRef.current as any).frameInterval) {
          clearInterval((mediaRecorderRef.current as any).frameInterval);
        }
        
        resolve(blob);
      };

      mediaRecorderRef.current.stop();
    });
  }, [isRecording]);

  const downloadRecording = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
    downloadRecording,
  };
};
