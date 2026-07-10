import React from "react";
import { X, BarChart2, Settings, MoreVertical } from "lucide-react";
import { HALightControlPanel } from "./HALightControlPanel";

interface HALightControlModalProps {
  device: any;
  onClose: () => void;
  serverUrl: string;
}

export const HALightControlModal: React.FC<HALightControlModalProps> = ({ device, onClose, serverUrl }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
      <div className="w-full max-w-sm h-[85vh] sm:h-auto sm:min-h-[700px] bg-[#1c1c1e] rounded-[32px] flex flex-col relative overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={onClose} className="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors cursor-pointer rounded-full hover:bg-white/10">
              <X className="w-6 h-6" />
            </button>
            <div className="flex flex-col">
              <span className="text-[11px] text-zinc-400 font-medium">{device.type === "light" ? "Quarto" : "Dispositivo"}</span>
              <span className="text-sm font-semibold text-white tracking-wide">{device.name}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-zinc-400 hover:text-white cursor-pointer rounded-full hover:bg-white/10"><BarChart2 className="w-5 h-5" /></button>
            <button className="p-2 text-zinc-400 hover:text-white cursor-pointer rounded-full hover:bg-white/10"><Settings className="w-5 h-5" /></button>
            <button className="p-2 -mr-2 text-zinc-400 hover:text-white cursor-pointer rounded-full hover:bg-white/10"><MoreVertical className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Content */}
        <HALightControlPanel devices={[device]} serverUrl={serverUrl} compact={false} />

      </div>
    </div>
  );
};
