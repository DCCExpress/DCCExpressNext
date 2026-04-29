import { Center, Loader, Overlay, Stack, Text } from "@mantine/core";

type FullscreenLoaderProps = {
  visible: boolean;
  text?: string;
};

export default function FullscreenLoader({
  visible,
  text = "Loading...",
}: FullscreenLoaderProps) {
  if (!visible) return null;

  return (
    <Overlay
      fixed
      zIndex={9999}
      blur={1}
      backgroundOpacity={0.1}
    >
      <Center h="100vh">
        <Stack align="center" gap="sm">
          <Loader size="xl" />
          <Text size="md" c="dimmed">
            {text}
          </Text>
        </Stack>
      </Center>
    </Overlay>
  );
}