export type Role = 'citizen' | 'officer';
export type Status = 'Submitted' | 'Under Review' | 'Assigned' | 'Resolved';
export type Severity = 'low' | 'medium' | 'high';

export interface Report {
  id: string;
  location: string;
  description: string;
  photoUrl: string;
  severity: Severity;
  status: Status;
  createdAt: string;
  updatedAt: string;
  aiVerified: boolean;
}
