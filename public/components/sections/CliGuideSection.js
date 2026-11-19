import { Button, Icon, toast } from "../ui/index.js";

/**
 * Edge CLI & PowerShell Utility Guide Section (/cli).
 *
 * @returns {HTMLElement}
 */
export function CliGuideSection() {
  const container = document.createElement("div");
  container.className = "app-cli-guide";

  // Section Title
  const titleBox = document.createElement("div");
  const heading = document.createElement("h1");
  heading.className = "app-detail__name";
  heading.textContent = "get.vib.tools CLI Guide";
  titleBox.appendChild(heading);

  const desc = document.createElement("p");
  desc.className = "app-detail__tagline";
  desc.textContent = "Zero-friction PowerShell installers and direct binary downloads powered by edge routing.";
  titleBox.appendChild(desc);
  container.appendChild(titleBox);

  // Guide entries
  const entries = [
    {
      title: "1. Install Latest Version",
      desc: "Installs the latest stable version of any registered application.",
      code: 'irm "https://get.vib.tools/<app>" | iex',
      example: 'irm "https://get.vib.tools/calgrid" | iex'
    },
    {
      title: "2. Install Specific Version",
      desc: "Installs a pinned version of the application.",
      code: 'irm "https://get.vib.tools/<app>/<version>" | iex',
      example: 'irm "https://get.vib.tools/calgrid/v1.0.3" | iex'
    },
    {
      title: "3. Direct Binary Download (Latest)",
      desc: "Issues a 302 redirect directly to the latest binary in Cloudflare R2 storage.",
      code: "https://get.vib.tools/dl/<app>",
      example: "https://get.vib.tools/dl/calgrid"
    },
    {
      title: "4. Direct Binary Download (Versioned)",
      desc: "Issues a 302 redirect directly to a versioned binary in Cloudflare R2 storage.",
      code: "https://get.vib.tools/dl/<app>/<version>",
      example: "https://get.vib.tools/dl/calgrid/v1.0.3"
    }
  ];

  entries.forEach((item) => {
    const card = document.createElement("div");
    card.className = "app-cli-guide__card";

    const titleEl = document.createElement("h2");
    titleEl.className = "app-cli-guide__title";
    titleEl.textContent = item.title;
    card.appendChild(titleEl);

    const descEl = document.createElement("p");
    descEl.className = "app-detail__tagline";
    descEl.textContent = item.desc;
    card.appendChild(descEl);

    // Code Box
    const codeBox = document.createElement("div");
    codeBox.className = "ui-code-box";

    const codeText = document.createElement("div");
    codeText.className = "ui-code-box__text";
    codeText.textContent = item.example;
    codeBox.appendChild(codeText);

    const copyBtn = Button({
      label: "Copy",
      icon: "copy",
      variant: "primary",
      size: "sm",
      onClick: async () => {
        try {
          await navigator.clipboard.writeText(item.example);
          toast.success(`Copied: ${item.example}`);
        } catch (_) {
          toast.error("Failed to copy to clipboard");
        }
      }
    });
    codeBox.appendChild(copyBtn);
    card.appendChild(codeBox);

    container.appendChild(card);
  });

  return container;
}
