import type { Meta, StoryObj } from "@storybook/react-vite";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "../AuthProvider";
import AuthFrame, { Field, GoogleIcon } from "./AuthFrame";

/**
 * Two-panel frame for the login and signup pages. It sits inside PublicShell, which reads the
 * auth context and router, so these stories run signed-out inside a MemoryRouter.
 */
const meta = {
  title: "Pages/AuthFrame",
  component: AuthFrame,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen", docs: { story: { inline: false, iframeHeight: 760 } } },
  decorators: [
    (Story) => (
      <MemoryRouter>
        <AuthProvider>
          <Story />
        </AuthProvider>
      </MemoryRouter>
    ),
  ],
} satisfies Meta<typeof AuthFrame>;

export default meta;
type Story = StoryObj;

const loginFooter = (
  <p>
    New here?{" "}
    <button type="button" className="font-bold underline underline-offset-4">
      Create a student account
    </button>
  </p>
);

export const Login: Story = {
  render: () => (
    <AuthFrame
      title="Welcome back"
      intro="Log in to check in, see your results, or manage your sessions."
      footer={loginFooter}
    >
      <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
        <Field id="email" label="Email" type="email" placeholder="you@usa.edu.ph" />
        <Field id="password" label="Password" type="password" />
        <button type="submit" className="mb-btn mb-btn-solid w-full">
          Log in
        </button>
        <button type="button" className="mb-btn mb-btn-line w-full">
          <GoogleIcon /> Continue with Google
        </button>
      </form>
    </AuthFrame>
  ),
};

export const WithFormError: Story = {
  render: () => (
    <AuthFrame
      title="Welcome back"
      intro="Log in to check in, see your results, or manage your sessions."
      footer={loginFooter}
    >
      <div role="alert" className="mb-alert mb-5">
        That email and password do not match. Check them and try again.
      </div>
      <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
        <Field id="email" label="Email" type="email" defaultValue="ana@usa.edu.ph" />
        <Field id="password" label="Password" type="password" />
        <button type="submit" className="mb-btn mb-btn-solid w-full">
          Log in
        </button>
      </form>
    </AuthFrame>
  ),
};

export const SignupWithFieldErrors: Story = {
  render: () => (
    <AuthFrame title="Create account" intro="Student accounts use your @usa.edu.ph email. It takes under a minute.">
      <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
        <Field id="name" label="Full name" type="text" defaultValue="Ben New" />
        <Field
          id="email"
          label="School email"
          type="email"
          defaultValue="ben@gmail.com"
          error="Use your @usa.edu.ph email."
        />
        <Field
          id="password"
          label="Password"
          type="password"
          defaultValue="abc"
          hint="At least 8 characters."
          error="Password must be at least 8 characters."
        />
        <button type="submit" className="mb-btn mb-btn-solid w-full">
          Create account
        </button>
      </form>
    </AuthFrame>
  ),
};
