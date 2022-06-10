import { EventsRequest, Pinpoint } from '@aws-sdk/client-pinpoint';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface Details {
  id: string;
  emailAddress: string;
  identifier: string;
  urlPart1?: string;
  urlPart2?: string;
}

@Injectable()
export class EventsService {
  private pinpoint: Pinpoint;
  private projectId = '4c852bebebf74c0a9050337a0e841fc5';
  private REGION: string;
  private eventsRequest: EventsRequest;
  constructor(private configService: ConfigService) {
    this.REGION = this.configService.get('AWS_DEFAULT_REGION') || 'us-east-1';

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

  async startSessionCompleteJourney(id: string, sessionDuration: number) {
    try {
      this.eventsRequest = { BatchItem: {} };
      this.eventsRequest.BatchItem[id] = {
        Endpoint: {
          ChannelType: 'EMAIL',
          Metrics: {
            sessionDuration: sessionDuration,
          },
        },
        Events: {
          sessionComplete: {
            EventType: 'session.complete',
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
}
