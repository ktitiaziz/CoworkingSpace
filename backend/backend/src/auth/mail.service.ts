import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly transporter;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('MAIL_HOST');
    const port = Number(this.configService.get<string>('MAIL_PORT') ?? 587);
    const user = this.configService.get<string>('MAIL_USER');
    const pass = this.configService.get<string>('MAIL_PASSWORD');

    if (!host || !user || !pass || !Number.isFinite(port)) {
      throw new Error('Email configuration is missing. Check MAIL_HOST, MAIL_PORT, MAIL_USER, and MAIL_PASSWORD.');
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  async sendVerificationCode(to: string, code: string, purpose: 'REGISTRATION' | 'LOGIN') {
    const from = this.configService.get<string>('MAIL_FROM') ?? this.configService.getOrThrow<string>('MAIL_USER');
    const action = purpose === 'REGISTRATION' ? 'verify your email address' : 'complete your login';

    try {
      await this.transporter.sendMail({
        from,
        to,
        subject: 'Your Coworking Space verification code',
        text: `Your verification code is ${code}. Use it to ${action}. It expires in 5 minutes. If you did not request this code, you can ignore this email.`,
        html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto"><h2>Coworking Space</h2><p>Use this code to ${action}:</p><div style="font-size:32px;font-weight:bold;letter-spacing:8px;padding:16px 0">${code}</div><p>This code expires in <b>5 minutes</b>.</p><p>If you did not request this code, you can ignore this email.</p></div>`,
      });
    } catch {
      throw new InternalServerErrorException('We could not send the verification email. Please try again later.');
    }
  }
}
