import { motion } from "framer-motion";
import { FC } from "react";

const RecordingIndicator: FC = () => {
  return (
    <div className="flex w-full items-center justify-center p-4 text-sm text-muted-foreground space-x-2">
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="h-4 w-1.5 rounded-full bg-white"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

export default RecordingIndicator;
