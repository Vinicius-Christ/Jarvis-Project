declare global {
  interface Window {
    electronAPI?: {
      getLocalHardware: () => Promise<any>;
      openUrl: (url: string) => Promise<any>;
      runCommand: (cmd: string) => Promise<any>;
      dockerCommand: (command: string) => Promise<any>;
      getServerStatus: () => Promise<any>;
      onServerCrashed: (callback: (data: any) => void) => void;
      onDockerStatus: (callback: (data: any) => void) => void;
      log: (message: string, type?: string) => void;
    };
  }
}
export {};
