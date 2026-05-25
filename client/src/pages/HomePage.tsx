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
  IconHeartHandshake,
  IconMap2,
  IconSparkles,
  IconTool,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import LanguageSelector from "../components/common/LanguageSelector";
import "../styles/global.css";

const HERO_BACKGROUND_IMAGE = "/images/home-hero.png";
const CARD_IMAGE_FADE_MASK =
  "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) calc(100% - 42px), rgba(0,0,0,0) 100%)";

const THANKS_TECH_ITEMS = [
  "React",
  "Mantine",
  "Node.js",
  "Express",
  "TypeScript",
  "Vite",
  "Tabler Icons",
  "WebSocket / ws",
  "CodeMirror",
  "i18next",
  "Zod",
  "SerialPort",
] as const;

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
  url?: string;
  onClick?: () => void;
  disabled?: boolean;
};

type NetworkUrlInfo = {
  name: string;
  address: string;
  desktop: string;
  mobile: string;
};

type NetworkInfoResponse = {
  ok: boolean;
  hostName?: string;
  port?: number;
  urls?: NetworkUrlInfo[];
};

function normalizeLanguage(language: string): string {
  const shortCode = language.split("-")[0]?.toLowerCase();

  if (shortCode === "hu" || shortCode === "de" || shortCode === "en") {
    return shortCode;
  }

  return "en";
}

function trimTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function withLanguage(url: string, language: string): string {
  const separator = url.includes("?") ? "&" : "?";
  const lang = encodeURIComponent(normalizeLanguage(language));

  return `${trimTrailingSlash(url)}${separator}lang=${lang}`;
}

function createFallbackDesktopUrl(): string {
  const protocol = window.location.protocol;
  return `${protocol}//${window.location.hostname}:3000`;
}

function activateCard(item: HomeCardItem): void {
  if (item.disabled === true) {
    return;
  }

  item.onClick?.();
}

function UrlPill({ label, url }: { label: string; url: string }) {
  return (
    <Box
      p="xs"
      style={{
        border: "1px solid rgba(120, 220, 255, 0.24)",
        borderRadius: 12,
        background:
          "linear-gradient(135deg, rgba(34, 139, 230, 0.18), rgba(4, 12, 24, 0.10))",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
      }}
    >
      <Text size="xs" fw={700} c="cyan.2" mb={4} tt="uppercase">
        {label}
      </Text>
      <Text
        size="sm"
        fw={700}
        c="blue.1"
        style={{
          wordBreak: "break-all",
          lineHeight: 1.25,
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        }}
      >
        {url}
      </Text>
    </Box>
  );
}

export default function HomePage({ onOpenLayout }: HomePageProps) {
  const { t, i18n } = useTranslation();
  const [networkUrls, setNetworkUrls] = useState<NetworkUrlInfo[]>([]);

  useEffect(() => {
    let alive = true;

    async function loadNetworkInfo(): Promise<void> {
      try {
        const response = await fetch("/api/network");

        if (!response.ok) {
          return;
        }

        const data = await response.json() as NetworkInfoResponse;

        if (!alive || !data.ok) {
          return;
        }

        setNetworkUrls(data.urls ?? []);
      } catch (error) {
        console.warn("Could not load network info.", error);
      }
    }

    void loadNetworkInfo();

    return () => {
      alive = false;
    };
  }, []);

  const primaryUrls = useMemo(() => {
    const primary = networkUrls[0];
    const desktop = trimTrailingSlash(primary?.desktop ?? createFallbackDesktopUrl());
    const mobileBase = primary?.mobile ?? `${createFallbackDesktopUrl()}/mobile`;

    return {
      desktop,
      mobile: withLanguage(mobileBase, i18n.language),
    };
  }, [networkUrls, i18n.language]);

  const cards: HomeCardItem[] = [
    {
      key: "layout",
      title: t("home.cards.layout.title"),
      description: t("home.cards.layout.description"),
      image: "/images/layout-card.png",
      buttonLabel: t("home.cards.layout.button"),
      icon: <IconMap2 size={18} />,
      url: primaryUrls.desktop,
      onClick: onOpenLayout,
      disabled: false,
    },
    {
      key: "programmer",
      title: t("home.cards.programmer.title"),
      description: t("home.cards.programmer.description"),
      image: "/images/programmer-card.png",
      buttonLabel: t("home.comingSoon"),
      icon: <IconTool size={18} />,
      disabled: true,
    },
    {
      key: "mobile",
      title: t("home.cards.mobile.title"),
      description: t("home.cards.mobile.description"),
      image: "/images/mobile-card.png",
      buttonLabel: "Open mobile",
      icon: <IconDeviceMobile size={18} />,
      url: primaryUrls.mobile,
      onClick: () => window.location.assign(primaryUrls.mobile),
      disabled: false,
    },
  ];

  return (
    <Box
      mih="100vh"
      style={{
        position: "relative",
        overflow: "hidden",
        background:
          "linear-gradient(135deg, #06101f 0%, #071827 42%, #020711 100%)",
      }}
    >
      <Box
        className="home-bg-glow home-bg-glow-light"
        aria-hidden="true"
      />
      <Box
        className="home-bg-glow home-bg-glow-cyan"
        aria-hidden="true"
      />
      <Box
        className="home-bg-glow home-bg-glow-dark"
        aria-hidden="true"
      />
      <Box
        className="home-bg-glow home-bg-glow-green"
        aria-hidden="true"
      />
      <Box
        className="home-bg-glow home-bg-glow-amber"
        aria-hidden="true"
      />

      <Container size="xl" py="xl" style={{ position: "relative", zIndex: 1 }}>
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
            {cards.map((item) => {
              const isActive = item.disabled !== true && item.onClick !== undefined;

              return (
                <Card
                  key={item.key}
                  shadow="sm"
                  padding="lg"
                  radius="lg"
                  withBorder
                  role={isActive ? "button" : undefined}
                  tabIndex={isActive ? 0 : undefined}
                  aria-disabled={item.disabled === true ? true : undefined}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    position: "relative",
                    overflow: "hidden",
                    opacity: item.disabled ? 0.78 : 1,
                    cursor: isActive ? "pointer" : "default",
                    transition: "transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, background 160ms ease",
                    background:
                      "linear-gradient(180deg, rgba(12, 31, 52, 0.58) 0%, rgba(4, 12, 24, 0.36) 100%)",
                    borderColor: "rgba(120, 220, 255, 0.18)",
                    backdropFilter: "blur(14px) saturate(1.22)",
                    boxShadow: "0 12px 36px rgba(0, 0, 0, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.045)",
                  }}
                  onClick={() => activateCard(item)}
                  onKeyDown={(ev) => {
                    if (!isActive) {
                      return;
                    }

                    if (ev.key === "Enter" || ev.key === " ") {
                      ev.preventDefault();
                      activateCard(item);
                    }
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

                    {item.url && (
                      <UrlPill label="Full URL" url={item.url} />
                    )}

                    <Button
                      variant={item.disabled ? "default" : "light"}
                      fullWidth
                      mt="sm"
                      disabled={item.disabled === true}
                      rightSection={
                        item.disabled === true ? undefined : <IconArrowRight size={16} />
                      }
                      onClick={(ev) => {
                        ev.stopPropagation();
                        activateCard(item);
                      }}
                    >
                      {item.buttonLabel}
                    </Button>
                  </Stack>
                </Card>
              );
            })}
          </SimpleGrid>

          {networkUrls.length > 1 && (
            <Paper
              radius="lg"
              p="md"
              withBorder
              style={{
                background: "rgba(4, 12, 24, 0.36)",
                borderColor: "rgba(120, 220, 255, 0.16)",
              }}
            >
              <Stack gap="xs">
                <Text fw={700}>Detected LAN addresses</Text>
                {networkUrls.map(item => (
                  <Group key={`${item.name}-${item.address}`} justify="space-between" gap="xs">
                    <Badge variant="light">{item.name}</Badge>
                    <Text
                      size="sm"
                      fw={700}
                      c="blue.1"
                      style={{
                        wordBreak: "break-all",
                        fontFamily:
                          "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                      }}
                    >
                      {trimTrailingSlash(item.mobile)}
                    </Text>
                  </Group>
                ))}
              </Stack>
            </Paper>
          )}

          <Paper
            radius="lg"
            p="xl"
            withBorder
            style={{
              position: "relative",
              overflow: "hidden",
              background:
                "linear-gradient(135deg, rgba(12, 31, 52, 0.62) 0%, rgba(4, 12, 24, 0.38) 100%)",
              borderColor: "rgba(120, 220, 255, 0.16)",
              boxShadow: "0 18px 52px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.045)",
              backdropFilter: "blur(14px) saturate(1.18)",
            }}
          >
            <Box
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                background:
                  "radial-gradient(circle at 12% 0%, rgba(90, 200, 255, 0.15) 0%, transparent 34%), radial-gradient(circle at 96% 100%, rgba(95, 255, 180, 0.08) 0%, transparent 38%)",
              }}
            />

            <Stack gap="lg" style={{ position: "relative" }}>
              <Group justify="space-between" align="flex-start" gap="lg">
                <Group gap="md" align="flex-start">
                  <ThemeIcon size="xl" radius="md" variant="light" color="cyan">
                    <IconHeartHandshake size={24} />
                  </ThemeIcon>

                  <Stack gap={4}>
                    <Group gap="xs" align="center">
                      <Title order={2} c="white">
                        Köszi / Thanks
                      </Title>
                      <IconSparkles size={20} color="var(--mantine-color-yellow-4)" />
                    </Group>

                    <Text c="gray.3" maw={820}>
                      {t("home.thanksDescription")}
                    </Text>
                  </Stack>
                </Group>

                <Badge
                  size="lg"
                  variant="gradient"
                  gradient={{ from: "violet", to: "cyan", deg: 135 }}
                >
                  ChatGPT
                </Badge>
              </Group>

              <Group gap="xs">
                {THANKS_TECH_ITEMS.map(item => (
                  <Badge
                    key={item}
                    variant="light"
                    color="cyan"
                    radius="sm"
                    size="lg"
                    style={{
                      background: "rgba(34, 139, 230, 0.12)",
                      border: "1px solid rgba(120, 220, 255, 0.12)",
                    }}
                  >
                    {item}
                  </Badge>
                ))}
              </Group>
            </Stack>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}
