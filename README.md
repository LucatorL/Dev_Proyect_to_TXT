# Dev_Proyect_to_TXT

| Web Version                                                                                                                              | Repository                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [**[OPEN ONLINE]**](https://dev-proyect-to-txt.vercel.app)<br><sub>Use it directly from your browser.</sub> | [**[VIEW SOURCE]**](https://github.com/LucatorL/Dev_Proyect_to_TXT)<br><sub>Explore the code and contribute.</sub> |

<br>

**Dev_Proyect_to_TXT** is a modern, web-based tool designed to consolidate project files (Java, Web, Python, and more) and other text-based sources (like `.xml`, `.txt`, `.sql`) into a single, organized document. It's built for developers who need to package their codebase into a single file for AI model context, documentation, or simplified sharing.

This project is an evolution and web adaptation of the original [JavaSourceToTxt application by @LucatorL](https://github.com/LucatorL/JavaSourceToTxt), expanding its core functionality to support a wider range of development projects directly in the browser.

## ✨ Features

-   **Project Type Presets:** Choose between `Java`, `Web`, or `Total` presets to automatically filter and prioritize relevant file types.
-   **Intelligent Drag & Drop:** Easily import entire project folders or individual files. The tool smartly categorizes files based on the selected project type.
-   **Selective Unification Modal:** An intuitive interface to select exactly which files to include in the final output.
    -   Primary files for the selected project type (e.g., `.java` for Java, `.js`/`.ts` for Web) are selected by default.
    -   Files not matching the preset are neatly organized, allowing you to preview and include them with a single click.
-   **Multi-Project Mode:** Toggle between unifying all dropped projects at once or processing them one by one.
-   **Advanced Comment Control:**
    -   Choose to remove all comments (code and app-generated headers).
    -   Keep original code comments but exclude the app's identification headers.
    -   Clean up headers from previous unifications to prevent clutter.
-   **Manual Content Addition:** Add custom code snippets or text files directly within the selection modal, either to an existing project or as a new one.
-   **Live Preview & Token Estimation:** See a real-time preview of the unified content as you select files, along with an approximate token count to optimize for AI model context windows.
-   **Recent History:** Quickly access information about recently processed projects.
-   **Internationalization:** Full support for English and Spanish.
-   **Dark/Light Theme:** Automatically adapts to your system preference.

## 🚀 How to Use

1.  **Visit the application:** [**dev-proyect-to-txt.vercel.app**](https://dev-proyect-to-txt.vercel.app)
2.  **Select Project Type:** In the header, choose `Java`, `Web`, or `Total`. This adjusts which files are recognized and selected by default.
3.  **Drag & Drop Files:** Drag your project folder(s), `.zip` archives, or individual files onto the main dropzone.
4.  **Manage Files for Unification:**
    *   A modal will appear listing all processed files, grouped by project and directory/package.
    *   Use the "Select All" / "Deselect All" buttons or individual checkboxes to refine your selection.
    *   Files not standard for the project type will appear in a separate, collapsible section, ready to be previewed and added.
    *   Toggle **"Unify Multiple Projects"** to process all projects together or one at a time.
    *   Use the **"Comment Handling"** dropdown to control how comments are treated in the final output.
5.  **Preview Content:** The right panel shows a live preview of the final text file. You can disable this for better performance with large projects.
6.  **Unify and Download:** Click **"Accept and Save"**. A `.txt` file containing the unified content will be downloaded instantly.

## 🛠️ Tech Stack

-   **Framework:** [Next.js](https://nextjs.org/) (App Router)
-   **Language:** [TypeScript](https://www.typescriptlang.org/)
-   **UI:** [React](https://reactjs.org/) with [ShadCN UI](https://ui.shadcn.com/) components
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
-   **Icons:** [Lucide React](https://lucide.dev/)

## 🤝 Contributing

Contributions are highly welcome! Feel free to fork the repository, make your changes, and open a Pull Request. You can also [open an issue](https://github.com/LucatorL/Dev_Proyect_to_TXT/issues) for bugs, feature requests, or suggestions.

## 📜 License

This project is open-source, licensed under the MIT License.

---
_This project is a web adaptation and expansion of the original [JavaSourceToTxt application by @LucatorL](https://github.com/LucatorL/JavaSourceToTxt)._
