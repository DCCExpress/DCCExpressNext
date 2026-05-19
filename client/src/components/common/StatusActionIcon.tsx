// client/src/components/common/StatusActionIcon.tsx

import {
  ActionIcon,
  Tooltip,
  type ActionIconProps,
} from "@mantine/core";

import type {
  ReactNode,
} from "react";

export type StatusActionIconProps = {
  tooltip: ReactNode;
  children: ReactNode;
  color?: ActionIconProps["color"];
  variant?: ActionIconProps["variant"];
  size?: ActionIconProps["size"];
  disabled?: boolean;
  onClick?: () => void;
  ariaLabel?: string;
};

export default function StatusActionIcon({
  tooltip,
  children,
  color,
  variant = "filled",
  size = "sm",
  disabled = false,
  onClick,
  ariaLabel,
}: StatusActionIconProps) {
  const resolvedAriaLabel =
    ariaLabel ??
    (
      typeof tooltip === "string"
        ? tooltip
        : undefined
    );

  return (
    <Tooltip label={tooltip}>
      <ActionIcon
        size={size}
        variant={variant}
        disabled={disabled}
        {...(
          color !== undefined
            ? { color }
            : {}
        )}
        {...(
          onClick !== undefined
            ? { onClick }
            : {}
        )}
        {...(
          resolvedAriaLabel !== undefined
            ? {
                "aria-label": resolvedAriaLabel,
              }
            : {}
        )}
      >
        {children}
      </ActionIcon>
    </Tooltip>
  );
}
