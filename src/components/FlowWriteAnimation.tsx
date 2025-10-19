import { motion } from "framer-motion";

interface FlowWriteAnimationProps {
  text: string;
  color: string;
  className?: string;
  speed: number;
}

export const FlowWriteAnimation = ({ text, color, className, speed }: FlowWriteAnimationProps) => {
  const words = text.split(" ");
  const totalChars = text.length;
  let charIndex = 0;

  return (
    <div className={`flex flex-wrap justify-center gap-2 ${className}`}>
      {words.map((word, wordIndex) => (
        <div key={wordIndex} className="flex">
          {word.split("").map((char, charIndexInWord) => {
            const currentCharIndex = charIndex++;
            const delay = (currentCharIndex * speed) / 1000;
            
            return (
              <motion.span
                key={charIndexInWord}
                className="inline-block"
                style={{ 
                  color,
                  filter: "drop-shadow(0 0 8px currentColor)",
                }}
                initial={{
                  opacity: 0,
                  scale: 0.3,
                  y: 20,
                  rotate: -15,
                  filter: "blur(4px) drop-shadow(0 0 8px currentColor)",
                }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  y: 0,
                  rotate: 0,
                  filter: "blur(0px) drop-shadow(0 0 8px currentColor)",
                }}
                transition={{
                  duration: 0.6,
                  delay,
                  ease: [0.16, 1, 0.3, 1],
                  opacity: { duration: 0.4, delay },
                  scale: { 
                    duration: 0.5, 
                    delay,
                    type: "spring",
                    stiffness: 200,
                    damping: 15
                  },
                  rotate: { duration: 0.5, delay },
                  filter: { duration: 0.6, delay },
                }}
              >
                {char}
              </motion.span>
            );
          })}
        </div>
      ))}
    </div>
  );
};
