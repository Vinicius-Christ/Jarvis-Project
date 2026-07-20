import React, { useState, useRef, useEffect } from "react";
import { Power, Sun, Pipette } from "lucide-react";

export interface HALightControlPanelProps {
  devices: any[];
  serverUrl: string;
  compact?: boolean;
}

const PRESET_COLORS = [
  "#ff8c00", // Orange
  "#ffcc80", // Light Orange
  "#ffe0b2", // Pale Orange
  "#ffffff", // White
  "#82b1ff", // Blue
  "#b388ff", // Purple
  "#ff80ab", // Pink
  "#ff8a80", // Coral
];

function hsvToHex(h: number, s: number, v: number): string {
  let c = v * s;
  let x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  let m = v - c;
  let r = 0, g = 0, b = 0;
  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
}

export const HALightControlPanel: React.FC<HALightControlPanelProps> = ({ devices, serverUrl, compact = false }) => {
  const isAnyOn = devices.some(d => d.state === "on");
  const firstOnDevice = devices.find(d => d.state === "on") || devices[0] || {};
  
  const [brightness, setBrightness] = useState(() => {
    if (firstOnDevice.status?.includes("%")) {
      const match = firstOnDevice.status.match(/\((\d+)%\)/);
      if (match) return parseInt(match[1]);
    }
    return 100;
  });
  
  const [power, setPower] = useState(isAnyOn);
  const [activeMode, setActiveMode] = useState<"white" | "color">("white");
  const [color, setColor] = useState("#ffffff");
  const [colorPos, setColorPos] = useState({ x: 0, y: 0 });
  const [temperature, setTemperature] = useState(50); // 0-100%

  const sliderRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const tempRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPower(devices.some(d => d.state === "on"));
  }, [devices]);

  const sendCommand = async (updates: any) => {
    try {
      const token = localStorage.getItem("jarvis_token");
      await Promise.all(devices.map(device => 
        fetch(`${serverUrl}/api/update/iot`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            deviceId: device.id,
            ...updates
          })
        })
      ));
    } catch (err) {
      console.error("Erro ao alterar estado das luzes:", err);
    }
  };

  const togglePower = () => {
    const newState = !power;
    setPower(newState);
    sendCommand({ state: newState ? "on" : "off" });
  };
  
  const updateTemperature = (newVal: number) => {
    setTemperature(newVal);
    const kelvin = Math.round(6500 - (newVal / 100) * (6500 - 2700));
    const mireds = Math.round(1000000 / kelvin);
    sendCommand({ color_temp: mireds, color_temp_kelvin: kelvin, state: "on", force_white: true });
    if (!power) setPower(true);
  };

  const handleColorClick = (c: string) => {
    setColor(c);
    setColorPos({ x: 0, y: 0 }); // Reset visually to center for presets
    sendCommand({ color: c, state: "on" });
    if (!power) setPower(true);
  };

  const applyCurrentWhiteMode = () => {
    // Positivo / Tuya range: 6500K (Cool/Frio at 0%) to 2700K (Warm/Quente at 100%)
    const kelvin = Math.round(6500 - (temperature / 100) * (6500 - 2700));
    const mireds = Math.round(1000000 / kelvin);
    sendCommand({ color_temp_kelvin: kelvin, color_temp: mireds, state: "on", force_white: true });
    if (!power) setPower(true);
  };

  const applyCurrentColorMode = () => {
    sendCommand({ color: color, state: "on" });
    if (!power) setPower(true);
  };

  const lastSendTime = useRef(0);

  const throttledSend = (updates: any, isFinal: boolean = false) => {
    const now = Date.now();
    if (isFinal || now - lastSendTime.current > 200) {
      lastSendTime.current = now;
      sendCommand(updates);
    }
  };

  // --- Horizontal Brightness ---
  const isDraggingBright = useRef(false);
  const updateBrightFromEvent = (ev: React.PointerEvent, isFinal = false) => {
    const slider = sliderRef.current;
    if (!slider) return;
    const rect = slider.getBoundingClientRect();
    const zoom = parseFloat(document.documentElement.style.zoom) || 1;
    
    // Horizontal calculation
    const x = Math.max(0, Math.min(rect.width, (ev.clientX - rect.left) / (rect.width > 0 ? 1 : zoom)));
    const percentage = (x / rect.width) * 100;
    const val = Math.round(percentage);
    
    setBrightness(val);
    if (!power) setPower(true);
    throttledSend({ brightness: val, state: "on" }, isFinal);
  };

  const handleBrightDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingBright.current = true;
    updateBrightFromEvent(e);
  };
  const handleBrightMove = (e: React.PointerEvent) => {
    if (isDraggingBright.current) updateBrightFromEvent(e);
  };
  const handleBrightUp = (e: React.PointerEvent) => {
    if (!isDraggingBright.current) return;
    isDraggingBright.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    updateBrightFromEvent(e, true);
  };

  // --- Horizontal Temperature ---
  const isDraggingTemp = useRef(false);
  const updateTempFromEvent = (ev: React.PointerEvent, isFinal = false) => {
    const slider = tempRef.current;
    if (!slider) return;
    const rect = slider.getBoundingClientRect();
    const zoom = parseFloat(document.documentElement.style.zoom) || 1;

    // Horizontal calculation
    const x = Math.max(0, Math.min(rect.width, (ev.clientX - rect.left) / (rect.width > 0 ? 1 : zoom)));
    const percentage = (x / rect.width) * 100;
    const val = Math.round(percentage);
    
    setTemperature(val);
    if (!power) setPower(true);
    
    const kelvin = Math.round(6500 - (val / 100) * (6500 - 2700));
    const mireds = Math.round(1000000 / kelvin);
    throttledSend({ color_temp_kelvin: kelvin, color_temp: mireds, state: "on" }, isFinal);
  };

  const handleTempDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingTemp.current = true;
    updateTempFromEvent(e);
  };
  const handleTempMove = (e: React.PointerEvent) => {
    if (isDraggingTemp.current) updateTempFromEvent(e);
  };
  const handleTempUp = (e: React.PointerEvent) => {
    if (!isDraggingTemp.current) return;
    isDraggingTemp.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    updateTempFromEvent(e, true);
  };

  // --- Color Wheel ---
  const isDraggingColor = useRef(false);
  const updateColorFromEvent = (ev: React.PointerEvent, isFinal = false) => {
    const wheel = wheelRef.current;
    if (!wheel) return;
    const rect = wheel.getBoundingClientRect();
    const zoom = parseFloat(document.documentElement.style.zoom) || 1;

    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const x = (ev.clientX - cx) / zoom;
    const y = (ev.clientY - cy) / zoom;

    let angle = Math.atan2(y, x) * (180 / Math.PI);
    if (angle < 0) angle += 360;

    const radius = rect.width / 2;
    const distance = Math.min(radius, Math.sqrt(x*x + y*y));
    const saturation = distance / radius; 
    
    const nx = distance === 0 ? 0 : (x / distance) * saturation;
    const ny = distance === 0 ? 0 : (y / distance) * saturation;
    setColorPos({ x: nx, y: ny });

    const hexColor = hsvToHex(angle, saturation, 1);
    setColor(hexColor);
    if (!power) setPower(true);
    throttledSend({ color: hexColor, state: "on" }, isFinal);
  };

  const handleColorDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingColor.current = true;
    updateColorFromEvent(e);
  };
  const handleColorMove = (e: React.PointerEvent) => {
    if (isDraggingColor.current) updateColorFromEvent(e);
  };
  const handleColorUp = (e: React.PointerEvent) => {
    if (!isDraggingColor.current) return;
    isDraggingColor.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    updateColorFromEvent(e, true);
  };

  if (!devices || devices.length === 0) return null;

  return (
    <div className={`flex-1 flex flex-col items-center justify-between ${compact ? 'p-2' : 'p-6'} w-full h-full`}>
      
      {/* Top Header */}
      <div className="w-full">
        {compact && (
          <div className="text-center w-full pb-2 border-b border-white/5 mb-2">
             <span className="text-[9px] font-mono tracking-wider text-[var(--brand-light)] uppercase flex items-center justify-center gap-1">
                GRUPO DE LUZES ({devices.length})
             </span>
          </div>
        )}

        <div className="text-center space-y-1 mb-4">
          <h2 className={`${compact ? 'text-2xl' : 'text-3xl'} font-light text-white`}>{power ? brightness + "%" : "Desligado"}</h2>
          {!compact && <p className="text-sm font-medium text-white/50">{power ? "Em 7 segundos" : "Offline"}</p>}
        </div>

        {/* Mode Tabs (Tuya Style) */}
        <div className="flex bg-[#2c2c2e] rounded-full p-1 justify-between w-full max-w-[280px] mx-auto mb-6 shadow-inner">
          <button 
            onClick={() => {
              setActiveMode("white");
              applyCurrentWhiteMode();
            }}
            className={`flex-1 ${compact ? 'h-8 text-xs' : 'h-10 text-sm'} rounded-full flex items-center justify-center transition-all cursor-pointer font-medium ${activeMode === 'white' && power ? 'bg-[#4c4c4e] text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
          >
            Branco
          </button>
          
          <button 
            onClick={() => {
              setActiveMode("color");
              applyCurrentColorMode();
            }}
            className={`flex-1 ${compact ? 'h-8 text-xs' : 'h-10 text-sm'} rounded-full flex items-center justify-center transition-all cursor-pointer font-medium ${activeMode === 'color' && power ? 'bg-[#4c4c4e] text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
          >
            Colorido
          </button>
        </div>
      </div>

      {/* Main Visualizer Area */}
      <div className="flex-1 w-full flex flex-col items-center justify-center relative">
        {activeMode === "color" ? (
          <div className="relative">
            {/* Color Wheel */}
            <div 
              ref={wheelRef}
              onPointerDown={handleColorDown}
              onPointerMove={handleColorMove}
              onPointerUp={handleColorUp}
              className={`${compact ? 'w-[160px] h-[160px]' : 'w-[240px] h-[240px]'} rounded-full cursor-pointer touch-none shadow-lg relative`}
              style={{
                background: 'radial-gradient(circle, white 0%, transparent 80%), conic-gradient(from 90deg, red, yellow, lime, cyan, blue, magenta, red)'
              }}
            >
              {/* Center thumb indicator */}
              <div className="absolute inset-0 pointer-events-none">
                 <div 
                   className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full border-2 border-white shadow-md transition-transform duration-75"
                   style={{ 
                     backgroundColor: color,
                     left: `calc(50% + ${colorPos.x * 50}%)`,
                     top: `calc(50% + ${colorPos.y * 50}%)`
                   }} 
                 />
              </div>
            </div>
            {!compact && (
              <div className="absolute -top-4 -right-4 text-white/70 hover:text-white cursor-pointer p-2 bg-[#2c2c2e] rounded-full shadow-md">
                <Pipette className="w-4 h-4" />
              </div>
            )}
          </div>
        ) : (
          <div className="w-full max-w-[280px] flex flex-col justify-center items-center px-4">
            {/* Temperature Slider (White Mode) */}
            <div className="w-full relative mb-8">
              <div className="flex justify-between text-white/50 text-[10px] uppercase font-bold tracking-wider mb-3 px-2">
                <span>Frio</span>
                <span>Quente</span>
              </div>
              <div 
                ref={tempRef}
                onPointerDown={handleTempDown}
                onPointerMove={handleTempMove}
                onPointerUp={handleTempUp}
                className={`w-full ${compact ? 'h-10' : 'h-12'} rounded-full relative cursor-pointer touch-none shadow-inner overflow-hidden`}
                style={{ background: 'linear-gradient(to right, #82b1ff, #ffffff, #ffcc80, #ff8c00)' }}
              >
                <div className="absolute inset-0 bg-black/10 pointer-events-none" />
                <div 
                  className={`absolute top-1/2 -translate-y-1/2 ${compact ? 'w-8 h-8' : 'w-10 h-10'} bg-white rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.3)] pointer-events-none transition-transform`}
                  style={{ left: `calc(${temperature}% - ${compact ? 16 : 20}px)` }} 
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Universal Controls */}
      <div className="w-full max-w-[280px] mt-6 px-4">
         {/* Brightness Slider (Always visible) */}
         <div className="w-full relative mb-8">
           <div className="flex justify-between text-white/50 text-[10px] uppercase font-bold tracking-wider mb-3 px-2">
             <div className="flex items-center gap-1"><Sun className="w-3 h-3" /> Brilho</div>
             <span>{brightness}%</span>
           </div>
           <div 
             ref={sliderRef}
             onPointerDown={handleBrightDown}
             onPointerMove={handleBrightMove}
             onPointerUp={handleBrightUp}
             className={`w-full ${compact ? 'h-10' : 'h-12'} rounded-full bg-[#1c1c1e] relative cursor-pointer touch-none shadow-inner overflow-hidden border border-white/5`}
           >
              <div 
                className="absolute left-0 h-full bg-[#e5e5ea] pointer-events-none shadow-[0_0_15px_rgba(255,255,255,0.2)]" 
                style={{ width: `${power ? brightness : 0}%`, opacity: power ? 1 : 0.2 }}
              />
           </div>
         </div>

         {/* Bottom Action Row */}
         <div className="flex justify-between items-center px-2">
           <div className={`grid grid-cols-4 ${compact ? 'gap-2' : 'gap-3'} flex-1 mr-4`}>
             {PRESET_COLORS.slice(0, 4).map(c => (
               <button
                 key={c}
                 onClick={() => handleColorClick(c)}
                 className={`${compact ? 'w-6 h-6' : 'w-8 h-8'} rounded-full cursor-pointer transition-transform hover:scale-110 active:scale-95 ${color === c && power ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1c1c1e]' : 'border border-white/10'}`}
                 style={{ backgroundColor: c }}
               />
             ))}
           </div>
           
           <button 
             onClick={togglePower}
             className={`flex-shrink-0 ${compact ? 'w-12 h-12' : 'w-14 h-14'} rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg ${!power ? 'bg-[#2c2c2e] text-white' : 'bg-white text-black hover:scale-105'}`}
           >
             <Power className={`${compact ? 'w-5 h-5' : 'w-6 h-6'}`} />
           </button>
         </div>
      </div>

    </div>
  );
};
