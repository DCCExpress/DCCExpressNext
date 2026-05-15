import { Modal, type ModalProps } from "@mantine/core";

type AppModalProps = ModalProps;

export default function AppModal(props: AppModalProps) {
  return (
    <Modal
      {...props}
      closeButtonProps={{
        ...props.closeButtonProps,
        style: {
          color: "white",
          ...props.closeButtonProps?.style,
        },
      }}
      styles={{
        ...props.styles,
        header: {
          backgroundColor: "var(--mantine-primary-color-filled)",
          ...(
            typeof props.styles === "object"
              ? props.styles?.header
              : undefined
          ),
        },
        title: {
          color: "white",
          fontWeight: 700,
          ...(
            typeof props.styles === "object"
              ? props.styles?.title
              : undefined
          ),
        },
      }}
    />
  );
}