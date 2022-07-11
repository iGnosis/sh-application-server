import { EventsRequest, Pinpoint, SendMessagesCommandInput } from '@aws-sdk/client-pinpoint';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PatientFeedback } from 'src/types/patient';

interface Details {
  id: string;
  emailAddress: string;
  identifier: string;
  urlPart1?: string;
  urlPart2?: string;
}

interface SessionEndedEventMetrics {
  numOfActivitesCompletedToday: number;
  numOfActiveDays: number;
  totalDailyDurationInMin: number;
}

@Injectable()
export class EventsService {
  private pinpoint: Pinpoint;
  private projectId = '4c852bebebf74c0a9050337a0e841fc5';
  private REGION: string;
  private eventsRequest: EventsRequest;
  constructor(private configService: ConfigService) {
    this.REGION = this.configService.get('AWS_DEFAULT_REGION') || 'us-east-1';

    // TODO: remove hardcoded keys. Use IAM roles instead.
    // TODO: a new pinpoint project per env.
    this.pinpoint = new Pinpoint({
      region: this.REGION,
      endpoint: 'https://pinpoint.us-east-1.amazonaws.com',
      credentials: {
        accessKeyId: 'AKIASYR4W4DVRO6KNAVL',
        secretAccessKey: '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',
      },
    });
  }

  async updateEndpoint(details: Details, endpointId: string, type: 'patient' | 'therapist') {
    const { id, emailAddress, identifier, urlPart1, urlPart2 } = details;
    switch (type) {
      case 'patient':
        try {
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
                  role: ['patient'],
                  identifier: [identifier],
                  urlPart1: [urlPart1],
                  urlPart2: [urlPart2],
                },
              },
            },
          });

          this.eventsRequest = { BatchItem: {} };
          this.eventsRequest.BatchItem[endpointId] = {
            Endpoint: {
              ChannelType: 'EMAIL',
            },
            Events: {
              patientNew: {
                EventType: 'patient.new',
                Timestamp: new Date().toISOString(),
              },
            },
          };

          console.log(this.eventsRequest);

          const response = await this.pinpoint.putEvents({
            ApplicationId: this.projectId,
            EventsRequest: this.eventsRequest,
          });
          return response;
        } catch (err) {
          console.log('Error', err);
        }
        break;
      case 'therapist':
        try {
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
                  identifier: [identifier],
                },
              },
            },
          });
          this.eventsRequest = { BatchItem: {} };
          this.eventsRequest.BatchItem[endpointId] = {
            Endpoint: {
              ChannelType: 'EMAIL',
            },
            Events: {
              therapistNew: {
                EventType: 'therapist.new',
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
          console.log('Error', err);
        }
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
      console.log('Error', err);
    }
  }

  // event sent whenever a session starts
  async sessionStarted(userId: string) {
    await this._updateEvents(userId, 'session.started');
  }

  // event sent whenever a session ends
  async sessionEndedEvent(userId: string, metrics: SessionEndedEventMetrics) {
    await this._updateEvents(userId, 'session.complete', {}, metrics);
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

  // helper function for sending Patient events.
  async _updateEvents(userId: string, eventType: string, userAttributes?: any, metrics?: any) {
    this.eventsRequest = { BatchItem: {} };
    this.eventsRequest.BatchItem[userId] = {
      Endpoint: {
        ChannelType: 'EMAIL',
      },
      Events: {
        eventType: {
          EventType: eventType,
          Timestamp: new Date().toISOString(),
          Attributes: userAttributes ? userAttributes : {},
          Metrics: metrics ? metrics : {},
        },
      },
    };
    await this.pinpoint.putEvents({
      ApplicationId: this.projectId,
      EventsRequest: this.eventsRequest,
    });
  }

  async sendFeedbackEmail(patientFeedback: PatientFeedback) {
    // const { description, rating, recommendationScore, patientByPatient: { email: patientEmail, nickname } } = patientFeedback;

    // much cleaner this way!
    const { description, rating, recommendationScore } = patientFeedback;
    const { email: patientEmail, nickname } = patientFeedback.patientByPatient;

    const input: SendMessagesCommandInput = {
      ApplicationId: this.projectId,
      MessageRequest: {
        MessageConfiguration: {
          EmailMessage: {
            // TODO: Replace the sender address.
            FromAddress: 'bhattdeep38@gmail.com',
            SimpleEmail: {
              Subject: {
                Data: `Feedback from Patient ${nickname}`,
              },
              TextPart: {
                Data: `
                Patient Email: ${patientEmail}
                Patient NickName: ${nickname}

                Feedback Received =>
                  Description: ${description}
                  Please rate your experience: ${rating}
                  How likely are you to recommend this product to someone?: ${recommendationScore}`,
              },
            },
          },
        },
        // TODO: Replace the receiver address.
        Addresses: {
          'bhattdeep38@gmail.com': {
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
