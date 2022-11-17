export class Patient {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  provider: string;
  activeCareplan: string;
  identifier: string;
  nickname: string;
  medicalConditions: any;
  preferredGenres: any;
  primaryTherapist: string;
  onboardedBy: string;
  email: string;
  careGiverEmail: string;
  phoneCountryCode: string;
  phoneNumber: string;
  canBenchmark: boolean;
}

export class PatientFeedback {
  patientByPatient: Patient;
  createdAt: Date;
  updatedAt: Date;
  description: string;
  rating: number;
  recommendationScore: number;
}
