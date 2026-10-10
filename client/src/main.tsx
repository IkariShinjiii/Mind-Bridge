// Checks the Firebase config before anything imports Firebase: with a missing key `getAuth` throws while the
// modules load, which leaves a blank page. A plain message tells the owner what to fix instead.
const missing = ["VITE_FIREBASE_API_KEY", "VITE_FIREBASE_AUTH_DOMAIN", "VITE_FIREBASE_PROJECT_ID"].filter(
  (name) => !import.meta.env[name],
);

if (missing.length > 0) {
  const container = document.getElementById("root");
  if (container) {
    const box = document.createElement("div");
    box.setAttribute("role", "alert");
    box.style.cssText = "max-width:34rem;margin:4rem auto;padding:0 1rem;font:16px/1.6 system-ui,sans-serif";
    const title = document.createElement("h1");
    title.textContent = "Mind Bridge is not set up yet";
    title.style.fontSize = "1.5rem";
    const body = document.createElement("p");
    body.textContent =
      "This copy of the site was built without its Firebase settings, so it cannot start. If you run Mind Bridge, add the missing variables in your hosting settings and redeploy. If you are a student, please try again later or contact Guidance Services.";
    const list = document.createElement("p");
    list.textContent = `Missing: ${missing.join(", ")}`;
    list.style.opacity = "0.7";
    box.append(title, body, list);
    container.append(box);
  }
} else {
  void import("./bootstrap");
}
