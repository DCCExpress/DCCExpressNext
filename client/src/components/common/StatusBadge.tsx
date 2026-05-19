// client/src/components/common/StatusBadge.tsx

import {
  Badge,
  Group,
  Tooltip,
  type BadgeProps,
} from "@mantine/core";

import type {
  CSSProperties,
  ReactNode,
} from "react";

export type StatusBadgeProps = {
  color?: BadgeProps["color"];
  variant?: BadgeProps["variant"];
  tooltip?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  onClick?: () => void;
  blink?: boolean;
  className?: string;
  style?: CSSProperties;
  numeric?: boolean;
};

export default function StatusBadge({
  color,
  variant = "filled",
  tooltip,
  icon,
  children,
  onClick,
  blink = false,
  className,
  style,
  numeric = false,
}: StatusBadgeProps) {
  const mergedClassName =
    [
      className,
      blink ? "blinkBadge" : "",
    ]
      .filter(Boolean)
      .join(" ") || undefined;

  const mergedStyle: CSSProperties = {
    ...(numeric
      ? {
          fontVariantNumeric: "tabular-nums",
        }
      : {}),
    ...(onClick
      ? {
          cursor: "pointer",
        }
      : {}),
    ...style,
  };

  const badge = (
    <Badge
      variant={variant}
      style={mergedStyle}
      {...(
        color !== undefined
          ? { color }
          : {}
      )}
      {...(
        mergedClassName !== undefined
          ? { className: mergedClassName }
          : {}
      )}
      {...(
        onClick !== undefined
          ? { onClick }
          : {}
      )}
    >
      {icon ? (
        <Group
          gap={4}
          wrap="nowrap"
        >
          {icon}
          <span>{children}</span>
        </Group>
      ) : (
        children
      )}
    </Badge>
  );

  if (!tooltip) {
    return badge;
  }

  return (
    <Tooltip label={tooltip}>
      {badge}
    </Tooltip>
  );
}
