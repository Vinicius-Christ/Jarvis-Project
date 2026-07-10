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
  return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).padStart(6, '0');
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
  const [activeMode, setActiveMode] = useState<"brightness" | "color" | "temp">("brightness");
  const [color, setColor] = useState("#ffffff");
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

  const updateBrightness = (newVal: number) => {
    setBrightness(newVal);
    sendCommand({ brightness: newVal, state: "on" });
    if (!power) setPower(true);
  };
  
  const updateTemperature = (newVal: number) => {
    setTemperature(newVal);
    // map 0-100 to mireds approx 153 to 500
    // 100% (top) = 500 mireds (warm)
    // 0% (bottom) = 153 mireds (cool)
    const mireds = 153 + (newVal / 100) * (500 - 153);
    sendCommand({ color_temp: Math.round(mireds), state: "on" });
    if (!power) setPower(true);
  };

  const handleColorClick = (c: string) => {
    setColor(c);
    sendCommand({ color: c, state: "on" });
    if (!power) setPower(true);
  };

  const handleBrightnessPointerDown = (e: React.PointerEvent) => {
    const slider = sliderRef.current;
    if (!slider) return;

    const updateFromEvent = (ev: PointerEvent) => {
      const rect = slider.getBoundingClientRect();
      const y = Math.max(0, Math.min(rect.height, ev.clientY - rect.top));
      const percentage = 100 - (y / rect.height) * 100;
      updateBrightness(Math.round(percentage));
    };

    updateFromEvent(e as any);

    const onPointerMove = (ev: PointerEvent) => {
      ev.preventDefault();
      updateFromEvent(ev);
    };

    const onPointerUp = () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  };

  const handleTempPointerDown = (e: React.PointerEvent) => {
    const slider = tempRef.current;
    if (!slider) return;

    const updateFromEvent = (ev: PointerEvent) => {
      const rect = slider.getBoundingClientRect();
      const y = Math.max(0, Math.min(rect.height, ev.clientY - rect.top));
      const percentage = 100 - (y / rect.height) * 100;
      updateTemperature(Math.round(percentage));
    };

    updateFromEvent(e as any);

    const onPointerMove = (ev: PointerEvent) => {
      ev.preventDefault();
      updateFromEvent(ev);
    };

    const onPointerUp = () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  };

  const handleWheelPointerDown = (e: React.PointerEvent) => {
    const wheel = wheelRef.current;
    if (!wheel) return;

    const updateFromEvent = (ev: PointerEvent) => {
      const rect = wheel.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const x = ev.clientX - cx;
      const y = ev.clientY - cy;

      let angle = Math.atan2(y, x) * (180 / Math.PI);
      if (angle < 0) angle += 360;

      const radius = rect.width / 2;
      const distance = Math.min(radius, Math.sqrt(x*x + y*y));
      const saturation = distance / radius; 

      const hexColor = hsvToHex(angle, saturation, 1);
      setColor(hexColor);
      sendCommand({ color: hexColor, state: "on" });
      if (!power) setPower(true);
    };

    updateFromEvent(e as any);

    const onPointerMove = (ev: PointerEvent) => {
      ev.preventDefault();
      updateFromEvent(ev);
    };

    const onPointerUp = () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
    };

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
  };

  if (!devices || devices.length === 0) return null;

  return (
    <div className={`flex-1 flex flex-col items-center justify-center ${compact ? 'p-2 gap-4' : 'p-6 gap-8'}`}>
      
      {compact && (
        <div className="text-center w-full pb-2 border-b border-white/5">
           <span className="text-[9px] font-mono tracking-wider text-[var(--brand-light)] uppercase flex items-center justify-center gap-1">
              GRUPO DE LUZES ({devices.length})
           </span>
        </div>
      )}

      <div className="text-center space-y-1">
        <h2 className={`${compact ? 'text-2xl' : 'text-4xl'} font-light text-white`}>{power ? brightness + "%" : "Desligado"}</h2>
        {!compact && <p className="text-sm font-medium text-white/50">{power ? "Em 7 segundos" : "Offline"}</p>}
      </div>

      <div className={`flex justify-center items-center ${compact ? 'h-[200px]' : 'h-[340px]'} w-full`}>
        {/* Brightness Slider */}
        {activeMode === "brightness" && (
          <div 
            ref={sliderRef}
            onPointerDown={handleBrightnessPointerDown}
            className={`${compact ? 'w-24 h-full' : 'w-32 h-full'} bg-[#2c2c2e] rounded-[3rem] relative overflow-hidden cursor-pointer shadow-inner touch-none`}
          >
            <div 
              className="absolute bottom-0 w-full transition-all duration-75 rounded-[3rem]"
              style={{ 
                height: power ? `${brightness}%` : '0%',
                backgroundColor: "#e5e5ea",
                opacity: power ? 1 : 0
              }}
            >
              {brightness > 5 && power && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 w-8 h-1 bg-black/20 rounded-full" />
              )}
            </div>
          </div>
        )}

        {/* Color Wheel */}
        {activeMode === "color" && (
          <div className="relative">
            <div 
              ref={wheelRef}
              onPointerDown={handleWheelPointerDown}
              className={`${compact ? 'w-[200px] h-[200px]' : 'w-[300px] h-[300px]'} rounded-full cursor-pointer touch-none shadow-lg relative`}
              style={{
                background: 'radial-gradient(circle, white 0%, transparent 80%), conic-gradient(from 90deg, red, yellow, lime, cyan, blue, magenta, red)'
              }}
            >
              {/* Center thumb indicator */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                 <div className="w-8 h-8 rounded-full border-2 border-white/50 shadow-md" style={{ backgroundColor: color }} />
              </div>
            </div>
            {!compact && (
              <div className="absolute top-2 right-2 text-white/70 hover:text-white cursor-pointer">
                <Pipette className="w-5 h-5" />
              </div>
            )}
          </div>
        )}

        {/* Temperature Slider */}
        {activeMode === "temp" && (
          <div 
            ref={tempRef}
            onPointerDown={handleTempPointerDown}
            className={`${compact ? 'w-24 h-full' : 'w-32 h-full'} rounded-[3rem] relative overflow-hidden cursor-pointer shadow-inner touch-none`}
            style={{ background: 'linear-gradient(to bottom, #ff8c00, #ffcc80, #ffffff, #82b1ff)' }}
          >
            {/* Overlay to dim when off */}
            {!power && <div className="absolute inset-0 bg-black/50" />}
            
            {/* Handle */}
            {power && (
              <div 
                className="absolute left-1/2 -translate-x-1/2 w-10 h-1.5 bg-white/80 rounded-full shadow-sm pointer-events-none"
                style={{ top: `${100 - temperature}%`, marginTop: '-3px' }}
              />
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className={`flex flex-col ${compact ? 'gap-4' : 'gap-8'} w-full max-w-[280px]`}>
        
        {/* Mode row */}
        <div className="flex bg-[#2c2c2e] rounded-full p-1 justify-between w-full">
          <button 
            onClick={togglePower}
            className={`flex-1 ${compact ? 'h-10' : 'h-12'} rounded-full flex items-center justify-center transition-all cursor-pointer ${!power ? 'bg-[#3a3a3c] text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
          >
            <Power className={`${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
          </button>
          
          <button 
            onClick={() => setActiveMode("brightness")}
            className={`flex-1 ${compact ? 'h-10' : 'h-12'} rounded-full flex items-center justify-center transition-all cursor-pointer ${activeMode === 'brightness' && power ? 'bg-[#4c4c4e] text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
          >
            <Sun className={`${compact ? 'w-4 h-4' : 'w-5 h-5'}`} />
          </button>
          
          <button 
            onClick={() => setActiveMode("color")}
            className={`flex-1 ${compact ? 'h-10' : 'h-12'} rounded-full flex items-center justify-center transition-all cursor-pointer ${activeMode === 'color' && power ? 'bg-[#4c4c4e] text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
          >
            <div className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} rounded-full bg-gradient-to-tr from-blue-500 via-green-400 to-red-500`} />
          </button>

          <button 
            onClick={() => setActiveMode("temp")}
            className={`flex-1 ${compact ? 'h-10' : 'h-12'} rounded-full flex items-center justify-center transition-all cursor-pointer ${activeMode === 'temp' && power ? 'bg-[#4c4c4e] text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}
          >
            <div className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} rounded-full bg-gradient-to-t from-blue-100 to-orange-400`} />
          </button>
        </div>

        {/* Presets */}
        <div className={`grid grid-cols-4 ${compact ? 'gap-x-2 gap-y-3' : 'gap-x-4 gap-y-6'} justify-items-center px-2`}>
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              onClick={() => handleColorClick(c)}
              className={`${compact ? 'w-8 h-8 border-2' : 'w-12 h-12 border-[3px]'} rounded-full cursor-pointer transition-transform hover:scale-105 active:scale-95 ${color === c && power ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'border-transparent shadow-sm'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

      </div>
    </div>
  );
};
