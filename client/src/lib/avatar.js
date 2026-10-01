// Avatar background colors. The ids match what is already saved in users/{uid}.avatarGradient,
// so existing choices keep working. Every color gives white initials at least 4.5:1 contrast.
export const AVATAR_COLORS = [
  { id: "cyan", name: "Teal", color: "#0f4a55" },
  { id: "purple", name: "Violet", color: "#5b3fa0" },
  { id: "emerald", name: "Green", color: "#1e7a56" },
  { id: "amber", name: "Bronze", color: "#7a4f00" },
  { id: "rose", name: "Plum", color: "#8a3b62" },
];

export const avatarColor = (id) => (AVATAR_COLORS.find((c) => c.id === id) || AVATAR_COLORS[0]).color;
