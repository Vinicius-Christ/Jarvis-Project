import React from "react";
export default function CyberGauge({ value, onChange, color }: { value: number, onChange: (v: number) => void, color: string }) {
  const radius = 30;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="relative w-24 h-14 flex flex-col items-center justify-end cursor-pointer group" onMouseDown={(e) => {
      const target = e.currentTarget;
      const doChange = (ev: MouseEvent | React.MouseEvent) => {
        const rect = target.getBoundingClientRect();
        const x = ev.clientX - rect.left - rect.width / 2;
        const y = ev.clientY - rect.top - (rect.height - 8);
        const angle = Math.atan2(y, x);
        let percent = (Math.PI + angle) / Math.PI;
        if (percent < 0) percent = 0;
        if (percent > 1) percent = 1;
        onChange(Math.round(percent * 100));
      };
      doChange(e);
      const onMouseMove = (ev: MouseEvent) => doChange(ev);
      const onMouseUp = () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }}>
      <svg className="w-full h-full overflow-visible drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]" viewBox="0 0 80 40">
        <path d="M 10 40 A 30 30 0 0 1 70 40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" strokeLinecap="round" />
        <path d="M 10 40 A 30 30 0 0 1 70 40" fill="none" stroke={color || "var(--brand-primary, #06b6d4)"} strokeWidth="5" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-150 ease-out" />
        <text x="40" y="36" textAnchor="middle" fill="#fff" fontSize="12" fontFamily="monospace" fontWeight="bold">{value}%</text>
      </svg>
    </div>
  );
};
