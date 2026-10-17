
import 'dotenv/config';
import nodemailer from 'nodemailer';

const required = [
  'MAIL_HOST',
  'MAIL_PORT',
  'MAIL_USER',
  'MAIL_PASSWORD',
  'MAIL_FROM',
];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing environment variable: ${key}`);
    process.exit(1);
  }
}

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT),
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});

try {
  await transporter.verify();
  console.log('Gmail SMTP connection successful!');

  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: process.env.MAIL_USER,
    subject: 'Coworking Space - SMTP Test',
    text: 'Success! Your NestJS backend can send emails through Gmail.',
  });

  console.log('Test email sent:', info.messageId);
} catch (error) {
  console.error('SMTP test failed:', error.message);
  process.exitCode = 1;
}
