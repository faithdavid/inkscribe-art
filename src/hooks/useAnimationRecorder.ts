import { useState, useRef, useCallback } from "react";
import html2canvas from "html2canvas";
import { toast } from "react-toastify";

interface UseAnimationRecorderReturn {
  isRecording: boolean;
  startRecording: (element: HTMLElement) => void;
  stopRecording: () => Promise<Blob | null>;
  downloadRecording: (blob: Blob, filename: string) => void;
}

export const useAnimationRecorder = (): UseAnimationRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async (element: HTMLElement) => {
    try {
      const canvas = document.createElement("canvas");
      const rect = element.getBoundingClientRect();
      canvas.width = rect.width * 2;
      canvas.height = rect.height * 2;
      canvasRef.current = canvas;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context not available");

      ctx.scale(2, 2);

      const captureFrame = async () => {
        const snapshot = await html2canvas(element, {
          backgroundColor: null,
          useCORS: true,
          scale: 2,
          width: rect.width,
          height: rect.height,
          logging: false,
        });
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(snapshot, 0, 0, rect.width, rect.height);
      };

      await captureFrame();
      const frameInterval = setInterval(captureFrame, 1000 / 30);

      const stream = canvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "video/webm;codecs=vp9",
        videoBitsPerSecond: 8000000,
      });

      chunksRef.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      mediaRecorder.onstop = () => clearInterval(frameInterval);

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

      (mediaRecorder as any).frameInterval = frameInterval;
    } catch (error) {
      console.error("Error starting recording:", error);
      setIsRecording(false);
      toast.error("Failed to start recording. Please try again.");
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
