const nodemailer = {
  createTransport: (url) => ({
    sendMail: async (mail) => {
      if (globalThis.__fn.failNextSend) {
        globalThis.__fn.failNextSend = false;
        throw new Error("smtp down");
      }
      globalThis.__fn.mail.push({ ...mail, transportUrl: url });
      return { messageId: "test" };
    },
  }),
};
export default nodemailer;
