import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Novu } from '@novu/node';
import { NovuTriggerEnum } from 'src/types/enum';
import { GqlService } from '../clients/gql/gql.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NovuSubscriber, NovuSubscriberData, Patient } from 'src/types/global';
@Injectable()
export class NovuService {
  public novuClient: Novu;
  private novuApiKey: string;
  private novuBackendUrl: string;
  private overrides = {
    email: {
      replyTo: this.configService.get('SUPPORT_REPLY_TO_EMAIL'),
    },
  };

  constructor(
    private configService: ConfigService,
    private logger: Logger,
    private gqlService: GqlService,
  ) {
    this.novuApiKey = this.configService.get('NOVU_API_KEY');
    this.novuBackendUrl = this.configService.get('NOVU_BACKEND_URL');
    this.novuClient = new Novu(this.novuApiKey, {
      backendUrl: this.novuBackendUrl,
    });
  }

  async getPatientByPk(patientId: string): Promise<Patient> {
    const query = `query GetPatient($patientId: uuid!) {
      patient_by_pk(id: $patientId) {
        id
        organization {
          patientDomain
        }
      }
    }`;
    const resp = await this.gqlService.client.request(query, { patientId });
    return resp.patient_by_pk;
  }

  async getSubscriber(patientId: string): Promise<NovuSubscriber> {
    try {
      const resp = await this.novuClient.subscribers.get(patientId);
      return resp.data;
    } catch (err) {
      this.logger.error('error while getSubscriber ' + JSON.stringify(err));
    }
  }

  async createNewSubscriber(
    patientId: string,
    phoneCountryCode: string,
    phoneNumber: string,
    email: string,
    novuData: Partial<NovuSubscriberData>,
  ) {
    const defaultNovuData: NovuSubscriberData = {
      nickname: '',
      namePrefix: '',
      firstPaymentMade: false,
      firstActivityPlayed: false,
      pastSameActivityCount: 0,
      activityStreakCount: 0,
      sendInactiveUserReminder: false,
      quitDuringCalibrationMailSent: false,
      quitDuringTutorialMailSent: false,
      feedbackOn10ActiveDaysSent: false,
      organizationId: '',
      env: this.configService.get('ENV_NAME') || 'local',
      ...novuData,
    };
    try {
      const resp = await this.novuClient.subscribers.identify(patientId, {
        phone: `${phoneCountryCode}${phoneNumber}`,
        email,
        data: { ...defaultNovuData },
      });
      return resp.data;
    } catch (err) {
      this.logger.error('error while createNewSubscriber ' + JSON.stringify(err));
    }
  }

  async cancelTrigger(triggerId: string) {
    try {
      const resp = await this.novuClient.events.cancel(triggerId);
      return resp.data;
    } catch (err) {
      this.logger.error('error while cancelTrigger ' + JSON.stringify(err));
    }
  }

  async paymentFailed(patient: Patient) {
    try {
      return await this.novuClient.trigger(NovuTriggerEnum.PAYMENT_FAILED, {
        to: {
          subscriberId: patient.id,
        },
        payload: {
          patientDomainUrl: patient.organization.patientDomain || '',
          supportUrl: this.configService.get('SUPPORT_URL') || '',
        },
        overrides: this.overrides,
      });
    } catch (err) {
      this.logger.error('error while paymentFailed ' + JSON.stringify(err));
    }
  }

  async renewPaymentFailed(patient: Patient) {
    let timezoneName = patient.timezone;
    if (timezoneName) {
      // default timezone incase if timezone isn't set for patient
      timezoneName = 'America/New_York';
    }

    const formatter = new Intl.DateTimeFormat('default', { timeZone: timezoneName, month: 'long' });
    const monthName = formatter.format(new Date());

    try {
      return await this.novuClient.trigger(NovuTriggerEnum.RENEW_PAYMENT_FAILED, {
        to: {
          subscriberId: patient.id,
        },
        payload: {
          monthName,
          updatePaymentMethodUrl: patient.organization.patientDomain || '',
          supportUrl: this.configService.get('SUPPORT_URL') || '',
        },
        overrides: this.overrides,
      });
    } catch (err) {
      this.logger.error('error while renewPaymentFailed ' + JSON.stringify(err));
    }
  }

  async failedToPauseSubscription(patient: Patient) {
    try {
      return await this.novuClient.trigger(NovuTriggerEnum.PAUSED_SUBSCRIPTION_FAILED, {
        to: {
          subscriberId: patient.id,
        },
        payload: {
          pauseSubscriptionUrl: patient.organization.patientDomain || '',
        },
        overrides: this.overrides,
      });
    } catch (err) {
      this.logger.error('error while failedToPauseSubscription ' + JSON.stringify(err));
    }
  }

  async failedToCancelSubscription(patient: Patient, renewalDate: string) {
    try {
      return await this.novuClient.trigger(NovuTriggerEnum.CANCELLED_SUBSCRIPTION_FAILED, {
        to: {
          subscriberId: patient.id,
        },
        payload: {
          cancellationFailureReason: 'some technical difficulties',
          pauseSubscriptionUrl: patient.organization.patientDomain || '',
          subscriptionRenewalDate: renewalDate,
          customerSupportEmailAddr: 'support@pointmotion.us',
        },
        overrides: this.overrides,
      });
    } catch (err) {
      this.logger.error('error while failedToCancelSubscription ' + JSON.stringify(err));
    }
  }

  async firstPaymentSuccess(patient: Patient) {
    try {
      await this.novuClient.trigger(NovuTriggerEnum.FIRST_PAYMENT_SUCCESS, {
        to: {
          subscriberId: patient.id,
        },
        payload: {
          completeProfileUrl: patient.organization.patientDomain || '',
          referralProgramUrl: patient.organization.patientDomain || '',
          feedbackUrl: this.configService.get('FEEDBACK_URL') || '',
        },
        overrides: this.overrides,
      });
    } catch (err) {
      this.logger.error('error while firstPaymentSuccess ' + JSON.stringify(err));
    }
  }

  async renewPaymentSuccess(patient: Patient) {
    try {
      await this.novuClient.trigger(NovuTriggerEnum.RENEW_PAYMENT_SUCCESS, {
        to: {
          subscriberId: patient.id,
        },
        payload: {
          supportUrl: this.configService.get('SUPPORT_URL') || '',
        },
        overrides: this.overrides,
      });
    } catch (err) {
      this.logger.error('error while renewPaymentSuccess ' + JSON.stringify(err));
    }
  }

  async paymentMethodUpdatedSuccess(patient: Patient) {
    try {
      await this.novuClient.trigger(NovuTriggerEnum.PAYMENT_METHOD_UPDATED_SUCCESS, {
        to: {
          subscriberId: patient.id,
        },
        payload: {
          supportEmailAddr: 'support@pointmotion.us',
        },
        overrides: this.overrides,
      });
    } catch (err) {
      this.logger.error('error while paymentMethodUpdatedSuccess ' + JSON.stringify(err));
    }
  }

  async cancelSubscriptionSuccess(patient: Patient) {
    try {
      await this.novuClient.trigger(NovuTriggerEnum.CANCELLED_SUBSCRIPTION_SUCCESS, {
        to: {
          subscriberId: patient.id,
        },
        payload: {
          pauseSubscriptionUrl: patient.organization.patientDomain || '',
          resumeSubscriptionUrl: patient.organization.patientDomain || '',
        },
        overrides: this.overrides,
      });
    } catch (err) {
      this.logger.error('error while cancelSubscriptionSuccess ' + JSON.stringify(err));
    }
  }

  async pausedSubscriptionSuccess(patient: Patient) {
    try {
      await this.novuClient.trigger(NovuTriggerEnum.PAUSED_SUBSCRIPTION_SUCCESS, {
        to: {
          subscriberId: patient.id,
        },
        payload: {
          pausedUntilDate: '', // TODO: set paused until date
          resumeSubscriptionUrl: patient.organization.patientDomain || '',
          supportUrl: this.configService.get('SUPPORT_URL') || '',
        },
        overrides: this.overrides,
      });
    } catch (err) {
      this.logger.error('error while pausedSubscriptionSuccess ' + JSON.stringify(err));
    }
  }

  async noPaymentDoneReminder(patient: Patient) {
    try {
      await this.novuClient.trigger(NovuTriggerEnum.NO_PAYMENT_REMINDER, {
        to: {
          subscriberId: patient.id,
        },
        payload: {
          feedbackUrl: this.configService.get('FEEDBACK_URL') || '',
          supportUrl: this.configService.get('SUPPORT_URL') || '',
        },
        overrides: this.overrides,
      });
    } catch (err) {
      this.logger.error('error while noPaymentDoneReminder ' + JSON.stringify(err));
    }
  }

  async noActivityStartedReminder(patient: Patient) {
    try {
      await this.novuClient.trigger(NovuTriggerEnum.NO_ACTIVITY_STARTED_REMINDER, {
        to: {
          subscriberId: patient.id,
        },
        payload: {
          getStartedUrl: patient.organization.patientDomain || '',
          supportUrl: this.configService.get('SUPPORT_URL') || '',
        },
        overrides: this.overrides,
      });
    } catch (err) {
      this.logger.error('error while noActivityStartedReminder ' + JSON.stringify(err));
    }
  }

  async quitDuringCalibration(patientId: string) {
    try {
      await this.novuClient.trigger(NovuTriggerEnum.USER_LEAVES_CALIBRATION, {
        to: {
          subscriberId: patientId,
        },
        payload: {
          supportUrl: this.configService.get('SUPPORT_URL') || '',
        },
        overrides: this.overrides,
      });
    } catch (err) {
      this.logger.error('error while quitDuringCalibration ' + JSON.stringify(err));
    }
  }

  async quitDuringTutorial(patientId: string) {
    try {
      await this.novuClient.trigger(NovuTriggerEnum.USER_LEAVES_TUTORIAL, {
        to: {
          subscriberId: patientId,
        },
        payload: {
          feedbackUrl: this.configService.get('FEEDBACK_URL') || '',
        },
        overrides: this.overrides,
      });
    } catch (err) {
      this.logger.error('error while quitDuringTutorial ' + JSON.stringify(err));
    }
  }

  async firstActivityCompleted(patientId: string) {
    try {
      await this.novuClient.trigger(NovuTriggerEnum.USER_FIRST_ACTIVITY_COMPLETED, {
        to: {
          subscriberId: patientId,
        },
        payload: {
          supportUrl: this.configService.get('SUPPORT_URL') || '',
        },
        overrides: this.overrides,
      });
    } catch (err) {
      this.logger.error('error while firstActivityCompleted ' + JSON.stringify(err));
    }
  }

  async userPlayingSameGame(patientId: string, activityName: string) {
    try {
      await this.novuClient.trigger(NovuTriggerEnum.USER_PLAYING_SAME_GAME, {
        to: {
          subscriberId: patientId,
        },
        payload: {
          activityName: activityName,
          supportUrl: this.configService.get('SUPPORT_URL') || '',
        },
        overrides: this.overrides,
      });
    } catch (err) {
      this.logger.error('error while userPlayingSameGame ' + JSON.stringify(err));
    }
  }

  async maintainingStreak(patientId: string) {
    try {
      await this.novuClient.trigger(NovuTriggerEnum.MAINTAINING_STREAK, {
        to: {
          subscriberId: patientId,
        },
        payload: {
          supportUrl: this.configService.get('SUPPORT_URL') || '',
        },
        overrides: this.overrides,
      });
    } catch (err) {
      this.logger.error('error while maintainingStreak ' + JSON.stringify(err));
    }
  }

  async highScoreReached(patientId: string, gameName: string) {
    try {
      await this.novuClient.trigger(NovuTriggerEnum.HIGH_SCORE_REACHED, {
        to: {
          subscriberId: patientId,
        },
        payload: {
          gameName,
          supportUrl: this.configService.get('SUPPORT_URL') || '',
        },
        overrides: this.overrides,
      });
    } catch (err) {
      this.logger.error('error while highScoreReached ' + JSON.stringify(err));
    }
  }

  async freeTrialEndingReminder(patientId: string, sendAt: string) {
    try {
      await this.novuClient.trigger(NovuTriggerEnum.TRIAL_ENDING_REMINDER, {
        to: {
          subscriberId: patientId,
        },
        payload: {
          renewSubscriptionUrl: '',
          sendAt,
        },
        overrides: this.overrides,
      });
    } catch (err) {
      this.logger.error('error while freeTrialEndingReminder ' + JSON.stringify(err));
    }
  }

  async fabFeedbackSuccess(patientId: string) {
    try {
      await this.novuClient.trigger(NovuTriggerEnum.FAB_FEEDBACK_SUCCESS, {
        to: {
          subscriberId: patientId,
        },
        payload: {},
        overrides: this.overrides,
      });
    } catch (err) {
      this.logger.error('error while contactSupportSuccess ' + JSON.stringify(err));
    }
  }

  async contactSupportSuccess(patientId: string) {
    try {
      await this.novuClient.trigger(NovuTriggerEnum.CONTACT_SUPPORT_SUCCESS, {
        to: {
          subscriberId: patientId,
        },
        payload: {},
        overrides: this.overrides,
      });
    } catch (err) {
      this.logger.error('error while contactSupportSuccess ' + JSON.stringify(err));
    }
  }

  async feedbackOn10ActiveDays(patientId: string) {
    try {
      await this.novuClient.trigger(NovuTriggerEnum.FEEDBACK_ON_10_ACTIVE_DAYS, {
        to: {
          subscriberId: patientId,
        },
        payload: {},
        overrides: this.overrides,
      });
    } catch (err) {
      this.logger.error('error while contactSupportSuccess ' + JSON.stringify(err));
    }
  }

  async almostBrokenStreakReminder(patientId: string, sendAt: string, triggerId: string) {
    try {
      const resp = await this.novuClient.trigger(NovuTriggerEnum.ALMOST_BROKEN_STREAK, {
        to: {
          subscriberId: patientId,
        },
        payload: {
          sendAt,
        },
        overrides: this.overrides,
        // @ts-ignore
        transactionId: triggerId,
      });
      return resp.data;
    } catch (err) {
      this.logger.error('error while almostBrokenStreak ' + JSON.stringify(err));
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_NOON)
  async noActivityInPast3Days() {
    const patients = [];

    try {
      const resp = await this.novuClient.subscribers.list(0);
      patients.push(...resp.data.data);

      // -1 because we've already fetched first page. ie. page 0.
      const totalPages = Math.ceil(resp.data.totalCount / resp.data.pageSize) - 1;
      if (totalPages > 1) {
        for (let i = 0; i < totalPages; i++) {
          const resp = await this.novuClient.subscribers.list(i);
          patients.push(...resp.data.data);
        }
      }

      patients.forEach(async (patient: NovuSubscriber) => {
        if (patient.deleted || !patient.data || !patient.data.lastActivityPlayedOn) return;

        const now = new Date().getTime();
        const lastActivityPlayedOn = new Date(patient.data.lastActivityPlayedOn).getTime();
        const diffInMs = now - lastActivityPlayedOn;
        const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

        if (diffInDays > 3 && patient.data.sendInactiveUserReminder) {
          this.logger.log(
            'sending email to inactive patient ' + JSON.stringify(patient.subscriberId),
          );
          await this.novuClient.trigger(NovuTriggerEnum.INACTIVE_USERS_SINCE_3_DAYS, {
            to: {
              subscriberId: patient.subscriberId,
            },
            payload: {
              supportUrl: this.configService.get('SUPPORT_URL') || '',
            },
          });
          const novuData: Partial<NovuSubscriberData> = {
            sendInactiveUserReminder: false,
          };
          await this.novuClient.subscribers.update(patient.subscriberId, {
            data: { ...novuData },
          });
        }
      });
    } catch (err) {
      this.logger.error('error while noActivityInPast3Days ' + JSON.stringify(err));
    }
  }
}
