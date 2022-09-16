import { EventsRequest, Pinpoint, SendMessagesCommandInput } from '@aws-sdk/client-pinpoint';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PatientFeedback } from 'src/types/patient';

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
  private eventsRequest: EventsRequest;
  constructor(private configService: ConfigService) {
    this.projectId = this.configService.get('PINPOINT_PROJECT_ID');
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
      console.log('Error', err);
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
  async userSignIn(userId: string) {
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
    console.log(`_updateEvents:eventType: ${eventType}`, res);
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
            FromAddress: 'no-reply@pointmotion.us',
            ReplyToAddresses: ['support@pointmotion.us'],
            SimpleEmail: {
              Subject: {
                Data: `Feedback from Patient ${nickname}`,
              },
              TextPart: {
                Data: `
                Patient Email: ${patientEmail}
                Patient Nickname: ${nickname}

                Feedback Received =>
                  Description (optional): ${description}
                  Please rate your experience: ${rating}
                  How likely are you to recommend this product to someone? (optional): ${recommendationScore}`,
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
}
