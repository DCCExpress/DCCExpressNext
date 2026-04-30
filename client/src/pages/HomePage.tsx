import {
  Badge,
  Button,
  Card,
  Container,
  Group,
  Image,
  Overlay,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconArrowRight,
  IconDeviceMobile,
  IconMap2,
  IconTool,
} from "@tabler/icons-react";
import type { ReactNode } from "react";

type HomePageProps = {
  onOpenLayout: () => void;
  onOpenProgrammer: () => void;
};

type HomeCardItem = {
  key: string;
  title: string;
  description: string;
  image: string;
  buttonLabel: string;
  icon: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
};

export default function HomePage({ onOpenLayout, onOpenProgrammer }: HomePageProps) {
  const cards: HomeCardItem[] = [
    {
      key: "layout",
      title: "Layout & Control",
      description:
        "Design your railway layout and control it live with turnouts, signals, sensors, blocks, routes, and locomotive panels.",
      image: "/images/home-layout.jpg",
      buttonLabel: "Open Layout & Control",
      icon: <IconMap2 size={18} />,
      onClick: onOpenLayout,
      disabled: false,
    }, {
      key: "programmer",
      title: "Programmer",
      description:
        "Configure locomotives, accessories, functions, decoder values, and automation settings from a clean programming workspace.",
      image: "/images/home-programmer.jpg",
      buttonLabel: "Coming Soon",
      icon: <IconTool size={18} />,
      onClick: onOpenProgrammer,
      disabled: false,
    },
    {
      key: "mobile",
      title: "Mobile Controller",
      description:
        "Control your trains from a touch-friendly interface with speed control, direction, emergency stop, and function buttons.",
      image: "/images/home-mobile.jpg",
      buttonLabel: "Coming Soon",
      icon: <IconDeviceMobile size={18} />,
      disabled: true,
    },
  ];

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Paper
          radius="lg"
          p="xl"
          withBorder
          style={{
            position: "relative",
            overflow: "hidden",
            minHeight: 230,
            background:
              "linear-gradient(135deg, rgba(34,139,230,0.14) 0%, rgba(64,192,87,0.10) 100%)",
          }}
        >
          <Stack
            gap="md"
            style={{
              position: "relative",
              zIndex: 1,
            }}
          >
            <Badge variant="light" size="lg" radius="sm" w="fit-content">
              DCCExpress
            </Badge>

            <Title order={1}>
              Railway control made simple,
              <br />
              visual and powerful.
            </Title>

            <Text size="lg" c="dimmed" maw={760}>
              Welcome to DCCExpress — a modern model railway control system for
              editing layouts, programming railway components, and controlling
              trains from desktop or mobile devices.
            </Text>

            <Group>
              <Button
                size="md"
                rightSection={<IconArrowRight size={16} />}
                onClick={onOpenLayout}
              >
                Start with Layout Editor
              </Button>
            </Group>
          </Stack>
        </Paper>

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          {cards.map((item) => (
            <Card
              key={item.key}
              shadow="sm"
              padding="lg"
              radius="lg"
              withBorder
              style={{
                display: "flex",
                flexDirection: "column",
                height: "100%",
                opacity: item.disabled ? 0.72 : 1,
                transition: "transform 160ms ease, box-shadow 160ms ease",
              }}
              onMouseEnter={(ev) => {
                if (item.disabled) return;

                ev.currentTarget.style.transform = "translateY(-4px)";
                ev.currentTarget.style.boxShadow = "var(--mantine-shadow-md)";
              }}
              onMouseLeave={(ev) => {
                ev.currentTarget.style.transform = "translateY(0)";
                ev.currentTarget.style.boxShadow = "var(--mantine-shadow-sm)";
              }}
            >
              <Card.Section>
                <Image
                  src={item.image}
                  alt={item.title}
                  h={180}
                  fit="cover"
                  fallbackSrc={`https://placehold.co/800x450?text=${encodeURIComponent(
                    item.title
                  )}`}
                />
              </Card.Section>

              <Stack gap="sm" mt="md" style={{ flex: 1 }}>
                <Group gap="xs" align="center">
                  <ThemeIcon variant="light" size="lg" radius="md">
                    {item.icon}
                  </ThemeIcon>

                  <Title order={3}>{item.title}</Title>
                </Group>

                <Text size="sm" c="dimmed" style={{ flex: 1 }}>
                  {item.description}
                </Text>

                <Button
                  variant={item.disabled ? "default" : "light"}
                  fullWidth
                  mt="sm"
                  disabled={item.disabled === true}
                  rightSection={
                    item.disabled === true ? undefined : <IconArrowRight size={16} />
                  }
                  onClick={item.disabled === true ? undefined : item.onClick}
                >
                  {item.buttonLabel}
                </Button>
              </Stack>
            </Card>
          ))}
        </SimpleGrid>
      </Stack>
    </Container>
  );
}