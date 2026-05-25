import {
  Badge,
  Button,
  Card,
  Container,
  Group,
  Image,
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
import { useTranslation } from "react-i18next";
import LanguageSelector from "../components/common/LanguageSelector";

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
  const { t } = useTranslation();

  const cards: HomeCardItem[] = [
    {
      key: "layout",
      title: t("home.cards.layout.title"),
      description: t("home.cards.layout.description"),
      image: "/images/home-layout.jpg",
      buttonLabel: t("home.cards.layout.button"),
      icon: <IconMap2 size={18} />,
      onClick: onOpenLayout,
      disabled: false,
    }, {
      key: "programmer",
      title: t("home.cards.programmer.title"),
      description: t("home.cards.programmer.description"),
      image: "/images/home-programmer.jpg",
      buttonLabel: t("home.comingSoon"),
      icon: <IconTool size={18} />,
      onClick: onOpenProgrammer,
      disabled: false,
    },
    {
      key: "mobile",
      title: t("home.cards.mobile.title"),
      description: t("home.cards.mobile.description"),
      image: "/images/home-mobile.jpg",
      buttonLabel: t("home.comingSoon"),
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
          <Paper
            radius="md"
            p={4}
            withBorder
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              zIndex: 2,
              background: "color-mix(in srgb, var(--mantine-color-body) 78%, transparent)",
              backdropFilter: "blur(10px)",
            }}
          >
            <LanguageSelector variant="light" size="lg" width={68} />
          </Paper>

          <Stack
            gap="md"
            style={{
              position: "relative",
              zIndex: 1,
              paddingRight: 96,
            }}
          >
            <Badge variant="light" size="lg" radius="sm" w="fit-content">
              DCCExpress
            </Badge>

            <Title order={1}>
              {t("home.heroTitle").split("\n").map((line, index) => (
                <span key={line}>
                  {line}
                  {index === 0 && <br />}
                </span>
              ))}
            </Title>

            <Text size="lg" c="dimmed" maw={760}>
              {t("home.heroDescription")}
            </Text>

            <Group>
              <Button
                size="md"
                rightSection={<IconArrowRight size={16} />}
                onClick={onOpenLayout}
              >
                {t("home.startLayout")}
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
