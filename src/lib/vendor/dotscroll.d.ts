/** Local adaptation of https://github.com/LucatorL/dotscroll (MIT). */
export interface DotScrollInstance {
  sections: HTMLElement[];
  wrapper: HTMLElement;
  refresh(): void;
  destroy(): void;
  scrollTo(index: number): void;
  getActiveIndex(): number;
}
export interface DotScrollOptions {
  selector: string;
  container?: HTMLElement;
  smooth?: boolean;
  hideScrollbar?: boolean;
  invert?: boolean;
  compact?: boolean;
  pushBody?: boolean;
  offset?: number;
  onChange?: (index: number, section: HTMLElement, previousIndex: number) => void;
}
declare const DotScroll: { init(options: DotScrollOptions): DotScrollInstance };
export default DotScroll;
