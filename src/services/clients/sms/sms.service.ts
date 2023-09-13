import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

@Injectable()
export class SmsService {
  public client: Twilio;
  constructor(private config: ConfigService) {
    const token = config.get('TWILIO_AUTH_TOKEN');
    const sid = config.get('TWILIO_ACCOUNT_SID');
    try {
      this.client = new Twilio(sid, token);
    } catch (err) {
      console.error('Error initializing Twilio client:', err);
    }
  }
}
