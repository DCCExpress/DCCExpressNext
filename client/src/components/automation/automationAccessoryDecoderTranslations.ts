import i18n from "../../i18n";

type AccessoryDecoderTranslation = {
  nodeTitle: string;
  nodeDescription: string;
  addressField: string;
  graphCommand: string;
};

const translations: Record<string, AccessoryDecoderTranslation> = {
  en: {
    nodeTitle: "Accessory decoder",
    nodeDescription: "Basic accessory decoder output. Sends the input true/false state to an accessory address.",
    addressField: "Accessory decoder address",
    graphCommand: "accessory #{{command}}",
  },
  hu: {
    nodeTitle: "Accessory decoder",
    nodeDescription: "Basic accessory decoder kimenet. Az input true/false állapotát accessory címre küldi.",
    addressField: "Accessory decoder cím",
    graphCommand: "accessory #{{command}}",
  },
  de: {
    nodeTitle: "Accessory decoder",
    nodeDescription: "Basic-Accessory-Decoder-Ausgang. Sendet den true/false-Eingangszustand an eine Accessory-Adresse.",
    addressField: "Accessory-Decoder-Adresse",
    graphCommand: "accessory #{{command}}",
  },
};

for (const [language, value] of Object.entries(translations)) {
  i18n.addResource(language, "translation", "automation.nodes.output.title", value.nodeTitle);
  i18n.addResource(language, "translation", "automation.nodes.output.description", value.nodeDescription);
  i18n.addResource(language, "translation", "automation.fields.outputCommand", value.addressField);
  i18n.addResource(language, "translation", "automation.graph.outputCommand", value.graphCommand);
}
