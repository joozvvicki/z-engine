import { Window_Choice } from './Window_Choice'

export class Window_MenuCommand extends Window_Choice {
  constructor(x: number, y: number, width: number, height: number) {
    super(x, y, width, height)
    this.setChoices(['Przedmioty', 'Status', 'Zapisz', 'Koniec Gry'])
  }
}
