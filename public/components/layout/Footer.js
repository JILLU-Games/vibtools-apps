/**
 * Minimal compact Footer component.
 *
 * @returns {HTMLElement}
 */
export function Footer() {
  const footer = document.createElement("footer");
  footer.className = "app-footer";

  const inner = document.createElement("div");
  inner.className = "app-footer__inner";

  const left = document.createElement("div");
  left.className = "app-footer__brand";

  const brandIcon = document.createElement("img");
  brandIcon.src = "/vib.tools.Branding/favicon.svg";
  brandIcon.alt = "Vib Tools";
  brandIcon.width = 16;
  brandIcon.height = 16;
  brandIcon.className = "app-footer__logo-img";

  const brandText = document.createElement("span");
  brandText.textContent = `© ${new Date().getFullYear()} Vib Tools`;

  left.appendChild(brandIcon);
  left.appendChild(brandText);
  inner.appendChild(left);

  const right = document.createElement("div");
  right.className = "app-footer__links";

  const footerLinks = [
    { label: "vib.tools", href: "https://vib.tools" },
    { label: "docs.vib.tools", href: "https://docs.vib.tools" },
    { label: "get.vib.tools", href: "https://get.vib.tools" }
  ];

  footerLinks.forEach((item) => {
    const link = document.createElement("a");
    link.href = item.href;
    link.textContent = item.label;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    right.appendChild(link);
  });

  inner.appendChild(right);

  footer.appendChild(inner);
  return footer;
}
