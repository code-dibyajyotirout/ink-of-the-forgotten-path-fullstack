"use client";

import type { SaveData } from "@/systems/SaveManager";

export interface ConflictData {
  local: { chapter: number; zone: string; playtimeFormatted: string; timestamp: number };
  imported: { chapter: number; zone: string; playtimeFormatted: string; timestamp: number; rawData: SaveData };
}

interface CloudTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExportSave: () => void;
  onCopyShareLink: () => void;
  onImportClick: () => void;
  transferStatus: string;
  conflictData: ConflictData | null;
  onResolveConflict: (choice: "overwrite" | "cancel") => void;
}

export function CloudTransferModal({
  isOpen,
  onClose,
  onExportSave,
  onCopyShareLink,
  onImportClick,
  transferStatus,
  conflictData,
  onResolveConflict,
}: CloudTransferModalProps) {
  if (!isOpen) return null;

  return (
    <div className="hud-menu-modal-backdrop">
      <div className="hud-menu-modal-box cloud-save-modal">
        <div className="hud-menu-modal-header">
          <h2 className="hud-menu-modal-title">Save File Transfer Manager</h2>
          <button className="hud-menu-close-btn" style={{ fontSize: "20px" }} onClick={onClose}>&times;</button>
        </div>

        <div className="hud-menu-modal-body cloud-modal-container">
          <div className="cloud-section">
            <h3>Export Save File</h3>
            <p>Download your current progress as an encrypted <code>.inkpath</code> file to keep a backup or play on another browser.</p>
            <button className="cloud-action-btn" onClick={onExportSave}>
              Download File
            </button>
          </div>

          <div className="cloud-divider" />

          <div className="cloud-section">
            <h3>Copy Save Link</h3>
            <p>Generate a shareable link containing your entire save state. Paste it into another browser or device directly to load!</p>
            <button className="cloud-action-btn" onClick={onCopyShareLink}>
              Copy Save Link
            </button>
          </div>

          <div className="cloud-divider" />

          <div className="cloud-section">
            <h3>Import Save File</h3>
            <p>Load progress from a previously exported <code>.inkpath</code> save file on your device.</p>
            <button className="cloud-action-btn" onClick={onImportClick}>
              Select Save File
            </button>
          </div>
        </div>

        {/* Status box */}
        {transferStatus && (
          <div className="cloud-status-box">
            <p>{transferStatus}</p>
          </div>
        )}

        {/* Conflict resolution screen */}
        {conflictData && (
          <div className="conflict-overlay">
            <div className="conflict-box">
              <h3>Save Conflict Detected</h3>
              <p>A local save already exists on this browser. Compare files below before deciding to overwrite.</p>

              <div className="conflict-grid">
                <div className="conflict-card local-card">
                  <h4>Local Browser Save</h4>
                  <div className="conflict-detail">
                    <span>Chapter:</span> <strong>Chapter {conflictData.local.chapter}</strong>
                  </div>
                  <div className="conflict-detail">
                    <span>Zone:</span> <strong>{conflictData.local.zone.replace(/_/g, ' ').toUpperCase()}</strong>
                  </div>
                  <div className="conflict-detail">
                    <span>Playtime:</span> <strong>{conflictData.local.playtimeFormatted}</strong>
                  </div>
                  <div className="conflict-detail">
                    <span>Date Saved:</span> <strong>{new Date(conflictData.local.timestamp).toLocaleString()}</strong>
                  </div>
                </div>

                <div className="conflict-card cloud-card">
                  <h4>Imported Save File</h4>
                  <div className="conflict-detail">
                    <span>Chapter:</span> <strong>Chapter {conflictData.imported.chapter}</strong>
                  </div>
                  <div className="conflict-detail">
                    <span>Zone:</span> <strong>{conflictData.imported.zone.replace(/_/g, ' ').toUpperCase()}</strong>
                  </div>
                  <div className="conflict-detail">
                    <span>Playtime:</span> <strong>{conflictData.imported.playtimeFormatted}</strong>
                  </div>
                  <div className="conflict-detail">
                    <span>Date Saved:</span> <strong>{new Date(conflictData.imported.timestamp).toLocaleString()}</strong>
                  </div>
                </div>
              </div>

              <div className="conflict-actions">
                <button
                  className="conflict-btn overwrite-btn"
                  onClick={() => onResolveConflict("overwrite")}
                >
                  Overwrite Local Browser Save
                </button>
                <button
                  className="conflict-btn cancel-btn"
                  onClick={() => onResolveConflict("cancel")}
                >
                  Cancel Import
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
