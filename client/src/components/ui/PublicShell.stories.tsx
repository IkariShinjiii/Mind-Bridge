import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../AuthProvider";
import PublicShell, { Brand, CrisisStrip } from "./PublicShell";

/** Header, crisis strip and footer around every public page. Rendered signed-out. */
const meta = {
  title: "Layout/PublicShell",
  component: PublicShell,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen", docs: { story: { inline: false, iframeHeight: 640 } } },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <AuthProvider>
          <Story />
        </AuthProvider>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof PublicShell>;

export default meta;
type Story = StoryObj<typeof meta>;

const Page = () => (
  <div className="mx-auto max-w-3xl px-4 py-12">
    <h1 className="text-4xl font-bold">Page content</h1>
    <p className="mt-2 text-[color:var(--mb-muted)]">Whatever the page renders sits between the header and footer.</p>
  </div>
);

export const Default: Story = { render: () => <PublicShell><Page /></PublicShell> };

export const WithoutAuthLinks: Story = {
  name: "Without login and signup links",
  render: () => <PublicShell showAuthLinks={false}><Page /></PublicShell>,
};

export const BrandSizes: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-4">
      <Brand />
      <Brand small />
    </div>
  ),
  parameters: { layout: "padded" },
};

export const CrisisBanner: Story = {
  render: () => <CrisisStrip />,
  parameters: { layout: "padded" },
};
