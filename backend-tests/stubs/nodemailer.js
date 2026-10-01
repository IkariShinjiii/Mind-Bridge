const nodemailer = {
  createTransport: (url) => ({
    sendMail: async (mail) => {
      globalThis.__fn.mail.push({ ...mail, transportUrl: url });
      return { messageId: "test" };
    },
  }),
};
export default nodemailer;
