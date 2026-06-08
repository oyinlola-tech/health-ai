/**
 * Adds a consistent authenticated mobile bottom navigation when a page does
 * not already define one. This keeps legacy static pages usable during the
 * migration to shared layouts.
 */
const navItems = [
  { href: "/chat", icon: "chat", label: "Chat" },
  { href: "/reports", icon: "description", label: "Reports" },
  { href: "/doctors", icon: "stethoscope", label: "Doctors" },
  { href: "/profile", icon: "account_circle", label: "Profile" }
];

export function ensureMobileBottomNav() {
  if (document.querySelector(".mx-bottom-nav")) return;
  if (location.pathname.includes("/auth/") || location.pathname.includes("/admin/login")) return;

  const nav = document.createElement("nav");
  nav.className = "mx-bottom-nav";
  nav.setAttribute("aria-label", "Mobile primary");
  nav.innerHTML = navItems
    .map((item) => {
      const active = location.pathname.endsWith(item.href);
      return `<a href="${item.href}"${active ? ' aria-current="page"' : ""}><span class="material-symbols-outlined" aria-hidden="true">${item.icon}</span><span>${item.label}</span></a>`;
    })
    .join("");
  document.body.appendChild(nav);
  document.body.style.paddingBottom = "calc(5rem + env(safe-area-inset-bottom, 0px))";
}

document.addEventListener("DOMContentLoaded", ensureMobileBottomNav);
