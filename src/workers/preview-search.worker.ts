import { escapeSearchTerm, SEARCH_CHECKPOINT_STRIDE } from '@/lib/preview-search';

self.addEventListener('message', (event: MessageEvent<{ text: string; query: string }>) => {
  const { text, query } = event.data;
  const expression = new RegExp(escapeSearchTerm(query), 'gi');
  let count = 0;
  let checkpoints: number[] = [];
  let lastReport = performance.now();

  const report = (done: boolean) => {
    self.postMessage({ query, count, checkpoints, done });
    checkpoints = [];
    lastReport = performance.now();
  };

  const scan = () => {
    let match: RegExpExecArray | null = null;
    for (let batch = 0; batch < 10000; batch++) {
      match = expression.exec(text);
      if (!match) {
        report(true);
        return;
      }
      if (count % SEARCH_CHECKPOINT_STRIDE === 0) checkpoints.push(match.index);
      count++;
    }
    if (performance.now() - lastReport >= 50) report(false);
    setTimeout(scan, 0);
  };

  scan();
});
