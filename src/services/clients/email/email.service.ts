import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESClient } from '@aws-sdk/client-ses';
import { SendEmailCommand } from '@aws-sdk/client-ses';
import { Email } from 'src/types/email';

@Injectable()
export class EmailService {
  private sesClient;

  constructor(private configService: ConfigService) {
    const REGION = this.configService.get('AWS_DEFAULT_REGION');
    this.sesClient = new SESClient({ region: REGION });
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
      // console.log('Success', data);
      return data; // For unit tests.
    } catch (err) {
      console.log('Err while sending an email', err);
    }
  }
}
