import { EventsRequest, Pinpoint, SendMessagesCommandInput } from '@aws-sdk/client-pinpoint';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PatientFeedback } from 'src/types/global';

interface Details {
  id: string;
  emailAddress: string;
  nickname: string;
}

interface GameEndedEventMetrics {
  numOfActivitesCompletedToday: number;
  numOfActiveDays: number;
  totalDailyDurationInMin: number;
}

@Injectable()
export class EventsService {
  private pinpoint: Pinpoint;
  private projectId: string;
  private REGION: string;
  private eventsRequest: EventsRequest;

  constructor(private configService: ConfigService, private readonly logger: Logger) {
    this.REGION = this.configService.get('AWS_DEFAULT_REGION') || 'us-east-1';
    this.projectId = this.configService.get('PINPOINT_PROJECT_ID');
    this.pinpoint = new Pinpoint({ region: this.REGION });
    this.logger = new Logger(ConfigService.name);
  }

  async updateEndpoint(details: Details, endpointId: string, type: 'patient' | 'therapist') {
    const { id, emailAddress, nickname } = details;
    switch (type) {
      case 'patient':
        await this.pinpoint.updateEndpoint({
          ApplicationId: this.projectId,
          EndpointId: endpointId,
          EndpointRequest: {
            ChannelType: 'EMAIL',
            OptOut: 'NONE',
            Address: emailAddress,
            EndpointStatus: 'ACTIVE',
            User: {
              UserId: id,
              UserAttributes: {
                role: ['patient'],
                nickname: [nickname],
              },
            },
          },
        });
        break;
      case 'therapist':
        await this.pinpoint.updateEndpoint({
          ApplicationId: this.projectId,
          EndpointId: endpointId,
          EndpointRequest: {
            ChannelType: 'EMAIL',
            Address: emailAddress,
            EndpointStatus: 'ACTIVE',
            User: {
              UserId: id,
              UserAttributes: {
                role: ['therapist'],
                nickname: [nickname],
              },
            },
          },
        });
    }
  }

  async startAddedFirstPatientJourney(id: string, patientName: string) {
    try {
      this.eventsRequest = { BatchItem: {} };
      this.eventsRequest.BatchItem[id] = {
        Endpoint: {
          ChannelType: 'EMAIL',
          Attributes: {
            patientName: [patientName],
          },
        },
        Events: {
          addedFirstPatient: {
            EventType: 'therapist.addedFirstPatient',
            Timestamp: new Date().toISOString(),
          },
        },
      };

      const response = await this.pinpoint.putEvents({
        ApplicationId: this.projectId,
        EventsRequest: this.eventsRequest,
      });
      return response;
    } catch (err) {
      this.logger.error('startAddedFirstPatientJourney: ' + JSON.stringify(err));
    }
  }

  async gameStarted(userId: string) {
    await this._updateEvents(userId, 'game.started');
  }

  // event sent whenever a session ends
  async gameEnded(userId: string, metrics: GameEndedEventMetrics) {
    await this._updateEvents(userId, 'game.complete', {}, metrics);
  }

  // evet sent when a reward is unlocked.
  async rewardUnlockedEvent(userId: string, rewardUnlocked: RewardTypes) {
    await this._updateEvents(userId, 'reward.unlocked', { rewardTier: rewardUnlocked });
  }

  // event sent when a reward is accessed. (button 'Access Now' is clicked.)
  async rewardAccessedEvent(userId: string, rewardsAccessed: RewardTypes) {
    await this._updateEvents(userId, 'reward.accessed', { rewardTier: rewardsAccessed });
  }

  // event sent when FAQs are accessed.
  async faqAccessed(userId: string) {
    await this._updateEvents(userId, 'help_accessed.faq');
  }

  // event sent when free parkinson resources are accessed.
  async freeParkinsonResourceAccessed(userId: string) {
    await this._updateEvents(userId, 'help_accessed.freeParkinsonResource');
  }

  // event sent when 5% off Extertools coupon is accessed.
  async freeRewardAccessed(userId: string) {
    await this._updateEvents(userId, 'help_accessed.exertools', { name: 'Exertools' });
  }

  // Called when users' emails are updated.
  async userSignUp(userId: string) {
    await this._updateEvents(userId, 'user.signup');
  }

  // Called whenever App is accessed.
  async appAccessed(userId: string) {
    await this._updateEvents(userId, 'user.app.accessed');
  }

  // helper function for sending Patient events.
  async _updateEvents(userId: string, eventType: string, userAttributes?: any, metrics?: any) {
    this.eventsRequest = { BatchItem: {} };
    this.eventsRequest.BatchItem[userId] = {
      Endpoint: {
        ChannelType: 'EMAIL',
        Metrics: metrics ? metrics : {},
      },
      Events: {
        eventType: {
          EventType: eventType,
          Timestamp: new Date().toISOString(),
          Attributes: userAttributes ? userAttributes : {},
        },
      },
    };
    const res = await this.pinpoint.putEvents({
      ApplicationId: this.projectId,
      EventsRequest: this.eventsRequest,
    });
    this.logger.log(`_updateEvents:eventType: ${eventType}` + JSON.stringify(res));
  }

  async sendFeedbackEmail(patientFeedback: PatientFeedback) {
    // const { description, rating, recommendationScore, patientByPatient: { email: patientEmail, nickname } } = patientFeedback;

    // much cleaner this way!
    const { response } = patientFeedback;
    const { email: patientEmail, nickname } = patientFeedback.patientByPatient;

    let feedbackString = 'Feedback Received =>\n\n';
    for (let i = 0; i < response.length; i++) {
      feedbackString += `\tQ. ${response[i].question}\n`;
      feedbackString += `\tA. ${response[i].answer}\n\n`;
    }

    const input: SendMessagesCommandInput = {
      ApplicationId: this.projectId,
      MessageRequest: {
        MessageConfiguration: {
          EmailMessage: {
            FromAddress: 'no-reply@pointmotion.us',
            ReplyToAddresses: ['support@pointmotion.us'],
            SimpleEmail: {
              Subject: {
                Data: `Feedback from Patient ${nickname}`,
              },
              TextPart: {
                Data: `Patient Email: ${patientEmail}
Patient Nickname: ${nickname}

${feedbackString}`,
              },
            },
          },
        },
        Addresses: {
          'vigneshhrajj@gmail.com': {
            ChannelType: 'EMAIL',
          },
        },
      },
    };
    await this.pinpoint.sendMessages(input);
    return {
      status: 'success',
    };
  }

  async sendCancellationEmail(patientEmail: string, nickname?: string, reason?: string) {
    const input: SendMessagesCommandInput = {
      ApplicationId: this.projectId,
      MessageRequest: {
        MessageConfiguration: {
          EmailMessage: {
            FromAddress: 'no-reply@pointmotion.us',
            ReplyToAddresses: ['support@pointmotion.us'],
            SimpleEmail: {
              Subject: {
                Data: `Cancellation request from Patient ${nickname || ''}`,
              },
              TextPart: {
                Data: `
                Patient Email: ${patientEmail}
                Patient Nickname: ${nickname || 'unknown'}

                Feedback Received =>
                  Reason for cancellation: ${reason || 'none'}`,
              },
            },
          },
        },
        Addresses: {
          'support@pointmotion.us': {
            ChannelType: 'EMAIL',
          },
        },
      },
    };
    await this.pinpoint.sendMessages(input);
    return {
      status: 'success',
    };
  }

  async sendMonthlyReportEmail(report: string, billingPeriod: Date) {
    const dateOptions: Intl.DateTimeFormatOptions = { month: 'long', year: 'numeric' };
    const input: SendMessagesCommandInput = {
      ApplicationId: this.projectId,
      MessageRequest: {
        MessageConfiguration: {
          EmailMessage: {
            FromAddress: 'no-reply@pointmotion.us',
            ReplyToAddresses: ['support@pointmotion.us'],
            SimpleEmail: {
              Subject: {
                Data: `Monthly report for the month ${billingPeriod.toLocaleDateString(
                  'en-US',
                  dateOptions,
                )}`,
              },
              TextPart: {
                Data: `Month: ${billingPeriod.toLocaleDateString('en-US', dateOptions)}

Report:
${report}`,
              },
            },
          },
        },
        Addresses: {
          'imen@pointmotioncontrol.com': {
            ChannelType: 'EMAIL',
          },
          'kevin@pointmotioncontrol.com': {
            ChannelType: 'EMAIL',
          },
          'aman@pointmotioncontrol.com': {
            ChannelType: 'EMAIL',
          },
        },
      },
    };
    await this.pinpoint.sendMessages(input);
    return {
      status: 'success',
    };
  }
}
