import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import paperBg from "@/assets/paper-background.png";
import { Download, Play, RotateCcw, Video } from "lucide-react";
import { FlowWriteAnimation } from "@/components/FlowWriteAnimation";
import { useAnimationRecorder } from "@/hooks/useAnimationRecorder";
import { useMp4Converter } from "@/hooks/useMp4Converter";
import { useToast } from "@/hooks/use-toast";

type AnimationStyle = "typewriter" | "shimmer" | "fluid" | "flowwrite";
type FontFamily = "tangerine" | "great-vibes" | "dancing-script" | "allura";

const Index = () => {
  const [text, setText] = useState("");
  const [displayText, setDisplayText] = useState("");
  const [animationStyle, setAnimationStyle] = useState<AnimationStyle>("typewriter");
  const [fontFamily, setFontFamily] = useState<FontFamily>("tangerine");
  const [fontSize, setFontSize] = useState("medium");
  const [textColor, setTextColor] = useState("#fcd34d");
  const [speed, setSpeed] = useState([100]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showCursor, setShowCursor] = useState(false);
  const [canDownload, setCanDownload] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { convertWebMToMp4, isConverting, progress } = useMp4Converter();
  const { isRecording, startRecording, stopRecording, downloadRecording } = useAnimationRecorder();
  const maxChars = 200;

  const fontSizeClasses = {
    small: "text-3xl md:text-4xl",
    medium: "text-4xl md:text-6xl",
    large: "text-5xl md:text-7xl",
  };

  const fontFamilyClasses = {
    tangerine: "font-tangerine",
    "great-vibes": "font-great-vibes",
    "dancing-script": "font-dancing-script",
    allura: "font-allura",
  };

  useEffect(() => {
    if (!isAnimating || !text) return;

    setDisplayText("");
    setShowCursor(false);
    let currentIndex = 0;

    // Calculate total animation duration based on style
    const calculateAnimationDuration = () => {
      const baseDelay = speed[0];
      const textLength = text.length;
      
      switch (animationStyle) {
        case "flowwrite":
          // FlowWrite has staggered delays: each char starts at index * (speed/10)
          // Plus each char's own animation takes ~300ms
          return textLength * (baseDelay / 10) + 500;
        case "fluid":
          // Fluid has 50ms delay per character plus animation duration
          return textLength * 50 + 500;
        case "shimmer":
          // Shimmer animation takes about 2 seconds total
          return textLength * baseDelay + 2000;
        default:
          // Typewriter is character by character
          return textLength * baseDelay;
      }
    };

    const interval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayText(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(interval);
        setIsAnimating(false);
        if (animationStyle === "typewriter") {
          setShowCursor(true);
        }
        
        // Calculate extra time needed for the animation to visually complete
        const totalAnimationTime = calculateAnimationDuration();
        const elapsedTime = text.length * speed[0];
        const extraTime = Math.max(totalAnimationTime - elapsedTime, 0) + 1000;
        
        // Stop recording after animation fully completes
        setTimeout(async () => {
          if (isRecording) {
            const blob = await stopRecording();
            if (blob) {
              setVideoBlob(blob);
              setCanDownload(true);
              toast({
                title: "Animation Complete",
                description: "Your animation is ready to download as MP4.",
              });
            }
          }
        }, extraTime);
      }
    }, speed[0]);

    return () => clearInterval(interval);
  }, [isAnimating, text, speed, animationStyle, isRecording, stopRecording, toast]);

  const handleGenerate = async () => {
    if (!text.trim() || !previewRef.current) return;
    
    setCanDownload(false);
    setIsAnimating(true);
    
    // Start recording
    const previewElement = previewRef.current;
    await startRecording(previewElement);
  };

  const handleReset = () => {
    setDisplayText("");
    setIsAnimating(false);
    setShowCursor(false);
    setCanDownload(false);
    setVideoBlob(null);
  };

  const handleDownload = async () => {
    try {
      if (!videoBlob) {
        toast({
          title: "No video available",
          description: "Generate the animation first, then try downloading.",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Converting to MP4…", description: "This may take a moment." });
      const mp4 = await convertWebMToMp4(videoBlob);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      downloadRecording(mp4, `typewriter-animation-${timestamp}.mp4`);
      toast({
        title: "Download Ready",
        description: "Your MP4 video is being downloaded.",
      });
    } catch (error) {
      console.error(error);
      // Fallback: offer WebM if MP4 conversion fails
      if (videoBlob) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        downloadRecording(videoBlob, `typewriter-animation-${timestamp}.webm`);
        toast({
          title: "MP4 conversion failed",
          description: "Downloaded WebM as a fallback.",
        });
      }
    }
  };

  const renderAnimatedText = () => {
    if (animationStyle === "flowwrite") {
      return (
        <FlowWriteAnimation
          text={displayText}
          color={textColor}
          speed={speed[0]}
          className={`${fontFamilyClasses[fontFamily]} ${fontSizeClasses[fontSize]}`}
        />
      );
    }

    if (animationStyle === "fluid") {
      return (
        <div className="flex flex-wrap justify-center gap-1">
          {displayText.split("").map((char, index) => (
            <motion.span
              key={index}
              className="char-reveal inline-block"
              style={{ 
                animationDelay: `${index * 50}ms`,
                color: textColor,
              }}
            >
              {char === " " ? "\u00A0" : char}
            </motion.span>
          ))}
        </div>
      );
    }

    if (animationStyle === "shimmer") {
      return (
        <span className="text-shimmer" style={{ 
          backgroundImage: `linear-gradient(90deg, ${textColor} 0%, #ffffff 50%, ${textColor} 100%)`,
          backgroundSize: "200% auto",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}>
          {displayText}
        </span>
      );
    }

    return (
      <>
        <span style={{ color: textColor }}>{displayText}</span>
        {showCursor && <span className="typewriter-cursor" style={{ backgroundColor: textColor }} />}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-2">
            Typewriter Animation Tool
          </h1>
          <p className="text-muted-foreground">
            Create beautiful animated text with elegant cursive fonts
          </p>
        </header>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Controls Panel */}
          <div className="space-y-6 bg-card p-6 rounded-lg border">
            <div>
              <Label htmlFor="text-input" className="text-lg mb-2 block">
                Your Message
              </Label>
              <Textarea
                id="text-input"
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, maxChars))}
                placeholder="Type your message here..."
                className="min-h-[100px] resize-none"
                maxLength={maxChars}
              />
              <p className="text-sm text-muted-foreground mt-2">
                {text.length}/{maxChars} characters
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="font-family">Font Style</Label>
                <Select value={fontFamily} onValueChange={(v) => setFontFamily(v as FontFamily)}>
                  <SelectTrigger id="font-family">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tangerine">Tangerine</SelectItem>
                    <SelectItem value="great-vibes">Great Vibes</SelectItem>
                    <SelectItem value="dancing-script">Dancing Script</SelectItem>
                    <SelectItem value="allura">Allura</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="font-size">Font Size</Label>
                <Select value={fontSize} onValueChange={setFontSize}>
                  <SelectTrigger id="font-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="animation-style">Animation Style</Label>
              <Select value={animationStyle} onValueChange={(v) => setAnimationStyle(v as AnimationStyle)}>
                <SelectTrigger id="animation-style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="typewriter">Classic Typewriter</SelectItem>
                  <SelectItem value="shimmer">Glitter Shimmer</SelectItem>
                  <SelectItem value="fluid">Fluid Reveal</SelectItem>
                  <SelectItem value="flowwrite">FlowWrite (Handwriting)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="text-color" className="mb-2 block">
                Text Color
              </Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="text-color"
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-20 h-10 cursor-pointer"
                />
                <Input
                  type="text"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="speed" className="mb-2 block">
                Animation Speed: {speed[0]}ms
              </Label>
              <Slider
                id="speed"
                value={speed}
                onValueChange={setSpeed}
                min={50}
                max={300}
                step={10}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Fast</span>
                <span>Slow</span>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleGenerate}
                disabled={!text.trim() || isAnimating}
                className="flex-1"
                size="lg"
              >
                <Play className="w-4 h-4 mr-2" />
                {isAnimating ? "Animating..." : "Generate"}
              </Button>
              <Button
                onClick={handleReset}
                disabled={!displayText}
                variant="outline"
                size="lg"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>

          {/* Preview Panel */}
          <div className="relative">
            <div
              ref={previewRef}
              className="relative w-full aspect-[3/4] rounded-lg overflow-hidden shadow-2xl"
              style={{
                backgroundImage: `url(${paperBg})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20" />
              
              <div className="relative h-full flex items-center justify-center p-8 md:p-16">
                <div
                  className={`
                    ${fontFamilyClasses[fontFamily]}
                    ${fontSizeClasses[fontSize]}
                    text-center
                    leading-relaxed
                    max-w-[85%]
                    break-words
                  `}
                >
                  {displayText ? (
                    renderAnimatedText()
                  ) : (
                    <span className="text-muted-foreground opacity-50">
                      Your animation will appear here...
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              {isRecording && (
                <div className="flex items-center gap-2 px-4 py-2 bg-destructive/10 text-destructive rounded-lg flex-1">
                  <Video className="w-4 h-4 animate-pulse" />
                  <span className="text-sm font-medium">Recording...</span>
                </div>
              )}
              
              {canDownload && !isRecording && (
                <Button
                  onClick={handleDownload}
                  className="flex-1"
                  size="lg"
                  disabled={isConverting}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {isConverting ? `Converting…` : `Download MP4`}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
