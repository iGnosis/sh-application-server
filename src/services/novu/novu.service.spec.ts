import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { NovuService } from './novu.service';
import { Novu } from '@novu/node';
import { Logger } from '@nestjs/common';
import { GqlService } from '../clients/gql/gql.service';
import { NovuSubscriberData, Patient } from 'src/types/global';
import { NovuTriggerEnum } from 'src/types/enum';

const mockConfig = {
  apiKey: 'test',
  backendUrl: 'test',
};

const novuOverrides = {
  email: {
    replyTo: undefined,
  },
};

const mockPatient: Patient = {
  id: 'acadac98-0c06-4ca0-bf95-d8fdffcd409d',
  timezone: 'Asia/Kolkata',
  organizationId: '561c681a-be84-4da1-9a0f-76918a6c879d',
  organization: {
    id: '561c681a-be84-4da1-9a0f-76918a6c879d',
    patientDomain: 'https://example.com',
  },
};

const mockTriggerResponse = {
  data: {
    acknowledged: true,
    status: 'processed',
  },
};

describe('NovuService', () => {
  let service: NovuService;
  let novuTriggerSpy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NovuService, ConfigService, Logger, GqlService],
    }).compile();

    service = module.get<NovuService>(NovuService);
    service.novuClient = new Novu(mockConfig.apiKey);

    novuTriggerSpy = jest.spyOn(service.novuClient, 'trigger').mockImplementation(async () => {
      return mockTriggerResponse as any;
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should get subscriber', async () => {
    const mockResponse = {
      data: {
        subscriberId: 'testSubId',
      },
    };

    // given
    const subscriberId = 'testSubId';
    const spy = jest.spyOn(service.novuClient.subscribers, 'get').mockImplementation(async () => {
      return mockResponse as any;
    });

    // when
    const subscriber = await service.getSubscriber(subscriberId);

    // then
    expect(spy).toHaveBeenCalledWith(subscriberId);
    expect(subscriber.subscriberId).toEqual(subscriberId);
  });

  it('should create a new subscriber', async () => {
    const mockResponse = {
      data: {
        subscriberId: 'testSubId',
      },
    };

    // given
    const subscriberId = 'testSubId';
    const phoneCountryCode = '+91';
    const phoneNumber = '123456789';
    const mockNovuData: Partial<NovuSubscriberData> = {
      nickname: 'test-nickname',
      namePrefix: 'Mr.',
      firstPaymentMade: true,
      firstActivityPlayed: true,
      pastSameActivityCount: 0,
      activityStreakCount: 0,
      sendInactiveUserReminder: false,
      quitDuringCalibrationMailSent: false,
      quitDuringTutorialMailSent: false,
      feedbackOn10ActiveDaysSent: false,
      organizationId: '',
      env: 'local',
    };
    const spy = jest
      .spyOn(service.novuClient.subscribers, 'identify')
      .mockImplementation(async () => {
        return mockResponse as any;
      });

    // when
    const sub = await service.createNewSubscriber(
      subscriberId,
      phoneCountryCode,
      phoneNumber,
      mockNovuData,
    );

    // then
    expect(sub.subscriberId).toEqual(subscriberId);
    expect(spy).toHaveBeenCalledWith(subscriberId, {
      data: {
        ...mockNovuData,
      },
      phone: `${phoneCountryCode}${phoneNumber}`,
    });
  });

  it('should cancel a trigger', async () => {
    const mockResponse = {
      data: true,
    };

    // given
    const triggerId = 'testSubId';
    const spy = jest.spyOn(service.novuClient.events, 'cancel').mockImplementation(async () => {
      return mockResponse as any;
    });

    // then
    const isTriggerCancelled = await service.cancelTrigger(triggerId);
    expect(isTriggerCancelled).toBe(true);
    expect(spy).toHaveBeenCalledWith(triggerId);
  });

  it('should trigger paymentFailed notification', async () => {
    await service.paymentFailed(mockPatient);

    expect(novuTriggerSpy).toHaveBeenCalledWith(NovuTriggerEnum.PAYMENT_FAILED, {
      overrides: {
        ...novuOverrides,
      },
      payload: {
        patientDomainUrl: mockPatient.organization.patientDomain,
        supportUrl: '',
      },
      to: {
        subscriberId: mockPatient.id,
      },
    });
  });

  it('should trigger renewPaymentFailed notification', async () => {
    // given
    const formatter = new Intl.DateTimeFormat('default', {
      timeZone: mockPatient.timezone,
      month: 'long',
    });
    const monthName = formatter.format(new Date());

    // when
    await service.renewPaymentFailed(mockPatient);

    // then
    expect(novuTriggerSpy).toHaveBeenCalledWith(NovuTriggerEnum.RENEW_PAYMENT_FAILED, {
      overrides: {
        ...novuOverrides,
      },
      payload: {
        monthName,
        updatePaymentMethodUrl: mockPatient.organization.patientDomain,
        supportUrl: '',
      },
      to: {
        subscriberId: mockPatient.id,
      },
    });
  });

  it('should trigger failedToPauseSubscription notification', async () => {
    await service.failedToPauseSubscription(mockPatient);

    expect(novuTriggerSpy).toHaveBeenCalledWith(NovuTriggerEnum.PAUSED_SUBSCRIPTION_FAILED, {
      overrides: {
        ...novuOverrides,
      },
      payload: {
        pauseSubscriptionUrl: mockPatient.organization.patientDomain,
      },
      to: {
        subscriberId: mockPatient.id,
      },
    });
  });

  it('should trigger failedToCancelSubscription notification', async () => {
    // given
    const renewalDate = new Date().toISOString();

    // when
    await service.failedToCancelSubscription(mockPatient, renewalDate);

    // then
    expect(novuTriggerSpy).toHaveBeenCalledWith(NovuTriggerEnum.CANCELLED_SUBSCRIPTION_FAILED, {
      overrides: {
        ...novuOverrides,
      },
      payload: {
        cancellationFailureReason: 'some technical difficulties',
        pauseSubscriptionUrl: mockPatient.organization.patientDomain,
        subscriptionRenewalDate: renewalDate,
        customerSupportEmailAddr: 'support@pointmotion.us',
      },
      to: {
        subscriberId: mockPatient.id,
      },
    });
  });

  it('should trigger firstPaymentSuccess notification', async () => {
    await service.firstPaymentSuccess(mockPatient);
    expect(novuTriggerSpy).toHaveBeenCalledWith(NovuTriggerEnum.FIRST_PAYMENT_SUCCESS, {
      overrides: {
        ...novuOverrides,
      },
      payload: {
        completeProfileUrl: mockPatient.organization.patientDomain || '',
        referralProgramUrl: mockPatient.organization.patientDomain || '',
        feedbackUrl: '',
      },
      to: {
        subscriberId: mockPatient.id,
      },
    });
  });

  it('should trigger renewPaymentSuccess notification', async () => {
    await service.renewPaymentSuccess(mockPatient);
    expect(novuTriggerSpy).toHaveBeenCalledWith(NovuTriggerEnum.RENEW_PAYMENT_SUCCESS, {
      overrides: {
        ...novuOverrides,
      },
      payload: {
        supportUrl: '',
      },
      to: {
        subscriberId: mockPatient.id,
      },
    });
  });

  it('should trigger paymentMethodUpdatedSuccess notification', async () => {
    await service.paymentMethodUpdatedSuccess(mockPatient);
    expect(novuTriggerSpy).toHaveBeenCalledWith(NovuTriggerEnum.PAYMENT_METHOD_UPDATED_SUCCESS, {
      overrides: {
        ...novuOverrides,
      },
      payload: {
        supportEmailAddr: 'support@pointmotion.us',
      },
      to: {
        subscriberId: mockPatient.id,
      },
    });
  });

  it('should trigger cancelSubscriptionSuccess notification', async () => {
    await service.cancelSubscriptionSuccess(mockPatient);
    expect(novuTriggerSpy).toHaveBeenCalledWith(NovuTriggerEnum.CANCELLED_SUBSCRIPTION_SUCCESS, {
      overrides: {
        ...novuOverrides,
      },
      payload: {
        pauseSubscriptionUrl: mockPatient.organization.patientDomain,
        resumeSubscriptionUrl: mockPatient.organization.patientDomain,
      },
      to: {
        subscriberId: mockPatient.id,
      },
    });
  });

  it('should trigger pausedSubscriptionSuccess notification', async () => {
    await service.pausedSubscriptionSuccess(mockPatient);
    expect(novuTriggerSpy).toHaveBeenCalledWith(NovuTriggerEnum.PAUSED_SUBSCRIPTION_SUCCESS, {
      overrides: {
        ...novuOverrides,
      },
      payload: {
        pausedUntilDate: '', // TODO: set paused until date
        resumeSubscriptionUrl: mockPatient.organization.patientDomain,
        supportUrl: '',
      },
      to: {
        subscriberId: mockPatient.id,
      },
    });
  });

  it('should trigger noPaymentDoneReminder notification', async () => {
    await service.noPaymentDoneReminder(mockPatient);
    expect(novuTriggerSpy).toHaveBeenCalledWith(NovuTriggerEnum.NO_PAYMENT_REMINDER, {
      overrides: {
        ...novuOverrides,
      },
      payload: {
        feedbackUrl: '',
        supportUrl: '',
      },
      to: {
        subscriberId: mockPatient.id,
      },
    });
  });

  it('should trigger noActivityStartedReminder notification', async () => {
    await service.noActivityStartedReminder(mockPatient);
    expect(novuTriggerSpy).toHaveBeenCalledWith(NovuTriggerEnum.NO_ACTIVITY_STARTED_REMINDER, {
      overrides: {
        ...novuOverrides,
      },
      payload: {
        getStartedUrl: mockPatient.organization.patientDomain,
        supportUrl: '',
      },
      to: {
        subscriberId: mockPatient.id,
      },
    });
  });

  it('should trigger quitDuringCalibration notification', async () => {
    await service.quitDuringCalibration(mockPatient.id);
    expect(novuTriggerSpy).toHaveBeenCalledWith(NovuTriggerEnum.USER_LEAVES_CALIBRATION, {
      overrides: {
        ...novuOverrides,
      },
      payload: {
        supportUrl: '',
      },
      to: {
        subscriberId: mockPatient.id,
      },
    });
  });

  it('should trigger quitDuringTutorial notification', async () => {
    await service.quitDuringTutorial(mockPatient.id);
    expect(novuTriggerSpy).toHaveBeenCalledWith(NovuTriggerEnum.USER_LEAVES_TUTORIAL, {
      overrides: {
        ...novuOverrides,
      },
      payload: {
        feedbackUrl: '',
      },
      to: {
        subscriberId: mockPatient.id,
      },
    });
  });

  it('should trigger firstActivityCompleted notification', async () => {
    await service.firstActivityCompleted(mockPatient.id);
    expect(novuTriggerSpy).toHaveBeenCalledWith(NovuTriggerEnum.USER_FIRST_ACTIVITY_COMPLETED, {
      overrides: {
        ...novuOverrides,
      },
      payload: {
        supportUrl: '',
      },
      to: {
        subscriberId: mockPatient.id,
      },
    });
  });

  it('should trigger userPlayingSameGame notification', async () => {
    // given
    const activityName = 'Sit Stand Achieve';

    // when
    await service.userPlayingSameGame(mockPatient.id, activityName);

    // then
    expect(novuTriggerSpy).toHaveBeenCalledWith(NovuTriggerEnum.USER_PLAYING_SAME_GAME, {
      overrides: {
        ...novuOverrides,
      },
      payload: {
        activityName: activityName,
        supportUrl: '',
      },
      to: {
        subscriberId: mockPatient.id,
      },
    });
  });

  it('should trigger maintainingStreak notification', async () => {
    await service.maintainingStreak(mockPatient.id);
    expect(novuTriggerSpy).toHaveBeenCalledWith(NovuTriggerEnum.MAINTAINING_STREAK, {
      overrides: {
        ...novuOverrides,
      },
      payload: {
        supportUrl: '',
      },
      to: {
        subscriberId: mockPatient.id,
      },
    });
  });

  it('should trigger highScoreReached notification', async () => {
    // given
    const activityName = 'Sit Stand Achieve';

    // when
    await service.highScoreReached(mockPatient.id, activityName);

    // then
    expect(novuTriggerSpy).toHaveBeenCalledWith(NovuTriggerEnum.HIGH_SCORE_REACHED, {
      overrides: {
        ...novuOverrides,
      },
      payload: {
        supportUrl: '',
        gameName: activityName,
      },
      to: {
        subscriberId: mockPatient.id,
      },
    });
  });

  it('should trigger freeTrialEndingReminder notification', async () => {
    // given
    const sendAt = new Date().toISOString();

    // when
    await service.freeTrialEndingReminder(mockPatient.id, sendAt);

    // then
    expect(novuTriggerSpy).toHaveBeenCalledWith(NovuTriggerEnum.TRIAL_ENDING_REMINDER, {
      overrides: {
        ...novuOverrides,
      },
      payload: {
        renewSubscriptionUrl: '',
        sendAt,
      },
      to: {
        subscriberId: mockPatient.id,
      },
    });
  });

  it('should trigger fabFeedbackSuccess notification', async () => {
    await service.fabFeedbackSuccess(mockPatient.id);
    expect(novuTriggerSpy).toHaveBeenCalledWith(NovuTriggerEnum.FAB_FEEDBACK_SUCCESS, {
      overrides: {
        ...novuOverrides,
      },
      payload: {},
      to: {
        subscriberId: mockPatient.id,
      },
    });
  });

  it('should trigger contactSupportSuccess notification', async () => {
    await service.contactSupportSuccess(mockPatient.id);
    expect(novuTriggerSpy).toHaveBeenCalledWith(NovuTriggerEnum.CONTACT_SUPPORT_SUCCESS, {
      overrides: {
        ...novuOverrides,
      },
      payload: {},
      to: {
        subscriberId: mockPatient.id,
      },
    });
  });

  it('should trigger feedbackOn10ActiveDays notification', async () => {
    await service.feedbackOn10ActiveDays(mockPatient.id);
    expect(novuTriggerSpy).toHaveBeenCalledWith(NovuTriggerEnum.FEEDBACK_ON_10_ACTIVE_DAYS, {
      overrides: {
        ...novuOverrides,
      },
      payload: {},
      to: {
        subscriberId: mockPatient.id,
      },
    });
  });

  it('should trigger almostBrokenStreakReminder notification', async () => {
    // given
    const sendAt = new Date().toISOString();
    const triggerId = 'testTriggerId';

    // when
    await service.almostBrokenStreakReminder(mockPatient.id, sendAt, triggerId);

    // then
    expect(novuTriggerSpy).toHaveBeenCalledWith(NovuTriggerEnum.ALMOST_BROKEN_STREAK, {
      overrides: {
        ...novuOverrides,
      },
      payload: {
        sendAt,
      },
      to: {
        subscriberId: mockPatient.id,
      },
      transactionId: triggerId,
    });
  });

  it('should trigger noActivityInPast3Days notification', async () => {
    // given
    const now = new Date();
    const foutDayInPast = new Date(now.setHours(now.getHours() - 24 * 4)).toISOString();
    const mockSubscriberListResp = {
      data: {
        page: 0,
        totalCount: 2,
        pageSize: 10,
        data: [
          {
            phone: '+911122331122',
            subscriberId: 'd03caa25-ee2c-44f1-b59e-61fc877b8ff5',
            email: 'test11@test.com',
            data: {
              lastActivityPlayedOn: new Date().toISOString(),
              sendInactiveUserReminder: true,
            },
          },
          {
            phone: '+914455661122',
            subscriberId: '919ab224-a816-41ff-b0c5-00fb1713ea91',
            email: 'test22@test.com',
            data: {
              lastActivityPlayedOn: foutDayInPast,
              sendInactiveUserReminder: false,
            },
          },
          {
            phone: '+91123456789',
            subscriberId: '42efec9e-c993-42ec-810f-3e3ac5501c88',
            email: 'test@test.com',
            data: {
              lastActivityPlayedOn: foutDayInPast,
              sendInactiveUserReminder: true,
            },
          },
        ],
      },
    };
    const subscriberListSpy = jest
      .spyOn(service.novuClient.subscribers, 'list')
      .mockImplementation(async () => {
        return mockSubscriberListResp as any;
      });

    const updateSubscriberSpy = jest
      .spyOn(service.novuClient.subscribers, 'update')
      .mockImplementation(async () => {
        return {} as any;
      });

    // when
    await service.noActivityInPast3Days();

    // then
    expect(novuTriggerSpy).toBeCalledTimes(1);
    expect(novuTriggerSpy).toHaveBeenCalledWith(NovuTriggerEnum.INACTIVE_USERS_SINCE_3_DAYS, {
      to: {
        subscriberId: '42efec9e-c993-42ec-810f-3e3ac5501c88',
      },
      payload: {
        supportUrl: '',
      },
    });
  });
});
