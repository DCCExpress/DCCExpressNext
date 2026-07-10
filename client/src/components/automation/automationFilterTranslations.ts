import i18n from "../../i18n";

type FilterTranslation = {
  nodeTitle: string;
  nodeDescription: string;
  valueField: string;
  valueDescription: string;
  graphValue: string;
};

const translations: Record<string, FilterTranslation> = {
  en: {
    nodeTitle: "Filter",
    nodeDescription: "Passes the input signal only when its boolean value matches the configured filter value.",
    valueField: "Allowed value",
    valueDescription: "Only this boolean value is forwarded. A different value produces no output signal.",
    graphValue: "passes: {{value}}",
  },
  hu: {
    nodeTitle: "Filter",
    nodeDescription: "Csak akkor engedi tovább a bemeneti jelet, ha annak boolean értéke megegyezik a beállított filterértékkel.",
    valueField: "Átengedett érték",
    valueDescription: "Csak ezt a boolean értéket engedi tovább. Eltérő értéknél nincs kimeneti jel.",
    graphValue: "átenged: {{value}}",
  },
  de: {
    nodeTitle: "Filter",
    nodeDescription: "Leitet das Eingangssignal nur weiter, wenn sein boolescher Wert dem eingestellten Filterwert entspricht.",
    valueField: "Zugelassener Wert",
    valueDescription: "Nur dieser boolesche Wert wird weitergeleitet. Bei einem anderen Wert gibt es kein Ausgangssignal.",
    graphValue: "durchlassen: {{value}}",
  },
};

for (const [language, value] of Object.entries(translations)) {
  i18n.addResource(language, "translation", "automation.nodes.filter.title", value.nodeTitle);
  i18n.addResource(language, "translation", "automation.nodes.filter.description", value.nodeDescription);
  i18n.addResource(language, "translation", "automation.fields.filterValue", value.valueField);
  i18n.addResource(language, "translation", "automation.fields.filterValueDescription", value.valueDescription);
  i18n.addResource(language, "translation", "automation.graph.filterValue", value.graphValue);
}
