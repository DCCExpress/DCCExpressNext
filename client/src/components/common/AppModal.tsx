import {
  Box,
  Modal,
  type ModalProps,
} from "@mantine/core";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

type AppModalProps = ModalProps & {
  draggable?: boolean;
  resetPositionOnOpen?: boolean;
};

type ModalOffset = {
  x: number;
  y: number;
};

type DragState = {
  pointerId: number;
  startPointerX: number;
  startPointerY: number;
  startOffsetX: number;
  startOffsetY: number;
  dialogRect: DOMRect;
};

const MIN_VISIBLE_HEADER_WIDTH = 180;
const MODAL_HEADER_HEIGHT = 56;

export default function AppModal({
  draggable = false,
  resetPositionOnOpen = true,
  title,
  styles,
  closeButtonProps,
  opened,
  ...props
}: AppModalProps) {
  const [offset, setOffset] = useState<ModalOffset>({ x: 0, y: 0 });
  const dragStateRef = useRef<DragState | null>(null);

  useEffect(() => {
    if (opened && resetPositionOnOpen) {
      setOffset({ x: 0, y: 0 });
      dragStateRef.current = null;
    }
  }, [opened, resetPositionOnOpen]);

  useEffect(() => {
    const handlePointerMove = (ev: PointerEvent) => {
      const dragState = dragStateRef.current;

      if (!dragState) return;
      if (ev.pointerId !== dragState.pointerId) return;

      const rawDx = ev.clientX - dragState.startPointerX;
      const rawDy = ev.clientY - dragState.startPointerY;

      const nextDialogLeft = dragState.dialogRect.left + rawDx;
      const nextDialogTop = dragState.dialogRect.top + rawDy;

      const minLeft =
        MIN_VISIBLE_HEADER_WIDTH - dragState.dialogRect.width;

      const maxLeft =
        window.innerWidth - MIN_VISIBLE_HEADER_WIDTH;

      const minTop = 0;
      const maxTop = window.innerHeight - MODAL_HEADER_HEIGHT;

      const clampedLeft = Math.min(
        maxLeft,
        Math.max(minLeft, nextDialogLeft)
      );

      const clampedTop = Math.min(
        maxTop,
        Math.max(minTop, nextDialogTop)
      );

      const clampedDx = clampedLeft - dragState.dialogRect.left;
      const clampedDy = clampedTop - dragState.dialogRect.top;

      setOffset({
        x: dragState.startOffsetX + clampedDx,
        y: dragState.startOffsetY + clampedDy,
      });
    };

    const stopDragging = (ev: PointerEvent) => {
      const dragState = dragStateRef.current;

      if (!dragState) return;
      if (ev.pointerId !== dragState.pointerId) return;

      dragStateRef.current = null;
      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);

      document.body.style.userSelect = "";
      document.body.style.webkitUserSelect = "";
    };
  }, []);

  const handleDragAreaPointerDown = (
    ev: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (!draggable) return;

    if (ev.pointerType === "mouse" && ev.button !== 0) {
      return;
    }

    ev.preventDefault();

    const dragAreaElement = ev.currentTarget;

    const modalContentElement = dragAreaElement.closest(
      ".mantine-Modal-content"
    ) as HTMLElement | null;

    if (!modalContentElement) {
      return;
    }

    dragStateRef.current = {
      pointerId: ev.pointerId,
      startPointerX: ev.clientX,
      startPointerY: ev.clientY,
      startOffsetX: offset.x,
      startOffsetY: offset.y,
      dialogRect: modalContentElement.getBoundingClientRect(),
    };

    dragAreaElement.setPointerCapture?.(ev.pointerId);

    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";
  };

  const handleDragAreaDoubleClick = () => {
    if (!draggable) return;

    setOffset({ x: 0, y: 0 });
  };

  const modalTitle = draggable ? (
    <Box
      onPointerDown={handleDragAreaPointerDown}
      onDoubleClick={handleDragAreaDoubleClick}
      title="Drag to move • Double-click to reset position"
      style={{
        width: "100%",
        height: "100%",
        minHeight: MODAL_HEADER_HEIGHT,
        display: "flex",
        alignItems: "center",
        paddingLeft: "var(--mantine-spacing-md)",
        paddingRight: "var(--mantine-spacing-md)",
        cursor: "move",
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "none",
      }}
    >
      {title}
    </Box>
  ) : (
    title
  );

  return (
    <Modal
      {...props}
      opened={opened}
      title={modalTitle}
      closeButtonProps={{
        ...closeButtonProps,
        style: {
          color: "white",
          marginRight: 12,
          ...closeButtonProps?.style,
        },
      }}
      styles={{
        ...styles,

        inner: {
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
          willChange: draggable ? "transform" : "auto",
          ...(
            typeof styles === "object"
              ? styles?.inner
              : undefined
          ),
        },

        header: {
          minHeight: MODAL_HEADER_HEIGHT,
          padding: 0,
          backgroundColor: "var(--mantine-primary-color-filled)",
          userSelect: draggable ? "none" : undefined,
          WebkitUserSelect: draggable ? "none" : undefined,
          ...(
            typeof styles === "object"
              ? styles?.header
              : undefined
          ),
        },

        title: {
          color: "white",
          fontWeight: 700,
          flex: 1,
          alignSelf: "stretch",
          minWidth: 0,
          margin: 0,
          display: "flex",
          ...(
            typeof styles === "object"
              ? styles?.title
              : undefined
          ),
        },
      }}
    />
  );
}