"use client";

import { useState, useCallback, useEffect } from "react";
import { saveManager, type SaveData } from "@/systems/SaveManager";
import type { ConflictData } from "../CloudTransferModal";

export function useCloudSaveTransfer() {
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferStatus, setTransferStatus] = useState("");
  const [conflictData, setConflictData] = useState<ConflictData | null>(null);

  const handleExportSave = useCallback(async () => {
    setTransferStatus("Saving locally...");
    await saveManager.saveToSlot(1);
    setTransferStatus("Exporting file...");
    await saveManager.exportSave(1);
    setTransferStatus("Save file exported and downloaded successfully!");
    setTimeout(() => setTransferStatus(""), 4000);
  }, []);

  const handleCopyShareLink = useCallback(async () => {
    setTransferStatus("Saving locally...");
    await saveManager.saveToSlot(1);
    setTransferStatus("Generating share link...");
    try {
      const link = await saveManager.generateShareLink(1);
      await navigator.clipboard.writeText(link);
      setTransferStatus("Link copied to clipboard! Share it with another device.");
      setTimeout(() => setTransferStatus(""), 5000);
    } catch (err) {
      console.error(err);
      setTransferStatus("Error: Failed to generate share link.");
    }
  }, []);

  const handleImportClick = useCallback(async () => {
    setTransferStatus("");
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".inkpath,.json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      setTransferStatus("Reading file...");
      try {
        const text = await file.text();
        const payload = JSON.parse(text);

        if (payload.magic !== "INKPATH_V1") {
          setTransferStatus("Error: Invalid save file format");
          return;
        }

        const importedSave: SaveData = JSON.parse(payload.data);
        const localSlotInfo = await saveManager.getSlotInfo();
        const localSave = localSlotInfo[1];

        if (localSave && localSave.exists && localSave.meta && localSave.timestamp) {
          setConflictData({
            local: {
              chapter: localSave.meta.chapter,
              zone: localSave.meta.zone,
              playtimeFormatted: localSave.meta.playtimeFormatted,
              timestamp: localSave.timestamp,
            },
            imported: {
              chapter: importedSave.meta.chapter,
              zone: importedSave.meta.zone,
              playtimeFormatted: importedSave.meta.playtimeFormatted,
              timestamp: importedSave.timestamp,
              rawData: importedSave,
            },
          });
          setTransferStatus("Warning: Local save conflict detected. Compare saves below.");
        } else {
          setTransferStatus("Importing save...");
          await saveManager.writeSaveData(1, importedSave);
          await saveManager.loadFromSlot(1);
          setTransferStatus("Import complete! Game loaded successfully.");
          setTimeout(() => setShowTransferModal(false), 2000);
        }
      } catch (err) {
        console.error(err);
        setTransferStatus("Error: Failed to parse save file");
      }
    };
    input.click();
  }, []);

  const handleResolveConflict = useCallback(
    async (choice: "overwrite" | "cancel") => {
      if (choice === "overwrite" && conflictData) {
        setTransferStatus("Importing and loading save...");
        await saveManager.writeSaveData(1, conflictData.imported.rawData);
        await saveManager.loadFromSlot(1);
        setConflictData(null);
        setTransferStatus("Import complete! Game loaded successfully.");
        setTimeout(() => setShowTransferModal(false), 2000);
      } else {
        setConflictData(null);
        setTransferStatus("Import cancelled.");
      }
    },
    [conflictData]
  );

  useEffect(() => {
    const checkHashImport = async () => {
      const hash = window.location.hash;
      if (hash.startsWith("#import=")) {
        const base64 = hash.replace("#import=", "");
        window.history.replaceState(null, "", window.location.pathname);

        setTransferStatus("Reading shared link...");
        const importedSave = saveManager.decodeShareData(base64);
        if (!importedSave) {
          setTransferStatus("Error: Invalid or corrupted share link.");
          setShowTransferModal(true);
          return;
        }

        const localSlotInfo = await saveManager.getSlotInfo();
        const localSave = localSlotInfo[1];

        setShowTransferModal(true);
        if (localSave && localSave.exists && localSave.meta && localSave.timestamp) {
          setConflictData({
            local: {
              chapter: localSave.meta.chapter,
              zone: localSave.meta.zone,
              playtimeFormatted: localSave.meta.playtimeFormatted,
              timestamp: localSave.timestamp,
            },
            imported: {
              chapter: importedSave.meta.chapter,
              zone: importedSave.meta.zone,
              playtimeFormatted: importedSave.meta.playtimeFormatted,
              timestamp: importedSave.timestamp,
              rawData: importedSave,
            },
          });
          setTransferStatus("Warning: Local browser save conflict detected. Compare saves below.");
        } else {
          setTransferStatus("Importing save from link...");
          await saveManager.writeSaveData(1, importedSave);
          await saveManager.loadFromSlot(1);
          setTransferStatus("Import complete! Game loaded successfully.");
          setTimeout(() => setShowTransferModal(false), 2000);
        }
      }
    };

    checkHashImport();
  }, []);

  return {
    showTransferModal,
    setShowTransferModal,
    transferStatus,
    conflictData,
    handleExportSave,
    handleCopyShareLink,
    handleImportClick,
    handleResolveConflict,
  };
}
