# Third-party notices

The project's MIT license does not replace the licenses of its dependencies.

## DotScroll

`src/lib/vendor/dotscroll.js` contains an adaptation of [LucatorL/dotscroll](https://github.com/LucatorL/dotscroll) by LucatorL, licensed under MIT. The original project license is retained in this repository's `LICENSE`.

## RAR extraction

`public/unrar.wasm` is the binary supplied by `node-unrar-js` 2.0.2. The JavaScript wrapper is by Jianrong Yu and licensed under MIT; its license is retained in `licenses/node-unrar-js-MIT.txt`.

The binary includes the upstream UnRAR engine. Its upstream license and attribution also apply. See the [node-unrar-js source](https://github.com/YuJianrong/node-unrar.js) and [RARLab's UnRAR source distribution](https://www.rarlab.com/rar_add.htm).

## Other dependencies

JSZip is dual-licensed under MIT or GPLv3; this project uses the MIT option. Next.js, React, Tailwind CSS, Radix UI and Lucide retain the licenses distributed with their packages. Dependency versions and integrity hashes are recorded in `package-lock.json`.
