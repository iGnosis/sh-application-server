export class Patient {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  provider: string;
  identifier: string;
  medicalConditions: any;
  preferredGenres: any;
  primaryTherapist: string;
  onboardedBy: string;
  email: string;
  careGiverEmail: string;
  phoneCountryCode: string;
  phoneNumber: string;
}
