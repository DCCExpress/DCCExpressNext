import {
  Badge,
  Box,
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

const HERO_BACKGROUND_IMAGE = "/images/home-hero.png";
const CARD_IMAGE_FADE_MASK =
  "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) calc(100% - 42px), rgba(0,0,0,0) 100%)";

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
      image: "/images/layout-card.png",
      buttonLabel: t("home.cards.layout.button"),
      icon: <IconMap2 size={18} />,
      onClick: onOpenLayout,
      disabled: false,
    }, {
      key: "programmer",
      title: t("home.cards.programmer.title"),
      description: t("home.cards.programmer.description"),
      image: "/images/programmer-card.png",
      buttonLabel: t("home.comingSoon"),
      icon: <IconTool size={18} />,
      onClick: onOpenProgrammer,
      disabled: false,
    },
    {
      key: "mobile",
      title: t("home.cards.mobile.title"),
      description: t("home.cards.mobile.description"),
      image: "/images/mobile-card.png",
      buttonLabel: t("home.comingSoon"),
      icon: <IconDeviceMobile size={18} />,
      disabled: true,
    },
  ];

  return (
    <Box
      mih="100vh"
      style={{
        background:
          "radial-gradient(circle at 82% 18%, rgba(34, 139, 230, 0.22) 0%, transparent 32%), radial-gradient(circle at 18% 78%, rgba(64, 192, 87, 0.10) 0%, transparent 34%), linear-gradient(135deg, #06101f 0%, #071827 42%, #020711 100%)",
      }}
    >
      <Container size="xl" py="xl">
        <Stack gap="xl">
          <Paper
            radius="lg"
            p="xl"
            withBorder
            style={{
              position: "relative",
              overflow: "hidden",
              minHeight: 360,
              backgroundImage: `linear-gradient(90deg, rgba(5, 13, 27, 0.96) 0%, rgba(5, 13, 27, 0.86) 34%, rgba(5, 13, 27, 0.34) 67%, rgba(5, 13, 27, 0.18) 100%), url(${HERO_BACKGROUND_IMAGE})`,
              backgroundPosition: "center",
              backgroundSize: "cover",
              borderColor: "rgba(100, 210, 255, 0.20)",
              boxShadow: "0 26px 70px rgba(0, 0, 0, 0.38), 0 0 0 1px rgba(120, 220, 255, 0.06)",
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
              justify="center"
              style={{
                position: "relative",
                zIndex: 1,
                minHeight: 300,
                maxWidth: 760,
                paddingRight: 96,
              }}
            >
              <Badge variant="light" size="lg" radius="sm" w="fit-content">
                DCCExpress
              </Badge>

              <Title order={1} c="white">
                {t("home.heroTitle").split("\n").map((line, index) => (
                  <span key={line}>
                    {line}
                    {index === 0 && <br />}
                  </span>
                ))}
              </Title>

              <Text size="lg" c="gray.3" maw={720}>
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
                  position: "relative",
                  overflow: "hidden",
                  opacity: item.disabled ? 0.78 : 1,
                  transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, background 160ms ease",
                  background:
                    "linear-gradient(180deg, rgba(12, 31, 52, 0.58) 0%, rgba(4, 12, 24, 0.36) 100%)",
                  borderColor: "rgba(120, 220, 255, 0.18)",
                  backdropFilter: "blur(14px) saturate(1.22)",
                  boxShadow: "0 12px 36px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.045)",
                }}
                onMouseEnter={(ev) => {
                  if (item.disabled) return;

                  ev.currentTarget.style.transform = "translateY(-5px)";
                  ev.currentTarget.style.boxShadow = "0 22px 58px rgba(0, 0, 0, 0.34), 0 0 28px rgba(34, 139, 230, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.07)";
                  ev.currentTarget.style.borderColor = "rgba(120, 220, 255, 0.42)";
                  ev.currentTarget.style.background = "linear-gradient(180deg, rgba(16, 43, 72, 0.66) 0%, rgba(5, 15, 29, 0.42) 100%)";
                }}
                onMouseLeave={(ev) => {
                  ev.currentTarget.style.transform = "translateY(0)";
                  ev.currentTarget.style.boxShadow = "0 12px 36px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.045)";
                  ev.currentTarget.style.borderColor = "rgba(120, 220, 255, 0.18)";
                  ev.currentTarget.style.background = "linear-gradient(180deg, rgba(12, 31, 52, 0.58) 0%, rgba(4, 12, 24, 0.36) 100%)";
                }}
              >
                <Card.Section style={{ position: "relative", overflow: "hidden" }}>
                  <Image
                    src={item.image}
                    alt={item.title}
                    h={180}
                    fit="cover"
                    fallbackSrc={`https://placehold.co/800x450?text=${encodeURIComponent(
                      item.title
                    )}`}
                    style={{
                      display: "block",
                      WebkitMaskImage: CARD_IMAGE_FADE_MASK,
                      maskImage: CARD_IMAGE_FADE_MASK,
                    }}
                  />
                  <Box
                    style={{
                      position: "absolute",
                      inset: 0,
                      pointerEvents: "none",
                      background:
                        "radial-gradient(circle at 50% 0%, rgba(90, 200, 255, 0.14) 0%, transparent 48%)",
                    }}
                  />
                </Card.Section>

                <Stack gap="sm" mt="md" style={{ flex: 1, position: "relative" }}>
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
    </Box>
  );
}
