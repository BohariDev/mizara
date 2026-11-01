export enum UserStatus {
    Unverified = 'unverified',
}

export enum VerificationCodeType {
    EmailVerification = 'Email Verification',
    PasswordReset = 'Password Reset',
    ChangeEmail = 'Change Email',
}

export enum RecurringPaymentType {
    Subscription = 'Subscription',
    Bills = 'Bills',
}

export enum RecurringPaymentBillingCycle {
    Weekly = 'Weekly',
    Monthly = 'Monthly',
    Quarterly = 'Quarterly',
    Yearly = 'Yearly',
}

export enum RecurringPaymentSortBy {
    DueDate = 'due_date',
    Amount = 'amount',
    Name = 'name',
}

export enum SortOrder {
    ASC = 'ASC',
    DESC = 'DESC',
}

export enum ReminderOffsetDays {
    SevenDaysBefore = 7,
    ThreeDaysBefore = 3,
    OneDayBefore = 1,
    DueDay = 0,
}

export enum ReminderChannel {
    Email = 'email',
    Push = 'push',
}

export enum PushPlatform {
    Android = 'android',
    Ios = 'ios',
}

export enum SentReminderType {
    Due = 'due',
    Overdue = 'overdue',
    CycleConfirmation = 'cycle_confirmation',
}

export enum NotificationType {
    Due = 'due',
    Overdue = 'overdue',
    CycleConfirmation = 'cycle_confirmation',
    PaymentArchived = 'payment_archived',
    FreeTrialEndingSoon = 'free_trial_ending_soon',
    FreeTrialEnded = 'free_trial_ended',
    FreeTrialConvertedToPaid = 'free_trial_converted_to_paid',
}

export enum Theme {
    Light = 'light',
    Dark = 'dark',
    System = 'system',
}

export enum RecurringPaymentPricingType {
    Fixed = 'Fixed',
    Variable = 'Variable',
}

export enum RecurringPaymentDueDateType {
    Fixed = 'Fixed',
    Variable = 'Variable',
}

export enum RecurringPaymentBillingDateType {
    Fixed = 'Fixed',
    Variable = 'Variable',
}
