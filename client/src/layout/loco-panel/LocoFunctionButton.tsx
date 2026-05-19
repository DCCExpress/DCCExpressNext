import { Button } from "@mantine/core";
import type {
  Dispatch,
  SetStateAction,
} from "react";
import type {
  LocoFunction,
} from "../../../../common/src/types";
import { wsApi } from "../../services/wsApi";

type LocoFunctionButtonProps = {
  address: number;
  fnNumber: number;
  fn: LocoFunction | undefined;
  active: boolean;
  activeFunctions: Record<number, boolean>;
  onActiveFunctionsChange: Dispatch<
    SetStateAction<Record<number, boolean>>
  >;
};

export default function LocoFunctionButton({
  address,
  fnNumber,
  fn,
  active,
  activeFunctions,
  onActiveFunctionsChange,
}: LocoFunctionButtonProps) {
  const hasName =
    !!fn?.name?.trim();

  const releaseMomentaryFunction = () => {
    if (!fn?.momentary) {
      return;
    }

    onActiveFunctionsChange(previous => ({
      ...previous,
      [fnNumber]: false,
    }));

    wsApi.setLocoFunction(
      address,
      fnNumber,
      false
    );
  };

  return (
    <Button
      size="xs"
      variant={active ? "filled" : "light"}
      color={active ? "blue" : "gray"}
      style={{
        height: 48,
        padding: 2,
        touchAction: "none",
        userSelect: "none",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",
      }}
      styles={{
        inner: {
          width: "100%",
          height: "100%",
          justifyContent: "center",
        },
        label: {
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
      }}
      onPointerDown={event => {
        event.preventDefault();

        if (fn?.momentary) {
          wsApi.setLocoFunction(
            address,
            fnNumber,
            true
          );
          return;
        }

        wsApi.setLocoFunction(
          address,
          fnNumber,
          !activeFunctions[fnNumber]
        );
      }}
      onPointerUp={event => {
        event.preventDefault();
        releaseMomentaryFunction();
      }}
      onPointerCancel={
        releaseMomentaryFunction
      }
      onPointerLeave={
        releaseMomentaryFunction
      }
      onContextMenu={event => {
        event.preventDefault();
      }}
    >
      <span
        style={{
          width: "100%",
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          lineHeight: 1.15,
        }}
      >
        <span
          style={{
            display: "block",
            width: "100%",
            fontSize: 12,
            fontWeight: 700,
            textAlign: "center",
          }}
        >
          F{fnNumber}
        </span>

        {hasName && (
          <span
            style={{
              display: "block",
              width: "100%",
              minWidth: 0,
              fontSize: 10,
              opacity: 0.85,
              marginTop: 2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              textAlign: "center",
            }}
          >
            {fn?.name}
            {fn?.momentary ? " *" : ""}
          </span>
        )}
      </span>
    </Button>
  );
}
