import { Plugin } from "obsidian"
import { parseScale, build } from "./skala-core"

export default class MrSkalaPlugin extends Plugin {
  async onload() {
    this.registerMarkdownCodeBlockProcessor("skala", (source, el) => {
      const scale = parseScale(source)
      if (!scale) {
        el.createEl("pre", { text: "Nieprawidłowa skala: brak pytań (linie zaczynające się od „- ”)." })
        return
      }
      el.appendChild(build(scale))
    })
  }
}
