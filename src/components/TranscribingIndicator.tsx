import { motion } from "framer-motion";
import { FC } from "react";

const TranscribingIndicator: FC = () => {
  const dotVariants = {
    initial: {
      y: "0%",
    },
    animate: {
      y: "100%",
    },
    exit: {
      y: "0%",
    },
  };

  const containerVariants = {
    initial: {
      transition: {
        staggerChildren: 0.2,
      },
    },
    animate: {
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  return (
    <div className="flex w-full items-center justify-center p-4 text-sm text-muted-foreground space-x-2">
      <motion.div
        className="flex h-4 w-6 items-end justify-center space-x-1" // Adjusted height and spacing
        variants={containerVariants}
        initial="initial"
        animate="animate"
      >
        {[...Array(3)].map((_, i) => (
          <motion.span
            key={i}
            className="block h-4 w-4 rounded-full bg-current text-white" // Use current text color
            variants={dotVariants}
            transition={{
              duration: 0.5,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
              delay: i * 0.1, // Stagger start slightly
            }}
          />
        ))}
      </motion.div>
    </div>
  );
};
export default TranscribingIndicator;
