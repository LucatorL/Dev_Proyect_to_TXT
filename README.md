
# Dev_Proyect_to_TXT - Web Edition

[![Visitar Dev_Proyect_to_TXT](https://img.shields.io/badge/Visitar_Dev_Proyect_to_TXT-%23D87093?style=for-the-badge&logo=Netlify&logoColor=white&labelColor=2F2F2F)](https://javasourcetotxtweb.netlify.app/)

A modern web-based tool designed to consolidate project files (Java, Web, and more) and other text-based sources (like `.xml`, `.txt`, `.sql`) into a single, organized document. This project is a web adaptation of the original [JavaSourceToTxt application by @LucatorL](https://github.com/LucatorL/JavaSourceToTxt), expanding its core functionality to support a wider range of development projects.

It allows users to select a project type (Java, Web, Total), drag & drop project folders or individual files, select which ones to include, add content manually, preview the result, and download a unified text file.

## ✨ Features

-   **Project Type Selection:** Choose between `Java`, `Web`, or `Total` presets to filter and prioritize relevant files.
-   **Drag & Drop:** Easily import project folders or individual files. The tool filters for file types relevant to the selected project type.
-   **Selective Unification:** Intuitive modal to select exactly which files to include in the final output.
    -   Primary files for the selected project type (e.g., `.java` for Java, `.js` `.ts` for Web) are selected by default.
-   **Multi-Project Mode Toggle:** Switch between unifying all dropped projects at once or processing them one by one.
-   **Manual Content Addition:** Add custom code snippets or text files directly within the selection modal.
-   **Live Preview & Token Estimation:** See a real-time preview of the unified content as you select files, along with an approximate token count.
-   **Recent History:** Access a list of recently processed items.
-   **Dark/Light Theme:** Adapts to your system preference.
-   **In-App Changelog & Issue Reporting.**

## 🛠️ Tech Stack

-   **Framework:** [Next.js](https://nextjs.org/) (using App Router)
-   **UI Library:** [React](https://reactjs.org/)
-   **Components:** [ShadCN UI](https://ui.shadcn.com/)
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
-   **Language:** [TypeScript](https://www.typescriptlang.org/)
-   **Icons:** [Lucide React](https://lucide.dev/)

## 🚀 Getting Started / How to Use

1.  **Visit the application:** [https://javasourcetotxtweb.netlify.app/](https://javasourcetotxtweb.netlify.app/)
2.  **Select Project Type:** In the header, choose `Java`, `Web`, or `Total` from the dropdown menu. This will adjust which files are recognized and selected by default.
3.  **Drag & Drop Files:** Drag your project folder(s) or individual files onto the main dropzone.
4.  **Select Files for Unification:**
    *   A modal will appear listing all processed files relevant to the chosen project type.
    *   Use the "Select All" / "Deselect All" buttons or individual checkboxes to refine your selection.
    *   Use the **"Unificar Múltiples Proyectos"** toggle and navigation arrows to manage multiple projects.
5.  **Preview Content:**
    *   If preview is enabled, the right panel shows a live preview of the unified content.
6.  **Unify and Download:**
    *   Click **"Aceptar y Guardar"**. A `.txt` file containing the unified content will be downloaded.

## 🤝 Contributing

Contributions are welcome! Please feel free to fork the repository, make your changes, and open a Pull Request. You can also [open an issue](https://github.com/LucatorL/JavaSourceToTxt-WEB-/issues) for bugs or feature requests.

## 📜 License

This project is open-source, licensed under the MIT License.

---
_This project is a web adaptation and expansion of the original [JavaSourceToTxt application by @LucatorL](https://github.com/LucatorL/JavaSourceToTxt)._
