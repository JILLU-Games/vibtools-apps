import { Button, Badge, Icon, toast } from "../ui/index.js";
import { navigate } from "../../lib/router.js";
import { copyToClipboard } from "../../lib/clipboard.js";

/**
 * Edge CLI & PowerShell Utility Guide Section (/cli).
 *
 * @returns {HTMLElement}
 */
export function CliGuideSection() {
  const container = document.createElement("div");
  container.className = "app-cli-guide";

  // Breadcrumb back to catalog
  const breadcrumb = document.createElement("nav");
  breadcrumb.className = "app-detail__breadcrumb";
  breadcrumb.setAttribute("aria-label", "Breadcrumb");

  const homeLink = document.createElement("a");
  homeLink.href = "/";
  homeLink.className = "app-detail__crumb-link";
  homeLink.appendChild(Icon("arrow-left", 14));
  const homeText = document.createElement("span");
  homeText.textContent = "All Apps";
  homeLink.appendChild(homeText);
  homeLink.addEventListener("click", (e) => {
    e.preventDefault();
    navigate("/");
  });
  breadcrumb.appendChild(homeLink);
  breadcrumb.appendChild(Icon("chevron-right", 13));

  const current = document.createElement("span");
  current.className = "app-detail__crumb-current";
  current.textContent = "CLI Installer";
  current.setAttribute("aria-current", "page");
  breadcrumb.appendChild(current);
  container.appendChild(breadcrumb);

  // Section Header
  const headerBar = document.createElement("div");
  headerBar.className = "app-catalog-header";

  const titleBox = document.createElement("div");
  titleBox.className = "app-catalog-header__text";

  const heading = document.createElement("h1");
  heading.className = "app-catalog-header__title";
  heading.textContent = "get.vib.tools CLI Guide";
  titleBox.appendChild(heading);

  const desc = document.createElement("p");
  desc.className = "app-catalog-header__subtitle";
  desc.textContent =
    "PowerShell edge installers and direct Cloudflare R2 binary redirects for Vib Tools applications.";
  titleBox.appendChild(desc);
  headerBar.appendChild(titleBox);
  container.appendChild(headerBar);

  // Guide entries
  const entries = [
    {
      badge: "PowerShell",
      badgeVariant: "accent",
      title: "1. Install Latest Version",
      desc: "Resolves and runs the latest stable PowerShell installer script for any registered application.",
      template: 'irm "https://get.vib.tools/<app>" | iex',
      example: 'irm "https://get.vib.tools/calgrid" | iex'
    },
    {
      badge: "PowerShell",
      badgeVariant: "accent",
      title: "2. Install Specific Version",
      desc: "Pins installation to a specific release version published in the application manifest.",
      template: 'irm "https://get.vib.tools/<app>/<version>" | iex',
      example: 'irm "https://get.vib.tools/calgrid/1.0.3" | iex'
    },
    {
      badge: "302 Redirect",
      badgeVariant: "neutral",
      title: "3. Direct Binary Download (Latest)",
      desc: "Issues a direct 302 redirect to the latest binary stored on Cloudflare R2.",
      template: "https://get.vib.tools/dl/<app>",
      example: "https://get.vib.tools/dl/calgrid"
    },
    {
      badge: "302 Redirect",
      badgeVariant: "neutral",
      title: "4. Direct Binary Download (Versioned)",
      desc: "Issues a direct 302 redirect to a specific release version binary on Cloudflare R2.",
      template: "https://get.vib.tools/dl/<app>/<version>",
      example: "https://get.vib.tools/dl/calgrid/1.0.3"
    }
  ];

  const list = document.createElement("div");
  list.className = "app-cli-guide__list";

  entries.forEach((item) => {
    const card = document.createElement("section");
    card.className = "app-cli-guide__card";

    const cardHead = document.createElement("div");
    cardHead.className = "app-cli-guide__card-head";

    const titleEl = document.createElement("h2");
    titleEl.className = "app-cli-guide__title";
    titleEl.textContent = item.title;
    cardHead.appendChild(titleEl);

    cardHead.appendChild(
      Badge({
        text: item.badge,
        variant: item.badgeVariant
      })
    );
    card.appendChild(cardHead);

    const descEl = document.createElement("p");
    descEl.className = "app-detail__tagline";
    descEl.textContent = item.desc;
    card.appendChild(descEl);

    const syntaxRow = document.createElement("div");
    syntaxRow.className = "app-cli-guide__syntax";
    const syntaxLabel = document.createElement("span");
    syntaxLabel.textContent = "Syntax:";
    const syntaxCode = document.createElement("code");
    syntaxCode.textContent = item.template;
    syntaxRow.appendChild(syntaxLabel);
    syntaxRow.appendChild(syntaxCode);
    card.appendChild(syntaxRow);

    // Example Code Box
    const codeBox = document.createElement("div");
    codeBox.className = "ui-code-box";

    const codeText = document.createElement("code");
    codeText.className = "ui-code-box__text";
    codeText.textContent = item.example;
    codeBox.appendChild(codeText);

    const copyBtn = Button({
      label: "Copy",
      icon: "copy",
      variant: "primary",
      size: "sm",
      ariaLabel: `Copy example command for ${item.title}`,
      onClick: async () => {
        const copied = await copyToClipboard(item.example);
        if (copied) {
          toast.success(`Copied: ${item.example}`);
        } else {
          toast.error("Failed to copy to clipboard");
        }
      }
    });
    codeBox.appendChild(copyBtn);
    card.appendChild(codeBox);

    list.appendChild(card);
  });

  container.appendChild(list);
  return container;
}
