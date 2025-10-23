import { useCallback, useMemo, useRef, useState } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

interface UseMp4ConverterReturn {
  isConverting: boolean;
  progress: number; // 0-100
  convertWebMToMp4: (blob: Blob) => Promise<Blob>;
}

/**
 * useMp4Converter
 * Lightweight wrapper around FFmpeg.wasm to transcode WebM (VP8/9) to MP4 (H.264)
 * Note: Conversion is CPU intensive and can take time on low-end devices.
 */
export const useMp4Converter = (): UseMp4ConverterReturn => {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);

  const load = useCallback(async () => {
    if (ffmpegRef.current) return ffmpegRef.current;

    const ffmpeg = new FFmpeg();
    ffmpeg.on("progress", ({ progress }) => {
      // progress is 0..1
      setProgress(Math.round(progress * 100));
    });

    // Pin a specific core version for stability
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/";
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}ffmpeg-core.wasm`, "application/wasm"),
      workerURL: await toBlobURL(`${baseURL}ffmpeg-core.worker.js`, "text/javascript"),
    });

    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  }, []);

  const convertWebMToMp4 = useCallback(async (blob: Blob): Promise<Blob> => {
    setIsConverting(true);
    setProgress(0);
    try {
      const ffmpeg = await load();

      // Write input
      await ffmpeg.writeFile("input.webm", await fetchFile(blob));

      // Transcode to H.264 inside MP4 container
      // yuv420p ensures broad compatibility across players
      await ffmpeg.exec([
        "-i",
        "input.webm",
        "-c:v",
        "libx264",
        "-preset",
        "ultrafast",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "output.mp4",
      ]);

      const data = (await ffmpeg.readFile("output.mp4")) as Uint8Array;
      const ab = new ArrayBuffer(data.byteLength);
      new Uint8Array(ab).set(data);
      return new Blob([ab], { type: "video/mp4" });
    } finally {
      setIsConverting(false);
    }
  }, [load]);

  return useMemo(
    () => ({ isConverting, progress, convertWebMToMp4 }),
    [isConverting, progress, convertWebMToMp4]
  );
};
