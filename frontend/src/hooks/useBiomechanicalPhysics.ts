import { useRef, useCallback } from "react";
import { BiomechanicalPhysics, BiomechanicalFrame, Vector3D } from "../utils/BiomechanicalPhysics";

export function useBiomechanicalPhysics(effectiveMassKg: number = 4.2) {
  const engineRef = useRef<BiomechanicalPhysics | null>(null);

  if (!engineRef.current) {
    engineRef.current = new BiomechanicalPhysics(effectiveMassKg);
  }

  const processFrame = useCallback((pos: Vector3D, timestamp?: number): BiomechanicalFrame => {
    return engineRef.current!.processFrame(pos, timestamp);
  }, []);

  const reset = useCallback((): void => {
    engineRef.current?.reset();
  }, []);

  return { processFrame, reset };
}
