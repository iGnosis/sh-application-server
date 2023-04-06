// Hasura roles.
export enum UserRole {
  THERAPIST = 'therapist',
  PATIENT = 'patient',
  CARETAKER = 'caretaker',
  BENCHMARK = 'benchmark',
  ORG_ADMIN = 'org_admin',
  SH_ADMIN = 'sh_admin',
  GUEST = 'guest',
}

export enum LoginUserType {
  PATIENT = 'patient',
  BENCHMARK = 'benchmark',
  STAFF = 'staff',
  SH_ADMIN = 'sh_admin',
}

export enum DashboardMetricEnum {
  // conversion
  NEW_USERS = 'new_users',
  ACTIVATION_MILESTONE = 'activation_milestone',
  ACTIVATION_RATE = 'activation_rate',

  // engagement
  AVG_USER_ENGAGEMENT = 'avg_user_engagement',
  AVG_ACTIVITIES_PLAYED = 'avg_activities_played',
  ADOPTION_RATE = 'adoption_rate',

  // retention
  ACTIVE_USERS = 'active_users',
  TOTAL_USERS = 'total_users',
  STICKINESS = 'stickiness',
}

export enum NovuTriggerEnum {
  PAYMENT_FAILED = 'failed-to-update-payments-for-a-first-time-subscriber',
  FIRST_PAYMENT_SUCCESS = 'successful-1st-time-payment',
  RENEW_PAYMENT_FAILED = 'failed-to-renew-payment-for-subscribed-member',
  RENEW_PAYMENT_SUCCESS = 'successful-renewal',
  PAYMENT_METHOD_UPDATED_SUCCESS = 'updated-payment-method-successfully',

  CANCELLED_SUBSCRIPTION_SUCCESS = 'cancelled-subscription-successfully',
  CANCELLED_SUBSCRIPTION_FAILED = 'failed-to-cancel-subscriptions',

  PAUSED_SUBSCRIPTION_SUCCESS = 'paused-subscription-successfully',
  PAUSED_SUBSCRIPTION_FAILED = 'failed-to-pause-subscriptions',

  CONTACT_SUPPORT_SUCCESS = 'automatic-reply-to-contact-support',
  FAB_FEEDBACK_SUCCESS = 'automatic-reply-to-feedback-entry-through-fab',
  FEEDBACK_ON_10_ACTIVE_DAYS = 'getting-feedback-from-user',

  NO_PAYMENT_REMINDER = 'user-left-on-the-payment-screen',
  NO_ACTIVITY_STARTED_REMINDER = 'user-hasnt-started-any-activities-since-subscribing',
  TRIAL_ENDING_REMINDER = 'free-trial-ending-soon',

  USER_LEAVES_CALIBRATION = 'user-leaves-the-experience-due-to-failed-calibration',
  USER_LEAVES_TUTORIAL = 'user-leaves-the-experience-during-tutorial',

  USER_FIRST_ACTIVITY_COMPLETED = 'user-successfully-completes-1st-game-attempt',
  INACTIVE_USERS_SINCE_3_DAYS = 'user-hasnt-played-the-game-in-the-past-3-days',

  USER_PLAYING_SAME_GAME = 'sound-health-theres-more-to-explore-try-some-of-our-other-games',
  MAINTAINING_STREAK = 'maintaining-streaks',
  ALMOST_BROKEN_STREAK = 'almost-broken-streaks',
  HIGH_SCORE_REACHED = 'high-scores-in-any-of-the-games',
}

export enum SubscriptionStatusEnum {
  ACTIVE = 'active',
  PAUSED = 'paused',
  CANCELED = 'canceled',
  ARCHIVED = 'archived',
  BLOCKED = 'blocked',
  TRIAL_PERIOD = 'trial_period',
  TRIAL_EXPIRED = 'trial_expired',
  PAYMENT_PENDING = 'payment_pending',
}
