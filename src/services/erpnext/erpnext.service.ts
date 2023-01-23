import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { Axios } from 'axios';

@Injectable()
export class ErpnextService {
  username: string;
  password: string;
  erpnextEndpoint: string;
  authEndpoint: string;
  axiosClient: Axios;

  constructor(private configService: ConfigService, private logger: Logger) {
    this.username = this.configService.get('ERPNEXT_USERNAME');
    this.password = this.configService.get('ERPNEXT_PASSWORD');
    this.erpnextEndpoint = this.configService.get('ERPNEXT_ENDPOINT');
    this.authEndpoint = this.configService.get('ERPNEXT_ENDPOINT') + '/api/method/login';
    this.axiosClient = axios.create({
      withCredentials: true,
    });
  }

  async auth() {
    const body = {
      usr: this.username,
      pwd: this.password,
    };

    const resp = await this.axiosClient.post(this.authEndpoint, JSON.stringify(body), {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
    return resp.headers['set-cookie'];
  }

  async createIssue(subject: string, description: string, owner?: string) {
    let cookie = '';
    const auth = await this.auth();

    Object.values(auth).forEach((x) => (cookie += x + ';'));

    const body = {
      subject,
      description,
      owner,
      raised_by: owner,
      modified_by: owner,
    };

    const resp = await this.axiosClient.post(
      this.erpnextEndpoint + '/api/resource/Issue',
      JSON.stringify(body),
      {
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookie,
        },
      },
    );
    return resp.data;
  }
}
