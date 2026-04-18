const nodemailer = require("nodemailer");

const createTransporter = () =>
  nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_ACCT,
      pass: process.env.GMAIL_PASS,
    },
  });

const buildEmailMessage = (body) => ({
  from: process.env.GMAIL_ACCT,
  to: process.env.GMAIL_ACCT,
  subject: `🚀 New Project Request From: ${body.name.toUpperCase()}`,
  text: [
    `Name:         ${body.name}`,
    `Email:        ${body.email}`,
    `Company:      ${body.company || "N/A"}`,
    `Architecture: ${body.architecture?.length > 0 ? body.architecture.join(", ") : "N/A"}`,
    ``,
    `Project Details:`,
    `${body.message}`,
  ].join("\n"),
});

const create = (body) => {
  return new Promise((resolve, reject) => {
    const transporter = createTransporter();
    const mailDetails = buildEmailMessage(body);

    transporter.sendMail(mailDetails, (err, data) => {
      if (err) reject(err);
      if (data) resolve("success");
    });
  });
};

module.exports = { create };
