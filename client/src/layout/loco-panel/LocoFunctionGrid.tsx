import { Card, ScrollArea, SimpleGrid, Stack } from "@mantine/core";
import type {
  Dispatch,
  SetStateAction,
} from "react";
import type {
  Loco,
} from "../../../../common/src/types";
import LocoFunctionButton from "./LocoFunctionButton";

type LocoFunctionGridProps = {
  loco: Loco;
  activeFunctions: Record<number, boolean>;
  disabled?: boolean;
  onActiveFunctionsChange: Dispatch<
    SetStateAction<Record<number, boolean>>
  >;
};

export default function LocoFunctionGrid({
  loco,
  activeFunctions,
  disabled = false,
  onActiveFunctionsChange,
}: LocoFunctionGridProps) {
  return (
    <Card
      withBorder
      radius="xs"
      p="xs"
      style={{
        flex: 1,
        minHeight: 0,
      }}
    >
      <Stack gap="sm" h="100%">
        <ScrollArea
          style={{ flex: 1 }}
          type="auto"
        >
          <SimpleGrid
            cols={5}
            spacing="xs"
            verticalSpacing="xs"
          >
            {Array.from(
              { length: 28 },
              (_, index) => {
                const fn =
                  loco.functions.find(
                    item =>
                      item.number === index
                  );

                return (
                  <LocoFunctionButton
                    key={index}
                    address={loco.address}
                    fnNumber={index}
                    fn={fn}
                    active={
                      !!activeFunctions[index]
                    }
                    activeFunctions={
                      activeFunctions
                    }
                    disabled={disabled}
                    onActiveFunctionsChange={
                      onActiveFunctionsChange
                    }
                  />
                );
              }
            )}
          </SimpleGrid>
        </ScrollArea>
      </Stack>
    </Card>
  );
}
