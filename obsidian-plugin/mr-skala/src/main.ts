import { Plugin, PluginSettingTab, Setting } from "obsidian"
import { parseScale, build } from "./skala-core"
import { startSections } from "./sekcje"
import { parseDrug, buildDrug, parseRecommendations, buildRecommendations } from "./lek-core"

type Settings = { ramki: boolean }

export default class MrSkalaPlugin extends Plugin {
  settings: Settings = { ramki: true }
  refreshSections: () => void = () => {}

  async onload() {
    this.settings = Object.assign({ ramki: true }, await this.loadData())
    const sec = startSections(this, () => this.settings.ramki)
    this.refreshSections = sec.refresh
    this.addSettingTab(new MrSkalaSettingTab(this))

    this.registerMarkdownCodeBlockProcessor("skala", (source, el) => {
      const scale = parseScale(source)
      if (!scale) {
        el.createEl("pre", { text: "Nieprawidłowa skala: brak pytań (linie zaczynające się od „- ”)." })
        return
      }
      el.appendChild(build(scale))
    })

    // karta leku (z opcjonalnym kalkulatorem dawek)
    this.registerMarkdownCodeBlockProcessor("lek", (source, el) => {
      const drug = parseDrug(source)
      if (!drug) {
        el.createEl("pre", { text: "Nieprawidłowa karta leku: brak linii „nazwa: ...”." })
        return
      }
      el.appendChild(buildDrug(drug))
    })

    // karta zaleceń dla pacjenta
    this.registerMarkdownCodeBlockProcessor("zalecenia", (source, el) => {
      const rec = parseRecommendations(source)
      if (!rec) {
        el.createEl("pre", { text: "Puste zalecenia: dodaj treść pod linią „tytul: ...”." })
        return
      }
      el.appendChild(buildRecommendations(rec))
    })
  }
}

class MrSkalaSettingTab extends PluginSettingTab {
  plugin: MrSkalaPlugin
  constructor(plugin: MrSkalaPlugin) {
    super(plugin.app, plugin)
    this.plugin = plugin
  }
  display() {
    const { containerEl } = this
    containerEl.empty()
    new Setting(containerEl)
      .setName("Ramki sekcji w trybie czytania")
      .setDesc(
        "Nagłówki zwinięte domyślnie (natywne zwijanie Obsidiana) + przyciski Rozwiń/Zwiń wszystko. Włącza też opcję Obsidiana „Zwijaj nagłówki”.",
      )
      .addToggle((t) =>
        t.setValue(this.plugin.settings.ramki).onChange(async (v) => {
          this.plugin.settings.ramki = v
          await this.plugin.saveData(this.plugin.settings)
          this.plugin.refreshSections()
        }),
      )
  }
}
