import { useState, useEffect } from "react";

export interface DeviceCapability {
  hasWebGPU: boolean;
  hasWebGL2: boolean;
  maxTextureSize: number;
  hardwareConcurrency: number;
  deviceMemoryGB: number;
  gpuTier: "high" | "medium" | "low";
}

export function useDeviceCapability(): DeviceCapability {
  const [capability, setCapability] = useState<DeviceCapability>({
    hasWebGPU: false,
    hasWebGL2: false,
    maxTextureSize: 4096,
    hardwareConcurrency: 4,
    deviceMemoryGB: 8,
    gpuTier: "medium",
  });

  useEffect(() => {
    let hasWebGPU = false;
    let hasWebGL2 = false;
    let maxTextureSize = 4096;
    let hardwareConcurrency = 4;
    let deviceMemoryGB = 8;

    if (typeof navigator !== "undefined") {
      hasWebGPU = "gpu" in navigator;
      hardwareConcurrency = navigator.hardwareConcurrency || 4;
      if ("deviceMemory" in navigator) {
        deviceMemoryGB = (navigator as unknown as { deviceMemory: number }).deviceMemory || 8;
      }
    }

    if (typeof document !== "undefined") {
      try {
        const canvas = document.createElement("canvas");
        const gl2 = canvas.getContext("webgl2");
        if (gl2) {
          hasWebGL2 = true;
          maxTextureSize = gl2.getParameter(gl2.MAX_TEXTURE_SIZE) || 4096;
        }
      } catch {
        // Fallback for sandboxed DOM
      }
    }

    const gpuTier: "high" | "medium" | "low" =
      hasWebGPU || (hasWebGL2 && hardwareConcurrency >= 8 && deviceMemoryGB >= 8)
        ? "high"
        : hasWebGL2 && hardwareConcurrency >= 4
        ? "medium"
        : "low";

    setCapability({
      hasWebGPU,
      hasWebGL2,
      maxTextureSize,
      hardwareConcurrency,
      deviceMemoryGB,
      gpuTier,
    });
  }, []);

  return capability;
}
