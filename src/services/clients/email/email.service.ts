import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient } from '@aws-sdk/client-ses';
import { SendEmailCommand } from '@aws-sdk/client-ses';
import { Email } from 'src/types/global';

@Injectable()
export class EmailService {
  private readonly sesClient: SESClient;

  constructor(private configService: ConfigService, private readonly logger: Logger) {
    const REGION = this.configService.get('AWS_DEFAULT_REGION') || 'us-east-1';
    this.sesClient = new SESClient({ region: REGION });
    this.logger = new Logger(EmailService.name);
  }

  async send(email: Email) {
    const from = email.from || 'no-reply@pointmotion.us';

    const params = {
      Destination: {
        ToAddresses: email.to,
      },
      Message: {
        Body: {
          Html: {
            Charset: 'UTF-8',
            Data: email.body,
          },
          Text: {
            Charset: 'UTF-8',
            Data: email.text,
          },
        },
        Subject: {
          Charset: 'UTF-8',
          Data: email.subject,
        },
      },
      Source: from,
    };

    if (email.replyTo) {
      params['ReplyToAddresses'] = [email.replyTo];
    }

    try {
      const data = await this.sesClient.send(new SendEmailCommand(params));
      return data; // For unit tests.
    } catch (err) {
      this.logger.error('send: ' + JSON.stringify(err));
    }
  }
}
