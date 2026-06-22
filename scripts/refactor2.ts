import fs from 'fs';
let content = fs.readFileSync('src/App.tsx', 'utf-8');

if (!content.includes('import { AnimatePresence, motion }')) {
  // Find where import React is
  content = content.replace(/import React, \{[^\}]+\} from "react";/, `$&
import { AnimatePresence, motion } from "motion/react";
import { SystemHealthMonitor, HardwareProcessingMonitor } from "./components/HardwareMonitor";`);
}

fs.writeFileSync('src/App.tsx', content);
