// client/src/components/track-canvas/TrackCanvasBlockLocoPicker.tsx

import type {
  Loco,
} from "../../../../common/src/types";

import type {
  BlockElementView,
} from "../../models/editor/elements/BlockElementView";

import {
  wsApi,
} from "../../services/wsApi";

import LocoPicker from "../loco/LocoPicker";

export type TrackCanvasBlockLocoPickerProps = {
  opened: boolean;
  locos: Loco[];
  selectedBlock: BlockElementView | null;
  onClose: () => void;
};

export function TrackCanvasBlockLocoPicker({
  opened,
  locos,
  selectedBlock,
  onClose,
}: TrackCanvasBlockLocoPickerProps) {
  const selectedLocoId =
    selectedBlock?.locoAddress
      ? locos.find(loco => loco.address === selectedBlock.locoAddress)?.id || ""
      : "";

  return (
    <LocoPicker
      opened={opened}
      locos={locos}
      selectedLocoId={selectedLocoId}
      onClose={onClose}
      onSelect={(loco) => {
        if (!selectedBlock) {
          return;
        }

        wsApi.setBlock(
          selectedBlock.id,
          loco.id
        );

        onClose();
      }}
      onRemoveLoco={() => {
        if (!selectedBlock) {
          return;
        }

        const locoId =
          locos.find(loco => loco.address === selectedBlock.locoAddress)?.id || "";

        wsApi.setBlockRemove(
          selectedBlock.id,
          locoId
        );

        onClose();
      }}
      onRemoveAllLoco={() => {
        if (!selectedBlock) {
          return;
        }

        wsApi.setBlocksReset();
        onClose();
      }}
    />
  );
}
