import React from "react";
import PageLoader from "./PageLoader";

export default {
  title: "Components/PageLoader",
  component: PageLoader,
  tags: ["autodocs"],
  parameters: { docs: { story: { inline: false, iframeHeight: 240 } } },
  args: { label: "Loading…" },
};

export const Default = {};

export const CustomLabel = { args: { label: "Signing you in…" } };
